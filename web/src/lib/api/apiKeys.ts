import { apiRequest } from './client';

export type APIKey = Readonly<{
  id: string;
  name: string;
  prefix: string;
  plaintext?: string;
  created_at: string;
  last_used_at?: string;
  usage_count: number;
}>;

export type APIKeyUsageRecord = Readonly<{
  id: string;
  api_key_id: string;
  key_name: string;
  key_prefix: string;
  method: string;
  path: string;
  occurred_at: string;
}>;

export type APIKeyUsageStats = Readonly<{
  total: number;
  daily: readonly APIKeyUsageDailyBucket[];
  by_endpoint: readonly APIKeyUsageEndpointStat[];
  by_key: readonly APIKeyUsageKeyStat[];
}>;

type APIKeyUsageDailyBucket = Readonly<{
  date: string;
  count: number;
}>;

type APIKeyUsageEndpointStat = Readonly<{
  method: string;
  path: string;
  count: number;
}>;

type APIKeyUsageKeyStat = Readonly<{
  api_key_id: string;
  key_name: string;
  key_prefix: string;
  count: number;
}>;

export type ListAPIKeyUsageInput = Readonly<{
  keyId?: string;
  limit?: number;
}>;

export type GetAPIKeyUsageStatsInput = Readonly<{
  keyId?: string;
  days?: number;
}>;

export async function listAPIKeys(): Promise<readonly APIKey[]> {
  return apiRequest<readonly APIKey[]>('/v1/api-keys');
}

export async function listAPIKeyUsage(input: ListAPIKeyUsageInput = {}): Promise<readonly APIKeyUsageRecord[]> {
  const payload = await apiRequest<{ records: readonly APIKeyUsageRecord[] }>(`/v1/api-keys/usage${usageQueryString(input)}`);
  return payload.records;
}

export async function getAPIKeyUsageStats(input: GetAPIKeyUsageStatsInput = {}): Promise<APIKeyUsageStats> {
  return apiRequest<APIKeyUsageStats>(`/v1/api-keys/usage-stats${usageStatsQueryString(input)}`);
}

export async function createAPIKey(name: string): Promise<APIKey> {
  return apiRequest<APIKey>('/v1/api-keys', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function revokeAPIKey(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/api-keys/${id}`, { method: 'DELETE' });
}

function usageQueryString(input: ListAPIKeyUsageInput): string {
  const params = new URLSearchParams();
  if (input.limit) params.set('limit', String(input.limit));
  if (input.keyId) params.set('key_id', input.keyId);
  const value = params.toString();
  return value ? `?${value}` : '';
}

function usageStatsQueryString(input: GetAPIKeyUsageStatsInput): string {
  const params = new URLSearchParams();
  if (input.days) params.set('days', String(input.days));
  if (input.keyId) params.set('key_id', input.keyId);
  const value = params.toString();
  return value ? `?${value}` : '';
}
