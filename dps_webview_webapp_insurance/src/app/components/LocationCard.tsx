'use client';

import React, { useState, useEffect } from 'react';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    DPSNativeBridge?: {
      postMessage: (message: string) => void;
    };
    DPSCallback?: (callbackId: string, data: any) => void;
  }
}

export default function LocationCard() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Register the global callback that Flutter will invoke
    window.DPSCallback = (callbackId: string, data: any) => {
      console.log('Received from Flutter:', callbackId, data);
      if (callbackId === 'req_loc_1') {
        if (data.error) {
          setError(data.error);
          setLocation(null);
        } else {
          setLocation(data);
          setError(null);
        }
        setLoading(false);
      }
    };

    return () => {
      // Cleanup
      delete window.DPSCallback;
    };
  }, []);

  const requestLocation = () => {
    setLoading(true);
    setError(null);

    // Check if the Native Bridge exists (meaning we are inside the Flutter Super App)
    if (window.DPSNativeBridge) {
      const payload = {
        action: 'getLocation',
        callbackId: 'req_loc_1',
      };
      
      try {
        window.DPSNativeBridge.postMessage(JSON.stringify(payload));
      } catch (err) {
        console.error('Error posting to native bridge:', err);
        setError('Failed to communicate with Super App.');
        setLoading(false);
      }
    } else {
      // We are in a normal web browser, not the Super App
      setError('Native Bridge not found. Please open this app inside the DPS Super App.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-blue-200 border-2 relative">
      <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">NATIVE</div>
      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
        📍
      </div>
      <h3 className="text-lg font-bold mb-2">Device Location</h3>
      <p className="text-gray-600 text-sm mb-4">
        Uses the native bridge to fetch GPS coordinates from the host device securely.
      </p>
      
      <button 
        onClick={requestLocation}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-300"
      >
        {loading ? 'Requesting...' : 'Get Location'}
      </button>

      {location && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
          <strong>Location Received:</strong><br/>
          Lat: {location.lat}<br/>
          Lng: {location.lng}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
