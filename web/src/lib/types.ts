export type Language = 'zh' | 'en';
export type GenerationTaskStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled';
export type GenerationTaskType = 'image' | 'video';
export type AssetType = GenerationTaskType | 'audio';

export type GenerationTask = Readonly<{
  id: string;
  userId: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  model: string;
  modelName?: string;
  prompt: string;
  negativePrompt?: string;
  params: Record<string, unknown>;
  creditsUsed: number;
  resultUrls: string[];
  errorMessage?: string;
  errorCategory?: string;
  errorCode?: string;
  retryable?: boolean;
  providerTraceId?: string;
  createdAt: string;
  completedAt?: string;
  batchId?: string;
  batchIndex?: number;
}>;

export type CreativeModel = Readonly<{
  id: string;
  name: string;
  type: GenerationTaskType;
  description: string;
  tags: readonly string[];
  capabilities: readonly string[];
  paramsSchema: readonly ModelParamSchema[];
  pricingConfig?: ModelPricingConfig;
  inputLimits: ModelInputLimits;
  isNew?: boolean;
}>;

export type ModelInputLimits = Readonly<{
  referenceImages: number;
  referenceVideos: number;
  referenceAudios: number;
}>;

export type ImagePricingTier = Readonly<{
  low: number;
  medium: number;
  high: number;
}>;

export type ImagePricingConfig = Readonly<{
  tier1k: ImagePricingTier;
  tier2k: ImagePricingTier;
  tier4k: ImagePricingTier;
}>;

type VideoPricingMode = 'duration' | 'fixed';

export type VideoPricingConfig = Readonly<{
  mode: VideoPricingMode;
  credits?: number;
  creditsPerSecond?: number;
  minSeconds?: number;
  durationParam?: string;
  countParam?: string;
  resolutionParam?: string;
  resolutionMultipliers?: Readonly<Record<string, number>>;
}>;

export type ModelPricingConfig = Readonly<{
  image?: ImagePricingConfig;
  video?: VideoPricingConfig;
}>;

export type ModelParamKind = 'select' | 'number' | 'boolean' | 'text';

export type ModelParamOption = Readonly<{
  label: string;
  value: string | number | boolean;
}>;

export type ModelParamSchema = Readonly<{
  key: string;
  label: string;
  kind: ModelParamKind;
  required: boolean;
  default: string | number | boolean;
  options?: readonly ModelParamOption[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}>;

export type Asset = Readonly<{
  id: string;
  taskId?: string;
  type: AssetType;
  title: string;
  url: string;
  model: string;
  isFavorite: boolean;
  folderId?: string;
  sourceType: 'generated' | 'upload';
  createdAt: string;
  expiresAt: string;
}>;

export type AssetFolder = Readonly<{
  id: string;
  name: string;
  created_at: string;
}>;

export type BillingProduct = Readonly<{
  id: string;
  name: string;
  kind: 'credits_pack' | 'subscription';
  purchase_mode:
    | 'credits_pack'
    | 'first_order_pack'
    | 'weekly_membership'
    | 'monthly_subscription'
    | 'yearly_subscription'
    | 'monthly_value_subscription'
    | 'yearly_value_subscription';
  credits: number;
  base_credits: number;
  bonus_credits: number;
  amount_cents: number;
  currency: string;
  original_price_cents?: number;
  first_purchase_price_cents?: number;
  display_prices?: Readonly<Record<'cny' | 'usd', BillingDisplayPrice>>;
  enabled_providers: readonly string[];
  benefits: BillingProductBenefits;
  is_active: boolean;
}>;

export type PurchaseModeLabel = Readonly<{
  purchase_mode: string;
  badge_zh: string;
  badge_en: string;
}>;

export type BillingProductBenefits = Readonly<{
  base_credits: number;
  bonus_credits: number;
  membership_tier: string;
  membership_days: number;
  daily_bonus_credits: number;
  daily_free_hd_image_limit: number;
  first_order_only: boolean;
  max_purchases_per_user: number;
  summary: string;
  custom_amount_enabled: boolean;
  custom_credit_multiplier: number;
  custom_min_amount: number;
  custom_max_amount: number;
}>;

export type BillingDisplayCurrency = 'cny' | 'usd';

type BillingDisplayPrice = Readonly<{
  amount_cents: number;
  currency: BillingDisplayCurrency;
}>;

export type CreditBalance = Readonly<{
  available: number;
  plan: string;
}>;

export type RechargeRecord = Readonly<{
  id: string;
  provider: string;
  product_id: string;
  product_name: string;
  status: string;
  amount_cents: number;
  currency: string;
  credits: number;
  created_at: string;
  expires_at: string;
  paid_at?: string;
}>;

export type InvitedUserRechargeSummary = Readonly<{
  invitee_user_id: string;
  invitee_name: string;
  invitee_email: string;
  invited_at: string;
  recharge_count: number;
  paid_recharge_count: number;
  total_paid_amount_cents: number;
  total_paid_credits: number;
  last_recharge_at?: string;
  recent_records: readonly RechargeRecord[];
}>;

export type CreditConsumptionRecord = Readonly<{
  id: string;
  task_id?: string;
  task_type?: GenerationTaskType;
  task_status?: GenerationTaskStatus;
  model?: string;
  prompt?: string;
  amount: number;
  credits: number;
  reason: string;
  created_at: string;
}>;

export type CreateGenerationTaskInput = Readonly<{
  type: GenerationTaskType;
  model: string;
  prompt: string;
  negativePrompt?: string;
  params: Record<string, unknown>;
}>;

export type CreateGenerationTaskBatchInput = Readonly<{
  type: GenerationTaskType;
  model: string;
  prompts: readonly string[];
  negativePrompt?: string;
  params: Record<string, unknown>;
}>;

export type GenerationTaskBatch = Readonly<{
  id: string;
  userId: string;
  type: GenerationTaskType;
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed';
  model: string;
  modelName?: string;
  negativePrompt?: string;
  params: Record<string, unknown>;
  total: number;
  queued: number;
  processing: number;
  succeeded: number;
  failed: number;
  creditsUsed: number;
  tasks?: readonly GenerationTask[];
  createdAt: string;
  updatedAt: string;
}>;

export type EstimateGenerationCreditsInput = Readonly<{
  type: GenerationTaskType;
  model: string;
  params: Record<string, unknown>;
}>;

export type GenerationCreditEstimate = Readonly<{
  credits: number;
  params: Record<string, unknown>;
}>;
