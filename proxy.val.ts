const DOH_PROVIDERS = {
  cloudflare: "https://cloudflare-dns.com/dns-query",
  google: "https://dns.google/resolve",
  quad9: "https://dns.quad9.net:5053/dns-query",
};

async function resolveDoH(hostname: string, provider: string = "cloudflare"): Promise<string | null> {
  const endpoint = DOH_PROVIDERS[provider as keyof typeof DOH_PROVIDERS] || DOH_PROVIDERS.cloudflare;
  
  try {
    const params = new URLSearchParams({
      name: hostname,
      type: "A",
      cd: "false",
    });

    const response = await fetch(`${endpoint}?${params}`, {
      headers: {
        Accept: "application/dns-json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      for (const answer of data.Answer) {
        if (answer.type === 1) {
          return answer.data;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/dns") {
    const hostname = url.searchParams.get("name");
    const provider = url.searchParams.get("provider") || "cloudflare";

    if (!hostname) {
      return new Response(JSON.stringify({ error: "Missing hostname parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ip = await resolveDoH(hostname, provider);
    return new Response(JSON.stringify({ hostname, ip, provider, resolved: !!ip }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (path === "/providers") {
    return new Response(JSON.stringify(Object.keys(DOH_PROVIDERS)), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const targetUrl = url.searchParams.get("url");
  const dohEnabled = url.searchParams.get("doh") === "true";
  const dohProvider = url.searchParams.get("dohProvider") || "cloudflare";

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const target = new URL(targetUrl);
    if (!["http:", "https:"].includes(target.protocol)) {
      return new Response(JSON.stringify({ error: "Invalid protocol" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: 'manual',
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (location) {
        let redirectUrl = location;
        try {
          redirectUrl = new URL(location, targetUrl).href;
        } catch {}
        const isAbsoluteRedirect = location.startsWith('http://') || location.startsWith('https://');
        return new Response(JSON.stringify({ 
          redirect: isAbsoluteRedirect ? redirectUrl : null,
          proxiedUrl: redirectUrl,
          type: 'redirect'
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

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
  
  const originalLocation = window.location.href;
  let redirectTimeout = null;
  
  function sendNavigate(url) {
    if (window.parent !== window && url && url.startsWith('http')) {
      window.parent.postMessage({ type: 'navigate', url: url }, '*');
      return true;
    }
    return false;
  }
  
  function handleRedirect(url) {
    if (sendNavigate(url)) {
      if (redirectTimeout) clearTimeout(redirectTimeout);
      redirectTimeout = setTimeout(function() {
        window.stop && window.stop();
        document.write && document.write('<html><body><script>if(parent){parent.postMessage({type:"stopped"}, "*");}<\/script>Redirecting...</body></html>');
        document.close && document.close();
      }, 100);
    }
  }
  
  Object.defineProperty(window, 'location', {
    get: function() {
      return new Proxy(window._location, {
        get: function(target, prop) {
          if (prop === 'href') {
            const newHref = window._location.href;
            return newHref;
          }
          if (prop === 'replace' || prop === 'assign') {
            return function(url) { handleRedirect(url); };
          }
          if (prop === 'reload') {
            return function() { sendNavigate(originalLocation); };
          }
          return target[prop];
        },
        set: function(target, prop, value) {
          if (prop === 'href') {
            handleRedirect(value);
          } else {
            target[prop] = value;
          }
          return true;
        }
      });
    },
    set: function(val) { window._location = val; }
  });
  
  window._location = { ...window.location };
  
  window.location.replace = function(url) { handleRedirect(url); };
  window.location.assign = function(url) { handleRedirect(url); };
  
  window.open = function(url, name, features) {
    if (url && url.startsWith('http')) {
      handleRedirect(url);
      return null;
    }
    return window._origOpen.call(window, url, name, features);
  };
  window._origOpen = window.open;
  
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.method && form.method.toLowerCase() === 'get') {
      e.preventDefault();
      const action = form.action || window.location.href;
      const formData = new FormData(form);
      const params = new URLSearchParams(formData).toString();
      const navUrl = action.includes('?') ? action + '&' + params : action + '?' + params;
      handleRedirect(navUrl);
    }
  });
  
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('data:')) {
      if (window.parent !== window) {
        e.preventDefault();
        handleRedirect(link.href);
      }
    }
  });
  
  function checkMetaRefresh() {
    const metas = document.querySelectorAll('meta[http-equiv="refresh"]');
    metas.forEach(function(meta) {
      const content = meta.getAttribute('content');
      if (content) {
        const match = content.match(/url=([^;]+)/i);
        if (match && match[1]) {
          let url = match[1].trim();
          try { url = new URL(url, window.location.href).href; } catch {}
          handleRedirect(url);
        }
      }
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkMetaRefresh);
  } else {
    checkMetaRefresh();
  }
  
  var originalSetTimeout = window.setTimeout;
  window.setTimeout = function(func, delay) {
    var args = Array.prototype.slice.call(arguments, 2);
    return originalSetTimeout(function() {
      if (typeof func === 'string') {
        var match = func.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
        if (match) { handleRedirect(match[1]); return; }
        match = func.match(/location\.replace\s*\(\s*["']([^"']+)["']\s*\)/);
        if (match) { handleRedirect(match[1]); return; }
        match = func.match(/location\.assign\s*\(\s*["']([^"']+)["']\s*\)/);
        if (match) { handleRedirect(match[1]); return; }
      }
      if (typeof func === 'function') {
        func.apply(null, args);
      }
    }, delay);
  };
})();
</script>`;

    html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/(<head[^>]*>)/i, `$1${proxyScripts}<base href="${target.origin}">`);
    } else {
      html = `<head>${proxyScripts}<base href="${target.origin}"></head>` + html;
    }

    const rewriteUrl = (u: string) => {
      try {
        if (!u || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("javascript:") || u.startsWith("mailto:") || u.startsWith("#") || u.startsWith("//")) {
          return u;
        }
        return new URL(u, target.href).href;
      } catch {
        return u;
      }
    };

    html = html.replace(/(src|href)=["']((?![a-z]+:|\/|https?:\/\/|data:|blob:|#)([^"']*))["']/gi, (match: string, attr: string, path: string) => `${attr}="${rewriteUrl(path)}"`);
    html = html.replace(/srcset=["']([^"']*)[ "']/gi, (match: string, srcset: string) => {
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
    return new Response(JSON.stringify({ error: "Failed to fetch URL", details: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
