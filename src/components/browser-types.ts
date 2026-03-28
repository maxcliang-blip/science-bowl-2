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
  httpWarning: boolean;
  clearHistoryOnClose: boolean;
}

export interface TrackerEntry {
  domain: string;
  category: string;
  description: string;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  trackerBlocking: true,
  httpWarning: true,
  clearHistoryOnClose: false,
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
