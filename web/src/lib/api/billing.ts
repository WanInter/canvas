import type { BillingProduct, BillingProductBenefits, CreditBalance, CreditConsumptionRecord, InvitedUserRechargeSummary, PurchaseModeLabel, RechargeRecord } from '@/lib/types';
import { apiRequest } from './client';
import { getStoredToken } from './client';

export type PaymentProvider = Readonly<{
  id: 'stripe' | 'paypal' | 'alipay' | 'wechat' | 'waffo';
  name: string;
  enabled: boolean;
}>;

export type CheckoutSession = Readonly<{
  order_id: string;
  provider: string;
  status: string;
  redirect_url?: string;
  qr_code_url?: string;
}>;

export type PaymentWebhookResult = Readonly<{
  event_id: string;
  status: string;
}>;

export async function getCreditBalance(): Promise<CreditBalance> {
  return apiRequest<CreditBalance>('/v1/credits');
}

export type ListRechargeRecordsInput = Readonly<{
  status?: string;
  provider?: string;
  limit?: number;
  cursor?: string;
}>;

export type RechargeRecordPage = Readonly<{
  records: readonly RechargeRecord[];
  nextCursor?: string;
}>;

export async function listRechargeRecordsPage(input: ListRechargeRecordsInput = {}): Promise<RechargeRecordPage> {
  const payload = await apiRequest<{ records: readonly RechargeRecord[]; next_cursor?: string }>(`/v1/billing/recharge-records${rechargeQueryString(input)}`);
  return { records: payload.records, nextCursor: payload.next_cursor };
}

export async function listRechargeRecords(): Promise<readonly RechargeRecord[]> {
  const payload = await listRechargeRecordsPage();
  return payload.records;
}

export type InvitedUserPage = Readonly<{
  users: readonly InvitedUserRechargeSummary[];
  nextCursor?: string;
}>;

export async function listInvitedUsersPage(input: Pick<ListRechargeRecordsInput, 'limit' | 'cursor'> = {}): Promise<InvitedUserPage> {
  const payload = await apiRequest<{ users: readonly InvitedUserRechargeSummary[]; next_cursor?: string }>(`/v1/billing/invited-users${invitedRechargeQueryString(input)}`);
  return { users: payload.users, nextCursor: payload.next_cursor };
}

export type ListCreditConsumptionRecordsInput = Readonly<{
  limit?: number;
  cursor?: string;
}>;

export type CreditConsumptionRecordPage = Readonly<{
  records: readonly CreditConsumptionRecord[];
  nextCursor?: string;
}>;

export async function listCreditConsumptionRecordsPage(input: ListCreditConsumptionRecordsInput = {}): Promise<CreditConsumptionRecordPage> {
  const payload = await apiRequest<{ records: readonly CreditConsumptionRecord[]; next_cursor?: string }>(`/v1/credits/consumption-records${creditConsumptionQueryString(input)}`);
  return { records: payload.records, nextCursor: payload.next_cursor };
}

export async function listPaymentProviders(): Promise<readonly PaymentProvider[]> {
  const payload = await apiRequest<unknown>('/v1/billing/payment-providers');
  if (!isPaymentProviderPayload(payload)) {
    throw new Error('Payment providers response is missing a valid providers array');
  }
  return payload.providers;
}

export async function listBillingProducts(): Promise<readonly BillingProduct[]> {
  const payload = await apiRequest<unknown>('/v1/billing/products');
  if (!isBillingProductPayload(payload)) {
    throw new Error('Billing products response is missing a valid products array');
  }
  return payload.products.map(normalizeBillingProduct);
}

export async function listPurchaseModeLabels(): Promise<readonly PurchaseModeLabel[]> {
  const payload = await apiRequest<unknown>('/v1/purchase-mode-labels');
  if (!isPurchaseModeLabelPayload(payload)) {
    throw new Error('Purchase mode labels response is missing a valid purchase_mode_labels array');
  }
  return payload.purchase_mode_labels;
}

function isPurchaseModeLabelPayload(value: unknown): value is Readonly<{ purchase_mode_labels: readonly PurchaseModeLabel[] }> {
  if (!value || typeof value !== 'object' || !('purchase_mode_labels' in value)) return false;
  const labels = (value as { purchase_mode_labels?: unknown }).purchase_mode_labels;
  return Array.isArray(labels) && labels.every(isPurchaseModeLabel);
}

function isPurchaseModeLabel(value: unknown): value is PurchaseModeLabel {
  if (!value || typeof value !== 'object') return false;
  const label = value as Partial<PurchaseModeLabel>;
  return typeof label.purchase_mode === 'string' && typeof label.badge_zh === 'string' && typeof label.badge_en === 'string';
}

type BillingProductDto = Readonly<Omit<BillingProduct, 'base_credits' | 'bonus_credits' | 'benefits'> & {
  base_credits?: number;
  bonus_credits?: number;
  benefits?: Partial<BillingProductBenefits>;
}>;

function normalizeBillingProduct(product: BillingProductDto): BillingProduct {
  const benefits = normalizeProductBenefits(product);
  return {
    ...product,
    enabled_providers: Array.isArray(product.enabled_providers) ? product.enabled_providers : [],
    base_credits: product.base_credits ?? benefits.base_credits,
    bonus_credits: product.bonus_credits ?? benefits.bonus_credits,
    benefits,
  };
}

function normalizeProductBenefits(product: BillingProductDto): BillingProductBenefits {
  const benefits = product.benefits ?? {};
  return {
    base_credits: Number(benefits.base_credits ?? product.base_credits ?? product.credits ?? 0),
    bonus_credits: Number(benefits.bonus_credits ?? product.bonus_credits ?? 0),
    membership_tier: String(benefits.membership_tier ?? ''),
    membership_days: Number(benefits.membership_days ?? 0),
    daily_bonus_credits: Number(benefits.daily_bonus_credits ?? 0),
    daily_free_hd_image_limit: Number(benefits.daily_free_hd_image_limit ?? 0),
    first_order_only: Boolean(benefits.first_order_only),
    max_purchases_per_user: Number(benefits.max_purchases_per_user ?? 0),
    summary: String(benefits.summary ?? ''),
    custom_amount_enabled: Boolean(benefits.custom_amount_enabled),
    custom_credit_multiplier: Number(benefits.custom_credit_multiplier ?? 10),
    custom_min_amount: Number(benefits.custom_min_amount ?? 1),
    custom_max_amount: Number(benefits.custom_max_amount ?? 0),
  };
}

function isBillingProductPayload(value: unknown): value is Readonly<{ products: readonly BillingProductDto[] }> {
  if (!value || typeof value !== 'object' || !('products' in value)) return false;
  const products = (value as { products?: unknown }).products;
  return Array.isArray(products) && products.every((product) => Boolean(product) && typeof product === 'object');
}

function isPaymentProviderPayload(value: unknown): value is Readonly<{ providers: readonly PaymentProvider[] }> {
  if (!value || typeof value !== 'object' || !('providers' in value)) return false;
  const providers = (value as { providers?: unknown }).providers;
  return Array.isArray(providers) && providers.every(isPaymentProvider);
}

function isPaymentProvider(value: unknown): value is PaymentProvider {
  if (!value || typeof value !== 'object') return false;
  const provider = value as Partial<PaymentProvider>;
  return typeof provider.id === 'string'
    && typeof provider.name === 'string'
    && typeof provider.enabled === 'boolean';
}

export type CreateCheckoutSessionInput = Readonly<{
  provider: string;
  productId: string;
  billingName?: string;
  billingEmail?: string;
  companyName?: string;
  taxId?: string;
  customAmount?: number;
}>;

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
  if (input.provider === 'waffo') return createWaffoCheckoutSession(input);
  return apiRequest<CheckoutSession>('/v1/billing/checkout-sessions', {
    method: 'POST',
    body: JSON.stringify({
      provider: input.provider,
      product_id: input.productId,
      billing_name: input.billingName,
      billing_email: input.billingEmail,
      company_name: input.companyName,
      tax_id: input.taxId,
      custom_amount: input.customAmount,
    }),
  });
}

export async function resumeCheckoutSession(orderID: string): Promise<CheckoutSession> {
  const record = await findRechargeRecord(orderID);
  if (record?.provider === 'waffo') {
    return {
      order_id: orderID,
      provider: 'waffo',
      status: record.status,
      redirect_url: waffoResumeCheckoutUrl(record),
    };
  }
  return apiRequest<CheckoutSession>(`/v1/billing/payment-orders/${encodeURIComponent(orderID)}/resume`, {
    method: 'POST',
  });
}

export async function refreshPaymentOrderStatus(orderID: string): Promise<PaymentWebhookResult> {
  return apiRequest<PaymentWebhookResult>(`/v1/billing/payment-orders/${encodeURIComponent(orderID)}/refresh`, {
    method: 'POST',
  });
}

export async function capturePayPalOrder(orderID: string): Promise<PaymentWebhookResult> {
  return apiRequest<PaymentWebhookResult>(`/v1/billing/payment-orders/${encodeURIComponent(orderID)}/paypal/capture`, {
    method: 'POST',
  });
}

function rechargeQueryString(input: ListRechargeRecordsInput): string {
  const params = new URLSearchParams();
  const normalizedStatus = normalizeRechargeFilter(input.status);
  const normalizedProvider = normalizeRechargeFilter(input.provider);
  if (normalizedStatus) params.set('status', normalizedStatus);
  if (normalizedProvider) params.set('provider', normalizedProvider);
  if (typeof input.limit === 'number' && Number.isFinite(input.limit)) params.set('limit', String(input.limit));
  if (input.cursor) params.set('cursor', input.cursor);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function invitedRechargeQueryString(input: Pick<ListRechargeRecordsInput, 'limit' | 'cursor'>): string {
  const params = new URLSearchParams();
  if (typeof input.limit === 'number' && Number.isFinite(input.limit)) params.set('limit', String(input.limit));
  if (input.cursor) params.set('cursor', input.cursor);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function creditConsumptionQueryString(input: ListCreditConsumptionRecordsInput): string {
  const params = new URLSearchParams();
  if (typeof input.limit === 'number' && Number.isFinite(input.limit)) params.set('limit', String(input.limit));
  if (input.cursor) params.set('cursor', input.cursor);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function normalizeRechargeFilter(value?: string): string | undefined {
  if (!value) return undefined;
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue || normalizedValue === 'all') return undefined;
  return normalizedValue;
}


async function createWaffoCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
  const response = await fetch('/api/waffo/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
    },
    body: JSON.stringify({
      productId: input.productId,
      currency: 'USD',
      buyerEmail: input.billingEmail,
      billingName: input.billingName,
      amount: typeof input.customAmount === 'number' && input.customAmount > 0 ? input.customAmount.toFixed(2) : undefined,
      metadata: {
        internal_product_id: input.productId,
        billing_name: input.billingName ?? '',
        billing_email: input.billingEmail ?? '',
        company_name: input.companyName ?? '',
        tax_id: input.taxId ?? '',
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to create Waffo checkout session');
  return payload as CheckoutSession;
}


async function findRechargeRecord(orderID: string): Promise<RechargeRecord | undefined> {
  const firstPage = await listRechargeRecordsPage({ limit: 100 });
  const firstMatch = firstPage.records.find((item) => item.id === orderID);
  if (firstMatch || !firstPage.nextCursor) return firstMatch;
  const secondPage = await listRechargeRecordsPage({ limit: 100, cursor: firstPage.nextCursor });
  return secondPage.records.find((item) => item.id === orderID);
}


function waffoResumeCheckoutUrl(record: RechargeRecord): string {
  const params = new URLSearchParams({
    product_id: record.product_id,
    provider: 'waffo',
    currency: 'usd',
  });
  if (record.amount_cents > 0 && record.currency.toLowerCase() === 'cny') {
    params.set('custom_amount', String(Math.round(record.amount_cents / 100)));
  }
  return `/checkout?${params.toString()}`;
}
