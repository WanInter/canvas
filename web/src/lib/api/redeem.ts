import { apiRequest, getApiBaseUrl, getStoredToken } from './client';

export type RedeemRewardType = 'points' | 'weekly_card' | 'monthly_card';
type RedeemBatchStatus = 'active' | 'disabled';
type RedeemCodeStatus = 'unused' | 'used' | 'disabled';

export type RedeemBatch = Readonly<{
  id: string;
  name: string;
  reward_type: RedeemRewardType;
  reward_value: number;
  total_count: number;
  used_count: number;
  price_cents: number;
  cost_cents: number;
  currency: string;
  channel: string;
  valid_from?: string;
  valid_until?: string;
  status: RedeemBatchStatus;
  remark: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}>;

export type RedeemCode = Readonly<{
  id: string;
  batch_id: string;
  code: string;
  code_prefix: string;
  reward_type: RedeemRewardType;
  reward_value: number;
  price_cents: number;
  currency: string;
  valid_from?: string;
  valid_until?: string;
  status: RedeemCodeStatus;
  used_by?: string;
  used_at?: string;
  created_at: string;
  updated_at: string;
}>;

export type CreateRedeemBatchInput = Readonly<{
  name: string;
  reward_type: RedeemRewardType;
  reward_value: number;
  total_count: number;
  price_cents: number;
  cost_cents: number;
  currency: string;
  channel: string;
  valid_from?: string | null;
  valid_until?: string | null;
  remark: string;
}>;

export type CreateRedeemBatchResult = Readonly<{ batch: RedeemBatch; codes: readonly RedeemCode[] }>;
export type RedeemBatchStats = Readonly<{
  total_batches: number;
  active_batches: number;
  disabled_batches: number;
  total_codes: number;
  used_codes: number;
  unused_codes: number;
  disabled_codes: number;
  points_codes: number;
  weekly_card_codes: number;
  monthly_card_codes: number;
  used_points_codes: number;
  used_weekly_card_codes: number;
  used_monthly_card_codes: number;
  used_points_value: number;
  gross_value_cents: number;
  redeemed_value_cents: number;
  cost_cents: number;
}>;
export type RedeemBatchList = Readonly<{ batches: readonly RedeemBatch[]; total: number; limit: number; offset: number; stats: RedeemBatchStats }>;
export type RedeemCodeList = Readonly<{ codes: readonly RedeemCode[]; total: number; limit: number; offset: number }>;
export type RedeemResult = Readonly<{ reward_type: RedeemRewardType; reward_value: number; message: string; balance?: number; membership_expires_at?: string }>;
export type RedeemUsage = Readonly<{ id: string; code_id: string; batch_id: string; user_id: string; code: string; reward_type: RedeemRewardType; reward_value: number; before_value: number; after_value: number; created_at: string }>;
export type RedeemUsageList = Readonly<{ usages: readonly RedeemUsage[]; total: number; limit: number; offset: number }>;


export async function redeemCode(code: string): Promise<RedeemResult> {
  return apiRequest<RedeemResult>('/v1/redeem-codes/redeem', { method: 'POST', body: JSON.stringify({ code }) });
}

export async function listMyRedeemUsages(input: Readonly<{ limit?: number; offset?: number }> = {}): Promise<RedeemUsageList> {
  const params = new URLSearchParams();
  if (input.limit) params.set('limit', String(input.limit));
  if (input.offset) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<RedeemUsageList>(`/v1/redeem-codes/usages${suffix}`);
}

export async function listRedeemBatches(input: Readonly<{ query?: string; reward_type?: string; status?: string; limit?: number; offset?: number }> = {}): Promise<RedeemBatchList> {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.reward_type) params.set('reward_type', input.reward_type);
  if (input.status) params.set('status', input.status);
  if (input.limit) params.set('limit', String(input.limit));
  if (input.offset) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<RedeemBatchList>(`/v1/admin/redeem-code-batches${suffix}`);
}

export async function createRedeemBatch(input: CreateRedeemBatchInput): Promise<CreateRedeemBatchResult> {
  return apiRequest<CreateRedeemBatchResult>('/v1/admin/redeem-code-batches', { method: 'POST', body: JSON.stringify(input) });
}

export async function listRedeemCodes(batchId: string, input: Readonly<{ query?: string; status?: string; limit?: number; offset?: number }> = {}): Promise<RedeemCodeList> {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.status) params.set('status', input.status);
  if (input.limit) params.set('limit', String(input.limit));
  if (input.offset) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<RedeemCodeList>(`/v1/admin/redeem-code-batches/${encodeURIComponent(batchId)}/codes${suffix}`);
}

export async function disableRedeemBatch(batchId: string): Promise<RedeemBatch> {
  return apiRequest<RedeemBatch>(`/v1/admin/redeem-code-batches/${encodeURIComponent(batchId)}/disable`, { method: 'POST' });
}

export async function disableRedeemCode(codeId: string): Promise<RedeemCode> {
  return apiRequest<RedeemCode>(`/v1/admin/redeem-codes/${encodeURIComponent(codeId)}/disable`, { method: 'POST' });
}

export function redeemCodesExportUrl(batchId: string): string {
  return `${getApiBaseUrl()}/v1/admin/redeem-code-batches/${encodeURIComponent(batchId)}/export`;
}

export function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
