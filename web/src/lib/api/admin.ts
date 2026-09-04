import type { BillingProduct, ImagePricingTier, InvitedUserRechargeSummary, ModelInputLimits, ModelParamSchema, ModelPricingConfig, PurchaseModeLabel, VideoPricingConfig } from '@/lib/types';
import { apiRequest } from './client';

export type AdminGenerationProvider = Readonly<{
  provider: string;
  adapter: string;
  enabled: boolean;
  base_url: string;
  api_key_configured: boolean;
  updated_at?: string;
}>;

export type AdminStorageProvider = Readonly<{
  id: string;
  provider: 'disabled' | 's3' | 'idrive' | 'aliyun-oss' | 'tencent-cos';
  endpoint_url: string;
  upload_endpoint_url: string;
  access_key_configured: boolean;
  secret_key_configured: boolean;
  bucket: string;
  region: string;
  path_style: string;
  public_base_url: string;
  signed_url_ttl_seconds: number;
  generated_asset_prefix: string;
  is_active: boolean;
  source: 'env' | 'database' | string;
  updated_at?: string;
}>;

export type AdminModel = Readonly<{
  id: string;
  name: string;
  provider: string;
  upstream_model_id: string;
  type: 'image' | 'video';
  description: string;
  tags: readonly string[];
  capabilities: readonly string[];
  paramsSchema: readonly ModelParamSchema[];
  pricingConfig: ModelPricingConfig;
  inputLimits: ModelInputLimits;
  display_order: number;
  is_enabled: boolean;
  updated_at?: string;
}>;

export type AdminBillingProduct = Readonly<BillingProduct & {
  provider_prices: Readonly<Record<string, string>>;
}>;

export type AdminPaymentChannel = Readonly<{
  id: string;
  provider: 'alipay' | 'wechat' | 'waffo';
  name: string;
  enabled: boolean;
  is_active: boolean;
  source?: string;
  alipay_app_id?: string;
  alipay_gateway_url?: string;
  alipay_notify_url?: string;
  alipay_return_url?: string;
  alipay_private_key_configured?: boolean;
  alipay_public_key_configured?: boolean;
  wechat_pay_mch_id?: string;
  wechat_pay_app_id?: string;
  wechat_pay_serial_no?: string;
  wechat_pay_notify_url?: string;
  wechat_pay_api_v3_key_configured?: boolean;
  wechat_pay_private_key_configured?: boolean;
  wechat_pay_platform_public_key_configured?: boolean;
  waffo_merchant_id?: string;
  waffo_api_base_url?: string;
  waffo_product_id?: string;
  waffo_product_id_map?: string;
  waffo_checkout_currency?: string;
  waffo_cny_per_usd?: string;
  waffo_webhook_env?: string;
  waffo_private_key_configured?: boolean;
  created_at?: string;
  updated_at?: string;
}>;

export type UpdatePaymentChannelInput = Readonly<{
  id: string;
  provider: 'alipay' | 'wechat' | 'waffo';
  name: string;
  enabled: boolean;
  is_active: boolean;
  alipay_app_id?: string;
  alipay_private_key?: string;
  alipay_public_key?: string;
  alipay_gateway_url?: string;
  alipay_notify_url?: string;
  alipay_return_url?: string;
  wechat_pay_mch_id?: string;
  wechat_pay_app_id?: string;
  wechat_pay_api_v3_key?: string;
  wechat_pay_private_key?: string;
  wechat_pay_platform_public_key?: string;
  wechat_pay_serial_no?: string;
  wechat_pay_notify_url?: string;
  waffo_merchant_id?: string;
  waffo_private_key?: string;
  waffo_api_base_url?: string;
  waffo_product_id?: string;
  waffo_product_id_map?: string;
  waffo_checkout_currency?: string;
  waffo_cny_per_usd?: string;
  waffo_webhook_env?: string;
}>;

export type AdminModelRoutingRule = Readonly<{
  id: string;
  enabled: boolean;
  task_type: 'image' | 'video';
  source_provider: string;
  source_provider_model: string;
  duration_seconds?: number;
  target_provider: string;
  target_provider_model: string;
  traffic_percent: number;
  strategy: string;
  note: string;
  created_at: string;
  updated_at: string;
}>;

export type AdminModelRoutingRuleInput = Readonly<{
  id?: string;
  enabled: boolean;
  task_type: 'image' | 'video';
  source_provider: string;
  source_provider_model: string;
  duration_seconds?: number | null;
  target_provider: string;
  target_provider_model: string;
  traffic_percent: number;
  strategy?: string;
  note?: string;
}>;




export type UserRechargePromotion = Readonly<{
  id: string;
  user_id: string;
  name: string;
  product_id?: string;
  bonus_rate_bps: number;
  min_amount_cents: number;
  max_bonus_credits: number;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}>;

export type UserRechargePromotionInput = Readonly<{
  id?: string;
  user_id: string;
  name: string;
  product_id?: string;
  bonus_rate_bps: number;
  min_amount_cents?: number;
  max_bonus_credits?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
}>;

export type AdminWorker = Readonly<{
  id: string;
  hostname: string;
  version: string;
  capabilities: readonly string[];
  concurrency: number;
  enabled: boolean;
  status: 'online' | 'busy' | 'offline' | 'disabled' | string;
  active_task_count: number;
  queued_task_count: number;
  succeeded_task_count: number;
  failed_task_count: number;
  total_task_count: number;
  last_heartbeat_at: string;
  heartbeat_interval_ms: number;
  last_task_at?: string;
  last_error_message?: string;
  created_at: string;
  updated_at: string;
}>;

export type AdminWorkerList = Readonly<{
  workers: readonly AdminWorker[];
  stats: Readonly<{
    total: number;
    online: number;
    offline: number;
    busy: number;
    capacity: number;
    active_tasks: number;
    succeeded_tasks: number;
    failed_tasks: number;
  }>;
}>;

export type AdminOrderStatusFilter = 'all' | 'pending' | 'paid' | 'succeeded' | 'failed' | 'canceled' | 'expired';

type AdminOrderPromotion = Readonly<{
  id: string;
  name?: string;
  bonus_rate_bps: number;
  base_credits: number;
  bonus_credits: number;
}>;

export type AdminOrder = Readonly<{
  id: string;
  user: Readonly<{ id: string; name: string; email: string }>;
  provider: string;
  provider_order_id?: string;
  provider_payment_id?: string;
  product_id: string;
  product_name: string;
  kind: 'credits_pack' | 'subscription' | string;
  status: 'pending' | 'paid' | 'succeeded' | 'failed' | 'canceled' | 'expired' | string;
  amount_cents: number;
  currency: string;
  credits: number;
  promotion?: AdminOrderPromotion;
  created_at: string;
  paid_at?: string;
  expires_at: string;
}>;

type AdminOrderStats = Readonly<{
  total: number;
  paid_amount_cents: number;
  paid_credits: number;
  counts: Readonly<{ pending: number; paid: number; failed: number; canceled: number; expired: number }>;
}>;

export type AdminOrderList = Readonly<{
  orders: readonly AdminOrder[];
  total: number;
  limit: number;
  offset: number;
  stats: AdminOrderStats;
  summary?: AdminOrderStats;
}>;

export type AdminTaskStatusFilter = 'all' | 'queued' | 'processing' | 'succeeded' | 'failed';
export type AdminTaskTypeFilter = 'all' | 'image' | 'video';
export type AdminTaskErrorCategoryFilter = 'all' | 'auth' | 'quota' | 'timeout' | 'parameter' | 'rate_limit' | 'storage' | 'worker' | 'provider' | 'unknown';
export type AdminTaskTimeRangeFilter = 'all' | '1h' | 'today' | 'yesterday' | '7d';
export type AdminTaskRunningStateFilter = 'all' | 'active' | 'stuck';
export type AdminTaskUpstreamStateFilter = 'all' | 'has_task_id' | 'missing_task_id' | 'repaired' | 'recoverable' | 'result_unfinished';
export type AdminTaskRetryableFilter = 'all' | 'true' | 'false';
export type AdminTaskUpstreamRequest = Readonly<{
  method: string;
  url: string;
  headers: Readonly<Record<string, string>>;
  body: unknown;
}>;

export type AdminTask = Readonly<{
  id: string;
  user: Readonly<{ id: string; name: string; email: string }>;
  type: 'image' | 'video';
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  provider: string;
  provider_model: string;
  model: string;
  model_name: string;
  prompt: string;
  negative_prompt?: string;
  params: Record<string, unknown>;
  credits_used: number;
  result_count: number;
  result_urls: readonly string[];
  error_message?: string;
  error_category?: string;
  error_code?: string;
  retryable?: boolean;
  provider_trace_id?: string;
  worker: Readonly<{
    id?: string;
    hostname?: string;
    version?: string;
    status?: string;
    last_heartbeat_at?: string;
    last_task_heartbeat_at?: string;
    locked_until?: string;
    attempt_count: number;
  }>;
  batch_id?: string;
  batch_index?: number;
  created_at: string;
  status_updated_at: string;
  processing_started_at?: string;
  next_attempt_at?: string;
  completed_at?: string;
  duration_ms?: number;
}>;

export type AdminTaskBatch = Readonly<{
  id: string;
  user: Readonly<{ id: string; name: string; email: string }>;
  type: 'image' | 'video';
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  model: string;
  model_name: string;
  negative_prompt?: string;
  params: Record<string, unknown>;
  total: number;
  queued: number;
  processing: number;
  succeeded: number;
  failed: number;
  credits_used: number;
  created_at: string;
  updated_at: string;
  tasks?: readonly AdminTask[];
}>;

type AdminTaskStats = Readonly<{
  total: number;
  credits_used: number;
  counts: Readonly<{ queued: number; processing: number; succeeded: number; failed: number }>;
  stuck_count?: number;
  stuck_task_ids?: readonly string[];
}>;

export type AdminTaskList = Readonly<{
  tasks: readonly AdminTask[];
  total: number;
  limit: number;
  offset: number;
  stats: AdminTaskStats;
  summary?: AdminTaskStats;
}>;

export type AdminTaskBatchList = Readonly<{
  batches: readonly AdminTaskBatch[];
  total: number;
  limit: number;
  offset: number;
  stats: AdminTaskStats;
  summary?: AdminTaskStats;
}>;

export type AdminBulkTaskResult = Readonly<{
  succeeded: readonly string[];
  failed: readonly Readonly<{ id: string; error: string }>[];
  affected_tasks?: number;
}>;

export type AdminAuditLog = Readonly<{
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  ip: string;
  user_agent: string;
  created_at: string;
}>;

export type AdminTaskAuditList = Readonly<{ logs: readonly AdminAuditLog[] }>;
export type AdminBulkBatchResult = AdminBulkTaskResult;

export type AdminTaskListInput = Readonly<{
  query?: string;
  status?: AdminTaskStatusFilter;
  type?: AdminTaskTypeFilter;
  worker_id?: string;
  error_category?: AdminTaskErrorCategoryFilter;
  time_range?: AdminTaskTimeRangeFilter;
  running_state?: AdminTaskRunningStateFilter;
  provider?: string;
  provider_model?: string;
  model?: string;
  batch_id?: string;
  upstream_state?: AdminTaskUpstreamStateFilter;
  retryable?: AdminTaskRetryableFilter;
  limit?: number;
  offset?: number;
}>;

type AdminCreditSources = Readonly<{
  direct_recharge: number;
  recharge_bonus: number;
  redeem_code: number;
  admin_added: number;
  signup_bonus: number;
  referral_invitee_bonus: number;
  referral_inviter_bonus: number;
  membership_daily_bonus: number;
  generation_refund?: number;
  generation_spent?: number;
  other: number;
}>;

export type AdminUser = Readonly<{
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  last_login_at?: string;
  last_seen_at?: string;
  disabled_at?: string;
  deleted_at?: string;
  referral_rewards_disabled_at?: string;
  credit_balance: number;
  credit_plan: string;
  credit_sources: AdminCreditSources;
  task_count: number;
  succeeded_count: number;
  failed_count: number;
  invite_code?: string;
  invited_by_user_id?: string;
  invited_by_name?: string;
  invited_by_email?: string;
  invited_at?: string;
  invited_count: number;
}>;

export type AdminUserList = Readonly<{
  users: readonly AdminUser[];
  total: number;
  limit: number;
  offset: number;
  counts: Readonly<{
    active: number;
    admins: number;
    disabled: number;
    deleted: number;
    failed: number;
    today_new: number;
  }>;
}>;

export type AdminOverview = Readonly<{
  generation_providers: readonly AdminGenerationProvider[];
  storage_providers: readonly AdminStorageProvider[];
  models: readonly AdminModel[];
  billing_products: readonly AdminBillingProduct[];
  effective_billing_products: readonly AdminBillingProduct[];
  payment_channels: readonly AdminPaymentChannel[];
  user_counts: Readonly<{
    total: number;
    active: number;
    deleted: number;
  }>;
}>;

export type UpdateGenerationProviderInput = Readonly<{
  provider: string;
  adapter: string;
  enabled: boolean;
  base_url: string;
  api_key?: string;
}>;

export type UpdateStorageProviderInput = Readonly<{
  id: string;
  provider: 'disabled' | 's3' | 'idrive' | 'aliyun-oss' | 'tencent-cos';
  endpoint_url: string;
  upload_endpoint_url: string;
  access_key?: string;
  secret_key?: string;
  bucket: string;
  region: string;
  path_style: string;
  public_base_url: string;
  signed_url_ttl_seconds: number;
  generated_asset_prefix: string;
  is_active: boolean;
}>;

export type AdminStorageProviderTestResult = Readonly<{
  ok: boolean;
  url: string;
  key: string;
}>;

export type UpdateAdminModelInput = Readonly<{
  id: string;
  original_id?: string;
  name: string;
  provider: string;
  upstream_model_id: string;
  type: 'image' | 'video';
  description: string;
  tags: readonly string[];
  capabilities: readonly string[];
  paramsSchema: readonly ModelParamSchema[];
  pricingConfig: ModelPricingConfig;
  inputLimits: ModelInputLimits;
  display_order: number;
  is_enabled: boolean;
}>;

type PricingTierDto = Readonly<{
  low: number;
  medium: number;
  high: number;
}>;

type ImagePricingConfigDto = Readonly<{
  tier_1k?: PricingTierDto;
  tier_2k?: PricingTierDto;
  tier_4k?: PricingTierDto;
}>;

type ModelPricingConfigDto = Readonly<{
  image?: ImagePricingConfigDto;
  video?: VideoPricingConfigDto;
}>;

type ModelInputLimitsDto = Readonly<{
  reference_images?: number;
  reference_videos?: number;
  reference_audios?: number;
}>;

type VideoPricingConfigDto = Readonly<{
  mode?: 'duration' | 'fixed';
  credits?: number;
  credits_per_second?: number;
  min_seconds?: number;
  duration_param?: string;
  count_param?: string;
  resolution_param?: string;
  resolution_multipliers?: Readonly<Record<string, number>>;
}>;

export type UpdateBillingProductInput = Readonly<{
  id: string;
  name: string;
  kind: BillingProduct['kind'];
  purchase_mode: BillingProduct['purchase_mode'];
  credits: number;
  amount_cents: number;
  original_price_cents?: number;
  first_purchase_price_cents?: number;
  currency: string;
  benefits: BillingProduct['benefits'];
  provider_prices: Readonly<Record<string, string>>;
  enabled_providers: readonly string[];
  is_active: boolean;
}>;

type AdminModelDto = Readonly<{
  id: string;
  name: string;
  provider: string;
  upstream_model_id: string;
  type: 'image' | 'video';
  description: string;
  tags: readonly string[];
  capabilities?: readonly string[];
  params_schema?: readonly ModelParamSchema[];
  pricing_config?: ModelPricingConfigDto;
  input_limits?: ModelInputLimitsDto;
  display_order?: number;
  is_enabled: boolean;
  updated_at?: string;
}>;

type AdminBillingProductDto = Readonly<{
  id: string;
  name: string;
  kind: BillingProduct['kind'];
  purchase_mode: BillingProduct['purchase_mode'];
  credits: number;
  base_credits?: number;
  bonus_credits?: number;
  amount_cents: number;
  original_price_cents?: number;
  first_purchase_price_cents?: number;
  currency: string;
  benefits?: BillingProduct['benefits'];
  display_prices?: BillingProduct['display_prices'];
  provider_prices?: Readonly<Record<string, string>>;
  enabled_providers: readonly string[];
  is_active: boolean;
}>;

type AdminOverviewDto = Readonly<{
  generation_providers: readonly AdminGenerationProvider[];
  storage_providers: readonly AdminStorageProvider[];
  models: readonly AdminModelDto[];
  billing_products: readonly AdminBillingProductDto[];
  effective_billing_products: readonly AdminBillingProductDto[];
  payment_channels?: readonly AdminPaymentChannel[];
  user_counts: Readonly<{
    total: number;
    active: number;
    deleted: number;
  }>;
}>;

export async function getAdminOverview(): Promise<AdminOverview> {
  const overview = await apiRequest<AdminOverviewDto>('/v1/admin/overview');
  const generationProviders = requireAdminArray(overview.generation_providers, 'generation_providers');
  const storageProviders = requireAdminArray(overview.storage_providers, 'storage_providers');
  const models = requireAdminArray(overview.models, 'models');
  const billingProducts = requireAdminArray(overview.billing_products, 'billing_products');
  const effectiveBillingProducts = requireAdminArray(overview.effective_billing_products, 'effective_billing_products');
  const paymentChannels = Array.isArray(overview.payment_channels) ? overview.payment_channels : [];
  return {
    generation_providers: generationProviders,
    storage_providers: storageProviders,
    models: models.map(mapAdminModel),
    billing_products: billingProducts.map(mapAdminBillingProduct),
    effective_billing_products: effectiveBillingProducts.map(mapAdminBillingProduct),
    payment_channels: paymentChannels,
    user_counts: overview.user_counts,
  };
}

export async function updateGenerationProvider(provider: string, input: UpdateGenerationProviderInput): Promise<AdminGenerationProvider> {
  return apiRequest<AdminGenerationProvider>(`/v1/admin/generation-providers/${encodeURIComponent(provider)}`, {
    method: 'PUT',
    body: JSON.stringify({ ...input, api_key: input.api_key }),
  });
}

export async function testGenerationProvider(provider: string): Promise<{ ok: boolean; message: string }> {
  return apiRequest<{ ok: boolean; message: string }>(`/v1/admin/generation-providers/${encodeURIComponent(provider)}/test`, {
    method: 'POST',
  });
}

export async function deleteGenerationProvider(provider: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/generation-providers/${encodeURIComponent(provider)}`, {
    method: 'DELETE',
  });
}

export async function listModelRoutingRules(): Promise<readonly AdminModelRoutingRule[]> {
  const payload = await apiRequest<{ rules: readonly AdminModelRoutingRule[] }>('/v1/admin/model-routing-rules');
  return payload.rules ?? [];
}

export async function upsertModelRoutingRule(input: AdminModelRoutingRuleInput): Promise<AdminModelRoutingRule> {
  const body = {
    id: input.id ?? '',
    enabled: input.enabled,
    task_type: input.task_type,
    source_provider: input.source_provider,
    source_provider_model: input.source_provider_model,
    duration_seconds: input.duration_seconds ?? null,
    target_provider: input.target_provider,
    target_provider_model: input.target_provider_model,
    traffic_percent: input.traffic_percent,
    strategy: input.strategy || 'deterministic_hash',
    note: input.note ?? '',
  };
  const id = input.id?.trim();
  if (id) {
    return apiRequest<AdminModelRoutingRule>(`/v1/admin/model-routing-rules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
  return apiRequest<AdminModelRoutingRule>('/v1/admin/model-routing-rules', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteModelRoutingRule(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/model-routing-rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateStorageProvider(id: string, input: UpdateStorageProviderInput): Promise<AdminStorageProvider> {
  return apiRequest<AdminStorageProvider>(`/v1/admin/storage-providers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function testStorageProvider(id: string): Promise<AdminStorageProviderTestResult> {
  return apiRequest<AdminStorageProviderTestResult>(`/v1/admin/storage-providers/${encodeURIComponent(id)}/test`, {
    method: 'POST',
  });
}

export async function deleteStorageProvider(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/storage-providers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateAdminModel(input: UpdateAdminModelInput): Promise<AdminModel> {
  return apiRequest<AdminModelDto>(`/v1/admin/models/${encodeURIComponent(input.original_id ?? input.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: input.id,
      name: input.name,
      provider: input.provider,
      upstream_model_id: input.upstream_model_id,
      type: input.type,
      description: input.description,
      tags: input.tags,
      capabilities: input.capabilities,
      params_schema: input.paramsSchema,
      pricing_config: toPricingConfigDto(input.pricingConfig),
      input_limits: toInputLimitsDto(input.inputLimits),
      display_order: input.display_order,
      is_enabled: input.is_enabled,
    }),
  }).then(mapAdminModel);
}

export async function deleteAdminModel(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/models/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateBillingProduct(input: UpdateBillingProductInput): Promise<AdminBillingProduct> {
  return apiRequest<AdminBillingProductDto>(`/v1/admin/billing-products/${encodeURIComponent(input.id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then(mapAdminBillingProduct);
}

export async function deleteBillingProduct(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/billing-products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updatePurchaseModeLabel(purchaseMode: string, input: Readonly<{ badge_zh: string; badge_en: string }>): Promise<PurchaseModeLabel> {
  return apiRequest<PurchaseModeLabel>(`/v1/admin/purchase-mode-labels/${encodeURIComponent(purchaseMode)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function updatePaymentChannel(input: UpdatePaymentChannelInput): Promise<AdminPaymentChannel> {
  return apiRequest<AdminPaymentChannel>(`/v1/admin/payment-channels/${encodeURIComponent(input.id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function activatePaymentChannel(id: string): Promise<AdminPaymentChannel> {
  return apiRequest<AdminPaymentChannel>(`/v1/admin/payment-channels/${encodeURIComponent(id)}/activate`, {
    method: 'POST',
  });
}

export async function deletePaymentChannel(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/payment-channels/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}


export async function listUserRechargePromotions(userId?: string): Promise<readonly UserRechargePromotion[]> {
  const params = new URLSearchParams();
  if (userId) params.set('user_id', userId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await apiRequest<{ promotions: readonly UserRechargePromotion[] }>(`/v1/admin/user-recharge-promotions${suffix}`);
  return payload.promotions ?? [];
}

export async function upsertUserRechargePromotion(input: UserRechargePromotionInput): Promise<UserRechargePromotion> {
  const id = input.id || `promo_${Date.now()}`;
  return apiRequest<UserRechargePromotion>(`/v1/admin/user-recharge-promotions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      user_id: input.user_id,
      name: input.name,
      product_id: input.product_id ?? '',
      bonus_rate_bps: input.bonus_rate_bps,
      min_amount_cents: input.min_amount_cents ?? 0,
      max_bonus_credits: input.max_bonus_credits ?? 0,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      is_active: input.is_active,
    }),
  });
}

export async function deleteUserRechargePromotion(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/user-recharge-promotions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function listAdminOrders(input: Readonly<{ query?: string; status?: AdminOrderStatusFilter; provider?: string; limit?: number; offset?: number }> = {}): Promise<AdminOrderList> {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.status) params.set('status', input.status);
  if (input.provider) params.set('provider', input.provider);
  if (input.limit) params.set('limit', String(input.limit));
  if (input.offset) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<AdminOrderList>(`/v1/admin/orders${suffix}`);
}

export type AdminPaymentActionResult = Readonly<{ event_id: string; status: string }>;

export async function syncAdminOrderStatus(id: string): Promise<AdminPaymentActionResult> {
  return apiRequest<AdminPaymentActionResult>(`/v1/admin/orders/${encodeURIComponent(id)}/sync-status`, { method: 'POST' });
}

export async function manualCompleteAdminOrder(id: string, input: Readonly<{ provider_payment_id?: string; reason?: string }> = {}): Promise<AdminPaymentActionResult> {
  return apiRequest<AdminPaymentActionResult>(`/v1/admin/orders/${encodeURIComponent(id)}/manual-complete`, { method: 'POST', body: JSON.stringify(input) });
}

export async function listAdminWorkers(): Promise<AdminWorkerList> {
  return apiRequest<AdminWorkerList>('/v1/admin/workers');
}

export async function updateAdminWorker(id: string, input: Readonly<{ enabled?: boolean; concurrency?: number }>): Promise<AdminWorker> {
  return apiRequest<AdminWorker>(`/v1/admin/workers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

function adminTaskListSuffix(input: AdminTaskListInput): string {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.status) params.set('status', input.status);
  if (input.type) params.set('type', input.type);
  if (input.worker_id) params.set('worker_id', input.worker_id);
  if (input.error_category) params.set('error_category', input.error_category);
  if (input.time_range) params.set('time_range', input.time_range);
  if (input.running_state) params.set('running_state', input.running_state);
  if (input.provider) params.set('provider', input.provider);
  if (input.provider_model) params.set('provider_model', input.provider_model);
  if (input.model) params.set('model', input.model);
  if (input.batch_id) params.set('batch_id', input.batch_id);
  if (input.upstream_state) params.set('upstream_state', input.upstream_state);
  if (input.retryable) params.set('retryable', input.retryable);
  if (input.limit) params.set('limit', String(input.limit));
  if (input.offset) params.set('offset', String(input.offset));
  return params.toString() ? `?${params.toString()}` : '';
}

export async function listAdminTasks(input: AdminTaskListInput = {}): Promise<AdminTaskList> {
  return apiRequest<AdminTaskList>(`/v1/admin/tasks${adminTaskListSuffix(input)}`);
}

export async function listAdminTaskBatches(input: AdminTaskListInput = {}): Promise<AdminTaskBatchList> {
  return apiRequest<AdminTaskBatchList>(`/v1/admin/task-batches${adminTaskListSuffix(input)}`);
}

export async function getAdminTaskBatch(id: string): Promise<AdminTaskBatch> {
  return apiRequest<AdminTaskBatch>(`/v1/admin/task-batches/${encodeURIComponent(id)}`);
}

export async function cancelAdminTask(id: string): Promise<AdminTask> {
  return apiRequest<AdminTask>(`/v1/admin/tasks/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}

export async function syncAdminTaskStatus(id: string): Promise<AdminTask> {
  return apiRequest<AdminTask>(`/v1/admin/tasks/${encodeURIComponent(id)}/sync-status`, { method: 'POST' });
}

export async function deleteAdminTask(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function bulkSyncAdminTasks(ids: readonly string[]): Promise<AdminBulkTaskResult> {
  return apiRequest<AdminBulkTaskResult>('/v1/admin/tasks/bulk/sync-status', { method: 'POST', body: JSON.stringify({ task_ids: ids }) });
}

export async function bulkRequeueAdminTasks(ids: readonly string[], reason = 'admin_bulk_requeue'): Promise<AdminBulkTaskResult> {
  return apiRequest<AdminBulkTaskResult>('/v1/admin/tasks/bulk/requeue', { method: 'POST', body: JSON.stringify({ task_ids: ids, reason }) });
}

export async function bulkCancelAdminTasks(ids: readonly string[]): Promise<AdminBulkTaskResult> {
  return apiRequest<AdminBulkTaskResult>('/v1/admin/tasks/bulk/cancel', { method: 'POST', body: JSON.stringify({ task_ids: ids }) });
}

export async function bulkDeleteAdminTasks(ids: readonly string[]): Promise<AdminBulkTaskResult> {
  return apiRequest<AdminBulkTaskResult>('/v1/admin/tasks/bulk', { method: 'DELETE', body: JSON.stringify({ task_ids: ids }) });
}

export async function retryAdminTask(id: string): Promise<AdminTask> {
  return apiRequest<AdminTask>(`/v1/admin/tasks/${encodeURIComponent(id)}/retry`, { method: 'POST' });
}

export async function requeueAdminTask(id: string, reason = ''): Promise<AdminTask> {
  return apiRequest<AdminTask>(`/v1/admin/tasks/${encodeURIComponent(id)}/requeue`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function setAdminTaskUpstreamTaskID(id: string, upstreamTaskID: string): Promise<AdminTask> {
  return apiRequest<AdminTask>(`/v1/admin/tasks/${encodeURIComponent(id)}/upstream-task-id`, { method: 'POST', body: JSON.stringify({ upstream_task_id: upstreamTaskID }) });
}

export async function listAdminTaskAudit(id: string): Promise<AdminTaskAuditList> {
  return apiRequest<AdminTaskAuditList>(`/v1/admin/tasks/${encodeURIComponent(id)}/audit`);
}

export async function getAdminTaskUpstreamRequest(id: string): Promise<AdminTaskUpstreamRequest> {
  return apiRequest<AdminTaskUpstreamRequest>(`/v1/admin/tasks/${encodeURIComponent(id)}/upstream-request`);
}

export async function createAdminTaskNote(id: string, note: string): Promise<{ id: string; note: string }> {
  return apiRequest<{ id: string; note: string }>(`/v1/admin/tasks/${encodeURIComponent(id)}/notes`, { method: 'POST', body: JSON.stringify({ note }) });
}

export async function cancelAdminTaskBatch(id: string): Promise<{ id: string; canceled: number }> {
  return apiRequest<{ id: string; canceled: number }>(`/v1/admin/task-batches/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}

export async function bulkCancelAdminTaskBatches(ids: readonly string[]): Promise<AdminBulkBatchResult> {
  return apiRequest<AdminBulkBatchResult>('/v1/admin/task-batches/bulk/cancel', { method: 'POST', body: JSON.stringify({ batch_ids: ids }) });
}

export async function bulkSyncAdminTaskBatches(ids: readonly string[]): Promise<AdminBulkBatchResult> {
  return apiRequest<AdminBulkBatchResult>('/v1/admin/task-batches/bulk/sync-status', { method: 'POST', body: JSON.stringify({ batch_ids: ids }) });
}

export type AdminUserStatusFilter = 'active' | 'admin' | 'disabled' | 'deleted' | 'failed' | 'today' | 'all';
export type AdminUserSortField = 'created_at' | 'last_seen_at' | 'credit_balance' | 'succeeded_count' | 'failed_count' | 'task_count' | 'email' | 'name';
export type AdminSortOrder = 'asc' | 'desc';

export async function listAdminUsers(input: Readonly<{ query?: string; status?: AdminUserStatusFilter; sort?: AdminUserSortField; order?: AdminSortOrder; limit?: number; offset?: number }> = {}): Promise<AdminUserList> {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.status) params.set('status', input.status);
  if (input.sort) params.set('sort', input.sort);
  if (input.order) params.set('order', input.order);
  if (input.limit) params.set('limit', String(input.limit));
  if (input.offset) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<AdminUserList>(`/v1/admin/users${suffix}`);
}

export type UpdateAdminUserInput = Readonly<{ id: string; is_admin?: boolean; disabled?: boolean; deleted?: boolean; credit_balance?: number; referral_rewards_disabled?: boolean }>;

export async function updateAdminUser(input: UpdateAdminUserInput): Promise<AdminUser> {
  const { id, ...body } = input;
  return apiRequest<AdminUser>(`/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function resetAdminUserPassword(input: Readonly<{ id: string; password: string }>): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/v1/admin/users/${encodeURIComponent(input.id)}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password: input.password }),
  });
}

export type AdminInvitedUserPage = Readonly<{
  users: readonly InvitedUserRechargeSummary[];
  nextCursor?: string;
}>;

export async function listAdminInvitedUsers(input: Readonly<{ userID: string; limit?: number; cursor?: string }>): Promise<AdminInvitedUserPage> {
  const params = new URLSearchParams();
  if (input.limit) params.set('limit', String(input.limit));
  if (input.cursor) params.set('cursor', input.cursor);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await apiRequest<{ users: readonly InvitedUserRechargeSummary[]; next_cursor?: string }>(`/v1/admin/users/${encodeURIComponent(input.userID)}/invited-users${suffix}`);
  return { users: payload.users, nextCursor: payload.next_cursor };
}

function mapAdminModel(item: AdminModelDto): AdminModel {
  return {
    ...item,
    capabilities: item.capabilities ?? [],
    paramsSchema: item.params_schema ?? [],
    pricingConfig: fromPricingConfigDto(item.pricing_config),
    inputLimits: fromInputLimitsDto(item.input_limits),
    display_order: item.display_order ?? 100,
  };
}

function fromInputLimitsDto(limits?: ModelInputLimitsDto): ModelInputLimits {
  return {
    referenceImages: limits?.reference_images ?? 0,
    referenceVideos: limits?.reference_videos ?? 0,
    referenceAudios: limits?.reference_audios ?? 0,
  };
}

function toInputLimitsDto(limits: ModelInputLimits): ModelInputLimitsDto {
  return {
    reference_images: limits.referenceImages,
    reference_videos: limits.referenceVideos,
    reference_audios: limits.referenceAudios,
  };
}

function mapAdminBillingProduct(item: AdminBillingProductDto): AdminBillingProduct {
  return {
    ...item,
    base_credits: item.base_credits ?? item.benefits?.base_credits ?? item.credits,
    bonus_credits: item.bonus_credits ?? item.benefits?.bonus_credits ?? 0,
    benefits: normalizeAdminProductBenefits(item.benefits, item.credits),
    display_prices: item.display_prices,
    provider_prices: item.provider_prices ?? {},
  };
}

function requireAdminArray<T>(value: readonly T[] | undefined, field: string): readonly T[] {
  if (Array.isArray(value)) {
    return value;
  }
  throw new Error(`Admin overview field "${field}" is missing or invalid`);
}

function normalizeAdminProductBenefits(benefits: Partial<BillingProduct['benefits']> | undefined, credits: number): BillingProduct['benefits'] {
  const fallback = emptyProductBenefits(credits);
  return {
    ...fallback,
    ...benefits,
    base_credits: Number(benefits?.base_credits ?? fallback.base_credits),
    bonus_credits: Number(benefits?.bonus_credits ?? fallback.bonus_credits),
    membership_days: Number(benefits?.membership_days ?? fallback.membership_days),
    daily_bonus_credits: Number(benefits?.daily_bonus_credits ?? fallback.daily_bonus_credits),
    daily_free_hd_image_limit: Number(benefits?.daily_free_hd_image_limit ?? fallback.daily_free_hd_image_limit),
    first_order_only: Boolean(benefits?.first_order_only ?? fallback.first_order_only),
    max_purchases_per_user: Number(benefits?.max_purchases_per_user ?? fallback.max_purchases_per_user),
    custom_amount_enabled: Boolean(benefits?.custom_amount_enabled ?? fallback.custom_amount_enabled),
    custom_credit_multiplier: Number(benefits?.custom_credit_multiplier ?? fallback.custom_credit_multiplier),
    custom_min_amount: Number(benefits?.custom_min_amount ?? fallback.custom_min_amount),
    custom_max_amount: Number(benefits?.custom_max_amount ?? fallback.custom_max_amount),
  };
}

function emptyProductBenefits(credits: number): BillingProduct['benefits'] {
  return {
    base_credits: credits,
    bonus_credits: 0,
    membership_tier: '',
    membership_days: 0,
    daily_bonus_credits: 0,
    daily_free_hd_image_limit: 0,
    first_order_only: false,
    max_purchases_per_user: 0,
    summary: '',
    custom_amount_enabled: false,
    custom_credit_multiplier: 10,
    custom_min_amount: 1,
    custom_max_amount: 0,
  };
}

function fromPricingConfigDto(config?: ModelPricingConfigDto): ModelPricingConfig {
  return {
    ...(config?.image ? { image: {
      tier1k: fromPricingTierDto(config.image.tier_1k),
      tier2k: fromPricingTierDto(config.image.tier_2k),
      tier4k: fromPricingTierDto(config.image.tier_4k),
    } } : {}),
    ...(config?.video ? { video: fromVideoPricingConfigDto(config.video) } : {}),
  };
}

function fromPricingTierDto(tier?: PricingTierDto): ImagePricingTier {
  return {
    low: tier?.low ?? 0,
    medium: tier?.medium ?? 0,
    high: tier?.high ?? 0,
  };
}

function toPricingConfigDto(config: ModelPricingConfig): ModelPricingConfigDto {
  return {
    ...(config.image ? { image: {
      tier_1k: toPricingTierDto(config.image.tier1k),
      tier_2k: toPricingTierDto(config.image.tier2k),
      tier_4k: toPricingTierDto(config.image.tier4k),
    } } : {}),
    ...(config.video ? { video: toVideoPricingConfigDto(config.video) } : {}),
  };
}

function toPricingTierDto(tier: ImagePricingTier): PricingTierDto {
  return {
    low: tier.low,
    medium: tier.medium,
    high: tier.high,
  };
}

function fromVideoPricingConfigDto(config: VideoPricingConfigDto): VideoPricingConfig {
  return {
    mode: config.mode === 'fixed' ? 'fixed' : 'duration',
    credits: config.credits,
    creditsPerSecond: config.credits_per_second,
    minSeconds: config.min_seconds,
    durationParam: config.duration_param,
    countParam: config.count_param,
    resolutionParam: config.resolution_param,
    resolutionMultipliers: config.resolution_multipliers,
  };
}

function toVideoPricingConfigDto(config: VideoPricingConfig): VideoPricingConfigDto {
  return {
    mode: config.mode,
    credits: config.credits,
    credits_per_second: config.creditsPerSecond,
    min_seconds: config.minSeconds,
    duration_param: config.durationParam,
    count_param: config.countParam,
    resolution_param: config.resolutionParam,
    resolution_multipliers: config.resolutionMultipliers,
  };
}

// ==================== Canvas 原有管理功能 API ====================

// AI 调用日志
export type AdminAILog = Readonly<{
  id: string;
  user_id: string;
  user_display_name: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  status: string;
  error?: string;
  created_at: string;
}>;

export type AdminAILogList = Readonly<{
  items: readonly AdminAILog[];
  total: number;
}>;

export async function listAILogs(page: number, pageSize: number): Promise<AdminAILogList> {
  return apiRequest<AdminAILogList>(`/v1/admin/ai-logs?page=${page}&pageSize=${pageSize}`, { method: 'GET' });
}

export async function deleteAILogs(before: string): Promise<void> {
  return apiRequest<void>('/v1/admin/ai-logs', { method: 'DELETE', body: JSON.stringify({ before }) });
}

// 积分日志
export type AdminCreditLog = Readonly<{
  id: string;
  user_id: string;
  user_display_name: string;
  type: string;
  amount: number;
  balance: number;
  related_id?: string;
  remark?: string;
  extra?: string;
  created_at: string;
}>;

export type AdminCreditLogList = Readonly<{
  items: readonly AdminCreditLog[];
  total: number;
}>;

export async function listCreditLogs(page: number, pageSize: number, keyword?: string): Promise<AdminCreditLogList> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (keyword) params.set('keyword', keyword);
  return apiRequest<AdminCreditLogList>(`/v1/admin/credit-logs?${params}`, { method: 'GET' });
}

export async function createCreditLog(log: { user_id: string; type: string; amount: number; remark?: string }): Promise<AdminCreditLog> {
  return apiRequest<AdminCreditLog>('/v1/admin/credit-logs', { method: 'POST', body: JSON.stringify(log) });
}

export async function deleteCreditLog(id: string): Promise<void> {
  return apiRequest<void>(`/v1/admin/credit-logs/${id}`, { method: 'DELETE' });
}

// Agent 技能管理
export type AdminAgentSkill = Readonly<{
  id: string;
  name: string;
  description: string;
  category: string;
  tags: readonly string[];
  content: string;
  file_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}>;

export type AdminAgentSkillFile = Readonly<{
  id: string;
  skill_id: string;
  name: string;
  path: string;
  content: string;
  created_at: string;
}>;

export async function listAgentSkills(): Promise<readonly AdminAgentSkill[]> {
  return apiRequest<readonly AdminAgentSkill[]>('/v1/admin/agent-skills', { method: 'GET' });
}

export async function getAgentSkillFiles(skillId: string): Promise<readonly AdminAgentSkillFile[]> {
  return apiRequest<readonly AdminAgentSkillFile[]>(`/v1/admin/agent-skills/${skillId}/files`, { method: 'GET' });
}

export async function saveAgentSkill(skill: Partial<AdminAgentSkill> & { files?: readonly AdminAgentSkillFile[] }): Promise<AdminAgentSkill> {
  return apiRequest<AdminAgentSkill>('/v1/admin/agent-skills', { method: 'POST', body: JSON.stringify(skill) });
}

export async function deleteAgentSkill(id: string): Promise<void> {
  return apiRequest<void>(`/v1/admin/agent-skills/${id}`, { method: 'DELETE' });
}

// 素材库管理
export type AdminAsset = Readonly<{
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'audio';
  cover_url: string;
  tags: readonly string[];
  category: string;
  description: string;
  content: string;
  url: string;
  created_at: string;
  updated_at: string;
}>;

export type AdminAssetList = Readonly<{
  items: readonly AdminAsset[];
  tags: readonly string[];
  total: number;
}>;

export async function listAssets(page: number, pageSize: number, category?: string, keyword?: string): Promise<AdminAssetList> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (category) params.set('category', category);
  if (keyword) params.set('keyword', keyword);
  return apiRequest<AdminAssetList>(`/v1/admin/assets?${params}`, { method: 'GET' });
}

export async function saveAsset(asset: Partial<AdminAsset>): Promise<AdminAsset> {
  return apiRequest<AdminAsset>('/v1/admin/assets', { method: 'POST', body: JSON.stringify(asset) });
}

export async function deleteAsset(id: string): Promise<void> {
  return apiRequest<void>(`/v1/admin/assets/${id}`, { method: 'DELETE' });
}

// 提示词管理
export type AdminPrompt = Readonly<{
  id: string;
  title: string;
  content: string;
  category: string;
  tags: readonly string[];
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}>;

export type AdminPromptList = Readonly<{
  items: readonly AdminPrompt[];
  total: number;
}>;

export async function listPrompts(page: number, pageSize: number, category?: string, keyword?: string): Promise<AdminPromptList> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (category) params.set('category', category);
  if (keyword) params.set('keyword', keyword);
  return apiRequest<AdminPromptList>(`/v1/admin/prompts?${params}`, { method: 'GET' });
}

export async function savePrompt(prompt: Partial<AdminPrompt>): Promise<AdminPrompt> {
  return apiRequest<AdminPrompt>('/v1/admin/prompts', { method: 'POST', body: JSON.stringify(prompt) });
}

export async function deletePrompt(id: string): Promise<void> {
  return apiRequest<void>(`/v1/admin/prompts/${id}`, { method: 'DELETE' });
}

export async function batchDeletePrompts(ids: readonly string[]): Promise<void> {
  return apiRequest<void>('/v1/admin/prompts/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) });
}
