import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url).searchParams.get("url");

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const targetUrl = new URL(url);
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return new Response(JSON.stringify({ error: "Invalid protocol" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return new Response(JSON.stringify({ redirect: url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let html = await response.text();

    const proxyScripts = `<script>
(function() {
  'use strict';
  Object.defineProperty(window, 'top', { get: function() { return window; }, set: function() {} });
  Object.defineProperty(window, 'parent', { get: function() { return window; }, set: function() {} });
  Object.defineProperty(window, 'frameElement', { get: function() { return null; } });
})();
</script>`;

    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, `$1${proxyScripts}<base href="${targetUrl.origin}">`);
    } else {
      html = `<head>${proxyScripts}<base href="${targetUrl.origin}"></head>` + html;
    }

    const rewriteUrl = (u) => {
      try {
        if (!u || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("javascript:") || u.startsWith("mailto:") || u.startsWith("#") || u.startsWith("//")) {
          return u;
        }
        return new URL(u, targetUrl).href;
      } catch {
        return u;
      }
    };

    html = html.replace(/(src|href)=["']((?![a-z]+:|\/|https?:\/\/|data:|blob:|#)([^"']*))["']/gi, (match, attr, path) => `${attr}="${rewriteUrl(path)}"`);
    html = html.replace(/srcset=["']([^"']*)[ "']/gi, (match, srcset) => {
      const rewritten = srcset.split(",").map((s) => {
        const parts = s.trim().split(/\s+/);
        if (parts.length >= 1) parts[0] = rewriteUrl(parts[0]);
        return parts.join(" ");
      }).join(", ");
      return `srcset="${rewritten}"`;
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "X-Frame-Options": "ALLOWALL",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch URL", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
