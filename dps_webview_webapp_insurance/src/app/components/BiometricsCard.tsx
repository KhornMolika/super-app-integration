"use client";

import { useState, useEffect } from 'react';

interface AuthResponse {
  error?: string;
  success?: boolean;
}

export default function BiometricsCard() {
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const handleAuthResponse = (callbackId: string, rawData: unknown) => {
      const response = rawData as AuthResponse | undefined;
      if (callbackId === 'auth-request') {
        setIsAuthenticating(false);
        if (response?.error) {
          setError(response.error);
        } else if (response?.success) {
          setSuccess(true);
          setError(null);
        }
      }
    };

    if (typeof window !== 'undefined') {
      const originalCallback = window.DPSCallback;
      window.DPSCallback = (callbackId: string, response: unknown) => {
        if (callbackId === 'auth-request') {
          handleAuthResponse(callbackId, response);
        } else if (originalCallback) {
          originalCallback(callbackId, response);
        }
      };
    }
  }, []);

  const handleAuthenticate = () => {
    setIsAuthenticating(true);
    setError(null);

    if (typeof window !== 'undefined' && window.DPSNativeBridge) {
      window.DPSNativeBridge.postMessage(JSON.stringify({
        action: 'authenticate',
        callbackId: 'auth-request'
      }));
    } else {
      setTimeout(() => {
        setError("Not running inside DPS Super App");
        setIsAuthenticating(false);
      }, 500);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Fast Approval</h2>
      </div>
      
      <p className="text-gray-500 text-sm mb-6 flex-grow">
        Sign this contract instantly using Biometrics (FaceID or Fingerprint).
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-100">
          {error}
        </div>
      )}

      {success ? (
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-center space-x-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-green-700 font-medium text-lg">Verified Successfully</span>
        </div>
      ) : (
        <button 
          onClick={handleAuthenticate}
          disabled={isAuthenticating}
          className="w-full py-3 px-4 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition shadow-sm disabled:opacity-70 flex items-center justify-center space-x-2"
        >
          {isAuthenticating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
              <span>Scan Face / Fingerprint</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
