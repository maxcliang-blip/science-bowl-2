import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/proxy', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

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
})();
</script>`;

    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, '$1' + proxyScripts);
    }

    const baseTagRegex = /<base[^>]*>/gi;
    if (baseTagRegex.test(html)) {
      html = html.replace(baseTagRegex, `<base href="${targetUrl.origin}">`);
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, '$1<base href="' + targetUrl.origin + '">');
    }

    const rewriteUrl = (u) => {
      try {
        if (!u || u.startsWith('data:') || u.startsWith('blob:') || 
            u.startsWith('javascript:') || u.startsWith('mailto:') ||
            u.startsWith('#') || u.startsWith('//')) {
          return u;
        }
        return new URL(u, targetUrl).href;
      } catch {
        return u;
      }
    };

    html = html.replace(/(src|href)=["']((?![a-z]+:|\/|https?:\/\/|data:|blob:|#)([^"']*))["']/gi, 
      (match, attr, path) => `${attr}="${rewriteUrl(path)}"`);
    html = html.replace(/srcset=["']([^"']*)[ "']/gi, (match, srcset) => {
      const rewritten = srcset.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        if (parts.length >= 1) parts[0] = rewriteUrl(parts[0]);
        return parts.join(' ');
      }).join(', ');
      return `srcset="${rewritten}"`;
    });

    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    return res.status(200).send(html);

  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch URL', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
