"use client";

import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, Globe } from 'lucide-react';

const InAppBrowser = () => {
  const [url, setUrl] = useState('https://example.com');
  const [inputUrl, setInputUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([ 'https://example.com' ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const validateUrl = (inputUrl: string): boolean => {
    try {
      const parsedUrl = new URL(inputUrl);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const navigateTo = (newUrl: string) => {
    if (!validateUrl(newUrl)) {
      setError('Invalid URL. Only http:// and https:// URLs are allowed.');
      return;
    }

    setError(null);
    setLoading(true);
    setUrl(newUrl);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setInputUrl(newUrl);
    
    if (iframeRef.current) {
      iframeRef.current.src = newUrl;
    }
  };

  const goBack = () => {
    if (canGoBack) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newUrl = history[newIndex];
      setUrl(newUrl);
      setInputUrl(newUrl);
      setLoading(true);
      if (iframeRef.current) {
        iframeRef.current.src = newUrl;
      }
    }
  };

  const goForward = () => {
    if (canGoForward) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newUrl = history[newIndex];
      setUrl(newUrl);
      setInputUrl(newUrl);
      setLoading(true);
      if (iframeRef.current) {
        iframeRef.current.src = newUrl;
      }
    }
  };

  const refresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(inputUrl);
  };

  const getFavicon = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  const isHttps = url.startsWith('https://');

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Chrome-like toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="max-w-4xl mx-auto">
          {/* Navigation buttons row */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={18} className="text-gray-700" />
            </button>
            <button
              onClick={goForward}
              disabled={!canGoForward}
              className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Go forward"
            >
              <ArrowRight size={18} className="text-gray-700" />
            </button>
            <button
              onClick={refresh}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Refresh"
            >
              <RotateCw size={18} className={`text-gray-700 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* URL bar */}
            <form onSubmit={handleSubmit} className="flex-1 relative">
              <div className="flex items-center bg-white border border-gray-300 rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <div className="mr-2">
                  {isHttps ? (
                    <Lock size={14} className="text-green-600" />
                  ) : (
                    <Globe size={14} className="text-gray-500" />
                  )}
                </div>
                {getFavicon(url) && (
                  <img 
                    src={getFavicon(url)!} 
                    alt="" 
                    className="w-4 h-4 mr-2"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Search or enter URL"
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                  disabled={loading}
                />
              </div>
            </form>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Browser content */}
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="mt-2 text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            title="In-App Browser"
            className="w-full h-full border-none"
            src={url}
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-2 text-center text-xs text-gray-500">
        In-App Browser • Powered by iframe
      </div>
    </div>
  );
};

export default InAppBrowser;