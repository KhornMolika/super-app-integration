import { NextRequest, NextResponse } from 'next/server';

// Whitelist of HTTP methods permitted through the reverse proxy to the backend
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  try {
    // 1. Enforce strict HTTP method validation
    if (!ALLOWED_METHODS.includes(request.method)) {
      return new NextResponse('Method Not Allowed', { status: 405 });
    }

    // 2. Resolve the dynamic URL paths
    const { proxy } = await params;
    const backendPath = proxy.join('/');
    const searchParams = request.nextUrl.search;

    const backendBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:3000/api/v1';
    const targetUrl = `${backendBaseUrl.replace(/\/$/, '')}/${backendPath}${searchParams}`;

    // 3. Security Check: Validate frontend session BEFORE talking to the backend
    const frontendToken = request.cookies.get('session-token')?.value;
    const authHeader = request.headers.get('authorization');

    // Exempt public paths (e.g. auth login, JWKS, public health checks)
    const isPublicPath = backendPath.startsWith('auth/') || backendPath === 'health';
    if (!frontendToken && !authHeader && !isPublicPath) {
      return new NextResponse('Unauthorized: No active session', { status: 401 });
    }

    // 4. Clone and scrub incoming headers to prevent header injection attacks
    const forwardedHeaders = new Headers();

    // Copy only safe headers from the client browser
    const headersToCopy = ['content-type', 'accept', 'accept-language', 'x-request-id'];
    headersToCopy.forEach((headerName) => {
      const value = request.headers.get(headerName);
      if (value) forwardedHeaders.set(headerName, value);
    });

    // 5. Inject secure, hidden server-to-server credentials
    if (process.env.BACKEND_INTERNAL_SECRET) {
      forwardedHeaders.set('Authorization', `Bearer ${process.env.BACKEND_INTERNAL_SECRET}`);
    } else if (authHeader) {
      forwardedHeaders.set('Authorization', authHeader);
    } else if (frontendToken) {
      forwardedHeaders.set('Authorization', `Bearer ${frontendToken}`);
    }

    // 6. Read the request body safely if the method permits it
    let body: ReadableStream | null = null;
    if (['POST', 'PUT'].includes(request.method) && request.body) {
      body = request.body;
    }

    // 7. Execute the server-side fetch to the isolated backend
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardedHeaders,
      body: body,
      // @ts-expect-error - duplex is required when forwarding a readable stream body in Node runtime
      duplex: 'half',
    });

    // 8. Extract backend response headers securely
    const responseHeaders = new Headers();
    const headersToReturn = ['content-type', 'set-cookie', 'cache-control'];
    headersToReturn.forEach((headerName) => {
      const value = backendResponse.headers.get(headerName);
      if (value) responseHeaders.set(headerName, value);
    });

    // 9. Send response data and status cleanly back to client
    const responseData = await backendResponse.blob();
    return new NextResponse(responseData, {
      status: backendResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Secure Reverse Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Export the catch-all handler for all supported HTTP methods
export {
  handleProxy as GET,
  handleProxy as POST,
  handleProxy as PUT,
  handleProxy as DELETE,
};
