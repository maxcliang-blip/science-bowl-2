const PROXY_BASE = "https://laxmiang--c1a496be2bd511f19a8942dde27851f2.web.val.run";

const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const CACHE_TTL = 300000;
const CACHE_MAX_SIZE = 100;
const PROGRESS_THRESHOLD = 2000;
const VERSION = "2.4";

const WEBSOCKET_TIMEOUT = 60000;
const COMPRESSION_THRESHOLD = 1024;

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_COOLDOWN = 30000;
const circuitBreaker = new Map<string, { failures: number; lastFailure: number }>();

const REQUEST_LOG_MAX = 1000;
const stats = {
  totalRequests: 0,
  totalBytes: 0,
  cacheHits: 0,
  cacheMisses: 0,
  wsConnections: 0,
  wsMessages: 0,
  compressedResponses: 0,
  compressionSaved: 0,
  startTime: Date.now(),
  recentRequests: [] as { url: string; domain: string; bytes: number; status: number; timestamp: number }[],
  topDomains: new Map<string, number>(),
  dedupCache: new Map<string, { count: number; firstSeen: number }>(),
};

const DOH_PROVIDERS = {
  cloudflare: "https://cloudflare-dns.com/dns-query",
  google: "https://dns.google/resolve",
  quad9: "https://dns.quad9.net:5053/dns-query",
};

const USER_AGENTS: Record<string, string> = {
  "chrome-win": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "chrome-mac": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "chrome-linux": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "firefox-win": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "firefox-mac": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0",
  "safari": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
  "edge": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
  "mobile-chrome": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  "mobile-safari": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
};

function getUserAgentFromId(id: string): string {
  return USER_AGENTS[id] || USER_AGENTS["chrome-win"];
}

function shouldCircuitBreak(domain: string): boolean {
  const state = circuitBreaker.get(domain);
  if (!state) return false;
  
  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    const timeSinceLastFailure = Date.now() - state.lastFailure;
    if (timeSinceLastFailure < CIRCUIT_BREAKER_COOLDOWN) {
      return true;
    }
    circuitBreaker.delete(domain);
  }
  return false;
}

function recordFailure(domain: string): void {
  const state = circuitBreaker.get(domain);
  if (state) {
    state.failures++;
    state.lastFailure = Date.now();
  } else {
    circuitBreaker.set(domain, { failures: 1, lastFailure: Date.now() });
  }
}

function recordSuccess(domain: string): void {
  circuitBreaker.delete(domain);
}

function getCircuitBreakerStats(): { domain: string; failures: number; cooldownRemaining: number }[] {
  const statsArr: { domain: string; failures: number; cooldownRemaining: number }[] = [];
  const now = Date.now();
  
  circuitBreaker.forEach((state, domain) => {
    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      const remaining = Math.max(0, CIRCUIT_BREAKER_COOLDOWN - (now - state.lastFailure));
      statsArr.push({ domain, failures: state.failures, cooldownRemaining: remaining });
    }
  });
  
  return statsArr;
}

function recordRequest(url: string, bytes: number, status: number): void {
  stats.totalRequests++;
  stats.totalBytes += bytes;
  
  try {
    const domain = new URL(url).hostname;
    
    const entry = {
      url: url.substring(0, 100),
      domain,
      bytes,
      status,
      timestamp: Date.now(),
    };
    
    stats.recentRequests.push(entry);
    if (stats.recentRequests.length > REQUEST_LOG_MAX) {
      stats.recentRequests.shift();
    }
    
    const count = stats.topDomains.get(domain) || 0;
    stats.topDomains.set(domain, count + 1);
    
    const dedupKey = url.split('?')[0];
    const dedupEntry = stats.dedupCache.get(dedupKey);
    if (dedupEntry) {
      dedupEntry.count++;
    } else {
      stats.dedupCache.set(dedupKey, { count: 1, firstSeen: Date.now() });
    }
    
    if (stats.dedupCache.size > 500) {
      const oldestKey = stats.dedupCache.keys().next().value;
      if (oldestKey) stats.dedupCache.delete(oldestKey);
    }
  } catch {}
}

function recordCacheHit(): void {
  stats.cacheHits++;
}

function recordCacheMiss(): void {
  stats.cacheMisses++;
}

function getProxyStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const topDomainsArr = Array.from(stats.topDomains.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([domain, count]) => ({ domain, requests: count }));
  
  const dedupArr = Array.from(stats.dedupCache.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([url, data]) => ({ url: url.substring(0, 80), requests: data.count, firstSeen: data.firstSeen }));
  
  return {
    version: VERSION,
    uptime,
    totalRequests: stats.totalRequests,
    totalBytes: stats.totalBytes,
    totalBytesFormatted: formatBytes(stats.totalBytes),
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheHitRate: stats.cacheHits + stats.cacheMisses > 0 
      ? Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100) 
      : 0,
    wsConnections: stats.wsConnections,
    wsMessages: stats.wsMessages,
    compressedResponses: stats.compressedResponses,
    compressionSaved: stats.compressionSaved,
    compressionSavedFormatted: formatBytes(stats.compressionSaved),
    recentRequests: stats.recentRequests.slice(-50).reverse(),
    topDomains: topDomainsArr,
    duplicatedUrls: dedupArr,
    deduplicationSaved: stats.dedupCache.size > 0 
      ? Array.from(stats.dedupCache.values()).reduce((acc, v) => acc + v.count - 1, 0)
      : 0,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "en;q=0.9,de;q=0.8",
  "en;q=0.9,fr;q=0.8",
  "en;q=0.9,es;q=0.8",
  "de,en;q=0.9",
  "fr,en;q=0.9",
  "en-US,en;q=0.9,de;q=0.7",
  "en;q=0.9,ja;q=0.8",
  "en;q=0.9,zh-CN;q=0.8",
];

function randomizeAcceptLanguage(): string {
  return LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
}

function generateRequestHeaders(targetUrl: string, userAgent: string): Record<string, string> {
  const url = new URL(targetUrl);
  
  return {
    "User-Agent": userAgent,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": randomizeAcceptLanguage(),
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": `https://www.google.com/search?q=${encodeURIComponent(url.hostname)}`,
    "sec-ch-ua": "\"Chromium\";v=\"122\", \"Not(A:Brand\";v=\"24\", \"Google Chrome\";v=\"122\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "cross-site",
    "sec-fetch-user": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
}

async function compressGzip(data: string | ArrayBuffer): Promise<ArrayBuffer> {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(input);
  writer.close();
  const output = await new Response(cs.readable).arrayBuffer();
  return output;
}

function acceptsCompression(acceptEncoding: string | null): { gzip: boolean; deflate: boolean } {
  if (!acceptEncoding) return { gzip: false, deflate: false };
  const lower = acceptEncoding.toLowerCase();
  return {
    gzip: lower.includes('gzip'),
    deflate: lower.includes('deflate'),
  };
}

async function handleWebSocket(targetUrl: string, req: Request): Promise<Response> {
  const url = new URL(targetUrl);
  const protocol = req.headers.get('sec-websocket-protocol') || '';
  const key = req.headers.get('sec-websocket-key') || '';
  const extensions = req.headers.get('sec-websocket-extensions') || '';
  const origin = req.headers.get('origin') || '';
  
  stats.wsConnections++;
  
  try {
    const headers: Record<string, string> = {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Key': key,
    };
    
    if (protocol) headers['Sec-WebSocket-Protocol'] = protocol;
    if (origin) headers['Origin'] = origin;
    
    const response = await fetch(`wss://${url.host}${url.pathname}${url.search}`, {
      headers,
      signal: AbortSignal.timeout(WEBSOCKET_TIMEOUT),
    });
    
    const wsProtocol = response.headers.get('sec-websocket-protocol') || protocol;
    
    return new Response(null, {
      status: 101,
      statusText: 'Switching Protocols',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Accept': response.headers.get('sec-websocket-accept') || '',
        ...(wsProtocol ? { 'Sec-WebSocket-Protocol': wsProtocol } : {}),
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'WebSocket connection failed', details: (error as Error).message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

const startTime = Date.now();

const cache = new Map<string, { response: string; timestamp: number; contentType: string }>();

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
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

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok || [301, 302, 303, 307, 308].includes(response.status)) {
        return response;
      }
      if (i < retries && response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError || new Error("All retries failed");
}

function getCacheKey(url: string): string {
  return url;
}

function getCached(url: string): { response: string; contentType: string } | null {
  const cached = cache.get(getCacheKey(url));
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { response: cached.response, contentType: cached.contentType };
  }
  if (cached) {
    cache.delete(getCacheKey(url));
  }
  return null;
}

function setCache(url: string, response: string, contentType: string): void {
  if (!contentType.includes('text/html')) return;
  
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(getCacheKey(url), {
    response,
    timestamp: Date.now(),
    contentType,
  });
}

function generateErrorPage(message: string, url?: string): string {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const suggestions = getErrorSuggestions(message);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unable to Load Page - Lax Browser</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 48px;
      max-width: 600px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 24px; margin-bottom: 16px; color: #ff6b6b; }
    .message { color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 16px; }
    .url { 
      background: rgba(0,0,0,0.3); 
      padding: 12px 16px; 
      border-radius: 8px; 
      font-family: monospace;
      font-size: 14px;
      word-break: break-all;
      margin-bottom: 24px;
    }
    .suggestions {
      background: rgba(78,205,196,0.1);
      border: 1px solid rgba(78,205,196,0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      text-align: left;
    }
    .suggestions h3 {
      color: #4ecdc4;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .suggestions ul {
      list-style: none;
      padding: 0;
    }
    .suggestions li {
      color: rgba(255,255,255,0.8);
      font-size: 13px;
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
    }
    .suggestions li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: #4ecdc4;
    }
    .buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .retry {
      background: #4ecdc4;
      color: #1a1a2e;
      border: none;
      padding: 14px 32px;
      border-radius: 30px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .retry:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(78,205,196,0.4);
    }
    .try-direct {
      background: transparent;
      color: #4ecdc4;
      border: 2px solid #4ecdc4;
      padding: 12px 28px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .try-direct:hover {
      background: rgba(78,205,196,0.1);
    }
    .info {
      margin-top: 32px;
      font-size: 12px;
      color: rgba(255,255,255,0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#9888;</div>
    <h1>Unable to Load Page</h1>
    <p class="message">${escapeHtml(message)}</p>
    ${url ? `<div class="url">${escapeHtml(url)}</div>` : ''}
    ${suggestions ? `<div class="suggestions"><h3>Try these solutions:</h3>${suggestions}</div>` : ''}
    <div class="buttons">
      <button class="retry" onclick="history.back()">Go Back</button>
      ${url ? `<button class="try-direct" onclick="window.open('${escapeHtml(url)}', '_blank')">Open Directly</button>` : ''}
    </div>
    <div class="info">Lax Browser Proxy v${VERSION} &bull; Uptime: ${uptime}s</div>
  </div>
</body>
</html>`;
}

function getCircuitBreakerErrorPage(domain: string, cooldownRemaining: number): string {
  const seconds = Math.ceil(cooldownRemaining / 1000);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site Temporarily Unavailable - Lax Browser</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 48px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 24px; margin-bottom: 16px; color: #ffa500; }
    .message { color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 16px; }
    .domain { 
      background: rgba(0,0,0,0.3); 
      padding: 12px 16px; 
      border-radius: 8px; 
      font-family: monospace;
      font-size: 14px;
      word-break: break-all;
      margin-bottom: 24px;
    }
    .timer {
      background: rgba(255,165,0,0.2);
      border: 1px solid rgba(255,165,0,0.5);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .timer-value { font-size: 48px; font-weight: bold; color: #ffa500; }
    .timer-label { font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 8px; }
    .info {
      margin-top: 32px;
      font-size: 12px;
      color: rgba(255,255,255,0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#9888;</div>
    <h1>Site Temporarily Unavailable</h1>
    <p class="message">This site has been temporarily blocked due to too many failed requests. This is to protect the proxy from being overloaded.</p>
    <div class="domain">${escapeHtml(domain)}</div>
    <div class="timer">
      <div class="timer-value" id="countdown">${seconds}</div>
      <div class="timer-label">seconds until retry</div>
    </div>
    <p class="message" style="font-size: 13px;">The site will automatically become available again when the cooldown period ends.</p>
    <div class="info">Lax Browser Proxy v${VERSION} &bull; Circuit Breaker Protection</div>
  </div>
  <script>
    (function() {
      var seconds = ${seconds};
      var countdown = document.getElementById('countdown');
      var timer = setInterval(function() {
        seconds--;
        countdown.textContent = seconds;
        if (seconds <= 0) {
          clearInterval(timer);
          location.reload();
        }
      }, 1000);
    })();
  </script>
</body>
</html>`;
}

function getErrorSuggestions(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
    return `<ul>
      <li>The server took too long to respond</li>
      <li>Try again in a few moments</li>
      <li>Check your internet connection</li>
      <li>The site may be experiencing high traffic</li>
    </ul>`;
  }
  
  if (lowerMsg.includes('blocked') || lowerMsg.includes('forbidden') || lowerMsg.includes('denied')) {
    return `<ul>
      <li>This site blocks embedded content</li>
      <li>Click "Open Directly" to visit the site directly</li>
      <li>Some banking and social sites have this restriction</li>
    </ul>`;
  }
  
  if (lowerMsg.includes('fetch') || lowerMsg.includes('network') || lowerMsg.includes('connection')) {
    return `<ul>
      <li>Check your internet connection</li>
      <li>The site may be temporarily unavailable</li>
      <li>Try using "Open Directly" option</li>
      <li>Wait a few minutes and try again</li>
    </ul>`;
  }
  
  if (lowerMsg.includes('ssl') || lowerMsg.includes('certificate') || lowerMsg.includes('secure')) {
    return `<ul>
      <li>The site's security certificate is invalid</li>
      <li>Avoid entering sensitive information</li>
      <li>Try "Open Directly" at your own risk</li>
    </ul>`;
  }
  
  if (lowerMsg.includes('404') || lowerMsg.includes('not found')) {
    return `<ul>
      <li>This page no longer exists</li>
      <li>The URL may have changed</li>
      <li>Try searching for the content</li>
    </ul>`;
  }
  
  return `<ul>
    <li>Try refreshing the page</li>
    <li>Check if the URL is correct</li>
    <li>Use "Open Directly" to bypass the proxy</li>
  </ul>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateProgressBarCSS(): string {
  return `<style>
    .proxy-progress {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: rgba(78,205,196,0.2);
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .proxy-progress.active { opacity: 1; }
    .proxy-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #4ecdc4, #44a08d);
      width: 0%;
      transition: width 0.3s ease-out;
      animation: proxy-progress-indeterminate 1.5s infinite ease-in-out;
    }
    @keyframes proxy-progress-indeterminate {
      0% { width: 0%; margin-left: 0; }
      50% { width: 70%; margin-left: 15%; }
      100% { width: 0%; margin-left: 100%; }
    }
  </style>
  <div class="proxy-progress" id="proxyProgress">
    <div class="proxy-progress-bar"></div>
  </div>
  <script>
    (function() {
      var progress = document.getElementById('proxyProgress');
      if (!progress) return;
      var timeout = setTimeout(function() {
        progress.classList.add('active');
      }, ${PROGRESS_THRESHOLD});
      window.addEventListener('load', function() {
        clearTimeout(timeout);
        progress.classList.remove('active');
      });
    })();
  </script>`;
}

function stripCSP(html: string): string {
  html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
  html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");
  html = html.replace(/<meta[^>]*http-equiv=["']X-Content-Type-Options["'][^>]*>/gi, "");
  html = html.replace(/<meta[^>]*http-equiv=["']Referrer-Policy["'][^>]*>/gi, "");
  return html;
}

const TRACKING_PATTERNS = [
  /<img[^>]+src=["'][^"']*(pixel|beacon|tracking|t\.analytics|nanalytics|analytics)[^"']*["'][^>]*>/gi,
  /<script[^>]+src=["'][^"']*(tracking|analytics|pixel|beacon)[^"']*["'][^>]*><\/script>/gi,
  /<iframe[^>]+src=["'][^"']*(doubleclick|adsense|analytics)[^"']*["'][^>]*><\/iframe>/gi,
  /<noscript>[\s\S]*?(pixel|beacon|tracking)[\s\S]*?<\/noscript>/gi,
  /<link[^>]+href=["'][^"']*(tracking|analytics|favicon\.ico)[^"']*["'][^>]*(?:\/>|>[\s\S]*?<\/link>)/gi,
];

const TRACKING_PIXEL_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'facebook.com/tr',
  'connect.facebook.net/en_US/fbevents',
  'bat.bing.com',
  'analytics.tiktok.com',
  'hotjar.com',
  'mixpanel.com',
  'segment.io',
  'amplitude.com',
  'fullstory.com',
  'mouseflow.com',
  'crazyegg.com',
  'optimizely.com',
  'branch.io',
  'adjust.com',
  'appsflyer.com',
  'kochava.com',
  'singular.net',
];

function sanitizeHtml(html: string): string {
  for (const pattern of TRACKING_PATTERNS) {
    html = html.replace(pattern, '');
  }
  
  for (const domain of TRACKING_PIXEL_DOMAINS) {
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pixelPattern = new RegExp(`<img[^>]+src=["'][^"']*${escapedDomain}[^"']*["'][^>]*>`, 'gi');
    html = html.replace(pixelPattern, '');
    
    const scriptPattern = new RegExp(`<script[^>]+src=["'][^"']*${escapedDomain}[^"']*["'][^>]*><\\/script>`, 'gi');
    html = html.replace(scriptPattern, '');
    
    const iframePattern = new RegExp(`<iframe[^>]+src=["'][^"']*${escapedDomain}[^"']*["'][^>]*><\\/iframe>`, 'gi');
    html = html.replace(iframePattern, '');
    
    const noscriptPattern = new RegExp(`<noscript>[\\s\\S]*?${escapedDomain}[\\s\\S]*?<\\/noscript>`, 'gi');
    html = html.replace(noscriptPattern, '');
  }
  
  html = html.replace(/<script[^>]+src=["'][^"']*\.ico["'][^>]*><\/script>/gi, '');
  
  return html;
}

function generateInjectScript(targetOrigin: string, proxyBase: string): string {
  return `<script>
(function() {
  var targetOrigin = "${targetOrigin}";
  var proxyBase = "${proxyBase}";
  
  function resolveUrl(href) {
    if (!href) return null;
    if (href.startsWith("http")) return href;
    if (href.startsWith("/")) return targetOrigin + href;
    return targetOrigin + "/" + href;
  }
  
  function isSameOrigin(href) {
    try {
      var url = new URL(href, targetOrigin);
      return url.origin === targetOrigin;
    } catch(e) { return false; }
  }
  
  function sendNavigate(url) {
    var resolved = resolveUrl(url);
    if (resolved && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: "navigate", url: resolved }, "*");
      } catch(e) {}
    }
  }
  
  // Form submission - let forms submit naturally to avoid triggering bot protection
  // The click interceptor will catch link navigation instead
  
  document.addEventListener("click", function(e) {
    // Only intercept clicks on actual anchor tags, not form elements
    var link = e.target.closest ? e.target.closest("a") : null;
    if (link && link.href && !link.href.startsWith("javascript:") && !link.href.startsWith("data:")) {
      e.preventDefault();
      sendNavigate(link.href);
    }
  }, true);
  
  var _pushState = history.pushState;
  var _replaceState = history.replaceState;
  history.pushState = function() {
    _pushState.apply(history, arguments);
    var url = arguments[2];
    if (url && isSameOrigin(url)) {
      sendNavigate(url);
    }
  };
  history.replaceState = function() {
    _replaceState.apply(history, arguments);
    var url = arguments[2];
    if (url && isSameOrigin(url)) {
      sendNavigate(url);
    }
  };
  window.addEventListener("popstate", function() {
    sendNavigate(window.location.href);
  });
})();
</script>`;
}

export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/ws") {
    const targetUrl = url.searchParams.get("url");
    
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing target URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const target = new URL(targetUrl);
      if (!["ws:", "wss:"].includes(target.protocol)) {
        if (!["http:", "https:"].includes(target.protocol)) {
          return new Response(JSON.stringify({ error: "Invalid protocol" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        target.protocol = "wss:";
      }
      
      stats.wsConnections++;
      
      return new Response(JSON.stringify({
        type: "websocket_info",
        wsUrl: target.href,
        host: target.host,
        path: target.pathname + target.search,
        instructions: "Connect directly to the WebSocket URL from your browser using native WebSocket API",
        headers: {
          "Sec-WebSocket-Version": "13",
          "Origin": target.origin,
        }
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (path === "/health") {
    return new Response(JSON.stringify({
      status: "ok",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: VERSION,
      cacheSize: cache.size,
      circuitBreaker: {
        protected: getCircuitBreakerStats(),
        threshold: CIRCUIT_BREAKER_THRESHOLD,
        cooldownSeconds: CIRCUIT_BREAKER_COOLDOWN / 1000,
      },
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*",
        "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
      },
    });
  }

  if (path === "/stats") {
    return new Response(JSON.stringify(getProxyStats()), {
      status: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*",
        "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
      },
    });
  }

  if (path === "/recent") {
    return new Response(JSON.stringify(stats.recentRequests.slice(-100).reverse()), {
      status: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*",
        "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
      },
    });
  }

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

  if (path === "/cache") {
    if (url.searchParams.get("clear") === "true") {
      cache.clear();
      return new Response(JSON.stringify({ success: true, message: "Cache cleared" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      size: cache.size,
      maxSize: CACHE_MAX_SIZE,
      ttl: CACHE_TTL,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (path === "/sw.js") {
    const swCode = `const CACHE_NAME = 'proxy-v1';
const PROXY_BASE = '${PROXY_BASE}';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.origin === PROXY_BASE && url.searchParams.has('url')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          return cached;
        }
        
        try {
          const response = await fetch(event.request);
          if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          return new Response('Service Worker: Network error', { status: 503 });
        }
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;
    return new Response(swCode, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Service-Worker-Allowed": "/",
        "Cache-Control": "no-cache",
      },
    });
  }

  if (path === "/proxy") {
    try {
      const body = await req.json();
      const { url: formUrl, method, formData, headers: customHeaders } = body;

      if (!formUrl || !method) {
        return new Response(JSON.stringify({ error: "Missing url or method" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const fetchHeaders: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, br",
        ...customHeaders,
      };

      if (formData) {
        let bodyData: string;
        if (typeof formData === "string") {
          bodyData = formData;
        } else {
          bodyData = new URLSearchParams(formData).toString();
        }

        const response = await fetchWithRetry(formUrl, {
          method: method.toUpperCase(),
          headers: fetchHeaders,
          body: bodyData,
          redirect: "manual",
        });

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          let redirectUrl = location;
          if (location && !location.startsWith("http")) {
            try {
              redirectUrl = new URL(location, formUrl).href;
            } catch {
              redirectUrl = location;
            }
          }
          return new Response(
            JSON.stringify({
              type: "redirect",
              url: redirectUrl,
              status: response.status,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("text/html")) {
          return new Response(
            JSON.stringify({
              type: "data",
              url: formUrl,
              contentType: contentType,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        let html = await response.text();
        html = stripCSP(html);
        html = sanitizeHtml(html);

        const htmlBytes = new TextEncoder().encode(html).length;
        recordRequest(formUrl, htmlBytes, 200);
        recordCacheMiss();

        const acceptEncoding = req.headers.get("Accept-Encoding") || "";
        const compression = acceptsCompression(acceptEncoding);
        
        const responseHeaders: Record<string, string> = {
          "Content-Type": "text/html; charset=utf-8",
          "X-Frame-Options": "ALLOWALL",
          "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
          "X-Content-Length": String(htmlBytes),
        };

        let responseBody: BodyInit = html;
        
        if (htmlBytes > COMPRESSION_THRESHOLD && compression.gzip) {
          const compressed = await compressGzip(html);
          const compressedSize = compressed.byteLength;
          if (compressedSize < htmlBytes) {
            responseBody = compressed;
            responseHeaders["Content-Encoding"] = "gzip";
            responseHeaders["X-Content-Length"] = String(compressedSize);
            responseHeaders["Vary"] = "Accept-Encoding";
            stats.compressedResponses++;
            stats.compressionSaved += htmlBytes - compressedSize;
          }
        }

        return new Response(responseBody, {
          status: 200,
          headers: responseHeaders,
        });
      }
    } catch (error) {
      return new Response(
        generateErrorPage("Failed to process form submission. Please try again.", (error as Error).message),
        {
          status: 500,
          headers: { 
            "Content-Type": "text/html",
            "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
          },
        }
      );
    }
  }

  const targetUrl = url.searchParams.get("url");
  const dohEnabled = url.searchParams.get("doh") === "true";
  const dohProvider = url.searchParams.get("dohProvider") || "cloudflare";
  const userAgent = getUserAgentFromId(url.searchParams.get("ua") || "chrome-win");

  if (!targetUrl) {
    const path = url.pathname;
    if (path === "/" || path === "") {
      return new Response(generateErrorPage("No URL provided. Use ?url=https://example.com"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
    
    return new Response("Not Found", { status: 404 });
  }

  try {
    const target = new URL(targetUrl);
    if (!["http:", "https:"].includes(target.protocol)) {
      return new Response(generateErrorPage("Invalid protocol. Only HTTP and HTTPS are supported."), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const domain = target.hostname;

    if (shouldCircuitBreak(domain)) {
      const state = circuitBreaker.get(domain);
      const cooldownRemaining = CIRCUIT_BREAKER_COOLDOWN - (Date.now() - state!.lastFailure);
      return new Response(getCircuitBreakerErrorPage(domain, cooldownRemaining), {
        status: 503,
        headers: { "Content-Type": "text/html" },
      });
    }

    const cached = getCached(targetUrl);
    if (cached) {
      recordSuccess(domain);
      let html = cached.response;
      html = injectScripts(html, target, PROXY_BASE);
      
    const htmlBytes = new TextEncoder().encode(html).length;
    recordRequest(targetUrl, htmlBytes, 200);
    recordCacheHit();
    
    const acceptEncoding = req.headers.get("Accept-Encoding") || "";
    const compression = acceptsCompression(acceptEncoding);
    
    const responseHeaders: Record<string, string> = {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "X-Frame-Options": "ALLOWALL",
      "X-Cache": "HIT",
      "Cache-Control": "public, max-age=300",
      "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
      "X-Content-Length": String(htmlBytes),
    };

    let responseBody: BodyInit = html;
    
    if (htmlBytes > COMPRESSION_THRESHOLD && compression.gzip) {
      const compressed = await compressGzip(html);
      const compressedSize = compressed.byteLength;
      if (compressedSize < htmlBytes) {
        responseBody = compressed;
        responseHeaders["Content-Encoding"] = "gzip";
        responseHeaders["X-Content-Length"] = String(compressedSize);
        responseHeaders["Vary"] = "Accept-Encoding";
        stats.compressedResponses++;
        stats.compressionSaved += htmlBytes - compressedSize;
      }
    }

    return new Response(responseBody, {
      status: 200,
      headers: responseHeaders,
    });
  }

    const fetchStartTime = Date.now();
    
    const headers = generateRequestHeaders(targetUrl, userAgent);
    const response = await fetchWithRetry(targetUrl, {
      headers,
      redirect: 'manual',
    });

    recordSuccess(domain);
    const fetchDuration = Date.now() - fetchStartTime;

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
    const cleanContentType = contentType.split(';')[0].trim().toLowerCase();

    const videoTypes = ['video/', 'audio/', 'application/x-mpegURL', 'application/dash+xml'];
    const isMediaContent = videoTypes.some(t => cleanContentType.includes(t));

    const jsTypes = ['application/javascript', 'application/x-javascript', 'text/javascript'];
    const cssTypes = ['text/css'];
    const fontTypes = ['font/', 'application/font', 'application/vnd', 'application/x-font'];
    const isStaticAsset = jsTypes.includes(cleanContentType) || 
                          cssTypes.includes(cleanContentType) ||
                          cleanContentType.includes('image/') ||
                          cleanContentType.includes('image/svg') ||
                          fontTypes.some(t => cleanContentType.includes(t)) ||
                          cleanContentType.includes('application/json') ||
                          cleanContentType.includes('application/xml') ||
                          cleanContentType.includes('text/plain');

    const isHtmlContent = cleanContentType.includes('text/html');

    if (!isHtmlContent) {
      if (isMediaContent || isStaticAsset) {
        const body = await response.arrayBuffer();
        const bodyBytes = body.byteLength;
        recordRequest(targetUrl, bodyBytes, response.status);
        const newHeaders = new Headers();
        response.headers.forEach((value, key) => {
          if (!['content-security-policy', 'x-frame-options'].includes(key.toLowerCase())) {
            newHeaders.set(key, value);
          }
        });
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Access-Control-Allow-Headers', '*');
        newHeaders.set('Cache-Control', 'public, max-age=86400');
        newHeaders.set('Content-Type', cleanContentType || 'application/octet-stream');
        return new Response(body, {
          status: response.status,
          headers: newHeaders,
        });
      }
      return new Response(JSON.stringify({ redirect: url.href }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let html = await response.text();
    
    html = stripCSP(html);
    html = sanitizeHtml(html);
    
    if (fetchDuration > PROGRESS_THRESHOLD) {
      html = injectProgressBar(html);
    }
    
    html = injectScripts(html, target, PROXY_BASE);
    
    setCache(targetUrl, html, contentType);

    const htmlBytes = new TextEncoder().encode(html).length;
    recordRequest(targetUrl, htmlBytes, 200);
    recordCacheMiss();

    const acceptEncoding = headers["Accept-Encoding"] || headers["accept-encoding"] || "";
    const compression = acceptsCompression(acceptEncoding);
    
    const responseHeaders: Record<string, string> = {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "X-Frame-Options": "ALLOWALL",
      "Cache-Control": "no-cache",
      "X-Fetch-Duration": String(fetchDuration),
      "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
      "X-Content-Length": String(htmlBytes),
    };

    let responseBody: BodyInit = html;
    
    if (htmlBytes > COMPRESSION_THRESHOLD && compression.gzip) {
      const compressed = await compressGzip(html);
      const compressedSize = compressed.byteLength;
      if (compressedSize < htmlBytes) {
        responseBody = compressed;
        responseHeaders["Content-Encoding"] = "gzip";
        responseHeaders["X-Content-Length"] = String(compressedSize);
        responseHeaders["Vary"] = "Accept-Encoding";
        stats.compressedResponses++;
        stats.compressionSaved += htmlBytes - compressedSize;
      }
    }

    return new Response(responseBody, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    const errorMessage = (error as Error).message || "Unknown error";
    
    try {
      const target = new URL(targetUrl);
      recordFailure(target.hostname);
      recordRequest(targetUrl, 0, 500);
    } catch {}

    if (errorMessage.includes("aborted")) {
      return new Response(generateErrorPage("Request timed out. The server took too long to respond.", targetUrl), {
        status: 504,
        headers: { 
          "Content-Type": "text/html",
          "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
        },
      });
    }
    
    return new Response(generateErrorPage(`Failed to fetch the requested page: ${errorMessage}`, targetUrl), {
      status: 500,
      headers: { 
        "Content-Type": "text/html",
        "X-Proxied-By": `Lax-Browser-Proxy/${VERSION}`,
      },
    });
  }
}

function injectProgressBar(html: string): string {
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/(<body[^>]*>)/i, `$1${generateProgressBarCSS()}`);
  } else if (/<head[^>]*>/i.test(html)) {
    return html.replace(/(<head[^>]*>)/i, `$1${generateProgressBarCSS()}`);
  } else if (/<html[^>]*>/i.test(html)) {
    return html.replace(/(<html[^>]*>)/i, `$1<head>${generateProgressBarCSS()}</head>`);
  }
  return generateProgressBarCSS() + html;
}

function injectScripts(html: string, target: URL, proxyBase: string): string {
  const targetOrigin = target.origin;
  const injectScript = generateInjectScript(targetOrigin, proxyBase);
  
  const cspOverride = `<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' blob: data:; frame-ancestors *; img-src * data:; style-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *;">`;

  html = html.replace(/<\/head>/i, cspOverride + injectScript + "</head>");

  const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|eot|otf|ico|png|jpg|jpeg|gif|webp|svg|mp4|webm|ogg|mp3|wav|flac|zip|gz|br)(\?|$)/i;
  
  const rewriteUrl = (u: string, isHtmlLink: boolean = false) => {
    try {
      if (!u || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("javascript:") || u.startsWith("mailto:") || u.startsWith("#")) {
        return u;
      }
      
      if (isHtmlLink && !STATIC_EXTENSIONS.test(u)) {
        const resolved = new URL(u, target.href).href;
        const proxyParams = new URLSearchParams({ url: resolved });
        return proxyBase + "/?" + proxyParams.toString();
      }
      
      const resolved = new URL(u, target.href).href;
      return resolved;
    } catch {
      return u;
    }
  };

  html = html.replace(/(src|href)=["']((?![a-z]+:|data:|blob:|javascript:)([^"']*))["']/gi, (match: string, attr: string, path: string) => {
    const isSrc = attr === "src";
    const isStatic = STATIC_EXTENSIONS.test(path);
    const rewritten = rewriteUrl(path, !isStatic && (attr === "href"));
    return `${attr}="${rewritten}"`;
  });
  
  html = html.replace(/srcset=["']([^"']*)[ "']/gi, (match: string, srcset: string) => {
    const rewritten = srcset.split(",").map((s) => {
      const parts = s.trim().split(/\s+/);
      if (parts.length >= 1) parts[0] = rewriteUrl(parts[0], false);
      return parts.join(" ");
    }).join(", ");
    return `srcset="${rewritten}"`;
  });

  return html;
}
