import React from 'react';
import * as jose from 'jose';

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
      <header className="bg-yellow-500 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Banking Mini App</h1>
        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <>
              <div className="w-8 h-8 rounded-full bg-white text-yellow-500 flex items-center justify-center font-bold">
                {initial}
              </div>
              <span className="hidden sm:inline">Hello {userName}</span>
            </>
          ) : (
            <span className="hidden sm:inline text-indigo-100 italic">Not logged in</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold">Welcome {isAuthenticated ? 'from Banking' : 'Visitor'}</h2>
          <p className="text-gray-600">Manage your accounts and transfers seamlessly.</p>
          {isAuthenticated && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded text-sm">
              ✅ Authenticated via DSP Single Sign-On
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              💰
            </div>
            <h3 className="text-lg font-bold mb-2">My Accounts</h3>
            <p className="text-gray-600 text-sm">View and manage your bank accounts and balances.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              💸
            </div>
            <h3 className="text-lg font-bold mb-2">Transfer</h3>
            <p className="text-gray-600 text-sm">Transfer money between accounts or to others.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              💳
            </div>
            <h3 className="text-lg font-bold mb-2">Cards</h3>
            <p className="text-gray-600 text-sm">Manage your debit and credit cards.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
