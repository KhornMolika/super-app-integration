"use client";

import React, { useState } from 'react';

interface IframePreviewEngineProps {
  url: string;
  reloadKey: number;
}

export default function IframePreviewEngine({ url, reloadKey }: IframePreviewEngineProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Validate and sanitize URL
  let safeUrl = url;
  if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
    safeUrl = `https://${safeUrl}`;
  }

  // Security checks
  React.useEffect(() => {
    try {
      const parsedUrl = new URL(safeUrl);
      const hostname = parsedUrl.hostname.toLowerCase();

      // 1. Enforce Protocol
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        setSecurityError(`Protocol "${parsedUrl.protocol}" is not allowed.`);
        return;
      }

      // 2. Block Localhost and Private IPs (in production/strict mode)
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]';
      const isMetadataEndpoint = hostname === '169.254.169.254';
      
      const allowLocalhost = process.env.NEXT_PUBLIC_PREVIEW_ALLOW_LOCALHOST === 'true';

      if ((isLocalhost && !allowLocalhost) || isMetadataEndpoint) {
        setSecurityError(`Access to internal network (${hostname}) is blocked for security reasons.`);
        return;
      }

      // 3. Optional: Enforce HTTPS only
      const requireHttps = process.env.NEXT_PUBLIC_PREVIEW_REQUIRE_HTTPS === 'true';
      if (requireHttps && parsedUrl.protocol !== 'https:') {
        setSecurityError('Only HTTPS URLs are allowed.');
        return;
      }

      setSecurityError(null);
    } catch (e) {
      setSecurityError('Invalid URL format.');
    }
  }, [safeUrl]);

  return (
    <div className="w-full h-full relative bg-white flex items-center justify-center">
      {securityError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 text-rose-600 p-6 text-center">
          <svg className="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span className="text-base font-bold">Security Violation</span>
          <span className="text-sm text-slate-600 mt-2 max-w-md">
            {securityError}
          </span>
        </div>
      )}

      {isLoading && !hasError && !securityError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 text-slate-400">
          <svg className="animate-spin h-8 w-8 mb-4 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Loading Mini App...</span>
        </div>
      )}

      {hasError && !securityError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 text-rose-500 p-6 text-center">
          <svg className="h-10 w-10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-sm font-medium">Failed to load Mini App</span>
          <span className="text-xs text-slate-500 mt-2 max-w-xs">
            The URL could not be reached, or the server blocked iframe embedding via X-Frame-Options/CSP.
          </span>
        </div>
      )}

      {!securityError && (
        <iframe
          key={reloadKey}
          src={safeUrl}
          className="w-full h-full border-0 absolute inset-0 z-0 bg-white"
          title="Mini App Preview"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
}
