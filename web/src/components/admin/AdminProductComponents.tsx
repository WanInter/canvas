'use client';

import { AlertTriangle, BadgeCheck, X } from 'lucide-react';
import { useId } from 'react';
import type { BillingProduct } from '@/lib/types';
import { type AdminLabels, FOCUS_RING, isValueSubscriptionMode, nextProductKindPatch, productBaseCredits, productBonusCredits, productKindOptions, productMembership, productMembershipMissing, productPurchaseModeOptions, PROVIDER_IDS, toggleSelection, type ProductForm, valueYearlyGrantPreview, withProductBaseCredits, withProductBonusCredits, withProductMembership } from './adminUtils';
import { Field, InlineBadge, PrimaryButton, SecondaryButton, StatusBadge } from './AdminSectionPrimitives';

export function ProductCard({
  labels,
  form,
  saving,
  deleting,
  isEffective,
  onChange,
  onDismissDraft,
  onDelete,
  onSave,
  onToggleActive,
}: Readonly<{
  labels: AdminLabels;
  form: ProductForm;
  saving: boolean;
  deleting: boolean;
  isEffective: boolean;
  onChange: (patch: Partial<ProductForm>) => void;
  onDismissDraft?: () => void;
  onDelete?: () => void;
  onSave: () => void;
  onToggleActive: () => void;
}>) {
  const title = form.name.trim() || labels.productDraftTitle;
  const riskItems = productRiskItems(form);
  const unitPrice = formatProductUnitPrice(form);
  const providerPriceMap = parseProviderPriceMap(form.providerPricesText);
  const fieldPrefix = `admin-product-${useId()}`;
  const fieldID = (field: string) => `${fieldPrefix}-${field}`;
  const kindOptions = productKindOptions(labels);
  const purchaseModeOptions = productPurchaseModeOptions(labels, form.kind);
  const yearlyMembershipMissing = form.purchaseMode === 'yearly_value_subscription' && productMembershipMissing(form.benefitsText);
  const activeImpactNote = form.isActive
    ? '停用前请确认：该商品会从可售/展示范围移除，用户将不能继续购买。'
    : '启用后商品可能重新出现在可售/展示范围，请确认价格、权益和渠道配置。';
  const deleteImpactNote = '删除前请确认：商品配置会被移除，前台购买入口和指定该商品的本地配置可能不再可用。';

  return (
    <details className="min-w-0" open={form.isDraft ? true : undefined}>
      <summary className={`cursor-pointer list-none rounded-control ${FOCUS_RING}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-ink">{title}</h3>
              {form.isDraft ? <InlineBadge>{labels.draftBadge}</InlineBadge> : null}
              {!form.isDraft ? <InlineBadge tone={isEffective ? 'emerald' : 'slate'}>{isEffective ? labels.liveNow : labels.liveHidden}</InlineBadge> : null}
            </div>
            <p className="mt-1 text-xs font-semibold text-muted">{form.id.trim() || labels.pendingId} · {labels.kind}: {form.kind} · {labels.purchaseMode}: {form.purchaseMode}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <InlineBadge tone={form.kind === 'subscription' ? 'indigo' : form.purchaseMode === 'first_order_pack' ? 'amber' : 'slate'}>{productTypeLabel(form)}</InlineBadge>
              <InlineBadge tone="slate">{unitPrice}</InlineBadge>
              {riskItems.length > 0 ? <InlineBadge tone="amber">风险 {riskItems.length}</InlineBadge> : <InlineBadge tone="emerald">配置正常</InlineBadge>}
            </div>
          </div>
          <StatusBadge active={form.isActive} activeLabel={labels.active} inactiveLabel={labels.inactive} />
        </div>
      </summary>
      {riskItems.length > 0 ? (
        <div className="mt-3 rounded-surface border border-warning bg-warning-soft px-3 py-2 text-xs font-bold leading-5 text-warning">
          <AlertTriangle size={14} className="mr-1 inline" aria-hidden="true" />配置风险：{riskItems.join('；')}
        </div>
      ) : (
        <div className="mt-3 rounded-surface border border-success bg-success-soft px-3 py-2 text-xs font-bold leading-5 text-success">
          <BadgeCheck size={14} className="mr-1 inline" aria-hidden="true" />价格、积分和支付渠道配置正常。
        </div>
      )}
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <Field htmlFor={fieldID('id')} label={labels.productId}>
          <input
            id={fieldID('id')}
            name={fieldID('id')}
            value={form.id}
            onChange={(event) => onChange({ id: event.target.value })}
            disabled={!form.isDraft}
            className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${form.isDraft ? FOCUS_RING : 'opacity-70'}`}
            placeholder={labels.productIdPlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field htmlFor={fieldID('name')} label={labels.name}>
          <input id={fieldID('name')} name={fieldID('name')} value={form.name} onChange={(event) => onChange({ name: event.target.value })} autoComplete="off" className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
        </Field>
        <Field htmlFor={fieldID('kind')} label={labels.kind}>
          <select id={fieldID('kind')} name={fieldID('kind')} value={form.kind} onChange={(event) => onChange(nextProductKindPatch(form, event.target.value as BillingProduct['kind']))} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}>
            {kindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field htmlFor={fieldID('purchase-mode')} label={labels.purchaseMode}>
          <select id={fieldID('purchase-mode')} name={fieldID('purchase-mode')} value={form.purchaseMode} onChange={(event) => onChange({ purchaseMode: event.target.value as BillingProduct['purchase_mode'] })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}>
            {purchaseModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field htmlFor={fieldID('currency')} label={labels.currency}>
          <input id={fieldID('currency')} name={fieldID('currency')} value={form.currency} onChange={(event) => onChange({ currency: event.target.value })} autoComplete="off" spellCheck={false} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
        </Field>
        <ProductCreditsFields fieldID={fieldID} form={form} onChange={onChange} creditsLabel={labels.credits} />
        <Field htmlFor={fieldID('amount')} label="售价（元）">
          <input id={fieldID('amount')} name={fieldID('amount')} type="number" min="0" step="0.01" inputMode="decimal" value={(form.amountCents / 100).toFixed(2)} onChange={(event) => onChange({ amountCents: Math.round(Number(event.target.value || 0) * 100) })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
        </Field>
        <Field htmlFor={fieldID('original-price')} label="原价（元，可留空）">
          <input
            id={fieldID('original-price')}
            name={fieldID('original-price')}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={form.originalPriceCents === undefined ? '' : (form.originalPriceCents / 100).toFixed(2)}
            onChange={(event) => onChange({ originalPriceCents: event.target.value.trim() === '' ? undefined : Math.round(Number(event.target.value) * 100) })}
            className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}
          />
        </Field>
        <Field htmlFor={fieldID('first-purchase-price')} label="首次购买价（元，可留空）">
          <input
            id={fieldID('first-purchase-price')}
            name={fieldID('first-purchase-price')}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={form.firstPurchasePriceCents === undefined ? '' : (form.firstPurchasePriceCents / 100).toFixed(2)}
            onChange={(event) => onChange({ firstPurchasePriceCents: event.target.value.trim() === '' ? undefined : Math.round(Number(event.target.value) * 100) })}
            className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}
          />
        </Field>
        <div className="sm:col-span-2"><ProductFrontendPreview form={form} unitPrice={unitPrice} /></div>
        <div className="sm:col-span-2">
          <Field htmlFor={fieldID('benefits')} label={labels.productBenefits}>
            <textarea id={fieldID('benefits')} name={fieldID('benefits')} value={form.benefitsText} onChange={(event) => onChange({ benefitsText: event.target.value })} className={`aics-control min-h-[140px] w-full rounded-surface px-3 py-2 font-mono text-xs leading-5 ${FOCUS_RING}`} autoComplete="off" spellCheck={false} />
          </Field>
          <p className="mt-2 text-xs font-semibold text-muted">{labels.productBenefitsHint}</p>
        </div>
        <div className="sm:col-span-2">
          <ProviderPriceStructuredEditor value={providerPriceMap} onChange={(next) => onChange({ providerPricesText: serializeProviderPriceMap(next) })} />
        </div>
        <details className="sm:col-span-2 rounded-lg border border-line bg-subtle p-3">
          <summary className={`cursor-pointer list-none text-xs font-black text-secondary ${FOCUS_RING}`}>高级模式：编辑原始渠道价格 JSON</summary>
          <div className="mt-3 border-t border-line pt-3">
            <Field htmlFor={fieldID('provider-prices')} label={labels.providerPrices}>
              <textarea id={fieldID('provider-prices')} name={fieldID('provider-prices')} value={form.providerPricesText} onChange={(event) => onChange({ providerPricesText: event.target.value })} className={`aics-control min-h-[120px] w-full rounded-lg px-3 py-2 font-mono text-xs leading-5 ${FOCUS_RING}`} autoComplete="off" spellCheck={false} />
            </Field>
            <p className="mt-2 text-xs font-semibold text-muted">{labels.providerPricesHint}</p>
          </div>
        </details>
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted">{labels.enabledProviders}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROVIDER_IDS.map((provider) => (
              <label key={provider} className="inline-flex items-center gap-2 rounded-surface border border-line bg-subtle px-3 py-2.5 text-sm font-bold text-secondary">
                <input
                  type="checkbox"
                  name={`${fieldPrefix}-enabled-providers`}
                  checked={form.enabledProviders.includes(provider)}
                  onChange={(event) => onChange({ enabledProviders: toggleSelection(form.enabledProviders, provider, event.target.checked) })}
                  className="h-4 w-4 accent-[var(--ui-accent)]"
                />
                {provider}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <PrimaryButton onClick={onSave} loading={saving} disabled={yearlyMembershipMissing}>{form.isDraft ? labels.createProduct : labels.savePrice}</PrimaryButton>
          {yearlyMembershipMissing ? (
            <div className="w-full rounded-surface border border-danger bg-danger-soft px-3 py-2 text-xs font-bold leading-5 text-danger sm:w-auto sm:max-w-[420px]">
              <AlertTriangle size={14} className="mr-1 inline" aria-hidden="true" />
              超值年卡必须配置会员权益和天数：积分分期发放依赖会员，缺失时后 11 个月积分不会到账。配置会员后才能保存。
            </div>
          ) : null}
          {!form.isDraft ? (
            <div className="w-full rounded-surface border border-warning bg-warning-soft px-3 py-2 text-xs font-bold leading-5 text-warning sm:w-auto sm:max-w-[420px]">
              <AlertTriangle size={14} className="mr-1 inline" aria-hidden="true" />
              {activeImpactNote}
            </div>
          ) : null}
          {!form.isDraft ? (
            <SecondaryButton onClick={onToggleActive} loading={saving} icon={<X size={16} />}>
              {form.isActive ? labels.productMarkInactive : labels.productMarkActive}
            </SecondaryButton>
          ) : null}
          {onDismissDraft ? <SecondaryButton onClick={onDismissDraft} icon={<X size={16} />}>{labels.cancelDraft}</SecondaryButton> : null}
          {onDelete ? (
            <>
              <div className="w-full rounded-surface border border-danger bg-danger-soft px-3 py-2 text-xs font-bold leading-5 text-danger sm:w-auto sm:max-w-[420px]">
                <AlertTriangle size={14} className="mr-1 inline" aria-hidden="true" />
                {deleteImpactNote}
              </div>
              <SecondaryButton onClick={onDelete} loading={deleting} icon={<X size={16} />}>{labels.deleteProduct}</SecondaryButton>
            </>
          ) : null}
        </div>
      </div>
    </details>
  );
}


function ProductCreditsFields({ fieldID, form, onChange, creditsLabel }: Readonly<{ fieldID: (field: string) => string; form: ProductForm; onChange: (patch: Partial<ProductForm>) => void; creditsLabel: string }>) {
  if (isValueSubscriptionMode(form.purchaseMode)) {
    return <ValueSubscriptionFields fieldID={fieldID} form={form} onChange={onChange} />;
  }
  return (
    <>
      <Field htmlFor={fieldID('credits')} label={creditsLabel}>
        <input id={fieldID('credits')} name={fieldID('credits')} type="number" inputMode="numeric" value={form.credits} onChange={(event) => onChange({ credits: Number(event.target.value) })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
      </Field>
      <Field htmlFor={fieldID('bonus-credits')} label="赠送积分（可留空，0 表示不赠送）">
        <input
          id={fieldID('bonus-credits')}
          name={fieldID('bonus-credits')}
          type="number"
          min="0"
          inputMode="numeric"
          value={productBonusCredits(form.benefitsText)}
          onChange={(event) => onChange({ benefitsText: withProductBonusCredits(form.benefitsText, Math.max(0, Number(event.target.value) || 0)) })}
          className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}
        />
      </Field>
    </>
  );
}

// 超值月卡/超值年卡：管理员只填基础/赠送积分，credits 列（= 两者之和）由代码同步。
function ValueSubscriptionFields({ fieldID, form, onChange }: Readonly<{ fieldID: (field: string) => string; form: ProductForm; onChange: (patch: Partial<ProductForm>) => void }>) {
  const yearly = form.purchaseMode === 'yearly_value_subscription';
  const base = productBaseCredits(form.benefitsText, form.credits);
  const bonus = productBonusCredits(form.benefitsText);
  const membership = productMembership(form.benefitsText);
  const inputClass = `aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`;
  const syncCredits = (benefitsText: string, nextBase: number, nextBonus: number) => onChange({ benefitsText, credits: nextBase + nextBonus });
  return (
    <>
      <Field htmlFor={fieldID('base-credits')} label={yearly ? '基础积分/年（分 12 个月发放）' : '基础积分（每次购买一次性到账）'}>
        <input
          id={fieldID('base-credits')}
          name={fieldID('base-credits')}
          type="number"
          min="0"
          inputMode="numeric"
          value={base}
          onChange={(event) => {
            const next = Math.max(0, Number(event.target.value) || 0);
            syncCredits(withProductBaseCredits(form.benefitsText, next), next, bonus);
          }}
          className={inputClass}
        />
      </Field>
      <Field htmlFor={fieldID('bonus-credits')} label={yearly ? '赠送积分（首月一次到账，可留空）' : '赠送积分（每次购买随单到账，可留空）'}>
        <input
          id={fieldID('bonus-credits')}
          name={fieldID('bonus-credits')}
          type="number"
          min="0"
          inputMode="numeric"
          value={bonus}
          onChange={(event) => {
            const next = Math.max(0, Number(event.target.value) || 0);
            syncCredits(withProductBonusCredits(form.benefitsText, next), base, next);
          }}
          className={inputClass}
        />
      </Field>
      <Field label="到账总积分（自动 = 基础 + 赠送）">
        <input readOnly tabIndex={-1} value={base + bonus} className={`${inputClass} opacity-70`} aria-label="到账总积分（自动计算）" />
      </Field>
      <Field htmlFor={fieldID('membership-tier')} label={yearly ? '会员权益（必选）' : '会员权益（可选）'}>
        <select
          id={fieldID('membership-tier')}
          name={fieldID('membership-tier')}
          value={membership.tier}
          onChange={(event) => {
            const tier = event.target.value;
            const days = tier === '' ? 0 : membership.days > 0 ? membership.days : yearly ? 365 : 31;
            onChange({ benefitsText: withProductMembership(form.benefitsText, { tier, days }) });
          }}
          className={inputClass}
        >
          <option value="">无会员</option>
          <option value="basic">基础会员</option>
        </select>
      </Field>
      {membership.tier !== '' ? (
        <Field htmlFor={fieldID('membership-days')} label="会员天数">
          <input
            id={fieldID('membership-days')}
            name={fieldID('membership-days')}
            type="number"
            min="1"
            inputMode="numeric"
            value={membership.days}
            onChange={(event) => onChange({ benefitsText: withProductMembership(form.benefitsText, { tier: membership.tier, days: Math.max(1, Number(event.target.value) || 0) }) })}
            className={inputClass}
          />
        </Field>
      ) : null}
      <ValueGrantPreview yearly={yearly} base={base} bonus={bonus} />
    </>
  );
}

function ValueGrantPreview({ yearly, base, bonus }: Readonly<{ yearly: boolean; base: number; bonus: number }>) {
  if (!yearly) {
    return <p className="text-xs font-semibold text-muted sm:col-span-2">发放方式：每次购买一次性到账 {base + bonus} 积分（{base} 基础 + {bonus} 赠送）。</p>;
  }
  const preview = valueYearlyGrantPreview(base, bonus);
  const firstMonthBase = preview.firstMonth - bonus;
  return (
    <div className="rounded-surface border border-line bg-subtle px-3 py-2 text-xs font-semibold leading-5 text-secondary sm:col-span-2">
      发放预览：首月到账 {preview.firstMonth}（{firstMonthBase} 基础 + {bonus} 赠送）；第 2–12 月每月到账 {preview.monthly}。基础积分按月分摊，除不尽的零头并入首月。
    </div>
  );
}

function ProductFrontendPreview({ form, unitPrice }: Readonly<{ form: ProductForm; unitPrice: string }>) {
  const benefits = form.benefitsText.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 4);
  return (
    <div className="border-y border-line bg-subtle py-4">
      <div className="mb-2 text-xs font-black uppercase tracking-normal text-muted">前台商品预览</div>
      <div className="bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-black text-ink">{form.name.trim() || '商品名称'}</div>
            <div className="mt-1 text-xs font-bold text-secondary">{productTypeLabel(form)} · {form.credits > 0 ? `${form.credits} 点` : '权益套餐'}</div>
          </div>
          <div className="text-right"><div className="text-xl font-black text-ink">¥{(form.amountCents / 100).toFixed(2)}</div><div className="text-xs font-bold text-muted">{unitPrice}</div></div>
        </div>
        {benefits.length > 0 ? <ul className="mt-3 space-y-1 text-xs font-semibold text-secondary">{benefits.map((item) => <li key={item}>• {item}</li>)}</ul> : <div className="mt-3 text-xs font-semibold text-muted">暂无权益说明</div>}
      </div>
    </div>
  );
}

function ProviderPriceStructuredEditor({ value, onChange }: Readonly<{ value: Record<string, string>; onChange: (value: Record<string, string>) => void }>) {
  const update = (provider: string, nextValue: string) => {
    const next = { ...value };
    if (nextValue.trim()) next[provider] = nextValue.trim();
    else delete next[provider];
    onChange(next);
  };
  return (
    <div className="border-y border-line bg-subtle py-3">
      <div className="mb-2 text-xs font-black uppercase tracking-normal text-muted">支付渠道价格结构化编辑</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {PROVIDER_IDS.map((provider) => (
          <label key={provider} className="block rounded-surface border border-line bg-white px-3 py-2">
            <span className="text-xs font-black text-secondary">{provider}</span>
            <input
              value={value[provider] ?? ''}
              onChange={(event) => update(provider, event.target.value)}
              placeholder={provider === 'stripe' ? 'price_xxx' : provider === 'waffo' ? 'product_id / sku' : '渠道价格 ID'}
              name={`${provider}-provider-price`}
              autoComplete="off"
              spellCheck={false}
              className={`mt-1 w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted ${FOCUS_RING}`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function parseProviderPriceMap(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value || '{}') as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const [key, raw] of Object.entries(parsed)) {
      if (typeof raw === 'string' || typeof raw === 'number') result[key] = String(raw);
    }
    return result;
  } catch {
    return {};
  }
}

function serializeProviderPriceMap(value: Record<string, string>): string {
  const entries = Object.entries(value).filter(([, item]) => item.trim());
  return JSON.stringify(Object.fromEntries(entries), null, 2);
}

export function productRiskItems(form: ProductForm): readonly string[] {
  const items: string[] = [];
  if (!form.id.trim()) items.push('缺少商品 ID');
  if (!form.name.trim()) items.push('缺少商品名称');
  if (form.amountCents <= 0) items.push('售价为 0 或小于 0');
  if (form.kind !== 'subscription' && form.credits <= 0) items.push('积分为 0 或小于 0');
  if (isValueSubscriptionMode(form.purchaseMode) && productBaseCredits(form.benefitsText, form.credits) <= 0) items.push('基础积分为 0');
  if (form.purchaseMode === 'yearly_value_subscription' && productMembershipMissing(form.benefitsText)) items.push('未配置会员权益，积分分期无法创建');
  if (form.isActive && form.enabledProviders.length === 0) items.push('已启用但未配置支付渠道');
  try { JSON.parse(form.providerPricesText || '{}'); } catch { items.push('渠道价格 JSON 非法'); }
  return items;
}

export function formatProductUnitPrice(form: ProductForm): string {
  if (form.amountCents <= 0 || form.credits <= 0) return '单价待配置';
  const yuan = form.amountCents / 100;
  return `¥${((yuan / form.credits) * 100).toFixed(2)} / 100点`;
}

export function productTypeLabel(form: ProductForm): string {
  if (form.purchaseMode === 'first_order_pack') return '新用户专属';
  if (form.kind === 'subscription') return '订阅套餐';
  return '积分包';
}
