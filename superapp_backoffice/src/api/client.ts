/**
 * Core API Client for Super App Gateway Backoffice
 * Routes all client-side requests through Next.js BFF API layer (/api/...)
 * with automatic 401 Silent Refresh and Session Expiry Interceptors.
 */

export class ApiError extends Error {
  status: number;
  data: any;
  code?: string;
  isBackendDown: boolean;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = typeof data === 'object' && data?.code ? data.code : undefined;
    this.isBackendDown =
      status === 503 ||
      this.code === 'BACKEND_SERVICE_DOWN' ||
      message.toLowerCase().includes('backend service is currently unreachable') ||
      message.toLowerCase().includes('fetch failed') ||
      message.toLowerCase().includes('econnrefused');
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(refreshed: boolean) => void> = [];

function onTokenRefreshed(refreshed: boolean) {
  refreshSubscribers.forEach((callback) => callback(refreshed));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (refreshed: boolean) => void) {
  refreshSubscribers.push(callback);
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: any;
  _retry?: boolean;
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers: customHeaders, _retry = false, ...restOptions } = options;

  let url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
  if (!url.startsWith('/api') && !url.startsWith('http')) {
    url = `/api/${url.replace(/^\/+/, '')}`;
  }

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `${url.includes('?') ? '&' : '?'}${queryString}`;
    }
  }

  const headers = new Headers(customHeaders);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (!isFormData && body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const requestInit: RequestInit = {
    ...restOptions,
    headers,
    body: isFormData ? body : typeof body === 'string' ? body : body !== undefined ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(url, requestInit);

  if (response.status === 204) {
    return null as T;
  }

  // 401 Unauthorized Interceptor: Attempt silent refresh with HttpOnly refresh token
  if (response.status === 401 && !_retry && !url.includes('/api/auth/login') && !url.includes('/api/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshRes.ok) {
          isRefreshing = false;
          onTokenRefreshed(true);
          return apiClient<T>(endpoint, { ...options, _retry: true });
        } else {
          isRefreshing = false;
          onTokenRefreshed(false);
          // Redirect to login if on client side
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
            window.location.href = '/login?expired=true';
          }
        }
      } catch {
        isRefreshing = false;
        onTokenRefreshed(false);
      }
    } else {
      // Wait for ongoing refresh to complete
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber((refreshed) => {
          if (refreshed) {
            resolve(apiClient<T>(endpoint, { ...options, _retry: true }));
          } else {
            reject(new ApiError('Session expired. Please log in again.', 401));
          }
        });
      });
    }
  }

  const contentType = response.headers.get('content-type');
  let data: any;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    let errorMessage =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`;

    if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('<')) {
      const matchTitle = errorMessage.match(/<title>([^<]+)<\/title>/i);
      if (matchTitle && matchTitle[1]) {
        errorMessage = `Gateway Error (${response.status}): ${matchTitle[1].replace(/fintechcenterfsa\.com\s*\|\s*/i, '').trim()}`;
      } else if (response.status === 504) {
        errorMessage = 'Gateway Timeout (504): The server took too long to respond. Please try again.';
      } else if (response.status === 502) {
        errorMessage = 'Bad Gateway (502): The upstream server is unreachable or starting up.';
      } else {
        errorMessage = `Server Error (${response.status}): Upstream service returned an error.`;
      }
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}
