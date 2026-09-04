import { apiRequest } from './client';

export type AuthUser = Readonly<{
  id: string;
  name: string;
  email: string;
  is_admin?: boolean;
  created_at: string;
  last_login_at?: string;
  last_seen_at?: string;
}>;

export type AuthSession = Readonly<{
  access_token: string;
  token_type: string;
  user: AuthUser;
}>;

export async function sendRegistrationCode(email: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/v1/auth/registration-code', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function register(name: string, email: string, password: string, verificationCode: string, inviteCode?: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, verification_code: verificationCode, invite_code: inviteCode }),
  });
}

export async function login(email: string, password: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}


export async function forgotPassword(email: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPassword(token: string, password: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
}

export async function verifyEmail(token: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
}

export async function me(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/v1/auth/me');
}

export async function logout(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/v1/auth/logout', { method: 'POST' });
}
