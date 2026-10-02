/**
 * SENTRA Global API Configuration
 * ===============================
 * Central source of truth for backend API base URL, environment detection,
 * and endpoint resolution for both local development and hosted cloud deployments.
 */

/**
 * Resolves the API base URL based on build environment and environment variables.
 * - If VITE_API_BASE_URL is set in .env or cloud hosting (e.g. https://api.sentra.domain), it is used.
 * - In local dev (import.meta.env.DEV), falls back to http://localhost:8000.
 * - In production builds where VITE_API_BASE_URL is omitted or empty, defaults to '' (same-origin relative path /api).
 */
function resolveBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return import.meta.env.DEV ? 'http://localhost:8000' : '';
}

export const API_BASE_URL: string = resolveBaseUrl();

/**
 * Returns true if the configured API URL points to a local machine address.
 */
export function isLocalhostApi(url: string = API_BASE_URL): boolean {
  if (!url) return false;
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)(:\d+)?(\/.*)?$/i.test(url);
}

export const IS_LOCAL_API: boolean = isLocalhostApi(API_BASE_URL);

/**
 * Constructs a fully qualified API endpoint URL from a relative path.
 * Handles both relative '/api/...' and absolute 'https://hosted.domain/api/...' URLs.
 */
export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return cleanPath;
  }
  return `${API_BASE_URL}${cleanPath}`;
}
