/**
 * Auth utility functions for ARCHON
 * Manages JWT tokens and user data in localStorage
 */

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
}

export function getUser(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export function setToken(token: string): void {
  localStorage.setItem('authToken', token);
}

export function setUser(user: Record<string, unknown>): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout(): void {
  clearAuth();
  window.location.href = '/auth/login';
}
