'use client';

import { Gift, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { UserRechargePromotion, UserRechargePromotionInput } from '@/lib/api/admin';
import { FOCUS_RING, type ProductEntry } from './adminUtils';
import { ConfirmDialog, type ConfirmDialogState, EmptyList, Field, InlineBadge, PrimaryButton, SecondaryButton, StatusBadge } from './AdminSectionPrimitives';

type PromotionForm = {
  id: string;
  user_id: string;
  name: string;
  product_id: string;
  bonus_percent: string;
  min_amount_cents: string;
  max_bonus_credits: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const emptyForm: PromotionForm = {
  id: '',
  user_id: '',
  name: '',
  product_id: '',
  bonus_percent: '30',
  min_amount_cents: '0',
  max_bonus_credits: '0',
  starts_at: '',
  ends_at: '',
  is_active: true,
};

function PromotionEditor({ form, productOptions, saving, submitLabel, autoSave, onChange, onSubmit }: Readonly<{
  form: PromotionForm;
  productOptions: readonly { id: string; name: string }[];
  saving?: boolean;
  submitLabel: string;
  autoSave?: boolean;
  onChange: (patch: Partial<PromotionForm>) => void;
  onSubmit: (form: PromotionForm) => Promise<void>;
}>) {
  const [local, setLocal] = useState(form);
  useEffect(() => setLocal(form), [form]);
  const patchLocal = (patch: Partial<PromotionForm>) => setLocal((current) => ({ ...current, ...patch }));
  const commit = async () => {
    onChange(local);
    if (!autoSave) await onSubmit(local);
  };

  return (
    <div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <Field label="用户 ID" htmlFor={`promo-${local.id || 'new'}-user`}>
          <input id={`promo-${local.id || 'new'}-user`} name={`promo-${local.id || 'new'}-user`} value={local.user_id} onChange={(event) => patchLocal({ user_id: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder="user_xxx…" autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="名称" htmlFor={`promo-${local.id || 'new'}-name`}>
          <input id={`promo-${local.id || 'new'}-name`} name={`promo-${local.id || 'new'}-name`} value={local.name} onChange={(event) => patchLocal({ name: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder="例如：VIP 专属 +30%…" autoComplete="off" />
        </Field>
        <Field label="适用产品" htmlFor={`promo-${local.id || 'new'}-product`}>
          <select id={`promo-${local.id || 'new'}-product`} name={`promo-${local.id || 'new'}-product`} value={local.product_id} onChange={(event) => patchLocal({ product_id: event.target.value })} autoComplete="off" className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}>
            <option value="">全部充值产品</option>
            {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.id}</option>)}
          </select>
        </Field>
        <Field label="加赠比例 %" htmlFor={`promo-${local.id || 'new'}-bonus`}>
          <input id={`promo-${local.id || 'new'}-bonus`} name={`promo-${local.id || 'new'}-bonus`} type="number" min="0" step="0.01" inputMode="decimal" value={local.bonus_percent} onChange={(event) => patchLocal({ bonus_percent: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
        </Field>
        <Field label="最低金额（分）" htmlFor={`promo-${local.id || 'new'}-min`}>
          <input id={`promo-${local.id || 'new'}-min`} name={`promo-${local.id || 'new'}-min`} type="number" min="0" inputMode="numeric" value={local.min_amount_cents} onChange={(event) => patchLocal({ min_amount_cents: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
        </Field>
        <Field label="最多加赠 Credits" htmlFor={`promo-${local.id || 'new'}-cap`}>
          <input id={`promo-${local.id || 'new'}-cap`} name={`promo-${local.id || 'new'}-cap`} type="number" min="0" inputMode="numeric" value={local.max_bonus_credits} onChange={(event) => patchLocal({ max_bonus_credits: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder="例如：0 表示不封顶…" />
        </Field>
        <Field label="开始时间" htmlFor={`promo-${local.id || 'new'}-starts`}>
          <input id={`promo-${local.id || 'new'}-starts`} name={`promo-${local.id || 'new'}-starts`} type="datetime-local" value={local.starts_at} onChange={(event) => patchLocal({ starts_at: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
        </Field>
        <Field label="结束时间" htmlFor={`promo-${local.id || 'new'}-ends`}>
          <input id={`promo-${local.id || 'new'}-ends`} name={`promo-${local.id || 'new'}-ends`} type="datetime-local" value={local.ends_at} onChange={(event) => patchLocal({ ends_at: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 rounded-control border border-line bg-subtle px-3 py-2.5 text-sm font-bold text-secondary">
          <input type="checkbox" name={`promo-${local.id || 'new'}-active`} checked={local.is_active} onChange={(event) => patchLocal({ is_active: event.target.checked })} className="h-4 w-4 accent-[var(--ui-accent)]" />
          启用规则
        </label>
        <PrimaryButton loading={saving} onClick={() => void commit()}>{submitLabel}</PrimaryButton>
      </div>
    </div>
  );
}

function PromotionSummary({ promotion }: Readonly<{ promotion: UserRechargePromotion }>) {
  const percent = promotion.bonus_rate_bps / 100;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-ink">{promotion.name || promotion.id}</h3>
          <InlineBadge tone="indigo">+{percent}%</InlineBadge>
          {promotion.product_id ? <InlineBadge tone="slate">{promotion.product_id}</InlineBadge> : <InlineBadge tone="slate">全部产品</InlineBadge>}
        </div>
        <div className="mt-2 grid gap-1 text-xs font-semibold text-secondary sm:grid-cols-2 xl:grid-cols-4">
          <span className="truncate"><span className="text-muted">User: </span>{promotion.user_id}</span>
          <span><span className="text-muted">最低: </span>{promotion.min_amount_cents} 分</span>
          <span><span className="text-muted">封顶: </span>{promotion.max_bonus_credits > 0 ? promotion.max_bonus_credits : '不封顶'}</span>
          <span><span className="text-muted">有效期: </span>{formatRange(promotion.starts_at, promotion.ends_at)}</span>
        </div>
      </div>
      <StatusBadge active={promotion.is_active} activeLabel="启用" inactiveLabel="停用" />
    </div>
  );
}

function promotionToForm(item: UserRechargePromotion): PromotionForm {
  return {
    id: item.id,
    user_id: item.user_id,
    name: item.name,
    product_id: item.product_id ?? '',
    bonus_percent: String(item.bonus_rate_bps / 100),
    min_amount_cents: String(item.min_amount_cents ?? 0),
    max_bonus_credits: String(item.max_bonus_credits ?? 0),
    starts_at: toDateTimeLocal(item.starts_at),
    ends_at: toDateTimeLocal(item.ends_at),
    is_active: item.is_active,
  };
}

function formToInput(form: PromotionForm): UserRechargePromotionInput {
  return {
    id: form.id.trim() || undefined,
    user_id: form.user_id.trim(),
    name: form.name.trim(),
    product_id: form.product_id.trim() || undefined,
    bonus_rate_bps: Math.round(Number(form.bonus_percent || 0) * 100),
    min_amount_cents: Math.max(0, Math.floor(Number(form.min_amount_cents || 0))),
    max_bonus_credits: Math.max(0, Math.floor(Number(form.max_bonus_credits || 0))),
    starts_at: localDateTimeToISO(form.starts_at),
    ends_at: localDateTimeToISO(form.ends_at),
    is_active: form.is_active,
  };
}

function toDateTimeLocal(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function localDateTimeToISO(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatRange(startsAt?: string, endsAt?: string): string {
  if (!startsAt && !endsAt) return '长期';
  return `${startsAt ? new Date(startsAt).toLocaleString() : '现在'} - ${endsAt ? new Date(endsAt).toLocaleString() : '长期'}`;
}

export function UserRechargePromotionDialog({
  userID,
  userLabel,
  open,
  promotions,
  productEntries,
  savingID,
  onClose,
  onSave,
  onDelete,
}: Readonly<{
  userID: string;
  userLabel: string;
  open: boolean;
  promotions: readonly UserRechargePromotion[];
  productEntries: readonly ProductEntry[];
  savingID?: string;
  onClose: () => void;
  onSave: (input: UserRechargePromotionInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [draft, setDraft] = useState<PromotionForm>({ ...emptyForm, user_id: userID });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const productOptions = useMemo(() => productEntries.map(([, form]) => ({ id: form.id, name: form.name || form.id })), [productEntries]);

  useEffect(() => {
    if (!open) return;
    setDraft({ ...emptyForm, user_id: userID });
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [open, userID]);

  if (!open || typeof document === 'undefined') return null;

  const submitDraft = async (form: PromotionForm) => {
    await onSave(formToInput({ ...form, user_id: userID }));
    setDraft({ ...emptyForm, user_id: userID });
  };
  const requestDelete = (promotion: UserRechargePromotion) => setConfirmDialog({ title: '删除专属充值优惠？', description: `${promotion.name || promotion.id} 将停止对该用户生效，已经完成的订单不会回滚。`, confirmLabel: '删除规则', tone: 'danger', onConfirm: () => void onDelete(promotion.id) });

  return createPortal(
    <dialog
      ref={dialogRef}
      className="ui-final m-auto w-[calc(100vw-24px)] max-w-[980px] overflow-visible bg-transparent p-0 backdrop:bg-[var(--ui-overlay)]"
      aria-labelledby={`promotion-dialog-title-${userID}`}
      onCancel={onClose}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div onMouseDown={(event) => event.stopPropagation()} className="max-h-[88vh] overflow-hidden rounded-shell border border-line bg-surface shadow-floating">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-black text-secondary"><Gift size={13} />用户专属充值优惠</div>
            <h3 id={`promotion-dialog-title-${userID}`} className="mt-2 text-lg font-black text-ink">配置 {userLabel} 的专属加赠</h3>
            <p className="mt-1 break-all text-xs font-semibold leading-5 text-secondary">{userID} · 付款金额不变，结算时按规则额外加赠 Credits。</p>
          </div>
          <button type="button" onClick={onClose} className={`rounded-full p-2 text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="max-h-[calc(88vh-96px)] overflow-y-auto px-5 py-4">
          <div className="rounded-surface border border-line bg-subtle p-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-sm font-black text-ink">新增规则</h4>
              <InlineBadge tone="indigo">Draft</InlineBadge>
            </div>
            <PromotionEditor form={draft} productOptions={productOptions} saving={savingID === 'new'} onChange={(patch) => setDraft((current) => ({ ...current, ...patch, user_id: userID }))} onSubmit={submitDraft} submitLabel="创建规则" />
          </div>
          <div className="mt-4 space-y-3">
            {promotions.length === 0 ? <EmptyList title="该用户暂无专属充值优惠" /> : promotions.map((promotion) => {
              const form = promotionToForm(promotion);
              return (
                <details key={promotion.id} className="admin-card rounded-surface p-3.5">
                  <summary className="cursor-pointer list-none"><PromotionSummary promotion={promotion} /></summary>
                  <div className="mt-4">
                    <PromotionEditor
                      form={form}
                      productOptions={productOptions}
                      saving={savingID === promotion.id}
                      onChange={(patch) => void onSave(formToInput({ ...form, ...patch, user_id: userID }))}
                      onSubmit={() => Promise.resolve()}
                      submitLabel="保存变更"
                      autoSave
                    />
                    <div className="mt-3 flex justify-end">
                      <SecondaryButton icon={<Trash2 size={16} />} loading={savingID === `delete:${promotion.id}`} onClick={() => requestDelete(promotion)}>删除规则</SecondaryButton>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
      <ConfirmDialog inline state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </dialog>,
    document.body,
  );
}
