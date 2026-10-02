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
    let clean = envUrl.trim().replace(/\/+$/, '');
    // If the base URL ends with /api (e.g. https://api.sentra.com/api), strip it
    // because endpoint paths are defined with /api (or canonicalized by buildApiUrl)
    if (clean.toLowerCase().endsWith('/api')) {
      clean = clean.slice(0, -4).replace(/\/+$/, '');
    }
    return clean;
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
 * Constructs a fully qualified API endpoint URL from a relative or absolute path.
 * Handles:
 * - Full URLs: 'http...' -> returns unchanged.
 * - Relative paths: '/health' or '/api/health' -> canonicalizes to '/api/health'.
 * - Prefixes API_BASE_URL if configured, avoiding double '/api/api/' segments.
 */
export function buildApiUrl(path: string): string {
  if (!path) return '/api';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Ensure leading slash
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If path has duplicate /api/api/, collapse to single /api/
  while (cleanPath.startsWith('/api/api/')) {
    cleanPath = cleanPath.slice(4);
  }

  // Canonicalize root endpoints like '/health' -> '/api/health', '/servers' -> '/api/servers'
  if (!cleanPath.startsWith('/api/') && cleanPath !== '/api') {
    cleanPath = `/api${cleanPath}`;
  }

  if (!API_BASE_URL) {
    return cleanPath;
  }

  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}${cleanPath}`;
}

