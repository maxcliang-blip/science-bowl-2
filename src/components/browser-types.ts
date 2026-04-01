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
}

export const DOH_PROVIDERS = [
  { id: 'cloudflare', name: 'Cloudflare (1.1.1.1)', url: 'https://cloudflare-dns.com' },
  { id: 'google', name: 'Google DNS', url: 'https://dns.google' },
  { id: 'quad9', name: 'Quad9', url: 'https://dns.quad9.net' },
] as const;

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
