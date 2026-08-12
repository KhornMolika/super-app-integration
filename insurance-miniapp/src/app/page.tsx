import React from 'react';
import * as jose from 'jose';
import LocationCard from './components/LocationCard';

import CameraCard from './components/CameraCard';
import BiometricsCard from './components/BiometricsCard';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const token = params?.token;

  let userName = 'Guest';
  let initial = 'G';
  let isAuthenticated = false;

  if (token) {
    try {
      const JWKS = jose.createRemoteJWKSet(new URL('http://localhost:3000/auth/jwks'));
      const { payload } = await jose.jwtVerify(token, JWKS);
      userName = (payload.name as string) || 'User';
      initial = userName.charAt(0).toUpperCase();
      isAuthenticated = true;
    } catch (error) {
      console.error('JWT validation failed:', error);
      userName = 'Invalid Token';
      initial = '!';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-green-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Insurance Mini App</h1>
        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <>
              <div className="w-8 h-8 rounded-full bg-white text-green-600 flex items-center justify-center font-bold">
                {initial}
              </div>
              <span className="hidden sm:inline">Hello {userName}</span>
            </>
          ) : (
            <span className="hidden sm:inline text-green-100 italic">Not logged in</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold">Welcome {isAuthenticated ? 'from Insurance' : 'Visitor'}</h2>
          <p className="text-gray-600">Manage your policies and claims seamlessly.</p>
          {isAuthenticated && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
              ✅ Authenticated via DSP Single Sign-On
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              📄
            </div>
            <h3 className="text-lg font-bold mb-2">My Policies</h3>
            <p className="text-gray-600 text-sm">View and manage your active insurance policies.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              🛡️
            </div>
            <h3 className="text-lg font-bold mb-2">File a Claim</h3>
            <p className="text-gray-600 text-sm">Submit a new claim or check the status of existing ones.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              📞
            </div>
            <h3 className="text-lg font-bold mb-2">Support</h3>
            <p className="text-gray-600 text-sm">Get help from our 24/7 customer service team.</p>
          </div>

          {/* Card 4 - NEW FEATURE */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-yellow-200 border-2 relative">
            <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">NEW</div>
            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              🕒
            </div>
            <h3 className="text-lg font-bold mb-2">Claim History</h3>
            <p className="text-gray-600 text-sm">Track the historical status of your past claims in real-time.</p>
          </div>

          {/* Card 5 - NATIVE BRIDGE LOCATION */}
          <LocationCard />

          {/* Card 6 - NATIVE BRIDGE CAMERA */}
          <CameraCard />

          {/* Card 7 - NATIVE BRIDGE BIOMETRICS */}
          <BiometricsCard />
        </div>
      </main>
    </div>
  );
}
