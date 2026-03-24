"use client";

import React, { useState, useRef } from 'react';

const InAppBrowser = () => {
  const [url, setUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-2xl bg-white bg-opacity-90 rounded-xl p-6 shadow-xl">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">In-App Browser</h2>
        <p className="text-gray-600 mb-6">Browse the web without leaving our app</p>
        <form onSubmit={handleSubmit} className="mb-6">
          <input            type="url"
            defaultValue="https://example.com"
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL"
            className="w-full px-4 py-3 text-lg text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-75"
          >
            {loading ? 'Loading...' : 'Open'}
          </button>
        </form>
        <div className="relative">
          <iframe
            ref={iframeRef}
            title="In-App Browser"
            className="w-full h-96 rounded-lg border border-gray-200"
            src={url}
            onLoad={() => setLoading(false)}
          />
        </div>
        <div className="mt-4 text-sm text-gray-400">
          Tip: Use https:// links for best results
        </div>
      </div>
    </div>
  );
};

export default InAppBrowser;