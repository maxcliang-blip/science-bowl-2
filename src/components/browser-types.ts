export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  loading: boolean;
  history: string[];
  historyIndex: number;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
  folderId?: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface ClosedTab {
  url: string;
  title: string;
  favicon?: string;
  closedAt: number;
}

export interface QuickLink {
  id: string;
  url: string;
  title: string;
  favicon?: string;
}

export interface FullHistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
}

export interface SecuritySettings {
  trackerBlocking: boolean;
  adBlocking: boolean;
  httpWarning: boolean;
  clearHistoryOnClose: boolean;
  fingerprintProtection: boolean;
  loginAttemptLimit: number;
  sessionTimeout: number;
  dnsOverHttps: boolean;
  dohProvider: 'cloudflare' | 'google' | 'quad9';
  searchEngine: string;
  userAgent: string;
  restoreTabsOnStartup: boolean;
  vpnEnabled: boolean;
  vpnProvider: 'custom' | 'wireguard' | 'openvpn' | 'ipsec';
  vpnConfig: VpnConfig;
}

export interface VpnConfig {
  server: string;
  port: number;
  protocol: 'udp' | 'tcp';
  authFile?: string;
  customConfig?: string;
}

export const VPN_PROVIDERS = [
  { id: 'wireguard', name: 'WireGuard', description: 'Modern, fast VPN protocol' },
  { id: 'openvpn', name: 'OpenVPN', description: 'Open source VPN solution' },
  { id: 'ipsec', name: 'IPSec/L2TP', description: 'Built-in OS VPN support' },
  { id: 'custom', name: 'Custom Config', description: 'Paste your own VPN configuration' },
] as const;

export const VPN_SERVER_PRESETS = [
  { name: ' Mullvad (WireGuard)', protocol: 'udp', port: 51820, example: 'wg.mullvad.net' },
  { name: 'NordVPN', protocol: 'udp', port: 51820, example: 'nordvpn.com' },
  { name: 'ProtonVPN', protocol: 'udp', port: 51820, example: 'vpn.proton.me' },
  { name: 'Windscribe', protocol: 'tcp', port: 443, example: 'ca.gervas.io' },
] as const;

export const DOH_PROVIDERS = [
  { id: 'cloudflare', name: 'Cloudflare (1.1.1.1)', url: 'https://cloudflare-dns.com' },
  { id: 'google', name: 'Google DNS', url: 'https://dns.google' },
  { id: 'quad9', name: 'Quad9', url: 'https://dns.quad9.net' },
] as const;

export const SEARCH_ENGINES = [
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: '🔍' },
  { id: 'google', name: 'Google', url: 'https://google.com/search?q=', icon: '🔎' },
  { id: 'bing', name: 'Bing', url: 'https://bing.com/search?q=', icon: '🌐' },
  { id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/do/search?query=', icon: '🛡️' },
  { id: 'brave', name: 'Brave Search', url: 'https://search.brave.com/search?q=', icon: '🦁' },
  { id: 'yahoo', name: 'Yahoo', url: 'https://search.yahoo.com/search?p=', icon: '📧' },
  { id: 'ecosia', name: 'Ecosia', url: 'https://www.ecosia.org/search?q=', icon: '🌳' },
  { id: 'qwant', name: 'Qwant', url: 'https://www.qwant.com/?l=en&q=', icon: '💙' },
  { id: 'searx', name: 'SearX', url: 'https://searxng.org/search?q=', icon: '🔮' },
] as const;

export const USER_AGENTS = [
  { id: 'chrome-win', name: 'Chrome (Windows)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  { id: 'chrome-mac', name: 'Chrome (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  { id: 'chrome-linux', name: 'Chrome (Linux)', value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  { id: 'firefox-win', name: 'Firefox (Windows)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0' },
  { id: 'firefox-mac', name: 'Firefox (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0' },
  { id: 'safari', name: 'Safari (Mac)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15' },
  { id: 'edge', name: 'Edge', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0' },
  { id: 'mobile-chrome', name: 'Chrome (Mobile)', value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36' },
  { id: 'mobile-safari', name: 'Safari (Mobile)', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1' },
] as const;

export interface Download {
  id: string;
  url: string;
  filename: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  size?: number;
  downloaded?: number;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface BlockedAdEntry {
  domain: string;
  timestamp: number;
  rule: string;
  type: 'ad' | 'tracker';
}

export interface ReadingSettings {
  fontSize: number;
  fontFamily: 'serif' | 'sans-serif';
  lineHeight: number;
  theme: 'light' | 'sepia' | 'dark';
}

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 1.6,
  theme: 'light',
};

export interface LoginAttempt {
  timestamp: number;
  success: boolean;
  ip?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  event: string;
  details: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string;
  httpOnly: boolean;
  secure: boolean;
}

export interface RequestLogEntry {
  id: string;
  url: string;
  method: string;
  status: number;
  type: string;
  blocked: boolean;
  timestamp: number;
}

export interface StorageEntry {
  key: string;
  value: string;
  type: 'localStorage' | 'sessionStorage' | 'cookie';
  size: number;
}

export interface TrackerEntry {
  domain: string;
  category: string;
  description: string;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  trackerBlocking: true,
  adBlocking: true,
  httpWarning: true,
  clearHistoryOnClose: false,
  fingerprintProtection: true,
  loginAttemptLimit: 5,
  sessionTimeout: 15,
  dnsOverHttps: true,
  dohProvider: 'cloudflare',
  searchEngine: 'duckduckgo',
  userAgent: 'chrome-win',
  restoreTabsOnStartup: true,
  vpnEnabled: false,
  vpnProvider: 'wireguard',
  vpnConfig: {
    server: '',
    port: 51820,
    protocol: 'udp',
  },
};

export const TRACKER_BLOCKLIST: TrackerEntry[] = [
  { domain: "google-analytics.com", category: "Analytics", description: "Google website analytics" },
  { domain: "googletagmanager.com", category: "Tag Manager", description: "Google tag management" },
  { domain: "googlesyndication.com", category: "Advertising", description: "Google ads network" },
  { domain: "googleadservices.com", category: "Advertising", description: "Google ad conversion tracking" },
  { domain: "facebook.net", category: "Social", description: "Facebook tracking scripts" },
  { domain: "facebook.com/tr", category: "Social", description: "Facebook pixel tracking" },
  { domain: "doubleclick.net", category: "Advertising", description: "Google DoubleClick ads" },
  { domain: "analytics.twitter.com", category: "Analytics", description: "Twitter analytics" },
  { domain: "platform.twitter.com", category: "Social", description: "Twitter widgets" },
  { domain: "hotjar.com", category: "Analytics", description: "User session recording" },
  { domain: "mixpanel.com", category: "Analytics", description: "Product analytics" },
  { domain: "segment.io", category: "Analytics", description: "Customer data platform" },
  { domain: "segment.com", category: "Analytics", description: "Customer data platform" },
  { domain: "amplitude.com", category: "Analytics", description: "Product analytics" },
  { domain: "fullstory.com", category: "Analytics", description: "Session replay" },
  { domain: "crazyegg.com", category: "Analytics", description: "Heatmap analytics" },
  { domain: "mouseflow.com", category: "Analytics", description: "Session recording" },
  { domain: "optimizely.com", category: "A/B Testing", description: "A/B testing platform" },
  { domain: "quantserve.com", category: "Analytics", description: "Quantcast analytics" },
  { domain: "scorecardresearch.com", category: "Analytics", description: "ComScore analytics" },
  { domain: "newrelic.com", category: "Monitoring", description: "Application performance monitoring" },
  { domain: "sentry.io", category: "Monitoring", description: "Error tracking" },
  { domain: "logrocket.com", category: "Analytics", description: "Session replay and analytics" },
  { domain: "intercom.io", category: "Customer Support", description: "Live chat and support" },
  { domain: "drift.com", category: "Customer Support", description: "Live chat" },
  { domain: "hubspot.com", category: "Marketing", description: "Marketing automation" },
  { domain: "marketo.com", category: "Marketing", description: "Marketing automation" },
  { domain: "pardot.com", category: "Marketing", description: "B2B marketing automation" },
  { domain: "eloqua.com", category: "Marketing", description: "Oracle marketing cloud" },
  { domain: "mailchimp.com", category: "Email", description: "Email marketing tracking" },
  { domain: "sendgrid.net", category: "Email", description: "Email tracking" },
  { domain: "taboola.com", category: "Advertising", description: "Content recommendation ads" },
  { domain: "outbrain.com", category: "Advertising", description: "Content recommendation ads" },
  { domain: "criteo.com", category: "Advertising", description: "Retargeting ads" },
  { domain: "adnxs.com", category: "Advertising", description: "AppNexus ad platform" },
  { domain: "rubiconproject.com", category: "Advertising", description: "Header bidding" },
  { domain: "pubmatic.com", category: "Advertising", description: "Ad exchange" },
  { domain: "openx.net", category: "Advertising", description: "Ad exchange" },
  { domain: "casalemedia.com", category: "Advertising", description: "Ad network" },
  { domain: "bidswitch.net", category: "Advertising", description: "Cross-exchange bidding" },
  { domain: "demdex.net", category: "Analytics", description: "Adobe Audience Manager" },
  { domain: "omtrdc.net", category: "Analytics", description: "Adobe analytics" },
  { domain: "adsrvr.org", category: "Advertising", description: "The Trade Desk" },
  { domain: "tapad.com", category: "Analytics", description: "Cross-device tracking" },
  { domain: "liveramp.com", category: "Analytics", description: "Identity resolution" },
  { domain: "krxd.net", category: "Analytics", description: "Krux digital data" },
  { domain: "bluekai.com", category: "Analytics", description: "Data management platform" },
  { domain: "exelator.com", category: "Analytics", description: "Big data advertising" },
  { domain: "rlcdn.com", category: "Advertising", description: "Right Media exchange" },
  { domain: "addthis.com", category: "Social", description: "Social sharing widgets" },
  { domain: "sharethis.com", category: "Social", description: "Social sharing widgets" },
  { domain: "linkedin.com/analytics", category: "Analytics", description: "LinkedIn insight tracking" },
];

export const createNewTab = (url: string = "about:blank"): Tab => ({
  id: crypto.randomUUID(),
  url,
  title: url === "about:blank" ? "New Tab" : new URL(url).hostname,
  favicon: url !== "about:blank" ? `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` : undefined,
  loading: false,
  history: [url],
  historyIndex: 0,
});

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: "1", url: "https://google.com", title: "Google", favicon: "https://www.google.com/s2/favicons?domain=google.com&sz=32" },
  { id: "2", url: "https://github.com", title: "GitHub", favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=32" },
  { id: "3", url: "https://youtube.com", title: "YouTube", favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32" },
  { id: "4", url: "https://wikipedia.org", title: "Wikipedia", favicon: "https://www.google.com/s2/favicons?domain=wikipedia.org&sz=32" },
  { id: "5", url: "https://reddit.com", title: "Reddit", favicon: "https://www.google.com/s2/favicons?domain=reddit.com&sz=32" },
  { id: "6", url: "https://twitter.com", title: "X (Twitter)", favicon: "https://www.google.com/s2/favicons?domain=twitter.com&sz=32" },
];

export const isTrackerDomain = (url: string, customBlocklist?: string[]): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    const blocklist = customBlocklist || TRACKER_BLOCKLIST.map(t => t.domain);
    
    return blocklist.some(tracker => hostname.includes(tracker));
  } catch {
    return false;
  }
};

export const AD_BLOCKLIST: string[] = [
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "googleads.g.doubleclick.net",
  "ads.google.com",
  "adservice.google.com",
  "pagead2.googlesyndication.com",
  "adnxs.com",
  "adsrvr.org",
  "criteo.com",
  "criteo.net",
  "taboola.com",
  "outbrain.com",
  "moatads.com",
  "quantserve.com",
  "adcolony.com",
  "admob.com",
  "adsense.com",
  "advertising.com",
  "bidswitch.net",
  "casalemedia.com",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "33across.com",
  "adform.net",
  "bidswitch.net",
  "contextweb.com",
  "districtm.io",
  "gumgum.com",
  "indexww.com",
  "lijit.com",
  "media.net",
  "mgid.com",
  "outbrain.com",
  "revcontent.com",
  "sharethrough.com",
  "smartadserver.com",
  "sovrn.com",
  "spotxchange.com",
  "stickyadstv.com",
  "teads.tv",
  "triplelift.com",
  "undertone.com",
  "yahoo.com",
  "yieldmo.com",
  "zedo.com",
  "ad.doubleclick.net",
  "securepubads.g.doubleclick.net",
  "adclick.g.doubleclick.net",
  "adevents.googleapis.com",
];

export const isAdDomain = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    return AD_BLOCKLIST.some(ad => hostname.includes(ad));
  } catch {
    return false;
  }
};

export const FINGERPRINT_PROTECTION_SCRIPT = `
(function() {
  // Canvas fingerprint protection
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    const ctx = this.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.width, this.height);
    }
    return originalToDataURL.apply(this, arguments);
  };
  
  // WebGL fingerprint protection  
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445 || param === 37446) {
      return 'Intel Inc.';
    }
    return getParameter.apply(this, arguments);
  };
  
  // Audio fingerprint protection
  const analyserGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
  AnalyserNode.prototype.getFloatFrequencyData = function(array) {
    analyserGetFloatFrequencyData.call(this, array);
    for (let i = 0; i < array.length; i++) {
      array[i] = -100;
    }
    return array;
  };
  
  // Navigator properties
  Object.defineProperty(navigator, 'plugins', { get: function() { return []; } });
  Object.defineProperty(navigator, 'languages', { get: function() { return ['en-US', 'en']; } });
  Object.defineProperty(navigator, 'platform', { get: function() { return 'Win32'; } });
  
  // Screen properties
  Object.defineProperty(screen, 'colorDepth', { get: function() { return 24; } });
  Object.defineProperty(screen, 'pixelDepth', { get: function() { return 24; } });
})();
`;
