"use client";

import { useState, useEffect } from 'react';

interface CameraResponse {
  error?: string;
  image?: string;
}

export default function CameraCard() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const handleCameraResponse = (callbackId: string, rawData: unknown) => {
      const response = rawData as CameraResponse | undefined;
      if (callbackId === 'camera-request') {
        setIsCapturing(false);
        if (response?.error) {
          setError(response.error);
        } else if (response?.image) {
          setPhoto(response.image);
          setError(null);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.DPSCallback = (callbackId: string, response: unknown) => {
        handleCameraResponse(callbackId, response);
      };
    }
  }, []);

  const handleOpenCamera = () => {
    setIsCapturing(true);
    setError(null);

    if (typeof window !== 'undefined' && window.DPSNativeBridge) {
      window.DPSNativeBridge.postMessage(JSON.stringify({
        action: 'openCamera',
        callbackId: 'camera-request'
      }));
    } else {
      setTimeout(() => {
        setError("Not running inside DPS Super App");
        setIsCapturing(false);
      }, 500);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Identity Verification</h2>
      </div>
      
      <p className="text-gray-500 text-sm mb-6 flex-grow">
        Take a photo of yourself to securely verify your identity for this policy.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-100">
          {error}
        </div>
      )}

      {photo ? (
        <div className="mb-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Captured" className="w-full h-40 object-cover rounded-xl shadow-sm border border-gray-200" />
          <button 
            onClick={() => setPhoto(null)} 
            className="text-xs text-gray-500 hover:text-gray-700 mt-2 underline"
          >
            Retake Photo
          </button>
        </div>
      ) : (
        <button 
          onClick={handleOpenCamera}
          disabled={isCapturing}
          className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition shadow-sm disabled:opacity-70 flex items-center justify-center space-x-2"
        >
          {isCapturing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Opening Camera...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              <span>Take Photo</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
