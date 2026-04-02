"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Lock, Globe, Bookmark, 
  Plus, X, Home, History, FolderPlus, Trash2, Edit3, Check,
  Clock, Search, ZoomIn, ZoomOut, Eye, EyeOff, Sun, Moon,
  Camera, Download, ChevronRight, Shield, AlertTriangle,
  Upload, ShieldAlert, ShieldCheck, List, KeyRound, Eye as EyeIcon,
  Link2, Link2Off, Cookie, FileText, Database, Activity, XCircle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { 
  Tab, Bookmark as BookmarkType, BookmarkFolder, ClosedTab, QuickLink,
  createNewTab, DEFAULT_QUICK_LINKS, FullHistoryEntry,
  SecuritySettings, DEFAULT_SECURITY_SETTINGS, TRACKER_BLOCKLIST, TrackerEntry, isTrackerDomain, 
  RequestLogEntry, CookieEntry, StorageEntry, AuditLogEntry, LoginAttempt
} from "./browser-types";

const MAX_CLOSED_TABS = 20;
const MAX_HISTORY = 50;
const ZOOM_LEVELS = [50, 75, 90, 100, 110, 125, 150, 175, 200];
const BROWSER_PASSWORD = "LAXMIANG";
const PROXY_BASE = "https://laxmiang--c1a496be2bd511f19a8942dde27851f2.web.val.run";

const getProxyUrl = (url: string, dohEnabled: boolean, dohProvider: string): string => {
  const params = new URLSearchParams({ url });
  if (dohEnabled) {
    params.set('doh', 'true');
    params.set('dohProvider', dohProvider);
  }
  return `${PROXY_BASE}/?${params.toString()}`;
};

const InAppBrowser = () => {
  const [tabs, setTabs] = useState<Tab[]>([createNewTab("https://example.com")]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [closedTabs, setClosedTabs] = useState<ClosedTab[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(DEFAULT_QUICK_LINKS);
  const [fullHistory, setFullHistory] = useState<FullHistoryEntry[]>([]);
  
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [customBlocklist, setCustomBlocklist] = useState<string[]>([]);
  const [blockedTrackersToday, setBlockedTrackersToday] = useState<number>(0);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [clearHistory, setClearHistory] = useState(true);
  const [clearBookmarks, setClearBookmarks] = useState(false);
  const [clearClosedTabs, setClearClosedTabs] = useState(false);
  
  const [showHomepage, setShowHomepage] = useState(true);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<{type: 'folder' | 'bookmark' | 'quicklink'; item?: BookmarkType | BookmarkFolder | QuickLink} | null>(null);
  const [showSecurityPage, setShowSecurityPage] = useState(false);
  const [showBlocklistEditor, setShowBlocklistEditor] = useState(false);
  const [newTrackerDomain, setNewTrackerDomain] = useState("");
  
  const [newFolderName, setNewFolderName] = useState("");
  const [editingName, setEditingName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState("");
  const [newQuickLinkTitle, setNewQuickLinkTitle] = useState("");
  
  const [showPageSearch, setShowPageSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  
  const [zoom, setZoom] = useState(100);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  
  const [darkMode, setDarkMode] = useState(false);
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [showIncognitoWarning, setShowIncognitoWarning] = useState(false);
  
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  
  const [useProxy, setUseProxy] = useState(true);
  const [showRequestLogger, setShowRequestLogger] = useState(false);
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([]);
  const [showCookieManager, setShowCookieManager] = useState(false);
  const [cookies, setCookies] = useState<CookieEntry[]>([]);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [storageData, setStorageData] = useState<StorageEntry[]>([]);
  const [blockedAdsToday, setBlockedAdsToday] = useState(0);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [iframeError, setIframeError] = useState<string | null>(null);
  
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    const saved = localStorage.getItem("browserBookmarks");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.bookmarks) setBookmarks(parsed.bookmarks);
      if (parsed.folders) setFolders(parsed.folders);
      if (parsed.quickLinks) setQuickLinks(parsed.quickLinks);
    }
    
    const savedHistory = localStorage.getItem("browserFullHistory");
    if (savedHistory) setFullHistory(JSON.parse(savedHistory));
    
    const savedDarkMode = localStorage.getItem("browserDarkMode");
    if (savedDarkMode === "true") setDarkMode(true);
    
    const savedSecurity = localStorage.getItem("browserSecuritySettings");
    if (savedSecurity) setSecuritySettings(JSON.parse(savedSecurity));
    
    const savedBlocklist = localStorage.getItem("browserCustomBlocklist");
    if (savedBlocklist) setCustomBlocklist(JSON.parse(savedBlocklist));
    
    const savedBlockedCount = localStorage.getItem("browserBlockedTrackersToday");
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem("browserBlockedTrackersDate");
    if (savedDate === today && savedBlockedCount) {
      setBlockedTrackersToday(parseInt(savedBlockedCount, 10));
    }

    const savedLoginAttempts = localStorage.getItem("browserLoginAttempts");
    if (savedLoginAttempts) {
      const attempts = JSON.parse(savedLoginAttempts);
      const todayAttempts = attempts.filter((a: LoginAttempt) => new Date(a.timestamp).toDateString() === today);
      setLoginAttempts(todayAttempts);
      const failedToday = todayAttempts.filter((a: LoginAttempt) => !a.success).length;
      if (failedToday >= DEFAULT_SECURITY_SETTINGS.loginAttemptLimit) {
        setIsLockedOut(true);
        setLockoutEndTime(Date.now() + 300000);
      }
    }
    
    const savedAuditLog = localStorage.getItem("browserAuditLog");
    if (savedAuditLog) {
      const log = JSON.parse(savedAuditLog);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setAuditLog(log.filter((e: AuditLogEntry) => e.timestamp > weekAgo));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("browserBookmarks", JSON.stringify({ bookmarks, folders, quickLinks }));
  }, [bookmarks, folders, quickLinks]);

  useEffect(() => {
    if (!incognitoMode) {
      localStorage.setItem("browserFullHistory", JSON.stringify(fullHistory));
    }
  }, [fullHistory, incognitoMode]);

  useEffect(() => {
    localStorage.setItem("browserDarkMode", String(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("browserSecuritySettings", JSON.stringify(securitySettings));
  }, [securitySettings]);

  useEffect(() => {
    localStorage.setItem("browserCustomBlocklist", JSON.stringify(customBlocklist));
  }, [customBlocklist]);

  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem("browserBlockedTrackersDate", today);
    localStorage.setItem("browserBlockedTrackersToday", String(blockedTrackersToday));
  }, [blockedTrackersToday]);

  useEffect(() => {
    const savedBlockedAds = localStorage.getItem("browserBlockedAdsToday");
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem("browserBlockedAdsDate");
    if (savedDate === today && savedBlockedAds) {
      setBlockedAdsToday(parseInt(savedBlockedAds, 10));
    }
  }, []);

  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem("browserBlockedAdsDate", today);
    localStorage.setItem("browserBlockedAdsToday", String(blockedAdsToday));
  }, [blockedAdsToday]);

  useEffect(() => {
    const today = new Date().toDateString();
    const todayAttempts = loginAttempts.filter(a => new Date(a.timestamp).toDateString() === today);
    localStorage.setItem("browserLoginAttempts", JSON.stringify(todayAttempts));
  }, [loginAttempts]);

  useEffect(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentLog = auditLog.filter(e => e.timestamp > weekAgo);
    localStorage.setItem("browserAuditLog", JSON.stringify(recentLog));
  }, [auditLog]);

  useEffect(() => {
    if (isLockedOut && lockoutEndTime) {
      const timeout = setTimeout(() => {
        setIsLockedOut(false);
        setLockoutEndTime(null);
        addAuditLogEntry('security', 'Lockout ended', 'Automatic unlock after timeout', 'info');
      }, lockoutEndTime - Date.now());
      return () => clearTimeout(timeout);
    }
  }, [isLockedOut, lockoutEndTime]);

  const addAuditLogEntry = useCallback((event: string, details: string, severity: AuditLogEntry['severity'] = 'info') => {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      event,
      details,
      severity
    };
    setAuditLog(prev => [entry, ...prev].slice(0, 1000));
  }, []);

  useEffect(() => {
    if (securitySettings.clearHistoryOnClose) {
      const handleBeforeUnload = () => {
        localStorage.removeItem("browserFullHistory");
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [securitySettings.clearHistoryOnClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowPageSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        setShowPageSearch(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (showPageSearch) {
      searchInputRef.current?.focus();
    }
  }, [showPageSearch]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'navigate' && event.data.url) {
        const newUrl = event.data.url;
        if (newUrl.startsWith("lax://")) return;
        if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) return;
        
        setShowSecurityPage(false);
        setShowHomepage(false);
        
        setTabs(prev => prev.map(tab => {
          if (tab.id === activeTabId) {
            const newHistory = tab.history.slice(0, tab.historyIndex + 1);
            if (newHistory[newHistory.length - 1] !== newUrl) {
              newHistory.push(newUrl);
              if (newHistory.length > MAX_HISTORY) newHistory.shift();
            }
            return {
              ...tab,
              url: newUrl,
              title: new URL(newUrl).hostname,
              favicon: `https://www.google.com/s2/favicons?domain=${new URL(newUrl).hostname}&sz=32`,
              loading: true,
              history: newHistory,
              historyIndex: newHistory.length - 1,
            };
          }
          return tab;
        }));
        
        if (iframeRefs.current.has(activeTabId)) {
          const iframeUrl = getProxyUrl(newUrl, securitySettings.dnsOverHttps, securitySettings.dohProvider);
          iframeRefs.current.get(activeTabId)!.src = iframeUrl;
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeTabId, showSecurityPage, showHomepage, tabs]);

  useEffect(() => {
    if (showSecurityPage || showHomepage) return;
    
    const checkIframeUrl = () => {
      const iframe = iframeRefs.current.get(activeTabId);
      if (!iframe || !iframe.contentWindow) return;
      
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.location && iframeDoc.location.href) {
          let currentIframeUrl = iframeDoc.location.href;
          const currentTab = tabs.find(t => t.id === activeTabId);
          if (!currentTab) return;
          
          if (currentIframeUrl !== currentTab.url && !currentIframeUrl.includes('about:')) {
            if (currentIframeUrl.includes('type') && currentIframeUrl.includes('redirect') && currentIframeUrl.includes(PROXY_BASE)) {
              try {
                const url = new URL(currentIframeUrl);
                const redirectUrl = url.searchParams.get('url');
                if (redirectUrl) {
                  const proxyUrl = getProxyUrl(redirectUrl, securitySettings.dnsOverHttps, securitySettings.dohProvider);
                  iframe.src = proxyUrl;
                  return;
                }
              } catch {}
            }
            
            if (!currentIframeUrl.includes(PROXY_BASE) && currentIframeUrl.startsWith('http')) {
              const iframeUrl = getProxyUrl(currentIframeUrl, securitySettings.dnsOverHttps, securitySettings.dohProvider);
              iframe.src = iframeUrl;
              return;
            }
            
            setTabs(prev => prev.map(tab => {
              if (tab.id === activeTabId) {
                const newHistory = tab.history.slice(0, tab.historyIndex + 1);
                if (newHistory[newHistory.length - 1] !== currentIframeUrl) {
                  newHistory.push(currentIframeUrl);
                  if (newHistory.length > MAX_HISTORY) newHistory.shift();
                }
                return {
                  ...tab,
                  url: currentIframeUrl,
                  title: new URL(currentIframeUrl).hostname,
                  favicon: `https://www.google.com/s2/favicons?domain=${new URL(currentIframeUrl).hostname}&sz=32`,
                  loading: false,
                  history: newHistory,
                  historyIndex: newHistory.length - 1,
                };
              }
              return tab;
            }));
          }
        }
      } catch {
        // Cross-origin access denied - ignore
      }
    };
    
    const interval = setInterval(checkIframeUrl, 500);
    return () => clearInterval(interval);
  }, [activeTabId, showSecurityPage, showHomepage, tabs, securitySettings]);

  useEffect(() => {
    if (!isLocked || securitySettings.sessionTimeout <= 0) return;
    
    const checkInactivity = () => {
      const now = Date.now();
      const timeout = securitySettings.sessionTimeout * 60 * 1000;
      if (now - lastActivity > timeout) {
        setIsLocked(true);
        setShowHomepage(true);
        setShowSecurityPage(false);
        addAuditLogEntry('security', 'Session timeout', 'Browser locked due to inactivity', 'warning');
        showError('Session timed out due to inactivity');
      }
    };
    
    const interval = setInterval(checkInactivity, 30000);
    return () => clearInterval(interval);
  }, [isLocked, lastActivity, securitySettings.sessionTimeout]);

  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

  const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLockedOut) {
      const remaining = Math.ceil((lockoutEndTime! - Date.now()) / 1000 / 60);
      showError(`Too many failed attempts. Try again in ${remaining} minutes.`);
      return;
    }
    
    if (passwordInput === BROWSER_PASSWORD) {
      setIsLocked(false);
      setPasswordError(false);
      setPasswordInput("");
      setLastActivity(Date.now());
      const attempt: LoginAttempt = { timestamp: Date.now(), success: true };
      setLoginAttempts(prev => [...prev, attempt]);
      addAuditLogEntry('auth', 'Login success', 'Browser unlocked successfully', 'info');
      showSuccess("Browser unlocked");
    } else {
      setPasswordError(true);
      setPasswordInput("");
      const attempt: LoginAttempt = { timestamp: Date.now(), success: false };
      const newAttempts = [...loginAttempts, attempt];
      setLoginAttempts(newAttempts);
      addAuditLogEntry('auth', 'Login failed', 'Incorrect password attempt', 'warning');
      
      const failedToday = newAttempts.filter(a => !a.success && new Date(a.timestamp).toDateString() === new Date().toDateString()).length;
      if (failedToday >= securitySettings.loginAttemptLimit) {
        setIsLockedOut(true);
        setLockoutEndTime(Date.now() + 300000);
        addAuditLogEntry('security', `Too many failed attempts (${failedToday})`, 'critical');
        showError("Too many failed attempts. Locked for 5 minutes.");
      } else {
        showError(`Incorrect password. ${securitySettings.loginAttemptLimit - failedToday} attempts remaining.`);
      }
    }
  }, [passwordInput, isLockedOut, lockoutEndTime, loginAttempts, securitySettings.loginAttemptLimit, addAuditLogEntry]);

  const lockBrowser = useCallback(() => {
    setIsLocked(true);
    setShowHomepage(true);
    setShowSecurityPage(false);
    addAuditLogEntry('auth', 'Browser locked', 'User initiated lock', 'info');
    showSuccess("Browser locked");
  }, [addAuditLogEntry]);

  const exportBookmarks = useCallback(() => {
    const data = {
      bookmarks,
      folders,
      exportedAt: new Date().toISOString(),
      version: "1.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookmarks-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Bookmarks exported successfully");
  }, [bookmarks, folders]);

  const importBookmarks = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.bookmarks && Array.isArray(data.bookmarks)) {
          setBookmarks(data.bookmarks);
          setFolders(data.folders || []);
          showSuccess(`Imported ${data.bookmarks.length} bookmarks`);
        } else {
          showError("Invalid bookmark file format");
        }
      } catch {
        showError("Failed to parse bookmark file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const clearSelectedData = useCallback(() => {
    if (clearHistory) {
      setFullHistory([]);
      localStorage.removeItem("browserFullHistory");
    }
    if (clearBookmarks) {
      setBookmarks([]);
      setFolders([]);
      localStorage.removeItem("browserBookmarks");
    }
    if (clearClosedTabs) {
      setClosedTabs([]);
    }
    setShowClearDataDialog(false);
    setClearHistory(true);
    setClearBookmarks(false);
    setClearClosedTabs(false);
    showSuccess("Selected data cleared");
  }, [clearHistory, clearBookmarks, clearClosedTabs]);

  const addToHistory = useCallback((url: string, title: string) => {
    if (incognitoMode) return;
    const entry: FullHistoryEntry = {
      id: crypto.randomUUID(),
      url,
      title,
      visitedAt: Date.now(),
    };
    setFullHistory(prev => [entry, ...prev].slice(0, 500));
  }, [incognitoMode]);

  const validateUrl = (inputUrl: string): boolean => {
    if (inputUrl === "about:blank" || inputUrl.startsWith("lax://")) return true;
    try {
      const parsed = new URL(inputUrl);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const getFavicon = (url: string) => {
    if (url === "about:blank") return null;
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  const isHttp = (url: string) => url.startsWith("http://");

  const checkAndBlockTracker = useCallback((url: string): boolean => {
    if (!securitySettings.trackerBlocking) return false;
    const blocked = isTrackerDomain(url, customBlocklist);
    if (blocked) {
      setBlockedTrackersToday(prev => prev + 1);
    }
    return blocked;
  }, [securitySettings.trackerBlocking, customBlocklist]);

  const addNewTab = useCallback((url: string = "about:blank", isIncognito: boolean = incognitoMode) => {
    if (url.startsWith("lax://")) {
      if (url === "lax://security") {
        setShowSecurityPage(true);
        setShowHomepage(false);
        return;
      }
    }
    
    const newTab = createNewTab(url);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setShowHomepage(url === "about:blank" || url.startsWith("lax://"));
    if (isIncognito) {
      setShowIncognitoWarning(true);
      setTimeout(() => setShowIncognitoWarning(false), 3000);
    }
  }, [incognitoMode]);

  const closeTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.url !== "about:blank") {
      setClosedTabs(prev => [{
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
        closedAt: Date.now(),
      }, ...prev].slice(0, MAX_CLOSED_TABS));
    }
    
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (newTabs.length === 0) {
        const newTab = createNewTab("about:blank");
        setActiveTabId(newTab.id);
        setShowHomepage(true);
        setShowSecurityPage(false);
        return [newTab];
      }
      if (tabId === activeTabId) {
        const index = prev.findIndex(t => t.id === tabId);
        const newActive = newTabs[Math.min(index, newTabs.length - 1)];
        setActiveTabId(newActive.id);
        setShowHomepage(newActive.url === "about:blank" || newActive.url.startsWith("lax://"));
        setShowSecurityPage(newActive.url === "lax://security");
      }
      return newTabs;
    });
  }, [tabs, activeTabId]);

  const reopenClosedTab = useCallback((closedTab: ClosedTab) => {
    addNewTab(closedTab.url);
    setClosedTabs(prev => prev.filter(t => t.closedAt !== closedTab.closedAt));
  }, [addNewTab]);

  const navigateTo = useCallback((newUrl: string, tabId?: string) => {
    const targetTabId = tabId || activeTabId;
    
    if (newUrl.startsWith("lax://")) {
      if (newUrl === "lax://security") {
        setShowSecurityPage(true);
        setShowHomepage(false);
        setTabs(prev => prev.map(tab => {
          if (tab.id === targetTabId) {
            return {
              ...tab,
              url: newUrl,
              title: "Security Settings",
              favicon: undefined,
            };
          }
          return tab;
        }));
        return;
      }
    }
    
    if (!validateUrl(newUrl)) {
      showError("Invalid URL. Only http:// and https:// URLs are allowed.");
      return;
    }

    if (checkAndBlockTracker(newUrl)) {
      showError("Tracker blocked by protection");
      return;
    }

    setShowSecurityPage(false);
    setShowHomepage(false);
    
    setTabs(prev => prev.map(tab => {
      if (tab.id === targetTabId) {
        const newHistory = tab.history.slice(0, tab.historyIndex + 1);
        if (newHistory[newHistory.length - 1] !== newUrl) {
          newHistory.push(newUrl);
          if (newHistory.length > MAX_HISTORY) newHistory.shift();
        }
        return {
          ...tab,
          url: newUrl,
          title: newUrl === "about:blank" ? "New Tab" : new URL(newUrl).hostname,
          favicon: getFavicon(newUrl) || undefined,
          loading: true,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      }
      return tab;
    }));

    if (iframeRefs.current.has(targetTabId)) {
      const iframeUrl = useProxy && newUrl !== "about:blank" && !newUrl.startsWith("http://localhost")
        ? getProxyUrl(newUrl, securitySettings.dnsOverHttps, securitySettings.dohProvider)
        : newUrl;
      iframeRefs.current.get(targetTabId)!.src = iframeUrl;
    }
    
    const title = newUrl === "about:blank" ? "New Tab" : new URL(newUrl).hostname;
    addToHistory(newUrl, title);
  }, [activeTabId, addToHistory, checkAndBlockTracker, useProxy]);

  const updateTabUrl = useCallback((url: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return { ...tab, url, title: url === "about:blank" ? "New Tab" : url };
      }
      return tab;
    }));
  }, [activeTabId]);

  const goBack = useCallback((tabId: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId && tab.historyIndex > 0) {
        const newIndex = tab.historyIndex - 1;
        const newUrl = tab.history[newIndex];
        setTimeout(() => {
          if (iframeRefs.current.has(tabId)) {
            const iframeUrl = useProxy && newUrl !== "about:blank" && !newUrl.startsWith("http://localhost")
              ? getProxyUrl(newUrl, securitySettings.dnsOverHttps, securitySettings.dohProvider)
              : newUrl;
            iframeRefs.current.get(tabId)!.src = iframeUrl;
          }
        }, 0);
        return {
          ...tab,
          url: newUrl,
          historyIndex: newIndex,
          loading: true,
        };
      }
      return tab;
    }));
  }, [useProxy, securitySettings]);

  const goForward = useCallback((tabId: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId && tab.historyIndex < tab.history.length - 1) {
        const newIndex = tab.historyIndex + 1;
        const newUrl = tab.history[newIndex];
        setTimeout(() => {
          if (iframeRefs.current.has(tabId)) {
            const iframeUrl = useProxy && newUrl !== "about:blank" && !newUrl.startsWith("http://localhost")
              ? getProxyUrl(newUrl, securitySettings.dnsOverHttps, securitySettings.dohProvider)
              : newUrl;
            iframeRefs.current.get(tabId)!.src = iframeUrl;
          }
        }, 0);
        return {
          ...tab,
          url: newUrl,
          historyIndex: newIndex,
          loading: true,
        };
      }
      return tab;
    }));
  }, [useProxy]);

  const refresh = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && iframeRefs.current.has(tabId)) {
      const iframeUrl = useProxy && tab.url !== "about:blank" && !tab.url.startsWith("http://localhost")
        ? getProxyUrl(tab.url, securitySettings.dnsOverHttps, securitySettings.dohProvider)
        : tab.url;
      iframeRefs.current.get(tabId)!.src = iframeUrl;
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, loading: true } : t));
    }
  }, [tabs, useProxy, securitySettings]);

  const zoomIn = useCallback(() => {
    setZoom(prev => {
      const currentIndex = ZOOM_LEVELS.indexOf(prev);
      if (currentIndex < ZOOM_LEVELS.length - 1) return ZOOM_LEVELS[currentIndex + 1];
      return prev;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const currentIndex = ZOOM_LEVELS.indexOf(prev);
      if (currentIndex > 0) return ZOOM_LEVELS[currentIndex - 1];
      return prev;
    });
  }, []);

  const resetZoom = useCallback(() => setZoom(100), []);

  const takeScreenshot = useCallback(() => {
    const iframe = iframeRefs.current.get(activeTabId);
    if (!iframe || !activeTab || activeTab.url === "about:blank" || activeTab.url.startsWith("lax://")) {
      showError("Cannot take screenshot of this page");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = iframe.clientWidth;
      canvas.height = iframe.clientHeight;
      if (ctx) {
        ctx.scale(zoom / 100, zoom / 100);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `screenshot-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showSuccess("Screenshot saved");
          }
        }, "image/png");
      }
    };
    img.onerror = () => showError("Failed to capture screenshot");
    img.src = iframe.src;
  }, [activeTabId, activeTab, zoom]);

  const addBookmark = useCallback((url: string, title: string) => {
    if (incognitoMode) {
      showError("Cannot bookmark in incognito mode");
      return;
    }
    const bookmark: BookmarkType = {
      id: crypto.randomUUID(),
      url,
      title,
      favicon: getFavicon(url) || undefined,
      createdAt: Date.now(),
    };
    setBookmarks(prev => [...prev, bookmark]);
    showSuccess("Bookmark added");
  }, [incognitoMode]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    showSuccess("Bookmark removed");
  }, []);

  const addFolder = useCallback((name: string) => {
    const folder: BookmarkFolder = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
    };
    setFolders(prev => [...prev, folder]);
    setNewFolderName("");
    setShowFolderDialog(false);
    showSuccess("Folder created");
  }, []);

  const removeFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    setBookmarks(prev => prev.map(b => b.folderId === id ? { ...b, folderId: undefined } : b));
    if (selectedFolder === id) setSelectedFolder(null);
    showSuccess("Folder removed");
  }, [selectedFolder]);

  const addQuickLink = useCallback((url: string, title: string) => {
    const quickLink: QuickLink = {
      id: crypto.randomUUID(),
      url,
      title,
      favicon: getFavicon(url) || undefined,
    };
    setQuickLinks(prev => [...prev, quickLink]);
    showSuccess("Quick link added");
  }, []);

  const removeQuickLink = useCallback((id: string) => {
    setQuickLinks(prev => prev.filter(l => l.id !== id));
    showSuccess("Quick link removed");
  }, []);

  const handleIframeLoad = useCallback((tabId: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, loading: false } : tab
    ));
    
    const iframe = iframeRefs.current.get(tabId);
    if (!iframe || !iframe.contentWindow) return;
    
    try {
      const iframeUrl = iframe.contentWindow.location.href;
      const currentTab = tabs.find(t => t.id === tabId);
      if (!currentTab) return;
      
      if (iframeUrl !== currentTab.url && !iframeUrl.includes('about:')) {
        if (!iframeUrl.includes(PROXY_BASE)) {
          const proxyUrl = getProxyUrl(iframeUrl, securitySettings.dnsOverHttps, securitySettings.dohProvider);
          iframe.src = proxyUrl;
          return;
        }
        
        if (iframeUrl.includes('url=')) {
          try {
            const url = new URL(iframeUrl);
            const redirectUrl = url.searchParams.get('url');
            if (redirectUrl && redirectUrl.startsWith('http')) {
              const proxyUrl = getProxyUrl(redirectUrl, securitySettings.dnsOverHttps, securitySettings.dohProvider);
              iframe.src = proxyUrl;
              return;
            }
          } catch {}
        }
        
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        if (tabIndex !== -1) {
          const targetUrl = iframeUrl.includes('url=') ? new URL(iframeUrl).searchParams.get('url') || iframeUrl : iframeUrl;
          if (targetUrl.startsWith('http')) {
            setTabs(prev => {
              const newTabs = [...prev];
              const tab = { ...newTabs[tabIndex] };
              const newHistory = tab.history.slice(0, tab.historyIndex + 1);
              if (newHistory[newHistory.length - 1] !== targetUrl) {
                newHistory.push(targetUrl);
                if (newHistory.length > MAX_HISTORY) newHistory.shift();
              }
              tab.url = targetUrl;
              tab.title = new URL(targetUrl).hostname;
              tab.favicon = `https://www.google.com/s2/favicons?domain=${new URL(targetUrl).hostname}&sz=32`;
              tab.history = newHistory;
              tab.historyIndex = newHistory.length - 1;
              newTabs[tabIndex] = tab;
              return newTabs;
            });
          }
        }
      }
    } catch {}
  }, [tabs, securitySettings]);

  const handleIframeError = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && !tab.url.includes('about:') && !tab.url.includes('lax://')) {
      setIframeError(tab.url);
    }
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, loading: false } : t));
  }, [tabs]);

  const handleSubmit = useCallback((e: React.FormEvent, url: string) => {
    e.preventDefault();
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://") && url !== "about:blank" && !url.startsWith("lax://")) {
      if (url.includes(".") && !url.includes(" ")) {
        finalUrl = "https://" + url;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }
    navigateTo(finalUrl);
  }, [navigateTo]);

  const getBookmarksInFolder = useCallback((folderId: string | undefined) => {
    return bookmarks.filter(b => b.folderId === folderId);
  }, [bookmarks]);

  const moveBookmarkToFolder = useCallback((bookmarkId: string, folderId: string | null) => {
    setBookmarks(prev => prev.map(b => 
      b.id === bookmarkId ? { ...b, folderId: folderId || undefined } : b
    ));
    showSuccess("Bookmark moved");
  }, []);

  const getTabHistory = useCallback((tab: Tab) => {
    const history: { url: string; index: number }[] = [];
    tab.history.forEach((url, idx) => {
      history.push({ url, index: idx });
    });
    return history.reverse().slice(0, 20);
  }, []);

  const clearFullHistory = useCallback(() => {
    setFullHistory([]);
    localStorage.removeItem("browserFullHistory");
    showSuccess("History cleared");
  }, []);

  const deleteHistoryEntry = useCallback((id: string) => {
    setFullHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const groupedHistory = useMemo(() => {
    const groups: { date: string; entries: FullHistoryEntry[] }[] = [];
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();
    
    fullHistory.forEach(entry => {
      const entryDate = new Date(entry.visitedAt).toDateString();
      let dateLabel = entryDate;
      if (entryDate === today) dateLabel = "Today";
      else if (entryDate === yesterday) dateLabel = "Yesterday";
      
      const group = groups.find(g => g.date === dateLabel);
      if (group) {
        group.entries.push(entry);
      } else {
        groups.push({ date: dateLabel, entries: [entry] });
      }
    });
    return groups;
  }, [fullHistory]);

  const toggleIncognito = useCallback(() => {
    setIncognitoMode(prev => !prev);
    if (!incognitoMode) {
      setShowIncognitoWarning(true);
      setTimeout(() => setShowIncognitoWarning(false), 3000);
    }
  }, [incognitoMode]);

  const isHttps = activeTab?.url.startsWith("https://") ?? false;
  const showHttpWarning = isHttp(activeTab?.url || "") && securitySettings.httpWarning;

  const containerClasses = darkMode
    ? "h-screen flex flex-col bg-gray-900 text-white"
    : "h-screen flex flex-col bg-gray-100 text-gray-900";

  const renderTabBar = () => (
    <div className={`border-b px-2 py-1.5 flex items-center gap-1 overflow-x-auto ${
      darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
    }`}>
      <button
        onClick={() => addNewTab()}
        className={`p-1.5 rounded flex-shrink-0 ${
          darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"
        }`}
        title="New tab"
      >
        <Plus size={16} />
      </button>
      <ScrollArea className="flex-1 h-9">
        <div className="flex gap-1 px-1">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
                setShowHomepage(tab.url === "about:blank" || tab.url.startsWith("lax://"));
                setShowSecurityPage(tab.url === "lax://security");
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer min-w-0 max-w-36 group ${
                tab.id === activeTabId 
                  ? darkMode ? "bg-gray-700 shadow-sm" : "bg-white shadow-sm"
                  : darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
              }`}
            >
              {incognitoMode ? (
                <EyeOff size={14} className="text-gray-400 flex-shrink-0" />
              ) : tab.favicon ? (
                <img src={tab.favicon} alt="" className="w-4 h-4 flex-shrink-0" onError={(e) => e.currentTarget.style.display = "none"} />
              ) : tab.url.startsWith("lax://") ? (
                <Shield size={14} className="text-blue-400 flex-shrink-0" />
              ) : null}
              <span className={`text-xs truncate flex-1 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className={`p-0.5 rounded flex-shrink-0 ${
                    darkMode ? "hover:bg-gray-600" : "hover:bg-gray-300"
                  }`}
                >
                  <X size={12} className={darkMode ? "text-gray-400" : "text-gray-500"} />
                </button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <button
        onClick={toggleIncognito}
        className={`p-1.5 rounded flex-shrink-0 ${incognitoMode ? "bg-purple-600 text-white" : darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500"}`}
        title={incognitoMode ? "Exit incognito" : "Incognito mode"}
      >
        {incognitoMode ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
      
      <button
        onClick={lockBrowser}
        className={`p-1.5 rounded flex-shrink-0 ${darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500"}`}
        title="Lock browser"
      >
        <Lock size={16} />
      </button>
      
      <button
        onClick={() => setDarkMode(prev => !prev)}
        className={`p-1.5 rounded flex-shrink-0 ${darkMode ? "hover:bg-gray-700 text-yellow-400" : "hover:bg-gray-200 text-gray-500"}`}
        title={darkMode ? "Light mode" : "Dark mode"}
      >
        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );

  const renderToolbar = (tab: Tab) => (
    <div className={`border-b p-3 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goBack(tab.id)}
            disabled={tab.historyIndex <= 0}
            className={`p-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed ${
              darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => goForward(tab.id)}
            disabled={tab.historyIndex >= tab.history.length - 1}
            className={`p-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed ${
              darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"
            }`}
          >
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => refresh(tab.id)}
            className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"}`}
          >
            <RotateCw size={18} className={tab.loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowHomepage(true)}
            className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"}`}
            title="Home"
          >
            <Home size={18} />
          </button>
          <button
            onClick={() => {
              if (activeTab && !activeTab.url.startsWith("about:") && !activeTab.url.startsWith("lax://")) {
                window.open(activeTab.url, '_blank');
              }
            }}
            className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"}`}
            title="Open in new tab"
            disabled={!activeTab || activeTab.url.startsWith("about:") || activeTab.url.startsWith("lax://")}
          >
            <ExternalLink size={18} />
          </button>
          
          <Popover open={showBookmarks} onOpenChange={setShowBookmarks}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"}`}>
                <Bookmark size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white border border-gray-200 rounded-md shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="font-medium text-sm dark:text-white">Bookmarks</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setShowFolderDialog(true)} disabled={incognitoMode}>
                    <FolderPlus size={14} />
                  </Button>
                </div>
              </div>
              
              {folders.length > 0 && (
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${!selectedFolder ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    All Bookmarks
                  </button>
                  {folders.map(folder => (
                    <div key={folder.id} className="flex items-center group">
                      <button
                        onClick={() => setSelectedFolder(folder.id)}
                        className={`flex-1 text-left px-2 py-1 text-sm rounded ${selectedFolder === folder.id ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        {showEditDialog?.type === 'folder' && showEditDialog.item?.id === folder.id ? (
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Input
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              className="h-6 text-xs"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => {
                              setFolders(prev => prev.map(f => f.id === folder.id ? {...f, name: editingName} : f));
                              setShowEditDialog(null);
                            }}>
                              <Check size={12} />
                            </Button>
                          </div>
                        ) : folder.name}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFolder(folder.id); }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={12} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <ScrollArea className="max-h-64">
                <div className="p-2">
                  {(selectedFolder ? getBookmarksInFolder(selectedFolder) : bookmarks).length > 0 ? (
                    (selectedFolder ? getBookmarksInFolder(selectedFolder) : bookmarks).map(bookmark => (
                      <div key={bookmark.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded group">
                        {bookmark.favicon && (
                          <img src={bookmark.favicon} alt="" className="w-4 h-4" onError={(e) => e.currentTarget.style.display = "none"} />
                        )}
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => { navigateTo(bookmark.url); setShowBookmarks(false); }}
                        >
                          <div className="text-sm text-gray-700 dark:text-gray-200 truncate">{bookmark.title}</div>
                          <div className="text-xs text-gray-400 truncate">{bookmark.url}</div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          {folders.length > 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                  <FolderPlus size={12} />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2">
                                <div className="text-xs font-medium mb-1">Move to folder:</div>
                                {folders.map(folder => (
                                  <button
                                    key={folder.id}
                                    onClick={() => moveBookmarkToFolder(bookmark.id, folder.id)}
                                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                                  >
                                    {folder.name}
                                  </button>
                                ))}
                                {bookmark.folderId && (
                                  <button
                                    onClick={() => moveBookmarkToFolder(bookmark.id, null)}
                                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                                  >
                                    Remove from folder
                                  </button>
                                )}
                              </PopoverContent>
                            </Popover>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-red-100">
                            <Trash2 size={12} className="text-red-500" onClick={() => removeBookmark(bookmark.id)} />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-400">
                      {incognitoMode ? "Bookmarks disabled in incognito mode" : selectedFolder ? "No bookmarks in this folder" : "No bookmarks yet"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Popover open={showHistoryPopover} onOpenChange={setShowHistoryPopover}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"}`}>
                <History size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white border border-gray-200 rounded-md shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="font-medium text-sm dark:text-white">Recently Closed</span>
                <Button size="sm" variant="ghost" onClick={() => { setShowHistoryPopover(false); setShowFullHistory(true); }}>
                  <ChevronRight size={14} />
                </Button>
              </div>
              <ScrollArea className="max-h-64">
                <div className="p-2">
                  {closedTabs.length > 0 ? (
                    closedTabs.map((closedTab, idx) => (
                      <div 
                        key={idx}
                        onClick={() => { reopenClosedTab(closedTab); setShowHistoryPopover(false); }}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        {closedTab.favicon && (
                          <img src={closedTab.favicon} alt="" className="w-4 h-4" onError={(e) => e.currentTarget.style.display = "none"} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 dark:text-gray-200 truncate">{closedTab.title}</div>
                          <div className="text-xs text-gray-400 truncate">{closedTab.url}</div>
                        </div>
                        <Clock size={12} className="text-gray-400" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-400">
                      No recently closed tabs
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Popover open={showZoomMenu} onOpenChange={setShowZoomMenu}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"}`}>
                <ZoomIn size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-white border border-gray-200 rounded-md shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <button onClick={zoomOut} className={`p-1 rounded ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
                  <ZoomOut size={16} />
                </button>
                <span className="text-sm font-medium dark:text-white">{zoom}%</span>
                <button onClick={zoomIn} className={`p-1 rounded ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
                  <ZoomIn size={16} />
                </button>
              </div>
              <Button size="sm" variant="ghost" className="w-full" onClick={resetZoom}>
                Reset to 100%
              </Button>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {ZOOM_LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => { setZoom(level); setShowZoomMenu(false); }}
                    className={`text-xs py-1 rounded ${zoom === level ? "bg-blue-500 text-white" : darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  >
                    {level}%
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUseProxy(prev => !prev)}
            className={`p-2 rounded-full ${useProxy ? (darkMode ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-600") : (darkMode ? "hover:bg-gray-700 text-gray-500" : "hover:bg-gray-200 text-gray-400")}`}
            title={useProxy ? "Proxy enabled - bypasses X-Frame restrictions" : "Proxy disabled"}
          >
            {useProxy ? <Link2 size={18} /> : <Link2Off size={18} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={takeScreenshot}
            className={`p-2 rounded-full ${darkMode ? "hover:bg-gray-700 text-white" : "hover:bg-gray-200 text-gray-700"}`}
            title="Take screenshot"
          >
            <Camera size={18} />
          </Button>

          <form onSubmit={(e) => handleSubmit(e, tab.url)} className="flex-1 relative">
            <div className={`flex items-center border rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${
              darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
            }`}>
              <div className="mr-2">
                {isHttps ? (
                  <Lock size={14} className="text-green-600" />
                ) : (
                  <Globe size={14} className={darkMode ? "text-yellow-500" : "text-yellow-600"} />
                )}
              </div>
              {activeTab?.favicon && (
                <img src={activeTab.favicon} alt="" className="w-4 h-4 mr-2" onError={(e) => e.currentTarget.style.display = 'none'} />
              )}
              <input
                type="text"
                value={tab.url}
                onChange={(e) => updateTabUrl(e.target.value)}
                placeholder="Search or enter URL"
                className={`flex-1 bg-transparent outline-none text-sm placeholder-gray-400 ${darkMode ? "text-white" : "text-gray-800"}`}
                disabled={tab.loading}
              />
            </div>
          </form>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (activeTab && activeTab.url !== "about:blank" && !activeTab.url.startsWith("lax://")) {
                addBookmark(activeTab.url, activeTab.title);
              }
            }}
            className="text-xs"
            disabled={incognitoMode}
          >
            <Bookmark size={14} className="mr-1" />
            Bookmark
          </Button>
        </div>
      </div>
    </div>
  );

  const renderHttpWarning = () => {
    if (!showHttpWarning) return null;
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 flex items-center gap-2">
        <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-500" />
        <span className="text-sm text-yellow-800 dark:text-yellow-300">
          You're on an insecure connection (HTTP). Data may be intercepted.
        </span>
      </div>
    );
  };

  const renderPageSearch = () => {
    if (!showPageSearch) return null;
    
    return (
      <div className={`absolute top-0 left-0 right-0 z-20 flex items-center gap-2 p-2 ${
        darkMode ? "bg-gray-800 border-b border-gray-700" : "bg-white border-b border-gray-200"
      } shadow-md`}>
        <Search size={16} className="text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Find on page..."
          className={`flex-1 px-2 py-1 text-sm rounded border outline-none ${
            darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300"
          }`}
        />
        <span className="text-xs text-gray-400">
          {searchMatches > 0 ? `${currentMatch + 1} of ${searchMatches}` : searchQuery ? "No matches" : ""}
        </span>
        <button
          onClick={() => setShowPageSearch(false)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          <X size={16} />
        </button>
      </div>
    );
  };

  const renderFullHistory = () => {
    if (!showFullHistory) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFullHistory(false)}>
        <div className={`w-[600px] max-h-[80vh] rounded-xl overflow-hidden flex flex-col ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`} onClick={e => e.stopPropagation()}>
          <div className={`p-4 border-b flex items-center justify-between ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}>
            <h2 className={`font-medium ${darkMode ? "text-white" : ""}`}>Full History</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={clearFullHistory}>
                <Trash2 size={14} className="mr-1" />
                Clear All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFullHistory(false)}>
                <X size={14} />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {groupedHistory.length > 0 ? (
                groupedHistory.map(group => (
                  <div key={group.date} className="mb-4">
                    <h3 className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {group.date}
                    </h3>
                    <div className="space-y-1">
                      {group.entries.map(entry => (
                        <div 
                          key={entry.id}
                          className={`flex items-center gap-2 p-2 rounded ${
                            darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                          } group`}
                        >
                          <Globe size={14} className="text-gray-400 flex-shrink-0" />
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => { navigateTo(entry.url); setShowFullHistory(false); }}
                          >
                            <div className={`text-sm truncate ${darkMode ? "text-white" : "text-gray-700"}`}>{entry.title}</div>
                            <div className="text-xs text-gray-400 truncate">{entry.url}</div>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(entry.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => deleteHistoryEntry(entry.id)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded"
                          >
                            <X size={14} className="text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No browsing history
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const renderSecurityPage = () => {
    if (!showSecurityPage) return null;
    
    const securityScore = [
      securitySettings.trackerBlocking,
      securitySettings.adBlocking,
      securitySettings.fingerprintProtection,
      securitySettings.dnsOverHttps,
      securitySettings.httpWarning,
    ].filter(Boolean).length;
    
    const scorePercent = Math.round((securityScore / 5) * 100);
    const scoreColor = scorePercent >= 80 ? "text-green-500" : scorePercent >= 60 ? "text-yellow-500" : "text-red-500";
    
    return (
      <div className={`min-h-full overflow-auto ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"}`}>
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Shield size={36} className="text-white" />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>Security Center</h1>
                <p className={darkMode ? "text-gray-400" : "text-gray-500"}>Protect your browsing experience</p>
              </div>
            </div>
            <div className="text-center">
              <p className={`text-4xl font-bold ${scoreColor}`}>{scorePercent}%</p>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Security Score</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white shadow-md"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <ShieldCheck size={24} className="text-green-500" />
                  </div>
                  <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>Protection Status</h3>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Tracker Blocking", enabled: securitySettings.trackerBlocking, color: "bg-green-500" },
                  { label: "Ad Blocking", enabled: securitySettings.adBlocking, color: "bg-green-500" },
                  { label: "Fingerprint Protection", enabled: securitySettings.fingerprintProtection, color: "bg-green-500" },
                  { label: "DNS over HTTPS", enabled: securitySettings.dnsOverHttps, color: "bg-green-500" },
                  { label: "HTTP Warning", enabled: securitySettings.httpWarning, color: "bg-green-500" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>{item.label}</span>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${item.enabled ? "bg-green-500" : darkMode ? "bg-gray-600" : "bg-gray-300"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.enabled ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white shadow-md"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <ShieldAlert size={24} className="text-orange-500" />
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>Today's Activity</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${darkMode ? "bg-blue-900/30" : "bg-blue-50"}`}>
                  <p className={`text-3xl font-bold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>{blockedTrackersToday}</p>
                  <p className={`text-xs ${darkMode ? "text-blue-300" : "text-blue-500"}`}>Trackers Blocked</p>
                </div>
                <div className={`p-4 rounded-xl ${darkMode ? "bg-red-900/30" : "bg-red-50"}`}>
                  <p className={`text-3xl font-bold ${darkMode ? "text-red-400" : "text-red-600"}`}>{blockedAdsToday}</p>
                  <p className={`text-xs ${darkMode ? "text-red-300" : "text-red-500"}`}>Ads Blocked</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Custom blocklist</span>
                <Button size="sm" variant="outline" onClick={() => setShowBlocklistEditor(true)}>
                  {customBlocklist.length} domains
                </Button>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl mb-6 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white shadow-md"}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
              <span className="flex items-center gap-2">
                <Lock size={20} className="text-purple-500" />
                Privacy & Security
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                  <div>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>Fingerprinting Protection</p>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Block canvas, WebGL, audio fingerprinting</p>
                  </div>
                  <div className={`w-14 h-8 rounded-full p-1 transition-colors ${securitySettings.fingerprintProtection ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <button 
                      onClick={() => setSecuritySettings(prev => ({ ...prev, fingerprintProtection: !prev.fingerprintProtection }))}
                      className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${securitySettings.fingerprintProtection ? "translate-x-6" : "translate-x-0"}`}
                    />
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>DNS over HTTPS</p>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Encrypt your DNS queries</p>
                    </div>
                    <div className={`w-14 h-8 rounded-full p-1 transition-colors ${securitySettings.dnsOverHttps ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                      <button 
                        onClick={() => setSecuritySettings(prev => ({ ...prev, dnsOverHttps: !prev.dnsOverHttps }))}
                        className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${securitySettings.dnsOverHttps ? "translate-x-6" : "translate-x-0"}`}
                      />
                    </div>
                  </div>
                  {securitySettings.dnsOverHttps && (
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <label className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>DNS Provider</label>
                      <select
                        value={securitySettings.dohProvider}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, dohProvider: e.target.value as 'cloudflare' | 'google' | 'quad9' }))}
                        className={`mt-1 w-full p-2 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"} text-sm`}
                      >
                        <option value="cloudflare">Cloudflare (1.1.1.1)</option>
                        <option value="google">Google DNS</option>
                        <option value="quad9">Quad9</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>Login Attempts</p>
                    <span className={`text-lg font-bold ${darkMode ? "text-purple-400" : "text-purple-600"}`}>{securitySettings.loginAttemptLimit}</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={securitySettings.loginAttemptLimit}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, loginAttemptLimit: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Lock after {securitySettings.loginAttemptLimit} failed attempts</p>
                </div>
                
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>Session Timeout</p>
                    <span className={`text-lg font-bold ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>{securitySettings.sessionTimeout === 0 ? "Off" : `${securitySettings.sessionTimeout}m`}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Auto-lock after inactivity</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white shadow-md"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
                  <Activity size={24} className="text-cyan-500" />
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>Request Logger</h3>
              </div>
              <Button 
                variant={showRequestLogger ? "default" : "outline"} 
                onClick={() => { setShowRequestLogger(!showRequestLogger); if (!showRequestLogger) setRequestLog([]); }} 
                className="w-full"
              >
                {showRequestLogger ? "Hide Logger" : "Show Requests"}
              </Button>
              {showRequestLogger && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {requestLog.slice(-10).reverse().map((req) => (
                    <div key={req.id} className={`p-2 rounded-lg text-xs ${req.blocked ? "bg-red-100 dark:bg-red-900/30" : darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        {req.blocked && <XCircle size={14} className="text-red-500" />}
                        <span className={`font-mono font-bold ${req.blocked ? "text-red-600" : "text-green-600"}`}>{req.method}</span>
                        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{req.hostname || 'unknown'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white shadow-md"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                  <FileText size={24} className="text-yellow-500" />
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>Audit Log</h3>
                {auditLog.length > 0 && (
                  <span className={`ml-auto px-2 py-1 rounded-full text-xs font-bold ${darkMode ? "bg-red-900/50 text-red-400" : "bg-red-100 text-red-600"}`}>
                    {auditLog.filter(e => e.severity === 'critical' || e.severity === 'error').length} alerts
                  </span>
                )}
              </div>
              <Button 
                variant={showAuditLog ? "default" : "outline"} 
                onClick={() => setShowAuditLog(!showAuditLog)} 
                className="w-full"
              >
                {showAuditLog ? "Hide Log" : "Show Events"}
              </Button>
              {showAuditLog && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {auditLog.slice(0, 10).map((entry) => (
                    <div key={entry.id} className={`p-2 rounded-lg text-xs ${
                      entry.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700' :
                      entry.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${
                          entry.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                          entry.severity === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
                          darkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>{entry.event}</span>
                        <span className={`${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white shadow-md"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Download size={24} className="text-purple-500" />
              </div>
              <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>Backup & Data</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={exportBookmarks} className="h-12">
                <Upload size={18} className="mr-2" />
                Export Data
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-12">
                <Download size={18} className="mr-2" />
                Import Data
              </Button>
              <input type="file" ref={fileInputRef} onChange={importBookmarks} accept=".json" className="hidden" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityPageOld = () => {
    if (!showSecurityPage) return null;
    
    return (
      <div className={`min-h-full p-8 ${darkMode ? "bg-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Shield size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Security Settings</h1>
              <p className={darkMode ? "text-gray-400" : "text-gray-500"}>Manage your browser privacy and security</p>
            </div>
          </div>

          <div className={`rounded-xl p-6 mb-6 ${darkMode ? "bg-gray-700" : "bg-white shadow-sm"}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
              <ShieldCheck size={20} className="text-green-500" />
              Protection Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>Tracker Blocking</p>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Block known tracking scripts and analytics</p>
                </div>
                <Switch 
                  checked={securitySettings.trackerBlocking}
                  onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, trackerBlocking: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>HTTP Warning</p>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Show warning for insecure (HTTP) connections</p>
                </div>
                <Switch 
                  checked={securitySettings.httpWarning}
                  onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, httpWarning: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>Clear History on Close</p>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Automatically clear browsing history when closing</p>
                </div>
                <Switch 
                  checked={securitySettings.clearHistoryOnClose}
                  onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, clearHistoryOnClose: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>Ad Blocking</p>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Block known advertising domains</p>
                </div>
                <Switch 
                  checked={securitySettings.adBlocking}
                  onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, adBlocking: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>Fingerprinting Protection</p>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Block canvas, WebGL, and audio fingerprinting</p>
                </div>
                <Switch 
                  checked={securitySettings.fingerprintProtection}
                  onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, fingerprintProtection: checked }))}
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>DNS over HTTPS</p>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Encrypt DNS queries for privacy</p>
                  </div>
                  <Switch 
                    checked={securitySettings.dnsOverHttps}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, dnsOverHttps: checked }))}
                  />
                </div>
                {securitySettings.dnsOverHttps && (
                  <div className="mt-3">
                    <label className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Provider</label>
                    <select
                      value={securitySettings.dohProvider}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, dohProvider: e.target.value as 'cloudflare' | 'google' | 'quad9' }))}
                      className={`mt-1 w-full p-2 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-800"} text-sm`}
                    >
                      <option value="cloudflare">Cloudflare (1.1.1.1)</option>
                      <option value="google">Google DNS</option>
                      <option value="quad9">Quad9</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>Login Attempt Limit</p>
                  <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{securitySettings.loginAttemptLimit} attempts</span>
                </div>
                <Input
                  type="range"
                  min="3"
                  max="10"
                  value={securitySettings.loginAttemptLimit}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, loginAttemptLimit: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>Session Timeout</p>
                  <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{securitySettings.sessionTimeout} min</span>
                </div>
                <Input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>0 = disabled</p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-6 mb-6 ${darkMode ? "bg-gray-700" : "bg-white shadow-sm"}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
              <ShieldAlert size={20} className="text-orange-500" />
              Protection Stats
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className={`text-2xl font-bold ${darkMode ? "text-blue-300" : "text-blue-700"}`}>{blockedTrackersToday}</p>
                <p className={`text-sm ${darkMode ? "text-blue-400" : "text-blue-600"}`}>Trackers blocked</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p className={`text-2xl font-bold ${darkMode ? "text-red-300" : "text-red-700"}`}>{blockedAdsToday}</p>
                <p className={`text-sm ${darkMode ? "text-red-400" : "text-red-600"}`}>Ads blocked</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>Custom Blocklist</p>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{customBlocklist.length} custom domains blocked</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowBlocklistEditor(true)}>
                <List size={14} className="mr-1" />
                Edit Blocklist
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Add custom tracker domain (e.g., tracker.example.com)"
                value={newTrackerDomain}
                onChange={(e) => setNewTrackerDomain(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => {
                if (newTrackerDomain && !customBlocklist.includes(newTrackerDomain)) {
                  setCustomBlocklist(prev => [...prev, newTrackerDomain]);
                  setNewTrackerDomain("");
                  showSuccess("Domain added to blocklist");
                }
              }}>
                Add
              </Button>
            </div>
          </div>

          <div className={`rounded-xl p-6 mb-6 ${darkMode ? "bg-gray-700" : "bg-white shadow-sm"}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
              <Activity size={20} className="text-purple-500" />
              Request Logger
            </h2>
            <Button variant="outline" onClick={() => {
              setShowRequestLogger(!showRequestLogger);
              if (!showRequestLogger) setRequestLog([]);
            }} className="w-full mb-4">
              {showRequestLogger ? "Hide Request Logger" : "Show Request Logger"}
            </Button>
            {showRequestLogger && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {requestLog.length === 0 ? (
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No requests logged yet. Visit a page to see requests.</p>
                ) : (
                  requestLog.slice(-20).reverse().map((req) => (
                    <div key={req.id} className={`p-2 rounded text-xs ${req.blocked ? "bg-red-100 dark:bg-red-900/30" : darkMode ? "bg-gray-600" : "bg-gray-100"}`}>
                      <div className="flex items-center gap-2">
                        {req.blocked && <XCircle size={12} className="text-red-500" />}
                        <span className={`font-mono ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{req.method}</span>
                        <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{req.hostname}</span>
                        <span className={`ml-auto ${req.status >= 400 ? "text-red-500" : "text-green-500"}`}>{req.status || "blocked"}</span>
                      </div>
                      <p className={`truncate ${darkMode ? "text-gray-500" : "text-gray-400"}`}>{req.url}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className={`rounded-xl p-6 mb-6 ${darkMode ? "bg-gray-700" : "bg-white shadow-sm"}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
              <FileText size={20} className="text-cyan-500" />
              Audit Log
            </h2>
            <div className="flex gap-4 mb-4">
              <Button variant="outline" onClick={() => setShowAuditLog(!showAuditLog)} className="flex-1">
                {showAuditLog ? "Hide Audit Log" : "Show Audit Log"}
              </Button>
              {auditLog.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => {
                  setAuditLog([]);
                  showSuccess("Audit log cleared");
                }}>
                  Clear Log
                </Button>
              )}
            </div>
            {showAuditLog && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditLog.length === 0 ? (
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No security events logged.</p>
                ) : (
                  auditLog.map((entry) => (
                    <div key={entry.id} className={`p-3 rounded text-xs ${
                      entry.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 border border-red-500' :
                      entry.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                      entry.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                      darkMode ? 'bg-gray-600' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${
                          entry.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                          entry.severity === 'error' ? 'text-red-500' :
                          entry.severity === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                          darkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>{entry.event}</span>
                        <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className={darkMode ? "text-gray-300" : "text-gray-600"}>{entry.details}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className={`rounded-xl p-6 mb-6 ${darkMode ? "bg-gray-700" : "bg-white shadow-sm"}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
              <Download size={20} className="text-purple-500" />
              Backup & Restore
            </h2>
            
            <div className="flex gap-4">
              <Button onClick={exportBookmarks} className="flex-1">
                <Upload size={16} className="mr-2" />
                Export Bookmarks
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Download size={16} className="mr-2" />
                Import Bookmarks
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={importBookmarks}
                accept=".json"
                className="hidden"
              />
            </div>
            <p className={`text-xs mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Import will replace all existing bookmarks and folders.
            </p>
          </div>

          <div className={`rounded-xl p-6 mb-6 ${darkMode ? "bg-gray-700" : "bg-white shadow-sm"}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
              <Trash2 size={20} className="text-red-500" />
              Clear Browsing Data
            </h2>
            
            <Button variant="destructive" onClick={() => setShowClearDataDialog(true)}>
              <Trash2 size={16} className="mr-2" />
              Clear Selected Data
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={lockBrowser} className="flex-1">
              <Lock size={16} className="mr-2" />
              Lock Browser
            </Button>
            <Button variant="outline" onClick={() => { setShowSecurityPage(false); setShowHomepage(true); addNewTab("about:blank"); }} className="flex-1">
              <Home size={16} className="mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderBlocklistEditor = () => {
    if (!showBlocklistEditor) return null;
    
    const allTrackers = [
      ...TRACKER_BLOCKLIST.map(t => ({ ...t, isCustom: false })),
      ...customBlocklist.map(domain => ({ domain, category: "Custom", description: "User added", isCustom: true }))
    ];
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBlocklistEditor(false)}>
        <div className={`w-[700px] max-h-[80vh] rounded-xl overflow-hidden flex flex-col ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`} onClick={e => e.stopPropagation()}>
          <div className={`p-4 border-b flex items-center justify-between ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}>
            <h2 className={`font-medium ${darkMode ? "text-white" : ""}`}>Tracker Blocklist</h2>
            <Button size="sm" variant="ghost" onClick={() => setShowBlocklistEditor(false)}>
              <X size={14} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              <p className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Default blocklist contains {TRACKER_BLOCKLIST.length} trackers. Custom entries: {customBlocklist.length}
              </p>
              <div className="space-y-2">
                {allTrackers.map((tracker, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-2 rounded ${
                    darkMode ? "bg-gray-700" : "bg-gray-50"
                  }`}>
                    <div>
                      <span className={`text-sm font-mono ${darkMode ? "text-white" : "text-gray-700"}`}>
                        {tracker.domain}
                      </span>
                      <span className={`text-xs ml-2 px-1 py-0.5 rounded ${
                        tracker.isCustom ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                      }`}>
                        {tracker.category}
                      </span>
                    </div>
                    <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {tracker.description}
                    </span>
                    {tracker.isCustom && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-red-100" onClick={() => {
                        setCustomBlocklist(prev => prev.filter(d => d !== tracker.domain));
                      }}>
                        <X size={12} className="text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const renderClearDataDialog = () => {
    if (!showClearDataDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowClearDataDialog(false)}>
        <div className={`rounded-xl p-6 w-96 ${darkMode ? "bg-gray-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
          <h3 className={`font-medium mb-4 ${darkMode ? "text-white" : ""}`}>Clear Browsing Data</h3>
          <p className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Select what data you want to clear:
          </p>
          
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={clearHistory} 
                onChange={(e) => setClearHistory(e.target.checked)}
                className="rounded"
              />
              <span className={darkMode ? "text-white" : "text-gray-700"}>Browsing History ({fullHistory.length} entries)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={clearBookmarks} 
                onChange={(e) => setClearBookmarks(e.target.checked)}
                className="rounded"
              />
              <span className={darkMode ? "text-white" : "text-gray-700"}>Bookmarks & Folders ({bookmarks.length} bookmarks)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={clearClosedTabs} 
                onChange={(e) => setClearClosedTabs(e.target.checked)}
                className="rounded"
              />
              <span className={darkMode ? "text-white" : "text-gray-700"}>Recently Closed Tabs ({closedTabs.length})</span>
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowClearDataDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={clearSelectedData} 
              className="flex-1"
              disabled={!clearHistory && !clearBookmarks && !clearClosedTabs}
            >
              Clear Selected
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderHomepage = () => (
    <div className={`min-h-full p-8 ${darkMode ? "bg-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
            {incognitoMode ? "Incognito Mode" : "In-App Browser"}
          </h1>
          <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
            {incognitoMode ? "Your browsing is private" : "Quick access to your favorite sites"}
          </p>
        </div>

        {incognitoMode && (
          <div className="mb-6 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center gap-3">
            <EyeOff size={24} className="text-purple-600" />
            <div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">You're browsing privately</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Pages you visit won't appear in your history or bookmark list</p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.querySelector('input') as HTMLInputElement;
            if (input.value) {
              let url = input.value;
              if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("lax://")) {
                if (url.includes(".") && !url.includes(" ")) {
                  url = "https://" + url;
                } else {
                  url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
                }
              }
              addNewTab(url);
            }
          }} className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search or enter URL"
              className={`w-full pl-12 pr-4 py-3 rounded-full border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-200"
              }`}
            />
          </form>
        </div>

        {!incognitoMode && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Quick Links</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowEditDialog({ type: 'quicklink' })}>
                <Edit3 size={14} className="mr-1" />
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {quickLinks.map(link => (
                <a
                  key={link.id}
                  href="#"
                  onClick={(e) => { e.preventDefault(); navigateTo(link.url); }}
                  className={`flex flex-col items-center p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                    darkMode ? "bg-gray-700" : "bg-white"
                  } group`}
                >
                  {link.favicon ? (
                    <img src={link.favicon} alt="" className="w-10 h-10 mb-2" onError={(e) => e.currentTarget.style.display = 'none'} />
                  ) : (
                    <Globe size={40} className={`mb-2 ${darkMode ? "text-gray-400" : "text-gray-400"}`} />
                  )}
                  <span className={`text-sm group-hover:text-blue-500 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>{link.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className={`rounded-lg p-4 mb-6 ${darkMode ? "bg-gray-700" : "bg-white"}`}>
          <h2 className={`text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Security</h2>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigateTo("lax://security"); }}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-50 hover:bg-gray-100"
            } transition-colors`}
          >
            <Shield size={24} className="text-blue-500" />
            <div>
              <p className={`font-medium ${darkMode ? "text-white" : "text-gray-700"}`}>Security Settings</p>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Manage privacy, tracker blocking, and more</p>
            </div>
          </a>
        </div>

        <div className={`text-center text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          Press Enter to search or enter a URL directly
        </div>
      </div>
    </div>
  );

  const renderEditDialog = () => {
    if (!showEditDialog) return null;
    
    if (showEditDialog.type === 'quicklink') {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditDialog(null)}>
          <div className={`rounded-xl p-6 w-96 max-h-96 overflow-hidden flex flex-col ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`} onClick={e => e.stopPropagation()}>
            <h3 className={`font-medium mb-4 ${darkMode ? "text-white" : ""}`}>Edit Quick Links</h3>
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-2">
                {quickLinks.map(link => (
                  <div key={link.id} className={`flex items-center gap-2 p-2 rounded ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                    {link.favicon && <img src={link.favicon} alt="" className="w-6 h-6" />}
                    <span className="flex-1 text-sm truncate dark:text-white">{link.title}</span>
                    <button onClick={() => removeQuickLink(link.id)} className="text-red-500 hover:bg-red-100 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="URL"
                value={newBookmarkTitle.split('|')[0] || ""}
                onChange={e => setNewBookmarkTitle(e.target.value + "|" + newBookmarkTitle.split('|')[1] || "")}
                className="flex-1"
              />
              <Input
                placeholder="Title"
                value={newBookmarkTitle.split('|')[1] || ""}
                onChange={e => setNewBookmarkTitle(newBookmarkTitle.split('|')[0] || "" + "|" + e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => {
                const [url, title] = newBookmarkTitle.split('|');
                if (url && title) addQuickLink(url, title);
                setNewBookmarkTitle("");
              }}>
                Add
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderFolderDialog = () => {
    if (!showFolderDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFolderDialog(false)}>
        <div className={`rounded-xl p-6 w-80 ${darkMode ? "bg-gray-800" : "bg-white"}`} onClick={e => e.stopPropagation()}>
          <h3 className={`font-medium mb-4 ${darkMode ? "text-white" : ""}`}>Create New Folder</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button onClick={() => addFolder(newFolderName)}>Create</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderLockScreen = () => (
    <div className={`min-h-screen flex items-center justify-center ${
      darkMode ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-indigo-100"
    }`}>
      <div className={`max-w-md w-full ${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-8 shadow-2xl`}>
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            darkMode ? "bg-blue-900/50" : "bg-blue-100"
          }`}>
            <Lock size={32} className="text-blue-500" />
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
            Browser Locked
          </h1>
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Enter your password to unlock the browser
          </p>
        </div>
        
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              placeholder="Enter password"
              className={`w-full pr-12 ${passwordError ? "border-red-500 focus:ring-red-500" : ""}`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
                darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          {passwordError && (
            <p className="text-sm text-red-500 text-center">
              Incorrect password. Please try again.
            </p>
          )}
          
          <Button type="submit" className="w-full" disabled={!passwordInput}>
            <KeyRound size={16} className="mr-2" />
            Unlock
          </Button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            <KeyRound size={12} className="inline mr-1" />
            Protected browser - Enter password to continue
          </p>
        </div>
      </div>
    </div>
  );

  if (isLocked) {
    return renderLockScreen();
  }

  return (
    <div className={containerClasses} ref={containerRef}>
      {renderTabBar()}
      {activeTab && renderToolbar(activeTab)}
      {renderHttpWarning()}
      
      {showIncognitoWarning && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg shadow-lg animate-pulse">
          {incognitoMode ? "Incognito mode enabled" : "Incognito mode disabled"}
        </div>
      )}
      
      <div className="flex-1 p-4 overflow-auto relative">
        <div className={`max-w-4xl mx-auto rounded-xl shadow-lg h-full ${
          darkMode ? "bg-gray-700" : "bg-white"
        }`} style={{ overflow: zoom !== 100 ? 'auto' : 'hidden' }}>
          {showPageSearch && renderPageSearch()}
          
          <div 
            className="origin-top-left transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})`, width: zoom !== 100 ? `${(100 / zoom) * 100}%` : '100%', height: zoom !== 100 ? `${(100 / zoom) * 100}%` : '100%' }}
          >
            <div className="h-full">
              {tabs.map(tab => (
                <div key={tab.id} className={`relative w-full h-full ${tab.id === activeTabId && !showHomepage && !showSecurityPage ? 'block' : 'hidden'}`}>
                  <iframe
                    ref={(el) => { if (el) iframeRefs.current.set(tab.id, el); }}
                    title={`Tab-${tab.id}`}
                    className="w-full h-full border-none rounded-xl"
                    src={tab.url}
                    onLoad={() => handleIframeLoad(tab.id)}
                    onError={() => handleIframeError(tab.id)}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-top-navigation allow-top-navigation-by-user-activation"
                  />
                  {iframeError && tab.id === activeTabId && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl">
                      <ShieldAlert className="w-16 h-16 text-yellow-500 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Site Blocked</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center px-8">
                        This site doesn't allow embedding in iframes.<br />
                        For security, please use the button below.
                      </p>
                      <button
                        onClick={() => {
                          window.open(iframeError, '_blank');
                          setIframeError(null);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                      >
                        <ExternalLink size={16} />
                        Open in New Tab
                      </button>
                      <button
                        onClick={() => setIframeError(null)}
                        className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {showHomepage && activeTabId && !showSecurityPage && (
                <div className="w-full h-full overflow-auto rounded-xl">
                  {renderHomepage()}
                </div>
              )}
              
              {showSecurityPage && (
                <div className="w-full h-full overflow-auto rounded-xl">
                  {renderSecurityPage()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {renderFolderDialog()}
      {renderEditDialog()}
      {renderFullHistory()}
      {renderBlocklistEditor()}
      {renderClearDataDialog()}

      <div className={`p-2 text-center text-xs ${darkMode ? "bg-gray-800 border-t border-gray-700 text-gray-400" : "bg-gray-50 border-t border-gray-200 text-gray-500"}`}>
        In-App Browser • {tabs.length} tab{tabs.length !== 1 ? 's' : ''} • Zoom: {zoom}% • 
        {incognitoMode ? " Incognito" : ` ${fullHistory.length} pages visited`}
        {securitySettings.trackerBlocking && ` • ${blockedTrackersToday} trackers blocked`}
      </div>
    </div>
  );
};

export default InAppBrowser;
