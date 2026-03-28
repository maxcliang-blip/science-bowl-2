export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Validate URL
  let targetUrl;
  try {
    targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol. Only http and https are allowed.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const originalCSP = response.headers.get('content-security-policy') || '';

    // Only proxy HTML content
    if (!contentType.includes('text/html')) {
      return res.status(200).json({ 
        redirect: url,
        message: 'Non-HTML content'
      });
    }

    let html = await response.text();

    // Remove meta tags that set X-Frame-Options or CSP
    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    // Inject anti-frame-busting script at the start of head
    const antiFrameScript = `
<script>
(function() {
  // Remove frame-busting scripts
  Object.defineProperty(window, 'top', {
    get: function() { return window; },
    configurable: true
  });
  
  Object.defineProperty(window, 'parent', {
    get: function() { return window; },
    configurable: true
  });
  
  Object.defineProperty(window, 'frameElement', {
    get: function() { return null; },
    configurable: true
  });
  
  // Remove common frame-busting patterns
  if (window !== window.top) {
    try {
      window.top.location = window.location;
    } catch(e) {}
  }
  
  // Override location for iframe
  const origLocation = Object.getOwnPropertyDescriptor(window, 'location');
  Object.defineProperty(window, 'location', {
    get: function() { return origLocation.get.call(window); },
    set: function(val) {
      if (typeof val === 'string') val = new URL(val, window.location.href);
      if (val.hostname === window.location.hostname || val.hostname === '') {
        origLocation.set.call(window, val);
      }
    },
    configurable: true
  });
})();
</script>
`;

    // Insert anti-frame-busting script after <head> opening tag
    if (html.includes('<head')) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${antiFrameScript}`);
    } else if (html.includes('<html')) {
      html = html.replace(/(<html[^>]*>)/i, `$1<head>${antiFrameScript}</head>`);
    } else {
      html = `<head>${antiFrameScript}</head>` + html;
    }

    // Update or add base tag
    const baseTagRegex = /<base[^>]*>/gi;
    if (baseTagRegex.test(html)) {
      html = html.replace(baseTagRegex, `<base href="${targetUrl.origin}">`);
    } else {
      html = html.replace(/(<head[^>]*>)/i, `$1<base href="${targetUrl.origin}">`);
    }

    // Rewrite relative URLs for resources
    html = html.replace(/(src|href)=["']((?![a-z]+:|\/|#)([^"']*))["']/gi, (match, attr, path) => {
      try {
        const absoluteUrl = new URL(path, targetUrl);
        return `${attr}="${absoluteUrl.href}"`;
      } catch {
        return match;
      }
    });

    // Rewrite data-src (common for lazy loading)
    html = html.replace(/data-src=["']((?![a-z]+:|\/)([^"']*))["']/gi, (match, path) => {
      try {
        const absoluteUrl = new URL(path, targetUrl);
        return `data-src="${absoluteUrl.href}"`;
      } catch {
        return match;
      }
    });

    // Handle action attributes
    html = html.replace(/action=["']((?![a-z]+:|\/)([^"']*))["']/gi, (match, path) => {
      try {
        const absoluteUrl = new URL(path, targetUrl);
        return `action="${absoluteUrl.href}"`;
      } catch {
        return match;
      }
    });

    // Handle inline styles with url()
    html = html.replace(/url\(["']?((?![a-z]+:|\/)[^"')\s]+)["']?\)/gi, (match, path) => {
      try {
        const absoluteUrl = new URL(path, targetUrl);
        return `url("${absoluteUrl.href}")`;
      } catch {
        return match;
      }
    });

    // Modify existing CSP meta tag if present
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=["']([^"']*)["'][^>]*>/gi, 
      (match, csp) => {
        const modifiedCSP = csp
          .replace(/frame-ancestors\s+[^;]+;?/gi, '')
          .replace(/child-src\s+[^;]+;?/gi, '')
          .replace(/default-src\s+[^;]+;?/gi, "default-src 'self' 'unsafe-inline' 'unsafe-eval' *; ");
        return `<meta http-equiv="Content-Security-Policy" content="${modifiedCSP} frame-ancestors *;">`;
      });

    // Set permissive headers
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Remove original CSP header if possible
    res.removeHeader('Content-Security-Policy');
    
    return res.status(200).send(html);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch URL',
      details: error.message 
    });
  }
}
