import type { AdminBillingProduct, AdminGenerationProvider, AdminModel, AdminStorageProvider } from '@/lib/api/admin';
import type { BillingProduct } from '@/lib/types';
import {
  buildModelListSnapshot,
  cloneEditableModelState,
  editableModelSignature,
  editableInputLimitsFromModel,
  editablePricingConfigFromModel,
  editableParamsFromSchema,
  emptyEditableModelState,
  type EditableModelState,
  type ModelListSnapshot,
} from './modelEditorUtils';

type ProviderSavedState = Readonly<{
  id: string;
  adapter: string;
  enabled: boolean;
  baseURL: string;
  configured: boolean;
}>;

export type ProviderForm = {
  id: string;
  adapter: string;
  enabled: boolean;
  baseURL: string;
  apiKey: string;
  configured: boolean;
  isDraft: boolean;
  savedState: ProviderSavedState;
};

export type StorageProviderForm = {
  id: string;
  provider: AdminStorageProvider['provider'];
  endpointURL: string;
  uploadEndpointURL: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  pathStyle: string;
  publicBaseURL: string;
  signedURLTTLSeconds: number;
  generatedAssetPrefix: string;
  source: string;
  accessKeyConfigured: boolean;
  secretKeyConfigured: boolean;
  isActive: boolean;
  isDraft: boolean;
};

export type ModelForm = EditableModelState & {
  isDraft: boolean;
  savedState: EditableModelState;
  listSnapshot: ModelListSnapshot;
};

export type ProductForm = {
  id: string;
  name: string;
  kind: BillingProduct['kind'];
  purchaseMode: BillingProduct['purchase_mode'];
  credits: number;
  amountCents: number;
  originalPriceCents?: number;
  firstPurchasePriceCents?: number;
  currency: string;
  benefitsText: string;
  providerPricesText: string;
  enabledProviders: string[];
  isActive: boolean;
  isDraft: boolean;
};

export type ProviderEntry = readonly [string, ProviderForm];
export type StorageProviderEntry = readonly [string, StorageProviderForm];
export type ModelEntry = readonly [string, ModelForm];
export type ProductEntry = readonly [string, ProductForm];

export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2';
export const PROVIDER_IDS = ['stripe', 'paypal', 'alipay', 'wechat', 'waffo'] as const;
export const GENERATION_PROVIDER_ADAPTERS = ['image_openai', 'image_openai_grsai', 'image_gemini', 'image_waninter_async', 'video_openai', 'video_volcengine_ark', 'video_google_veo', 'video_veo_apexer', 'video_vjimeng', 'video_openai_otuapi', 'video_openai_shishi', 'video_xinghe', 'video_jimeng_dimensio', 'video_waninter'] as const;

const EMPTY_PROVIDER_PRICES_TEXT = '{}';
const DRAFT_ID_SLICE_START = 2;
const DRAFT_ID_SLICE_END = 8;

export function providerForm(item: AdminGenerationProvider): ProviderForm {
  const savedState = {
    id: item.provider,
    adapter: item.adapter,
    enabled: item.enabled,
    baseURL: item.base_url,
    configured: item.api_key_configured,
  };
  return {
    ...savedState,
    apiKey: '',
    isDraft: false,
    savedState,
  };
}

export function emptyProviderForm(): ProviderForm {
  const savedState = { id: '', adapter: GENERATION_PROVIDER_ADAPTERS[0], enabled: true, baseURL: '', configured: false };
  return {
    ...savedState,
    apiKey: '',
    isDraft: true,
    savedState,
  };
}

export function isProviderFormDirty(form: ProviderForm): boolean {
  if (form.isDraft) return true;
  return form.id !== form.savedState.id
    || form.adapter !== form.savedState.adapter
    || form.enabled !== form.savedState.enabled
    || form.baseURL !== form.savedState.baseURL
    || form.apiKey.trim().length > 0;
}

export function resetProviderForm(form: ProviderForm): ProviderForm {
  return {
    ...form,
    id: form.savedState.id,
    adapter: form.savedState.adapter,
    enabled: form.savedState.enabled,
    baseURL: form.savedState.baseURL,
    apiKey: '',
    configured: form.savedState.configured,
  };
}

export function storageProviderForm(item: AdminStorageProvider): StorageProviderForm {
  return {
    id: item.id,
    provider: item.provider,
    endpointURL: item.endpoint_url,
    uploadEndpointURL: item.upload_endpoint_url,
    accessKey: '',
    secretKey: '',
    bucket: item.bucket,
    region: item.region,
    pathStyle: item.path_style,
    publicBaseURL: item.public_base_url,
    signedURLTTLSeconds: item.signed_url_ttl_seconds,
    generatedAssetPrefix: item.generated_asset_prefix || 'generated',
    source: item.source,
    accessKeyConfigured: item.access_key_configured,
    secretKeyConfigured: item.secret_key_configured,
    isActive: item.is_active,
    isDraft: false,
  };
}

export function emptyStorageProviderForm(provider: AdminStorageProvider['provider'] = 'aliyun-oss'): StorageProviderForm {
  const isTencentCOS = provider === 'tencent-cos';
  return {
    id: '',
    provider,
    endpointURL: '',
    uploadEndpointURL: '',
    accessKey: '',
    secretKey: '',
    bucket: '',
    region: isTencentCOS ? 'ap-guangzhou' : 'cn-shanghai',
    pathStyle: provider === 'aliyun-oss' || isTencentCOS ? '' : 'auto',
    publicBaseURL: '',
    signedURLTTLSeconds: 604800,
    generatedAssetPrefix: 'generated',
    source: 'database',
    accessKeyConfigured: false,
    secretKeyConfigured: false,
    isActive: true,
    isDraft: true,
  };
}

export function storageProviderSelectionPatch(
  form: StorageProviderForm,
  provider: AdminStorageProvider['provider'],
): Partial<StorageProviderForm> {
  const patch: Partial<StorageProviderForm> = {
    provider,
    pathStyle: provider === 'aliyun-oss' || provider === 'tencent-cos' ? '' : (form.pathStyle || 'auto'),
  };
  if (provider === 'tencent-cos' && (!form.region.trim() || form.region === 'cn-shanghai')) {
    patch.region = 'ap-guangzhou';
  }
  return patch;
}

export function modelForm(item: AdminModel): ModelForm {
  const savedState: EditableModelState = {
    id: item.id,
    name: item.name,
    provider: item.provider,
    upstreamModelID: item.upstream_model_id,
    displayOrder: String(item.display_order ?? 100),
    type: item.type,
    description: item.description,
    tagsText: item.tags.join(', '),
    capabilitiesText: item.capabilities.join(', '),
    params: editableParamsFromSchema(item.paramsSchema),
    pricingConfig: editablePricingConfigFromModel(item.type, item.pricingConfig),
    inputLimits: editableInputLimitsFromModel(item.inputLimits),
    isEnabled: item.is_enabled,
  };
  return {
    ...cloneEditableModelState(savedState),
    isDraft: false,
    savedState,
    listSnapshot: buildModelListSnapshot(savedState),
  };
}

export function productForm(item: AdminBillingProduct): ProductForm {
  const benefitsText = JSON.stringify(item.benefits, null, 2);
  // 超值月卡/年卡：表单只编辑基础/赠送积分，credits 总是展示推导出的总数，
  // 避免历史数据里 credits 列只存了基础积分时表单显示出错。
  const credits = isValueSubscriptionMode(item.purchase_mode)
    ? productBaseCredits(benefitsText, item.credits) + (Number(item.benefits.bonus_credits ?? 0) || 0)
    : item.credits;
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    purchaseMode: item.purchase_mode,
    credits,
    amountCents: item.amount_cents,
    originalPriceCents: item.original_price_cents,
    firstPurchasePriceCents: item.first_purchase_price_cents,
    currency: item.currency,
    benefitsText,
    providerPricesText: JSON.stringify(item.provider_prices, null, 2),
    enabledProviders: [...item.enabled_providers],
    isActive: item.is_active,
    isDraft: false,
  };
}

export function emptyModelForm(provider = ''): ModelForm {
  const savedState = emptyEditableModelState(provider);
  return {
    ...cloneEditableModelState(savedState),
    isDraft: true,
    savedState,
    listSnapshot: buildModelListSnapshot(savedState),
  };
}


export function duplicateModelDraftForm(source: ModelForm): ModelForm {
  const draftState = cloneEditableModelState(source);
  draftState.id = '';
  draftState.name = source.name.trim() ? `${source.name.trim()} Copy` : '';
  const savedState = emptyEditableModelState(source.provider);
  return {
    ...draftState,
    isDraft: true,
    savedState,
    listSnapshot: buildModelListSnapshot(draftState),
  };
}

export function emptyProductForm(): ProductForm {
  return {
    id: '',
    name: '',
    kind: 'credits_pack',
    purchaseMode: 'credits_pack',
    credits: 0,
    amountCents: 0,
    originalPriceCents: undefined,
    firstPurchasePriceCents: undefined,
    currency: 'usd',
    benefitsText: JSON.stringify({
      base_credits: 0,
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
    }, null, 2),
    providerPricesText: EMPTY_PROVIDER_PRICES_TEXT,
    enabledProviders: [],
    isActive: true,
    isDraft: true,
  };
}

export function parseProviderPricesText(value: string, labels: AdminLabels): Record<string, string> {
  const parsed = JSON.parse(value) as unknown;
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(labels.providerPricesObjectRequired);
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  const normalized: Record<string, string> = {};
  for (const [key, rawValue] of entries) {
    if (typeof rawValue !== 'string') {
      throw new Error(labels.providerPricesValueRequired);
    }
    if (!key.trim()) {
      continue;
    }
    normalized[key.trim()] = rawValue.trim();
  }
  return normalized;
}

export function parseProductBenefitsText(value: string): BillingProduct['benefits'] {
  const parsed = JSON.parse(value) as BillingProduct['benefits'];
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('product_benefits_json must be an object');
  }
  return {
    base_credits: Number(parsed.base_credits ?? 0),
    bonus_credits: Number(parsed.bonus_credits ?? 0),
    membership_tier: String(parsed.membership_tier ?? ''),
    membership_days: Number(parsed.membership_days ?? 0),
    daily_bonus_credits: Number(parsed.daily_bonus_credits ?? 0),
    daily_free_hd_image_limit: Number(parsed.daily_free_hd_image_limit ?? 0),
    first_order_only: Boolean(parsed.first_order_only),
    max_purchases_per_user: Number(parsed.max_purchases_per_user ?? 0),
    summary: String(parsed.summary ?? ''),
    custom_amount_enabled: Boolean(parsed.custom_amount_enabled),
    custom_credit_multiplier: Number(parsed.custom_credit_multiplier ?? 10),
    custom_min_amount: Number(parsed.custom_min_amount ?? 1),
    custom_max_amount: Number(parsed.custom_max_amount ?? 0),
  };
}

export function productBonusCredits(benefitsText: string): number {
  try {
    const parsed = JSON.parse(benefitsText) as { bonus_credits?: unknown };
    return Number(parsed.bonus_credits ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function withProductBonusCredits(benefitsText: string, bonusCredits: number): string {
  let parsed: Record<string, unknown>;
  try {
    const candidate = JSON.parse(benefitsText) as unknown;
    parsed = candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate as Record<string, unknown> : {};
  } catch {
    parsed = {};
  }
  return JSON.stringify({ ...parsed, bonus_credits: bonusCredits }, null, 2);
}

// 超值月卡/超值年卡：数据库约定 credits 列 = 基础积分 + 赠送积分（总数）。
// 表单只让管理员填基础/赠送，总数由代码推导，避免手工加法配错。
export function isValueSubscriptionMode(mode: BillingProduct['purchase_mode']): boolean {
  return mode === 'monthly_value_subscription' || mode === 'yearly_value_subscription';
}

function parseBenefitsRecord(benefitsText: string): Record<string, unknown> {
  try {
    const candidate = JSON.parse(benefitsText) as unknown;
    return candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function productBaseCredits(benefitsText: string, credits: number): number {
  const parsed = parseBenefitsRecord(benefitsText);
  const base = Number(parsed.base_credits ?? 0) || 0;
  if (base > 0) return base;
  // 旧数据可能没填 base_credits：按 credits − bonus 兜底反推。
  const bonus = Number(parsed.bonus_credits ?? 0) || 0;
  return Math.max(0, credits - bonus);
}

export function withProductBaseCredits(benefitsText: string, baseCredits: number): string {
  return JSON.stringify({ ...parseBenefitsRecord(benefitsText), base_credits: baseCredits }, null, 2);
}

export type ProductMembership = { tier: string; days: number };

export function productMembership(benefitsText: string): ProductMembership {
  const parsed = parseBenefitsRecord(benefitsText);
  return {
    tier: String(parsed.membership_tier ?? ''),
    days: Number(parsed.membership_days ?? 0) || 0,
  };
}

export function withProductMembership(benefitsText: string, membership: ProductMembership): string {
  return JSON.stringify(
    { ...parseBenefitsRecord(benefitsText), membership_tier: membership.tier, membership_days: membership.days },
    null,
    2,
  );
}

// 超值年卡的分期发放依赖会员：不配会员时后端不会创建分期计划，后 11 个月积分不会到账。
export function productMembershipMissing(benefitsText: string): boolean {
  const membership = productMembership(benefitsText);
  return membership.tier.trim() === '' || membership.days <= 0;
}

// 超值年卡发放节奏（与后端 applyYearlyValueSubscriptionBenefits 一致）：
// 基础积分分 12 个月发放，除不尽的余数并入首月；赠送积分首月一次到账。
export const VALUE_YEARLY_INSTALLMENTS = 12;

export function valueYearlyGrantPreview(baseCredits: number, bonusCredits: number): { firstMonth: number; monthly: number } {
  const monthly = Math.floor(baseCredits / VALUE_YEARLY_INSTALLMENTS);
  return { firstMonth: monthly + (baseCredits % VALUE_YEARLY_INSTALLMENTS) + bonusCredits, monthly };
}

export function parseCSV(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function patchRecordEntry<T extends object>(source: Record<string, T>, key: string, patch: Partial<T>): Record<string, T> {
  const current = source[key];
  if (!current) return source;
  return { ...source, [key]: { ...current, ...patch } };
}

export function isModelFormDirty(form: ModelForm): boolean {
  return editableModelSignature(form) !== editableModelSignature(form.savedState);
}

export function resetModelForm(form: ModelForm): ModelForm {
  const restoredState = cloneEditableModelState(form.savedState);
  return {
    ...restoredState,
    isDraft: form.isDraft,
    savedState: cloneEditableModelState(form.savedState),
    listSnapshot: form.listSnapshot,
  };
}

export function replaceRecordEntry<T>(source: Record<string, T>, currentKey: string, nextKey: string, value: T): Record<string, T> {
  const next: Record<string, T> = {};
  let inserted = false;

  for (const [key, item] of Object.entries(source)) {
    if (key === currentKey) {
      next[nextKey] = value;
      inserted = true;
      continue;
    }
    if (key === nextKey) {
      continue;
    }
    next[key] = item;
  }

  if (!inserted) {
    next[nextKey] = value;
  }
  return next;
}

export function removeRecordEntry<T>(source: Record<string, T>, keyToRemove: string): Record<string, T> {
  return Object.fromEntries(Object.entries(source).filter(([key]) => key !== keyToRemove));
}

export function toggleSelection(values: readonly string[], value: string, checked: boolean): string[] {
  if (checked) {
    return values.includes(value) ? [...values] : [...values, value];
  }
  return values.filter((item) => item !== value);
}

const SUBSCRIPTION_PURCHASE_MODES: readonly BillingProduct['purchase_mode'][] = [
  'monthly_subscription',
  'yearly_subscription',
  'monthly_value_subscription',
  'yearly_value_subscription',
];

export function nextProductKindPatch(form: ProductForm, kind: BillingProduct['kind']): Partial<ProductForm> {
  if (kind === 'credits_pack') {
    return { kind, purchaseMode: 'credits_pack' };
  }
  if (SUBSCRIPTION_PURCHASE_MODES.includes(form.purchaseMode)) {
    return { kind };
  }
  return { kind, purchaseMode: 'monthly_subscription' };
}

export function productKindOptions(labels: AdminLabels) {
  return [
    { value: 'credits_pack' as const, label: labels.kindCreditsPack },
    { value: 'subscription' as const, label: labels.kindSubscription },
  ];
}

export function productPurchaseModeOptions(labels: AdminLabels, kind: BillingProduct['kind']) {
  if (kind === 'credits_pack') {
    return [
      { value: 'credits_pack' as const, label: labels.purchaseModeCreditsPack },
      { value: 'first_order_pack' as const, label: labels.purchaseModeFirstOrder },
      { value: 'weekly_membership' as const, label: labels.purchaseModeWeekly },
    ];
  }
  return [
    { value: 'monthly_subscription' as const, label: labels.purchaseModeMonthly },
    { value: 'yearly_subscription' as const, label: labels.purchaseModeYearly },
    { value: 'monthly_value_subscription' as const, label: labels.purchaseModeMonthlyValue },
    { value: 'yearly_value_subscription' as const, label: labels.purchaseModeYearlyValue },
  ];
}

export function createDraftKey(scope: 'provider' | 'storage' | 'model' | 'product'): string {
  return `draft:${scope}:${Math.random().toString(36).slice(DRAFT_ID_SLICE_START, DRAFT_ID_SLICE_END)}`;
}

export function providerAutofillSafeProps(provider: string, field: 'base-url' | 'api-key') {
  const safeFieldName = field === 'base-url' ? 'endpoint-url' : 'access-token';
  return {
    id: `provider-${provider}-${field}`,
    name: `section-admin-provider-${provider}-${safeFieldName}`,
    autoComplete: field === 'api-key' ? 'new-password' : 'off',
    spellCheck: false,
    autoCapitalize: 'none' as const,
    autoCorrect: 'off',
    'data-1p-ignore': 'true',
    'data-lpignore': 'true',
    'data-bwignore': 'true',
  };
}


export function storageAutofillSafeProps(formKey: string, field: 'endpoint-url' | 'upload-endpoint-url' | 'bucket' | 'region' | 'public-base-url' | 'asset-prefix' | 'access-token' | 'secret-token') {
  return {
    id: `storage-${formKey}-${field}`,
    name: `section-admin-object-store-${formKey}-${field}`,
    autoComplete: 'off',
    spellCheck: false,
    autoCapitalize: 'none' as const,
    autoCorrect: 'off',
    'data-1p-ignore': 'true',
    'data-lpignore': 'true',
    'data-bwignore': 'true',
    'data-form-type': 'other',
  };
}

export type StorageProviderOption = Readonly<{
  value: AdminStorageProvider['provider'];
  label: string;
}>;

export function storageProviderOptions(labels: AdminLabels): readonly StorageProviderOption[] {
  return [
    { value: 'disabled', label: labels.storageProviderDisabled },
    { value: 's3', label: labels.storageProviderS3 },
    { value: 'idrive', label: labels.storageProviderIDrive },
    { value: 'aliyun-oss', label: labels.storageProviderAliyunOSS },
    { value: 'tencent-cos', label: labels.storageProviderTencentCOS },
  ];
}

export function storageProviderLabel(provider: AdminStorageProvider['provider'], labels: AdminLabels): string {
  return storageProviderOptions(labels).find((option) => option.value === provider)?.label ?? provider;
}

function storageSearchText(form: StorageProviderForm): string {
  return [
    form.id,
    form.provider,
    form.endpointURL,
    form.uploadEndpointURL,
    form.bucket,
    form.region,
    form.publicBaseURL,
    form.generatedAssetPrefix,
    form.pathStyle,
    form.source,
    form.isActive ? 'active' : 'inactive',
  ]
    .join(' ')
    .toLowerCase();
}

export function filterStorageEntries(
  entries: readonly StorageProviderEntry[],
  query: string,
  statusFilter: 'all' | 'active' | 'inactive' | 'configured',
): readonly StorageProviderEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  return entries.filter(([, form]) => {
    const matchesQuery = !normalizedQuery || storageSearchText(form).includes(normalizedQuery);
    const matchesStatus =
      statusFilter === 'all'
        || (statusFilter === 'active' && form.isActive)
        || (statusFilter === 'inactive' && !form.isActive)
        || (statusFilter === 'configured' && form.accessKeyConfigured && form.secretKeyConfigured);
    return matchesQuery && matchesStatus;
  });
}

function getChineseLabels() {
  return {
      title: '管理台',
      subtitle: '统一管理上游渠道、协议适配器、模型目录和价格产品。渠道配置实时作用于后端生成链路；价格产品直接写入 billing_products；模型目录直接驱动 /v1/models 与任务校验。',
      forbiddenTitle: '你没有管理权限',
      forbiddenBody: '当前账号不是管理员账号，无法访问该页面。',
      loadingTitle: '正在加载管理配置',
      loadingBody: '读取上游渠道、模型目录和价格产品中…',
      loadFailed: '加载管理配置失败',
      saveFailed: '保存配置失败',
      saved: '配置已保存',
      saveAction: '保存',
      cancelAction: '取消',
      confirmAction: '确定',
      closeAction: '关闭',
      deleteAction: '删除',
      draftBadge: '草稿',
      cancelDraft: '取消草稿',
      pendingId: '待填写 ID',
      pendingProvider: '待填写渠道',
      searchPlaceholder: '搜索名称、公开 ID、渠道 ID、上游模型 ID、Tags 或功能…',
      noSearchResult: '当前筛选条件下没有结果',
      collapseAll: '全部收起',
      expandAll: '全部展开',
      searchAction: '搜索',
      providersEyebrow: '上游渠道',
      providersTabTitle: '上游渠道',
      providersTitle: '管理上游渠道、协议适配器、地址与密钥',
      providersBody: 'Provider ID 表示真实上游渠道，例如官方账号、某个中转站或自建网关；Adapter 表示调用协议，例如 OpenAI 图片、OpenAI 视频或 Google Veo。保存后无需重新部署前端。若要保存新密钥，需要后端配置 ADMIN_CONFIG_SECRET。',
      secretConfigured: '已配置密钥',
      secretMissing: '未配置密钥',
      enabled: '启用',
      disabled: '已禁用',
      active: '上架',
      inactive: '下架',
      liveNow: '当前生效',
      liveHidden: '当前未对外生效',
      baseURL: 'Base URL',
      apiKey: 'API Key',
      apiKeyPlaceholder: '留空则保持当前密钥不变',
      addProvider: '新增 Provider',
      createProvider: '创建 Provider',
      deleteProvider: '删除 Provider',
      deleteProviderConfirm: '确认删除这个 Provider？如果仍有启用中的模型或运行中的任务引用它，删除会被拒绝。',
      providerDeleted: 'Provider 已删除',
      providerDraftTitle: '新 Provider 草稿',
      providerId: '渠道 ID / Provider ID',
      providerIdPlaceholder: '例如：aiapexers-openai-images / openai-official',
      adapter: '协议适配器',
      saveProvider: '保存 Provider',
      storageProvidersEyebrow: '对象存储',
      storageTabTitle: '对象存储',
      storageProvidersTitle: '管理对象存储供应商与当前生效配置',
      storageProvidersBody: '这里可以配置多个对象存储供应商，并选择一个作为当前生效配置。页面上传、生成后的资产落库和签名 URL 都会使用当前生效项。',
      storageDraftTitle: '新存储配置草稿',
      storageAdd: '新增存储',
      storageSave: '保存存储',
      storageDeleteConfirm: '确认删除这个对象存储配置？如果它仍是当前生效项，系统会自动切换到默认配置。',
      storageDeleted: '存储配置已删除',
      storageId: '配置 ID',
      storageIdPlaceholder: '例如：aliyun-oss-prod',
      storageProvider: '存储供应商',
      storageEndpointURL: 'Endpoint URL',
    storageUploadEndpointURL: 'Upload Endpoint URL',
      storageAccessKey: 'Access Key',
      storageSecretKey: 'Secret Key',
      storageBucket: 'Bucket',
      storageRegion: 'Region',
    storagePathStyle: 'Path Style',
    storagePathStyleAuto: 'Auto',
    storagePathStylePath: 'Path',
    storagePathStyleVirtual: 'Virtual host',
      storagePublicBaseURL: 'Public Base URL',
      storageSignedURLTTL: '签名链接时长（秒）',
      storageGeneratedAssetPrefix: '对象前缀',
      storageSourceEnv: '.env 默认',
      storageSourceDatabase: '数据库配置',
      storageTest: '测试连接',
      storageTesting: '测试中…',
      storageTestSucceeded: '对象存储测试成功',
      providerTestSucceeded: 'Provider 连接测试成功',
      storageSecretsHint: '留空则保持当前密钥不变；新建配置时通常需要填写。',
      storageCurrentActive: '当前生效',
      storageInactive: '未生效',
      storageMarkActive: '设为生效',
      storageAccessKeyConfigured: 'Access Key 已配置',
      storageSecretKeyConfigured: 'Secret Key 已配置',
      storageAccessKeyMissing: 'Access Key 未配置',
      storageSecretKeyMissing: 'Secret Key 未配置',
      storageProviderDisabled: 'disabled',
      storageProviderS3: 's3',
      storageProviderIDrive: 'idrive',
      storageProviderAliyunOSS: 'aliyun-oss',
      storageProviderTencentCOS: '腾讯云 COS',
      modelsEyebrow: '模型目录',
      modelsTabTitle: '模型配置',
      modelsTitle: '按模型管理目录并选择上游渠道',
      modelsBody: '先创建或编辑模型，再为模型选择真实上游渠道。列表直接展示模型名称、公开 ID、渠道 ID、上游模型 ID、类型、状态与默认扣点；编辑后的模型会直接驱动 /v1/models 与任务校验。',
      addModel: '新增模型',
      createModel: '创建模型',
      duplicateModel: '复制模型',
      modelDraftTitle: '新模型草稿',
      modelId: '公开模型 ID',
      modelDisplayOrder: '排序权重',
      modelIdPlaceholder: '例如：creative-image-pro',
      modelStatsTotal: '模型总数',
      modelStatsEnabled: '启用中',
      modelStatsProviders: '关联渠道',
      modelCreditEstimate: '默认扣点预估',
      modelCreditEstimateHint: '按当前默认参数实时估算',
      modelCreditEstimateUnit: '点 / 次',
      modelPricing: '计费配置',
      modelPricingHint: '按 quality × 分辨率预设配置单张扣点；保存后后端会按这里的值真实扣点。',
      modelVideoPricingHint: '配置视频扣点规则；保存后生成页估算和后端真实扣点都会按这里计算。',
      pricingTier1k: '1K',
      pricingTier2k: '2K',
      pricingTier4k: '4K',
      pricingLow: 'low',
      pricingMedium: 'medium',
      pricingHigh: 'high',
      videoPricingMode: '计费模式',
      videoPricingModeDuration: '按时长',
      videoPricingModeFixed: '固定积分',
      videoFixedCredits: '固定积分',
      videoCreditsPerSecond: '每秒积分',
      videoMinSeconds: '最小时长',
      videoDurationParam: '时长参数名',
      videoCountParam: '数量参数名',
      videoResolutionParam: '分辨率参数名',
      videoResolutionMultipliers: '分辨率倍率',
      imageModels: '图片模型',
      videoModels: '视频模型',
      name: '前端显示名称',
      provider: '渠道 ID',
      upstreamModelId: '上游模型 ID',
      type: '类型',
      description: '描述',
      tagsCSV: 'Tags（逗号分隔）',
      capabilitiesCSV: 'Capabilities（逗号分隔）',
      modelInputLimits: '参考媒体上限',
      modelInputLimitsHint: '留空或填写 0 表示不限；媒体是否可用由 Capabilities 控制。',
      referenceImagesLimit: '参考图上限',
      referenceVideosLimit: '参考视频上限',
      referenceAudiosLimit: '参考音频上限',
      unlimited: '不限',
      paramsSchema: '参数字段',
      saveModel: '保存模型',
      deleteModelConfirm: '确认删除这个模型？如果已有生成任务引用它，删除会被拒绝。',
      modelDeleted: '模型已删除',
      resetChanges: '还原修改',
      dirtyBadge: '未保存',
      modelDirtyNoticeTitle: '你有未保存的模型修改',
      modelDirtyNoticeBody: '关闭标签页或刷新前，请先保存或还原这些修改。',
      unsavedChangesWarning: '你有未保存的模型修改，离开当前页面会丢失这些内容。',
      validationSummaryTitle: '请先修正以下问题',
      fieldRequiredSuffix: '为必填项',
      invalidNumber: '请输入合法数字',
      positiveNumber: '必须大于 0',
      minMaxInvalid: '最大值必须大于或等于最小值',
      duplicateParamKey: '参数 Key 不能重复',
      selectNeedsOptions: 'select 类型至少需要 1 个选项',
      defaultOptionMismatch: '默认值必须命中某个选项值',
      optionLabelRequired: '选项标签为必填项',
      optionValueRequired: '选项值为必填项',
      numberDefaultOutOfRange: '默认值必须落在最小值与最大值范围内',
      numberDefaultNotOnStep: '默认值必须与步长对齐',
      numberMaxNotOnStep: '最大值必须与步长对齐',
      positiveInteger: '请输入大于 0 的整数',
      nonNegativeInteger: '请输入大于或等于 0 的整数',
      paramBuilderTitle: '参数编辑器',
      paramBuilderBody: '直接维护参数字段，不再手写整段 JSON。保存时会自动转换为 params_schema。',
      addParam: '新增参数',
      noParams: '当前还没有参数字段。',
      paramCardTitle: '参数',
      paramCardHint: '先填写参数 Key，再补充默认值与说明。',
      removeParam: '删除参数',
      paramKey: '参数 Key',
      paramLabel: '展示名称',
      paramKind: '参数类型',
      paramDefault: '默认值',
      paramDefaultBoolean: '默认开启',
      paramRequired: '必填',
      paramDescription: '字段说明',
      paramMin: '最小值',
      paramMax: '最大值',
      paramStep: '步长',
      paramOptions: '选项',
      paramOptionsHint: 'text / select 类型可维护候选项；select 会强制默认值命中其中一个。',
      noOptions: '当前没有选项。',
      addOption: '新增选项',
      removeOption: '删除选项',
      paramOptionLabel: '选项标签',
      paramOptionValue: '选项值',
      schemaInvalid: 'params_schema JSON 解析失败',
      schemaArrayRequired: 'params_schema 必须是数组',
      pricingEyebrow: '价格产品',
      pricingTitle: '区分当前生效商品与底层账单目录',
      pricingBody: '上方显示当前真正对外售卖的商品，下方维护 billing_products 全量目录。这样你可以同时看到线上生效结果与底层配置。',
      effectiveProductsTitle: '当前已生效商品',
      effectiveProductsBody: '这里读取的是当前真实对外售卖列表，会受到 billing_products、购买模式开关和后端价格计算逻辑共同影响。',
      effectiveProductsEmpty: '当前没有对外生效的商品。',
      addProduct: '新增产品',
      createProduct: '创建产品',
      productDraftTitle: '新价格产品草稿',
      productId: '产品 ID',
      productIdPlaceholder: '例如：sub_creator_monthly / credits_starter_1000',
      pricingStatsEffective: '生效中',
      pricingStatsCatalog: '目录总数',
      pricingStatsDrafts: '草稿数',
      productsTabTitle: '产品',
      usersTabTitle: '用户管理',
      tasksTabTitle: '任务管理',
      tasksEyebrow: '任务运营台',
      tasksTitle: '查看全站生成任务、失败原因与消耗',
      tasksBody: '按状态、类型和关键词筛选所有用户的任务，快速定位失败原因，并查看当前筛选范围内的任务积分记录。',
      tasksSearchPlaceholder: '搜索任务 ID、Batch ID、用户、模型、渠道、提示词或错误…',
      tasksClearSearch: '清除任务搜索',
      tasksStatsTotal: '任务数',
      tasksStatsTotalHint: '当前筛选范围',
      tasksStatsCredits: '任务积分合计',
      tasksStatsCreditsHint: '按任务记录汇总，非最终实扣' ,
      tasksStatsFailed: '失败数',
      tasksStatsRunning: '排队 / 执行中',
      tasksAll: '全部',
      tasksAllTypes: '全部类型',
      tasksQueued: '排队',
      tasksProcessing: '执行中',
      tasksSucceeded: '成功',
      tasksFailed: '失败',
      tasksColumnTask: '任务',
      tasksColumnUser: '用户',
      tasksColumnModel: '模型 / 渠道',
      tasksColumnConsumption: '消耗',
      tasksColumnFailure: '失败原因',
      tasksColumnTime: '时间',
      tasksColumnActions: '操作',
      tasksOpenDetails: '详情',
      tasksDetailsTitle: '任务详情',
      tasksCloseDetails: '关闭任务详情',
      tasksDuration: '执行耗时',
      tasksCreatedAt: '创建时间',
      tasksCompletedAt: '完成时间',
      tasksParamsJSON: '参数 JSON',
      tasksReferencePreview: '参考图预览',
      tasksResultURLs: '结果链接',
      tasksRawJSON: '完整任务 JSON',
      tasksResultCount: (count: number) => `结果 ${count}`,
      usersSearchPlaceholder: '搜索用户 ID、邮箱或名称…',
      usersActive: '活跃用户',
      usersTodayNew: '今日新增',
      usersAdmins: '管理员',
      usersEnabled: '正常',
      usersDisabled: '已禁用',
      usersDeleted: '已删除',
      usersFailedTasks: '失败任务',
      usersAccount: '账号',
      usersRole: '角色',
      usersCredits: '积分',
      usersCreatedAt: '注册时间',
      usersLastSeen: '最近活跃',
      usersNeverSeen: '暂无活跃',
      creditSourceDirectRecharge: '充值',
      creditSourceRechargeBonus: '充值赠送',
      creditSourceRedeemCode: '兑换码',
      creditSourceAdminAdded: '管理员添加',
      creditSourceSignupBonus: '注册赠送',
      creditSourceReferralInvitee: '受邀奖励',
      creditSourceReferralInviter: '邀请奖励',
      creditSourceMembershipDaily: '会员每日赠送',
      creditSourceGenerationRefund: '生成退款',
      creditSourceGenerationSpent: '生成消耗',
      creditSourceOther: '未归类',
      creditSourceEmpty: '暂无来源记录',
      usersInvitation: '邀请',
      usersNoInviter: '无邀请人',
      usersInviteCode: '邀请码',
      usersTasks: '任务',
      usersLastLogin: '最近登录',
      usersActions: '操作',
      usersAdminRole: '管理员',
      usersMemberRole: '用户',
      usersCurrentUser: '当前账号',
      usersAdminSwitch: 'Admin',
      usersPageSize: '每页',
      usersPageRange: (start: number, end: number, total: number) => total > 0 ? `${start}-${end} / ${total}` : '0 / 0',
      usersTaskBreakdown: (succeeded: number, failed: number) => `成功 ${succeeded} / 失败 ${failed}`,
      previousPage: '上一页',
      nextPage: '下一页',
      userUpdated: '用户已更新',
      saveCredits: '保存积分',
      moreActions: '更多',
      rechargeCreditsAction: '充值',
      rechargeCreditsTitle: '充值/扣减积分',
      rechargeCreditsAmount: '变动积分',
      rechargeCreditsCurrent: '当前积分',
      rechargeCreditsAfter: '操作后积分',
      rechargeCreditsPrompt: (email: string, current: number) => `为 ${email} 充值/扣减积分（当前 ${current}）。输入正数增加，负数扣减。`,
      rechargeCreditsInvalid: '请输入非零整数，例如 100 或 -50',
      rechargeCreditsBelowZero: '扣减后余额不能小于 0',
      makeAdminAction: '改为管理员',
      removeAdminAction: '取消管理员',
      disableUser: '禁用',
      enableUser: '启用',
      deleteUser: '删除',
      restoreUser: '恢复',
      resetPassword: '重置密码',
      userPasswordReset: '密码已重置',
      userResetPasswordMinLength: '新密码至少需要 6 个字符。',
      userResetPasswordPrompt: (email: string) => `请输入 ${email} 的新密码（至少 6 位）`,
      userResetPasswordConfirm: (email: string) => `确认重置 ${email} 的登录密码？`,
      userDeleteConfirm: '确认删除这个用户？系统会保留历史任务、资产和账单记录，但该账号将无法继续登录。',
      kind: 'Kind',
      kindCreditsPack: 'credits_pack',
      kindSubscription: 'subscription',
      purchaseMode: 'Purchase Mode',
      purchaseModeCreditsPack: 'credits_pack',
      purchaseModeFirstOrder: 'first_order_pack',
      purchaseModeWeekly: 'weekly_membership',
      purchaseModeMonthly: 'monthly_subscription',
      purchaseModeYearly: 'yearly_subscription',
      purchaseModeMonthlyValue: 'monthly_value_subscription',
      purchaseModeYearlyValue: 'yearly_value_subscription',
      credits: '积分',
      amountCents: '金额（分）',
      currency: '币种',
      productBenefits: 'product_benefits_json JSON',
      productBenefitsHint: '配置积分拆分、会员天数、每日赠送、每日免费超高清图片次数、首单、限购，以及自定义充值：custom_amount_enabled / custom_credit_multiplier / custom_min_amount / custom_max_amount。',
      providerPrices: 'provider_price_json JSON',
      providerPricesHint: '例如：{"stripe_price_id":"price_xxx"}。订阅产品的月付 / 年付含义由产品 ID 后缀与 purchase_mode 一起决定。',
      providerPricesInvalid: 'provider_price_json JSON 解析失败',
      providerPricesObjectRequired: 'provider_price_json 必须是对象',
      providerPricesValueRequired: 'provider_price_json 的值必须是字符串',
      enabledProviders: '启用支付方式',
      savePrice: '保存价格',
      deleteProduct: '删除产品',
      deleteProductConfirm: '确认删除这个价格产品？如果已有支付订单引用它，删除会被拒绝。',
      productDeleted: '价格产品已删除',
      productMarkActive: '上架',
      productMarkInactive: '下架',
      firstOrderGroup: '新用户专属',
      monthlyGroup: '月付订阅',
      yearlyGroup: '年付订阅',
      weeklyGroup: '周卡会员',
      creditsGroup: '积分包',
      refreshing: '刷新中',
      refreshData: '刷新数据',
      unsavedModels: '未保存模型',
      dirtyModelCount: (count: number) => `${count} 个模型存在未保存修改`,
      jumpToFirstChange: '直接跳到第一处变更',
  };
}

function getEnglishLabels() {
  return {
    title: 'Admin Console',
    subtitle: 'Manage upstream channels, protocol adapters, model catalog entries, and billing products in one place. Channel changes affect real generation traffic, billing products write directly to billing_products, and model changes drive /v1/models plus task validation.',
    forbiddenTitle: 'You do not have admin access',
    forbiddenBody: 'This account is not allowed to open the admin console.',
    loadingTitle: 'Loading admin configuration',
    loadingBody: 'Reading upstream channels, models, and billing settings…',
    loadFailed: 'Failed to load admin configuration',
    saveFailed: 'Failed to save configuration',
    saved: 'Configuration saved',
    saveAction: 'Save',
    cancelAction: 'Cancel',
    confirmAction: 'Confirm',
    closeAction: 'Close',
    deleteAction: 'Delete',
    draftBadge: 'Draft',
    cancelDraft: 'Discard draft',
    pendingId: 'pending id',
    pendingProvider: 'pending channel',
    searchPlaceholder: 'Search by name, public id, channel id, upstream model id, tags, or capability…',
    noSearchResult: 'No records match the current filter',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    searchAction: 'Search',
    providersEyebrow: 'Upstream channels',
    providersTabTitle: 'Upstream channels',
    providersTitle: 'Manage channels, protocol adapters, endpoints, and keys',
    providersBody: 'Provider ID represents the real upstream channel, such as an official account, relay service, or your own gateway. Adapter represents the request protocol, such as OpenAI image, OpenAI video, or Google Veo. Saving a new secret requires ADMIN_CONFIG_SECRET on the backend.',
    secretConfigured: 'Secret configured',
    secretMissing: 'Secret missing',
    enabled: 'Enabled',
    disabled: 'Disabled',
    active: 'Active',
    inactive: 'Inactive',
    liveNow: 'Live now',
    liveHidden: 'Not live right now',
    baseURL: 'Base URL',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Leave blank to keep the current secret',
    addProvider: 'Add provider',
    createProvider: 'Create provider',
    deleteProvider: 'Delete provider',
    deleteProviderConfirm: 'Delete this provider? The request will be rejected if enabled models or active tasks still reference it.',
    providerDeleted: 'Provider deleted',
    providerDraftTitle: 'New provider draft',
    providerId: 'Channel ID / Provider ID',
    providerIdPlaceholder: 'Example: aiapexers-openai-images / openai-official',
    adapter: 'Protocol adapter',
    saveProvider: 'Save provider',
    storageProvidersEyebrow: 'Object storage',
    storageTabTitle: 'Object storage',
    storageProvidersTitle: 'Manage object storage suppliers and the active configuration',
    storageProvidersBody: 'You can configure multiple object storage suppliers and pick one active configuration. Uploads, generated asset storage, and signed URLs all use the active entry.',
    storageDraftTitle: 'New storage draft',
    storageAdd: 'Add storage',
    storageSave: 'Save storage',
    storageDeleteConfirm: 'Delete this storage provider? If it is currently active, the system will fall back to the default configuration.',
    storageDeleted: 'Storage provider deleted',
    storageId: 'Config ID',
    storageIdPlaceholder: 'Example: aliyun-oss-prod',
    storageProvider: 'Storage provider',
    storageEndpointURL: 'Endpoint URL',
    storageUploadEndpointURL: 'Upload Endpoint URL',
    storageAccessKey: 'Access Key',
    storageSecretKey: 'Secret Key',
    storageBucket: 'Bucket',
    storageRegion: 'Region',
    storagePathStyle: 'Path Style',
    storagePathStyleAuto: 'Auto',
    storagePathStylePath: 'Path',
    storagePathStyleVirtual: 'Virtual host',
    storagePublicBaseURL: 'Public Base URL',
    storageSignedURLTTL: 'Signed URL TTL (seconds)',
    storageGeneratedAssetPrefix: 'Object prefix',
    storageSourceEnv: '.env default',
    storageSourceDatabase: 'Database config',
    storageTest: 'Test connection',
    storageTesting: 'Testing…',
    storageTestSucceeded: 'Object storage test succeeded',
      providerTestSucceeded: 'Provider connection test succeeded',
    storageSecretsHint: 'Leave blank to keep the current secret. New configs usually need both values filled in.',
    storageCurrentActive: 'Active now',
    storageInactive: 'Inactive',
    storageMarkActive: 'Set active',
    storageAccessKeyConfigured: 'Access Key configured',
    storageSecretKeyConfigured: 'Secret Key configured',
    storageAccessKeyMissing: 'Access Key missing',
    storageSecretKeyMissing: 'Secret Key missing',
    storageProviderDisabled: 'disabled',
    storageProviderS3: 's3',
    storageProviderIDrive: 'idrive',
    storageProviderAliyunOSS: 'aliyun-oss',
    storageProviderTencentCOS: 'Tencent Cloud COS',
    modelsEyebrow: 'Model catalog',
    modelsTabTitle: 'Model config',
    modelsTitle: 'Manage models and choose upstream channels',
    modelsBody: 'Create or edit a model first, then choose the real upstream channel for that model. The list shows model name, public ID, channel ID, upstream model ID, type, status, and default credits. Changes still drive /v1/models and backend validation.',
    addModel: 'Add model',
    createModel: 'Create model',
    duplicateModel: 'Duplicate model',
    modelDraftTitle: 'New model draft',
    modelId: 'Public model ID',
    modelDisplayOrder: 'Display order',
    modelIdPlaceholder: 'Example: creative-image-pro',
    modelStatsTotal: 'Total models',
    modelStatsEnabled: 'Enabled',
    modelStatsProviders: 'Linked channels',
    modelCreditEstimate: 'Default credit estimate',
    modelCreditEstimateHint: 'Live estimate from current default params',
    modelCreditEstimateUnit: 'credits / call',
    modelPricing: 'Pricing config',
    modelPricingHint: 'Set per-image credits by quality × resolution tier. The backend charges these exact values after save.',
    modelVideoPricingHint: 'Configure video credit rules. Generation estimates and backend charging use these values after save.',
    pricingTier1k: '1K',
    pricingTier2k: '2K',
    pricingTier4k: '4K',
    pricingLow: 'low',
    pricingMedium: 'medium',
    pricingHigh: 'high',
    videoPricingMode: 'Pricing mode',
    videoPricingModeDuration: 'By duration',
    videoPricingModeFixed: 'Fixed credits',
    videoFixedCredits: 'Fixed credits',
    videoCreditsPerSecond: 'Credits / second',
    videoMinSeconds: 'Minimum seconds',
    videoDurationParam: 'Duration param',
    videoCountParam: 'Count param',
    videoResolutionParam: 'Resolution param',
    videoResolutionMultipliers: 'Resolution multipliers',
    imageModels: 'Image models',
    videoModels: 'Video models',
    name: 'Public display name',
    provider: 'Channel ID',
    upstreamModelId: 'Upstream model ID',
    type: 'Type',
    description: 'Description',
    tagsCSV: 'Tags (CSV)',
    capabilitiesCSV: 'Capabilities (CSV)',
    modelInputLimits: 'Reference media limits',
    modelInputLimitsHint: 'Leave blank or enter 0 for unlimited. Capabilities control whether each media type is supported.',
    referenceImagesLimit: 'Reference image limit',
    referenceVideosLimit: 'Reference video limit',
    referenceAudiosLimit: 'Reference audio limit',
    unlimited: 'Unlimited',
    paramsSchema: 'Parameters',
    saveModel: 'Save model',
    deleteModelConfirm: 'Delete this model? The request will be rejected if generation tasks already reference it.',
    modelDeleted: 'Model deleted',
    resetChanges: 'Reset changes',
    dirtyBadge: 'Unsaved',
    modelDirtyNoticeTitle: 'You have unsaved model changes',
    modelDirtyNoticeBody: 'Save or reset them before you refresh or close this tab.',
    unsavedChangesWarning: 'You have unsaved model changes. Leaving this page will discard them.',
    validationSummaryTitle: 'Fix these issues before saving',
    fieldRequiredSuffix: ' is required',
    invalidNumber: 'Enter a valid number',
    positiveNumber: 'Value must be greater than 0',
    minMaxInvalid: 'Max must be greater than or equal to min',
    duplicateParamKey: 'Parameter keys must be unique',
    selectNeedsOptions: 'Select fields need at least 1 option',
    defaultOptionMismatch: 'Default value must match one of the option values',
    optionLabelRequired: 'Option label is required',
    optionValueRequired: 'Option value is required',
    numberDefaultOutOfRange: 'Default value must stay within the min & max range',
    numberDefaultNotOnStep: 'Default value must align with the step',
    numberMaxNotOnStep: 'Maximum value must align with the step',
    positiveInteger: 'Enter a positive integer',
    nonNegativeInteger: 'Enter an integer greater than or equal to 0',
    paramBuilderTitle: 'Parameter Builder',
    paramBuilderBody: 'Edit parameter fields directly instead of hand-writing the full JSON blob. The form converts them into params_schema on save.',
    addParam: 'Add parameter',
    noParams: 'No parameter fields yet.',
    paramCardTitle: 'Parameter',
    paramCardHint: 'Start with the key, then fill in the default and guidance.',
    removeParam: 'Remove parameter',
    paramKey: 'Parameter key',
    paramLabel: 'Display label',
    paramKind: 'Parameter type',
    paramDefault: 'Default value',
    paramDefaultBoolean: 'Enabled by default',
    paramRequired: 'Required',
    paramDescription: 'Field description',
    paramMin: 'Min',
    paramMax: 'Max',
    paramStep: 'Step',
    paramOptions: 'Options',
    paramOptionsHint: 'Text / select fields can define suggested options; select defaults must match one option value.',
    noOptions: 'No options yet.',
    addOption: 'Add option',
    removeOption: 'Remove option',
    paramOptionLabel: 'Option label',
    paramOptionValue: 'Option value',
    schemaInvalid: 'Failed to parse params_schema JSON',
    schemaArrayRequired: 'params_schema must be an array',
    pricingEyebrow: 'Billing products',
    pricingTitle: 'Separate live products from the raw billing catalog',
    pricingBody: 'The top area shows what is truly live for customers right now. The lower area edits the full billing_products catalog. This makes it easy to compare live output with underlying records.',
    effectiveProductsTitle: 'Currently live products',
    effectiveProductsBody: 'This list reads the real customer-facing products after billing_products, purchase-mode flags, and backend price calculation rules are applied.',
    effectiveProductsEmpty: 'There are no live products right now.',
    addProduct: 'Add product',
    createProduct: 'Create product',
    productDraftTitle: 'New billing product draft',
    productId: 'Product ID',
    productIdPlaceholder: 'Example: sub_creator_monthly / credits_starter_1000',
    pricingStatsEffective: 'Live now',
    pricingStatsCatalog: 'Catalog total',
    pricingStatsDrafts: 'Drafts',
    productsTabTitle: 'Products',
    usersTabTitle: 'Users',
    tasksTabTitle: 'Tasks',
    tasksEyebrow: 'Task operations',
    tasksTitle: 'Inspect all generation tasks, failures, and consumption',
    tasksBody: 'Filter tasks across users by status, type, and keyword to diagnose failures and inspect recorded task credits.',
    tasksSearchPlaceholder: 'Search task ID, batch ID, user, model, provider, prompt, or error…',
    tasksClearSearch: 'Clear task search',
    tasksStatsTotal: 'Tasks',
    tasksStatsTotalHint: 'Current filter scope',
    tasksStatsCredits: 'Task credits total',
    tasksStatsCreditsHint: 'Summed from task records, not final net charge',
    tasksStatsFailed: 'Failures',
    tasksStatsRunning: 'Queued / running',
    tasksAll: 'All',
    tasksAllTypes: 'All types',
    tasksQueued: 'Queued',
    tasksProcessing: 'Processing',
    tasksSucceeded: 'Succeeded',
    tasksFailed: 'Failed',
    tasksColumnTask: 'Task',
    tasksColumnUser: 'User',
    tasksColumnModel: 'Model / provider',
    tasksColumnConsumption: 'Consumption',
    tasksColumnFailure: 'Failure reason',
    tasksColumnTime: 'Time',
    tasksColumnActions: 'Actions',
    tasksOpenDetails: 'Details',
    tasksDetailsTitle: 'Task details',
    tasksCloseDetails: 'Close task details',
    tasksDuration: 'Duration',
    tasksCreatedAt: 'Created at',
    tasksCompletedAt: 'Completed at',
    tasksParamsJSON: 'Params JSON',
    tasksReferencePreview: 'Reference previews',
    tasksResultURLs: 'Result URLs',
    tasksRawJSON: 'Raw task JSON',
    tasksResultCount: (count: number) => `Results ${count}`,
    usersSearchPlaceholder: 'Search user ID, email, or name…',
      usersActive: 'Active users',
    usersTodayNew: 'Today new',
    usersAdmins: 'Admins',
    usersEnabled: 'Active',
    usersDisabled: 'Disabled',
    usersDeleted: 'Deleted',
    usersFailedTasks: 'Failed tasks',
    usersAccount: 'Account',
    usersRole: 'Role',
    usersCredits: 'Credits',
    usersCreatedAt: 'Registered',
    usersLastSeen: 'Last active',
    usersNeverSeen: 'No activity',
    creditSourceDirectRecharge: 'Paid',
    creditSourceRechargeBonus: 'Paid bonus',
    creditSourceRedeemCode: 'Redeem code',
    creditSourceAdminAdded: 'Admin added',
    creditSourceSignupBonus: 'Signup bonus',
    creditSourceReferralInvitee: 'Invitee bonus',
    creditSourceReferralInviter: 'Inviter bonus',
    creditSourceMembershipDaily: 'Daily member bonus',
    creditSourceGenerationRefund: 'Generation refund',
    creditSourceGenerationSpent: 'Generation spent',
    creditSourceOther: 'Unclassified',
    creditSourceEmpty: 'No source records',
    usersInvitation: 'Invitation',
    usersNoInviter: 'No inviter',
    usersInviteCode: 'Invite code',
    usersTasks: 'Tasks',
    usersLastLogin: 'Last login',
    usersActions: 'Actions',
    usersAdminRole: 'Admin',
    usersMemberRole: 'User',
    usersCurrentUser: 'Current',
    usersAdminSwitch: 'Admin',
    usersPageSize: 'Per page',
    usersPageRange: (start: number, end: number, total: number) => total > 0 ? `${start}-${end} / ${total}` : '0 / 0',
    usersTaskBreakdown: (succeeded: number, failed: number) => `OK ${succeeded} / failed ${failed}`,
    previousPage: 'Previous',
    nextPage: 'Next',
    userUpdated: 'User updated',
    saveCredits: 'Save credits',
    moreActions: 'More',
    rechargeCreditsAction: 'Recharge',
    rechargeCreditsTitle: 'Recharge/deduct credits',
    rechargeCreditsAmount: 'Credit delta',
    rechargeCreditsCurrent: 'Current credits',
    rechargeCreditsAfter: 'After change',
    rechargeCreditsPrompt: (email: string, current: number) => `Recharge/deduct credits for ${email} (current ${current}). Use positive to add, negative to deduct.`,
    rechargeCreditsInvalid: 'Enter a non-zero integer, e.g. 100 or -50',
    rechargeCreditsBelowZero: 'Balance cannot be below 0 after deduction',
    makeAdminAction: 'Make admin',
    removeAdminAction: 'Remove admin',
    disableUser: 'Disable',
    enableUser: 'Enable',
    deleteUser: 'Delete',
    restoreUser: 'Restore',
    resetPassword: 'Reset password',
    userPasswordReset: 'Password reset',
    userResetPasswordMinLength: 'New password must be at least 6 characters.',
    userResetPasswordPrompt: (email: string) => `Enter a new password for ${email} (at least 6 characters)`,
    userResetPasswordConfirm: (email: string) => `Reset the sign-in password for ${email}?`,
    userDeleteConfirm: 'Delete this user? Historical tasks, assets, and billing records will be retained, but the account will no longer be able to sign in.',
    kind: 'Kind',
    kindCreditsPack: 'credits_pack',
    kindSubscription: 'subscription',
    purchaseMode: 'Purchase Mode',
    purchaseModeCreditsPack: 'credits_pack',
    purchaseModeFirstOrder: 'first_order_pack',
    purchaseModeWeekly: 'weekly_membership',
    purchaseModeMonthly: 'monthly_subscription',
    purchaseModeYearly: 'yearly_subscription',
    purchaseModeMonthlyValue: 'monthly_value_subscription',
    purchaseModeYearlyValue: 'yearly_value_subscription',
    credits: 'Credits',
    amountCents: 'Amount (cents)',
    currency: 'Currency',
    productBenefits: 'product_benefits_json JSON',
    productBenefitsHint: 'Configure credit split, membership days, daily bonus, daily free ultra-HD image limit, first-order gate, and purchase limit.',
    providerPrices: 'provider_price_json JSON',
    providerPricesHint: 'Example: {"stripe_price_id":"price_xxx"}. Monthly/yearly subscription meaning is determined by the ID suffix together with purchase_mode.',
    providerPricesInvalid: 'Failed to parse provider_price_json JSON',
    providerPricesObjectRequired: 'provider_price_json must be an object',
    providerPricesValueRequired: 'provider_price_json values must be strings',
    enabledProviders: 'Enabled providers',
    savePrice: 'Save pricing',
    deleteProduct: 'Delete product',
    deleteProductConfirm: 'Delete this billing product? The request will be rejected if payment orders already reference it.',
    productDeleted: 'Billing product deleted',
    productMarkActive: 'Publish',
    productMarkInactive: 'Unpublish',
    firstOrderGroup: 'New-user packs',
    monthlyGroup: 'Monthly subscriptions',
    yearlyGroup: 'Yearly subscriptions',
    weeklyGroup: 'Weekly memberships',
    creditsGroup: 'Credit packs',
    refreshing: 'Refreshing',
    refreshData: 'Refresh data',
    unsavedModels: 'Unsaved models',
    dirtyModelCount: (count: number) => `${count} model${count === 1 ? '' : 's'} have unsaved changes`,
    jumpToFirstChange: 'Jump to first change',
  };
}

export function getLabels(language: 'zh' | 'en') {
  return language === 'zh' ? getChineseLabels() : getEnglishLabels();
}

export type AdminLabels = ReturnType<typeof getLabels>;
