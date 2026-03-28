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
      },
    });

    const contentType = response.headers.get('content-type') || '';

    // Only proxy HTML content
    if (!contentType.includes('text/html')) {
      // For non-HTML content, redirect to original URL
      return res.status(200).json({ 
        redirect: url,
        message: 'Non-HTML content, use direct URL'
      });
    }

    let html = await response.text();

    // Remove X-Frame-Options header
    // Remove Content-Security-Policy that blocks framing
    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
    html = html.replace(/<meta[^>]*http-equiv=["']content-security-policy["'][^>]*>/gi, '');

    // Update base tag if present, or add one
    const baseTagRegex = /<base[^>]*>/gi;
    if (baseTagRegex.test(html)) {
      html = html.replace(baseTagRegex, `<base href="${targetUrl.origin}">`);
    } else {
      // Add base tag after <head>
      html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${targetUrl.origin}">`);
    }

    // Rewrite relative URLs for resources (src, href)
    const baseOrigin = targetUrl.origin;
    const basePath = targetUrl.pathname.replace(/\/[^/]*$/, '/');

    // Handle src and href attributes
    html = html.replace(/(src|href)=["']((?![a-z]+:|\/)([^"']*))["']/gi, (match, attr, path) => {
      try {
        const absoluteUrl = new URL(path, targetUrl);
        return `${attr}="${absoluteUrl.href}"`;
      } catch {
        return match;
      }
    });

    // Handle action attributes in forms
    html = html.replace(/action=["']((?![a-z]+:|\/)([^"']*))["']/gi, (match, path) => {
      try {
        const absoluteUrl = new URL(path, targetUrl);
        return `action="${absoluteUrl.href}"`;
      } catch {
        return match;
      }
    });

    // Handle inline styles with url()
    html = html.replace(/url\(["']?((?![a-z]+:|\/)[^"')]+)["']?\)/gi, (match, path) => {
      try {
        const absoluteUrl = new URL(path, targetUrl);
        return `url("${absoluteUrl.href}")`;
      } catch {
        return match;
      }
    });

    // Set headers to allow framing
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).send(html);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch URL',
      details: error.message 
    });
  }
}
