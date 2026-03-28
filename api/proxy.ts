export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('[Proxy] Request received:', req.query.url);
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return res.status(200).json({ redirect: url });
    }

    let html = await response.text();

    // Inject anti-frame-busting and URL proxy scripts
    const proxyScripts = `
<script>
// Anti-frame-busting and proxy initialization
(function() {
  'use strict';
  
  // Store original values
  const _top = window.top;
  const _parent = window.parent;
  const _frameElement = window.frameElement;
  const _location = Object.getOwnPropertyDescriptor(window, 'location');
  
  // Override window.top
  Object.defineProperty(window, 'top', {
    get: function() { return window; },
    set: function(val) { return; },
    configurable: true
  });
  
  // Override window.parent  
  Object.defineProperty(window, 'parent', {
    get: function() { return window; },
    set: function(val) { return; },
    configurable: true
  });
  
  // Override window.frameElement
  Object.defineProperty(window, 'frameElement', {
    get: function() { return null; },
    configurable: true
  });
  
  // Override location
  const loc = window.location;
  Object.defineProperty(window, 'location', {
    get: function() { return loc; },
    set: function(val) {
      if (typeof val === 'string') {
        try {
          val = new URL(val, loc.href);
        } catch(e) {
          return;
        }
      }
      if (val.hostname === window.location.hostname || !val.hostname) {
        window.location.href = val.href;
      }
    },
    configurable: true
  });
  
  // Prevent frame-busting
  window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    e.stopPropagation();
    return;
  });
  
  // Kill frame-busting intervals
  const originalSetInterval = window.setInterval;
  window.setInterval = function() {
    const args = Array.from(arguments);
    const func = args[0];
    if (typeof func === 'string' && func.includes('top.location')) {
      return -1;
    }
    return originalSetInterval.apply(this, arguments);
  };
  
  // Prevent navigation attempts
  try {
    if (window !== window.top) {
      delete window.top;
    }
  } catch(e) {}
  
  console.log('[Proxy] Frame-busting protection active');
})();

// URL rewriting utilities
(function() {
  const baseUrl = window.location.origin;
  const proxyPrefix = '${req.headers.origin || ''}/api/proxy?url=';
  
  window.__proxyConfig__ = {
    baseUrl: baseUrl,
    prefix: proxyPrefix,
    rewrite: function(url) {
      if (!url) return url;
      try {
        const u = new URL(url, window.location.href);
        if (u.hostname !== window.location.hostname) {
          return proxyPrefix + encodeURIComponent(u.href);
        }
        return url;
      } catch(e) {
        return url;
      }
    }
  };
  
  // Intercept fetch
  const _fetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string') {
      const rewritten = window.__proxyConfig__.rewrite(url);
      if (rewritten !== url) {
        return _fetch.call(this, rewritten, options);
      }
    }
    return _fetch.apply(this, arguments);
  };
  
  console.log('[Proxy] URL rewriting active');
})();
</script>`;

    // Inject cookie proxy
    const cookieProxy = `
<script>
(function() {
  const _cookies = {};
  const _cookieString = document.cookie;
  
  // Parse existing cookies
  _cookieString.split(';').forEach(function(c) {
    const parts = c.split('=');
    if (parts.length >= 2) {
      _cookies[parts.shift().trim()] = parts.join('=');
    }
  });
  
  // Override document.cookie getter
  Object.defineProperty(document, 'cookie', {
    get: function() {
      return Object.keys(_cookies).map(function(k) {
        return k + '=' + _cookies[k];
      }).join('; ');
    },
    set: function(val) {
      const parts = val.split('=');
      if (parts.length >= 2) {
        _cookies[parts[0].trim()] = parts.slice(1).join('=');
      }
      return true;
    },
    configurable: true
  });
  
  window.__setCookie = function(name, value, days) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
  };
  
  window.__getCookie = function(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };
  
  console.log('[Proxy] Cookie proxy active');
})();
</script>`;

    // Remove meta tags with X-Frame-Options or CSP
    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    // Insert scripts after head
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, '$1' + proxyScripts + cookieProxy);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/(<html[^>]*>)/i, '$1<head>' + proxyScripts + cookieProxy + '</head>');
    } else {
      html = '<head>' + proxyScripts + cookieProxy + '</head>' + html;
    }

    // Add or update base tag
    const baseTagRegex = /<base[^>]*>/gi;
    if (baseTagRegex.test(html)) {
      html = html.replace(baseTagRegex, `<base href="${targetUrl.origin}">`);
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, '$1<base href="' + targetUrl.origin + '">');
    }

    // Rewrite all relative URLs
    const rewriteUrl = (url) => {
      try {
        if (!url || url.startsWith('data:') || url.startsWith('blob:') || 
            url.startsWith('javascript:') || url.startsWith('mailto:') ||
            url.startsWith('#') || url.startsWith('//')) {
          return url;
        }
        return new URL(url, targetUrl).href;
      } catch {
        return url;
      }
    };

    // Rewrite src and href attributes
    html = html.replace(/(src|href)=["']((?![a-z]+:|\/|https?:\/\/|data:|blob:|#)([^"']*))["']/gi, 
      (match, attr, path) => `${attr}="${rewriteUrl(path)}"`);
    
    // Rewrite action attributes
    html = html.replace(/action=["']((?![a-z]+:|\/|https?:\/\/)([^"']*))["']/gi, 
      (match, path) => `action="${rewriteUrl(path)}"`);
    
    // Rewrite data-src (lazy loading)
    html = html.replace(/data-src=["']((?![a-z]+:|\/|https?:\/\/)([^"']*))["']/gi,
      (match, path) => `data-src="${rewriteUrl(path)}"`);
    
    // Rewrite srcset
    html = html.replace(/srcset=["']([^"']*)[ "']/gi, (match, srcset) => {
      const rewritten = srcset.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        if (parts.length >= 1) {
          parts[0] = rewriteUrl(parts[0]);
        }
        return parts.join(' ');
      }).join(', ');
      return `srcset="${rewritten}"`;
    });

    // Rewrite CSS url()
    html = html.replace(/url\(["']?((?![a-z]+:|\/)([^"')]+))["']?\)/gi, 
      (match, path) => `url("${rewriteUrl(path)}")`);

    // Rewrite meta viewport (fix zoom issues)
    html = html.replace(/<meta[^>]*name=["']viewport["'][^>]*>/gi, 
      '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=10, user-scalable=yes">');

    // Set headers to allow framing
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).send(html);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch URL', 
      details: error.message,
      stack: error.stack 
    });
  }
}
