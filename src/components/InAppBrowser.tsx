"use client";

import React, { useState } from 'react';

const InAppBrowser = () => {
  const [url, setUrl] = useState('https://example.com');
  
  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4">In-App Browser</h2>
      <div className="mb-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL"
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
      </div>
      <iframe 
        src={url}
        title="In-App Browser"
        className="h-48 w-full border border-gray-300 rounded-lg"
      />
    </div>
  );
};

export default InAppBrowser;