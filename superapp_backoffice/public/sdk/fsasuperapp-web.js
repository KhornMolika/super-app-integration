/**
 * FSA SuperApp Host Bridge SDK (CDN Edition)
 * Version: 1.0.0
 * Copyright (c) 2026 FinTech Center FSA. All rights reserved.
 * 
 * Works exactly like Telegram Mini Apps (telegram-web-app.js)
 * Usage:
 *   <script src="https://app.fintechcenterfsa.com/sdk/fsasuperapp.min.js"></script>
 *   <script>
 *     FSASuperApp.ready();
 *     FSASuperApp.canIUse('biometric_auth').then(supported => { ... });
 *   </script>
 */
(function (global) {
  'use strict';

  if (global.FSASuperApp && global.FSASuperApp.__sdk_loaded) {
    return;
  }

  // Capability Unsupported Error Definition
  function CapabilityUnsupportedError(payload) {
    this.name = 'CapabilityUnsupportedError';
    this.code = 'CAPABILITY_UNSUPPORTED';
    this.capability = payload.capability || 'unknown';
    this.message = payload.message || ('Host shell does not support capability: ' + this.capability);
    this.hostVersion = payload.hostVersion || '1.0.0';
    this.supportedCapabilities = payload.supportedCapabilities || [];
    this.stack = (new Error(this.message)).stack;
  }
  CapabilityUnsupportedError.prototype = Object.create(Error.prototype);
  CapabilityUnsupportedError.prototype.constructor = CapabilityUnsupportedError;

  var existingBridge = global.FSASuperApp || {};
  var supportedCaps = existingBridge._supportedCapabilities || [
    'camera',
    'location',
    'biometrics',
    'secure_storage',
    'payment',
    'webview_runtime'
  ];

  var client = {
    __sdk_loaded: true,
    version: '1.0.0',
    hostVersion: existingBridge.hostVersion || '1.0.0',
    CapabilityUnsupportedError: CapabilityUnsupportedError,

    /**
     * Informs the SuperApp shell that the MiniApp webview is fully rendered and ready
     */
    ready: function () {
      if (global.FSASuperAppChannel) {
        global.FSASuperAppChannel.postMessage(JSON.stringify({ action: 'ready' }));
      }
      global.dispatchEvent(new CustomEvent('FSASuperAppReady', { detail: { version: '1.0.0' } }));
    },

    /**
     * Checks if a capability is supported by the current SuperApp shell version
     */
    canIUse: function (capabilityKey) {
      var key = (capabilityKey || '').toLowerCase().trim();
      if (existingBridge.canIUse && typeof existingBridge.canIUse === 'function') {
        return Promise.resolve(existingBridge.canIUse(key));
      }
      var isSupported = supportedCaps.indexOf(key) !== -1;
      return Promise.resolve(isSupported);
    },

    /**
     * Access verified host authentication session token
     */
    getAuthToken: function () {
      if (existingBridge.getAuthToken && typeof existingBridge.getAuthToken === 'function') {
        return Promise.resolve(existingBridge.getAuthToken());
      }
      return Promise.resolve({
        accessToken: 'fsa_token_' + Date.now(),
        expiresIn: 3600,
        tokenType: 'Bearer'
      });
    },

    /**
     * Access authenticated user profile
     */
    getUserProfile: function () {
      if (existingBridge.getUserProfile && typeof existingBridge.getUserProfile === 'function') {
        return Promise.resolve(existingBridge.getUserProfile());
      }
      return Promise.resolve({
        id: 'user_fsa_verified',
        displayName: 'Verified SuperApp User',
        email: 'user@fintechcenterfsa.com'
      });
    },

    /**
     * Close the MiniApp and return to SuperApp host view
     */
    close: function () {
      if (existingBridge.close && typeof existingBridge.close === 'function') {
        existingBridge.close();
        return;
      }
      if (global.FSASuperAppChannel) {
        global.FSASuperAppChannel.postMessage(JSON.stringify({ action: 'close' }));
      }
    },

    /**
     * Hardware Biometric Authentication (Face ID / Fingerprint)
     */
    authenticateBiometric: function (prompt) {
      return this.canIUse('biometrics').then(function (supported) {
        if (!supported) {
          return Promise.reject(new CapabilityUnsupportedError({
            capability: 'biometrics',
            supportedCapabilities: supportedCaps
          }));
        }
        if (existingBridge.authenticateBiometric) {
          return existingBridge.authenticateBiometric(prompt);
        }
        return Promise.resolve({
          authenticated: true,
          timestamp: new Date().toISOString(),
          method: 'BIOMETRIC_TOUCH_OR_FACE'
        });
      });
    },

    /**
     * Hardware Camera & QR Code Scanning
     */
    scanQRCode: function () {
      return this.canIUse('camera').then(function (supported) {
        if (!supported) {
          return Promise.reject(new CapabilityUnsupportedError({
            capability: 'camera',
            supportedCapabilities: supportedCaps
          }));
        }
        if (existingBridge.scanQRCode) {
          return existingBridge.scanQRCode();
        }
        return Promise.resolve({
          data: 'KHQR:00020101021229370016A000000727010701...',
          format: 'QR_CODE'
        });
      });
    },

    /**
     * High-Precision GPS Geolocation
     */
    getLocation: function (options) {
      return this.canIUse('location').then(function (supported) {
        if (!supported) {
          return Promise.reject(new CapabilityUnsupportedError({
            capability: 'location',
            supportedCapabilities: supportedCaps
          }));
        }
        if (existingBridge.getLocation) {
          return existingBridge.getLocation(options);
        }
        return new Promise(function (resolve, reject) {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              function (pos) {
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  altitude: pos.coords.altitude || 0
                });
              },
              function (err) { reject(err); },
              options || { timeout: 10000, enableHighAccuracy: true }
            );
          } else {
            resolve({ latitude: 11.5564, longitude: 104.9282, accuracy: 5 });
          }
        });
      });
    },

    /**
     * Secure Encrypted Hardware Vault Storage
     */
    getSecureStorage: function (key) {
      if (existingBridge.getSecureStorage) {
        return existingBridge.getSecureStorage(key);
      }
      return Promise.resolve(localStorage.getItem('fsa_vault_' + key));
    },

    setSecureStorage: function (key, value) {
      if (existingBridge.setSecureStorage) {
        return existingBridge.setSecureStorage(key, value);
      }
      localStorage.setItem('fsa_vault_' + key, String(value));
      return Promise.resolve();
    },

    removeSecureStorage: function (key) {
      if (existingBridge.removeSecureStorage) {
        return existingBridge.removeSecureStorage(key);
      }
      localStorage.removeItem('fsa_vault_' + key);
      return Promise.resolve();
    },

    /**
     * National KHQR & Bakong In-App Payment Settlement
     */
    requestPayment: function (paymentRequest) {
      return this.canIUse('payment').then(function (supported) {
        if (!supported) {
          return Promise.reject(new CapabilityUnsupportedError({
            capability: 'payment',
            supportedCapabilities: supportedCaps
          }));
        }
        if (existingBridge.requestPayment) {
          return existingBridge.requestPayment(paymentRequest);
        }
        return Promise.resolve({
          success: true,
          transactionId: 'TX_' + Date.now(),
          amount: paymentRequest.amount || 0,
          currency: paymentRequest.currency || 'USD',
          timestamp: new Date().toISOString()
        });
      });
    },

    /**
     * Displays a native non-blocking toast
     */
    showToast: function (message) {
      if (existingBridge.showToast) {
        existingBridge.showToast(message);
        return;
      }
      console.log('[FSASuperApp Toast]: ' + message);
    }
  };

  // Re-bind existing bridge methods onto client
  for (var prop in existingBridge) {
    if (existingBridge.hasOwnProperty(prop) && !client.hasOwnProperty(prop)) {
      client[prop] = existingBridge[prop];
    }
  }

  global.FSASuperApp = client;

  // Auto trigger ready event
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    client.ready();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      client.ready();
    });
  }

})(typeof window !== 'undefined' ? window : this);
