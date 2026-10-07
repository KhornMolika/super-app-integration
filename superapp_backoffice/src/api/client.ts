/**
 * Core API Client for DPS Webapp Backoffice
 * Routes all client-side requests through Next.js BFF API layer (/api/...)
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

/**
 * Checks whether an error is caused by the backend service being offline or unreachable
 */
export function isBackendUnreachableError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof ApiError && error.isBackendDown) return true;
  
  const status = (error as any)?.status || (error as any)?.statusCode;
  const code = (error as any)?.code || (error as any)?.data?.code;
  const msg = (error as any)?.message || (typeof error === 'string' ? error : '');
  const lowerMsg = String(msg).toLowerCase();

  return (
    code === 'BACKEND_SERVICE_DOWN' ||
    status === 503 ||
    lowerMsg.includes('backend service is currently unreachable') ||
    lowerMsg.includes('backend unreachable') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('fetch failed')
  );
}

/**
 * Formats a clean, user-friendly error message from an unknown error
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;
  if (isBackendUnreachableError(error)) {
    return 'Backend service is currently unreachable. It may be starting up or restarting. Please try again shortly.';
  }
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && (error as any).message) {
    return String((error as any).message);
  }
  return fallback;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: any;
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers: customHeaders, ...restOptions } = options;

  // Build URL with query params
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

    // If the error message is an HTML page (e.g. Cloudflare / Nginx 502/504), extract a concise message
    if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('<')) {
      const matchTitle = errorMessage.match(/<title>([^<]+)<\/title>/i);
      if (matchTitle && matchTitle[1]) {
        errorMessage = `Gateway Error (${response.status}): ${matchTitle[1].replace(/fintechcenterfsa\.com\s*\|\s*/i, '').trim()}`;
      } else if (response.status === 504) {
        errorMessage = 'Gateway Timeout (504): The server took too long to respond. Please try again.';
      } else if (response.status === 502) {
        errorMessage = 'Bad Gateway (502): The upstream server is unreachable or starting up.';
      } else {
        errorMessage = `Server Error (${response.status}): Upstream service returned an HTML error page.`;
      }
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

