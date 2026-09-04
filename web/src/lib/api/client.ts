type ApiEnvelope<T> = Readonly<{
  data: T;
  request_id?: string;
  requestId?: string;
}>;

type ApiErrorEnvelope = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
  }>;
  request_id?: string;
  requestId?: string;
}>;

export class ApiClientError extends Error {
  constructor(readonly code: string, message: string, readonly requestId: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const TOKEN_KEY = 'aics_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function notifyAuthExpired(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('aics:auth-expired'));
}

export function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new ApiClientError('API_BASE_URL_MISSING', 'NEXT_PUBLIC_API_BASE_URL is not configured', 'local');
  }
  return baseUrl.replace(/\/$/, '');
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  const payload = await parseApiPayload<T>(response);
  if (!response.ok || 'error' in payload) {
    const error = 'error' in payload ? payload.error : { code: 'HTTP_ERROR', message: response.statusText };
    if (response.status === 401 || error.code === 'UNAUTHORIZED') {
      notifyAuthExpired();
    }
    throw new ApiClientError(error.code, error.message, payload.request_id ?? payload.requestId ?? 'unknown');
  }
  return payload.data;
}


async function parseApiPayload<T>(response: Response): Promise<ApiEnvelope<T> | ApiErrorEnvelope> {
  const text = await response.text();
  try {
    return JSON.parse(text) as ApiEnvelope<T> | ApiErrorEnvelope;
  } catch {
    const message = text.trim() || response.statusText || 'API returned a non-JSON response';
    return {
      error: {
        code: response.ok ? 'INVALID_JSON_RESPONSE' : 'HTTP_ERROR',
        message: response.ok ? `API returned invalid JSON: ${message}` : message,
      },
      request_id: 'unknown',
    };
  }
}

export async function apiFormRequest<T>(path: string, body: FormData, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, method: init?.method ?? 'POST', body, headers });
  const payload = await parseApiPayload<T>(response);
  if (!response.ok || 'error' in payload) {
    const error = 'error' in payload ? payload.error : { code: 'HTTP_ERROR', message: response.statusText };
    if (response.status === 401 || error.code === 'UNAUTHORIZED') {
      notifyAuthExpired();
    }
    throw new ApiClientError(error.code, error.message, payload.request_id ?? payload.requestId ?? 'unknown');
  }
  return payload.data;
}
