"use client";

import React from 'react';

const Popover = ({ open, onOpenChange, children }) => {
  return (
    <div className="hidden">
      {open && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50">
          <div className="absolute top-10 left-10 bg-white rounded-md shadow-lg p-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popover;