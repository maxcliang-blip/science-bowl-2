"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl w-full bg-white bg-opacity-95 rounded-xl p-8 shadow-xl text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-2">Welcome to Your App</h1>
        <p className="text-xl text-gray-600 mb-6">
          Explore the web without leaving our application
        </p>
        <Link           to="/browser"
          className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
        >
          Open In-App Browser
        </Link>
        <div className="absolute bottom-4 right-4">
          <MadeWithDyad />
        </div>
      </div>
    </div>
  );
};

export default Index;