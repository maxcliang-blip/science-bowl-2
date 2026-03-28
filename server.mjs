import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

async function proxyHandler(req, res) {
  const url = req.query.url || req.body?.url;

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
    console.log('[Proxy] Fetching:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    console.log('[Proxy] Fetch success:', response.status);

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return res.status(200).json({ redirect: url });
    }

    let html = await response.text();

    const proxyScripts = `
<script>
(function() {
  'use strict';
  Object.defineProperty(window, 'top', { get: function() { return window; }, set: function() {} });
  Object.defineProperty(window, 'parent', { get: function() { return window; }, set: function() {} });
  Object.defineProperty(window, 'frameElement', { get: function() { return null; } });
  window.addEventListener('beforeunload', function(e) { e.preventDefault(); });
  window.setInterval = (function(orig) {
    return function() {
      const args = Array.from(arguments);
      if (typeof args[0] === 'string' && args[0].includes('top.location')) return -1;
      return orig.apply(this, arguments);
    };
  })(window.setInterval);
})();
</script>`;

    const cookieProxy = `
<script>
(function() {
  const _cookies = {};
  document.cookie.split(';').forEach(function(c) {
    const parts = c.split('=');
    if (parts.length >= 2) _cookies[parts.shift().trim()] = parts.join('=');
  });
  Object.defineProperty(document, 'cookie', {
    get: function() { return Object.keys(_cookies).map(function(k) { return k + '=' + _cookies[k]; }).join('; '); },
    set: function(val) { const parts = val.split('='); if (parts.length >= 2) _cookies[parts[0].trim()] = parts.slice(1).join('='); return true; }
  });
})();
</script>`;

    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, '$1' + proxyScripts + cookieProxy);
    }

    const baseTagRegex = /<base[^>]*>/gi;
    if (baseTagRegex.test(html)) {
      html = html.replace(baseTagRegex, `<base href="${targetUrl.origin}">`);
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, '$1<base href="' + targetUrl.origin + '">');
    }

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

    html = html.replace(/(src|href)=["']((?![a-z]+:|\/|https?:\/\/|data:|blob:|#)([^"']*))["']/gi, 
      (match, attr, path) => `${attr}="${rewriteUrl(path)}"`);
    html = html.replace(/action=["']((?![a-z]+:|\/|https?:\/\/)([^"']*))["']/gi, 
      (match, path) => `action="${rewriteUrl(path)}"`);
    html = html.replace(/data-src=["']((?![a-z]+:|\/|https?:\/\/)([^"']*))["']/gi,
      (match, path) => `data-src="${rewriteUrl(path)}"`);
    html = html.replace(/srcset=["']([^"']*)[ "']/gi, (match, srcset) => {
      const rewritten = srcset.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        if (parts.length >= 1) parts[0] = rewriteUrl(parts[0]);
        return parts.join(' ');
      }).join(', ');
      return `srcset="${rewritten}"`;
    });
    html = html.replace(/url\(["']?((?![a-z]+:|\/)([^"')]+))["']?\)/gi, 
      (match, path) => `url("${rewriteUrl(path)}")`);

    html = html.replace(/<meta[^>]*name=["']viewport["'][^>]*>/gi, 
      '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=10, user-scalable=yes">');

    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).send(html);

  } catch (error) {
    console.error('Proxy error:', error);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    return res.status(500).json({ error: 'Failed to fetch URL', details: error.message, code: error.code });
  }
}

app.get('/api/proxy', proxyHandler);
app.post('/api/proxy', proxyHandler);

app.get('/api/test', async (req, res) => {
  try {
    console.log('[Test] Attempting fetch...');
    const response = await fetch('https://example.com');
    console.log('[Test] Success');
    res.json({ success: true, status: response.status });
  } catch (error) {
    console.log('[Test] Error:', error);
    res.status(500).json({ error: error.message, code: error.code });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
