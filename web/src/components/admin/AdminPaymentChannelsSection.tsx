'use client';

import { ChevronDown, CreditCard, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { activatePaymentChannel, deletePaymentChannel, updatePaymentChannel, type AdminPaymentChannel, type UpdatePaymentChannelInput } from '@/lib/api/admin';
import { useToast } from '@/components/ui/ToastProvider';
import { FOCUS_RING } from './adminUtils';
import { ConfirmDialog, type ConfirmDialogState, InlineBadge, SectionHeader } from './AdminSectionPrimitives';

type Draft = UpdatePaymentChannelInput;

const EMPTY_ALIPAY = {
  alipay_app_id: '', alipay_gateway_url: '', alipay_notify_url: '', alipay_return_url: '', alipay_private_key: '', alipay_public_key: '',
};
const EMPTY_WECHAT = {
  wechat_pay_mch_id: '', wechat_pay_app_id: '', wechat_pay_serial_no: '', wechat_pay_notify_url: '', wechat_pay_api_v3_key: '', wechat_pay_private_key: '', wechat_pay_platform_public_key: '',
};
const EMPTY_WAFFO = {
  waffo_merchant_id: '', waffo_private_key: '', waffo_api_base_url: '', waffo_product_id: '', waffo_product_id_map: '', waffo_checkout_currency: 'USD', waffo_cny_per_usd: '7.2', waffo_webhook_env: '',
};

function draftFromChannel(item: AdminPaymentChannel): Draft {
  return {
    id: item.id,
    provider: item.provider,
    name: item.name,
    enabled: item.enabled,
    is_active: item.is_active,
    alipay_app_id: item.alipay_app_id ?? '',
    alipay_gateway_url: item.alipay_gateway_url ?? '',
    alipay_notify_url: item.alipay_notify_url ?? '',
    alipay_return_url: item.alipay_return_url ?? '',
    wechat_pay_mch_id: item.wechat_pay_mch_id ?? '',
    wechat_pay_app_id: item.wechat_pay_app_id ?? '',
    wechat_pay_serial_no: item.wechat_pay_serial_no ?? '',
    wechat_pay_notify_url: item.wechat_pay_notify_url ?? '',
    waffo_merchant_id: item.waffo_merchant_id ?? '',
    waffo_api_base_url: item.waffo_api_base_url ?? '',
    waffo_product_id: item.waffo_product_id ?? '',
    waffo_product_id_map: item.waffo_product_id_map ?? '',
    waffo_checkout_currency: item.waffo_checkout_currency ?? 'USD',
    waffo_cny_per_usd: item.waffo_cny_per_usd ?? '7.2',
    waffo_webhook_env: item.waffo_webhook_env ?? '',
  };
}

function emptyDraft(provider: 'alipay' | 'wechat' | 'waffo'): Draft {
  const name = provider === 'alipay' ? '支付宝通道' : provider === 'wechat' ? '微信支付通道' : 'Pancake/Waffo 通道';
  return { id: `paych_${provider}_${Date.now()}`, provider, name, enabled: true, is_active: false, ...EMPTY_ALIPAY, ...EMPTY_WECHAT, ...EMPTY_WAFFO };
}

export function AdminPaymentChannelsSection({ channels, onRefresh }: { channels: readonly AdminPaymentChannel[]; onRefresh: () => Promise<void> | void }) {
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingID, setSavingID] = useState<string>();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const entries = useMemo(() => channels.map((item) => [item.id, drafts[item.id] ?? draftFromChannel(item), item] as const), [channels, drafts]);
  const addDraft = (provider: 'alipay' | 'wechat' | 'waffo') => {
    const draft = emptyDraft(provider);
    setDrafts((current) => ({ ...current, [draft.id]: draft }));
  };
  const baseDraft = (id: string) => drafts[id] ?? (channels.find((item) => item.id === id) ? draftFromChannel(channels.find((item) => item.id === id)!) : emptyDraft('alipay'));
  const patch = (id: string, patchValue: Partial<Draft>) => setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? baseDraft(id)), ...patchValue } as Draft }));
  const save = async (draft: Draft) => {
    setSavingID(draft.id);
    try {
      await updatePaymentChannel(draft);
      showToast({ kind: 'success', message: '支付通道已保存' });
      setDrafts((current) => { const next = { ...current }; delete next[draft.id]; return next; });
      await onRefresh();
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof Error ? error.message : '保存失败' });
    } finally { setSavingID(undefined); }
  };
  const activate = async (id: string) => {
    setSavingID(id);
    try { await activatePaymentChannel(id); showToast({ kind: 'success', message: '当前通道已切换' }); await onRefresh(); }
    catch (error) { showToast({ kind: 'error', message: error instanceof Error ? error.message : '切换失败' }); }
    finally { setSavingID(undefined); }
  };
  const remove = async (id: string) => {
    setSavingID(id);
    try { await deletePaymentChannel(id); showToast({ kind: 'success', message: '支付通道已删除' }); await onRefresh(); }
    catch (error) { showToast({ kind: 'error', message: error instanceof Error ? error.message : '删除失败' }); }
    finally { setSavingID(undefined); }
  };
  const requestActivate = (id: string) => {
    const channel = channels.find((item) => item.id === id);
    setConfirmDialog({ title: '切换当前支付通道？', description: `${channel?.name || id} 将接管同支付方式的新订单。已有订单仍按原通道处理。`, confirmLabel: '切换通道', tone: 'warning', onConfirm: () => void activate(id) });
  };
  const requestRemove = (id: string) => {
    const channel = channels.find((item) => item.id === id);
    setConfirmDialog({ title: '删除支付通道？', description: `${channel?.name || id} 的数据库配置将被删除。请先确认没有待处理订单依赖该通道。`, confirmLabel: '删除通道', tone: 'danger', onConfirm: () => void remove(id) });
  };
  return (
    <section className="admin-config-section space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader icon={<CreditCard size={16} />} eyebrow="收款配置" title="支付收款通道" subtitle="支付宝和微信支付可共存；每个支付方式同一时间只能有一个启用的当前通道。密钥留空表示保留已有值。" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-black text-secondary transition hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`} onClick={() => addDraft('alipay')}><Plus size={14} aria-hidden="true" />支付宝</button>
          <button type="button" className={`inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-black text-secondary transition hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`} onClick={() => addDraft('wechat')}><Plus size={14} aria-hidden="true" />微信</button>
          <button type="button" className={`inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-black text-secondary transition hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`} onClick={() => addDraft('waffo')}><Plus size={14} aria-hidden="true" />Waffo</button>
        </div>
      </div>
      <div className="grid items-start gap-3 xl:grid-cols-2">
        {entries.map(([id, draft, saved]) => <ChannelCard key={id} id={id} draft={draft} saved={saved} saving={savingID === id} onPatch={patch} onSave={save} onActivate={requestActivate} onDelete={requestRemove} />)}
        {Object.entries(drafts).filter(([id]) => !channels.some((item) => item.id === id)).map(([id, draft]) => <ChannelCard key={id} id={id} draft={draft} saving={savingID === id} onPatch={patch} onSave={save} onActivate={activate} onDelete={(draftID) => setDrafts((cur) => { const next = { ...cur }; delete next[draftID]; return next; })} />)}
      </div>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </section>
  );
}

function ChannelCard({ id, draft, saved, saving, onPatch, onSave, onActivate, onDelete }: { id: string; draft: Draft; saved?: AdminPaymentChannel; saving: boolean; onPatch: (id: string, patch: Partial<Draft>) => void; onSave: (draft: Draft) => void; onActivate: (id: string) => void; onDelete: (id: string) => void }) {
  const isEnv = saved?.source === 'env' || id.startsWith('env_');
  const inputClass = `aics-control mt-1 w-full rounded-control px-3 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted ${FOCUS_RING}`;
  return <details className="admin-card group self-start rounded-surface p-3" open={!saved || saved.is_active ? true : undefined}>
    <summary className="cursor-pointer list-none">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-sm font-black text-ink"><span>{draft.provider === 'alipay' ? '支付宝' : draft.provider === 'wechat' ? '微信支付' : 'Pancake/Waffo'}</span><InlineBadge tone={saved?.is_active ? 'emerald' : 'slate'}>{saved?.is_active ? '当前使用中' : '备用'}</InlineBadge>{isEnv ? <InlineBadge tone="amber">环境变量只读</InlineBadge> : null}</div><div className="mt-1 break-words text-xs font-semibold text-secondary">{draft.name} · <span className="admin-mono">{id}</span></div></div>
      <div className="flex shrink-0 items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-bold text-secondary"><input type="checkbox" checked={draft.enabled} disabled={isEnv} onChange={(e) => onPatch(id, { enabled: e.target.checked })} className="size-4 accent-[var(--ui-accent)]" />启用</label>
        <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </div>
    </div>
    </summary>
    <div className="mt-4 space-y-3 border-t border-line pt-4">
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs font-bold text-secondary">ID<input className={inputClass} disabled={Boolean(saved) || isEnv} value={draft.id} onChange={(e) => onPatch(id, { id: e.target.value })} /></label>
      <label className="text-xs font-bold text-secondary">名称<input className={inputClass} disabled={isEnv} value={draft.name} onChange={(e) => onPatch(id, { name: e.target.value })} /></label>
    </div>
    {draft.provider === 'alipay' ? <AlipayFields draft={draft} disabled={isEnv} inputClass={inputClass} onPatch={(patch) => onPatch(id, patch)} saved={saved} /> : draft.provider === 'wechat' ? <WechatFields draft={draft} disabled={isEnv} inputClass={inputClass} onPatch={(patch) => onPatch(id, patch)} saved={saved} /> : <WaffoFields draft={draft} disabled={isEnv} inputClass={inputClass} onPatch={(patch) => onPatch(id, patch)} saved={saved} />}
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" disabled={saving || isEnv} className={`rounded-control border border-accent bg-accent px-3 py-2 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50 ${FOCUS_RING}`} onClick={() => onSave(draft)}>{saving ? '保存中…' : '保存配置'}</button>
      <button type="button" disabled={saving || saved?.is_active || !saved} className={`rounded-control border border-line bg-surface px-3 py-2 text-sm font-bold text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink disabled:opacity-50 ${FOCUS_RING}`} onClick={() => onActivate(id)}>设为当前通道</button>
      <button type="button" disabled={saving || isEnv} className={`rounded-control border border-danger bg-surface px-3 py-2 text-sm font-bold text-danger hover:bg-danger-soft disabled:opacity-50 ${FOCUS_RING}`} onClick={() => onDelete(id)}>{saved ? '删除通道' : '取消草稿'}</button>
    </div>
    </div>
  </details>;
}

function AlipayFields({ draft, saved, disabled, inputClass, onPatch }: { draft: Draft; saved?: AdminPaymentChannel; disabled: boolean; inputClass: string; onPatch: (patch: Partial<Draft>) => void }) {
  return <div className="grid gap-2"><label className="text-xs font-bold">App ID<input className={inputClass} disabled={disabled} value={draft.alipay_app_id ?? ''} onChange={(e) => onPatch({ alipay_app_id: e.target.value })} /></label><label className="text-xs font-bold">网关 URL<input className={inputClass} disabled={disabled} value={draft.alipay_gateway_url ?? ''} onChange={(e) => onPatch({ alipay_gateway_url: e.target.value })} /></label><label className="text-xs font-bold">异步通知 URL<input className={inputClass} disabled={disabled} value={draft.alipay_notify_url ?? ''} onChange={(e) => onPatch({ alipay_notify_url: e.target.value })} /></label><label className="text-xs font-bold">返回 URL<input className={inputClass} disabled={disabled} value={draft.alipay_return_url ?? ''} onChange={(e) => onPatch({ alipay_return_url: e.target.value })} /></label><SecretInput label={`应用私钥${saved?.alipay_private_key_configured ? '（已配置）' : ''}`} field="alipay_private_key" disabled={disabled} inputClass={inputClass} onPatch={onPatch} /><SecretInput label={`支付宝公钥${saved?.alipay_public_key_configured ? '（已配置）' : ''}`} field="alipay_public_key" disabled={disabled} inputClass={inputClass} onPatch={onPatch} /></div>;
}
function WechatFields({ draft, saved, disabled, inputClass, onPatch }: { draft: Draft; saved?: AdminPaymentChannel; disabled: boolean; inputClass: string; onPatch: (patch: Partial<Draft>) => void }) {
  return <div className="grid gap-2"><label className="text-xs font-bold">商户号<input className={inputClass} disabled={disabled} value={draft.wechat_pay_mch_id ?? ''} onChange={(e) => onPatch({ wechat_pay_mch_id: e.target.value })} /></label><label className="text-xs font-bold">App ID<input className={inputClass} disabled={disabled} value={draft.wechat_pay_app_id ?? ''} onChange={(e) => onPatch({ wechat_pay_app_id: e.target.value })} /></label><label className="text-xs font-bold">商户证书序列号<input className={inputClass} disabled={disabled} value={draft.wechat_pay_serial_no ?? ''} onChange={(e) => onPatch({ wechat_pay_serial_no: e.target.value })} /></label><label className="text-xs font-bold">通知 URL<input className={inputClass} disabled={disabled} value={draft.wechat_pay_notify_url ?? ''} onChange={(e) => onPatch({ wechat_pay_notify_url: e.target.value })} /></label><SecretInput label={`API v3 Key${saved?.wechat_pay_api_v3_key_configured ? '（已配置）' : ''}`} field="wechat_pay_api_v3_key" disabled={disabled} inputClass={inputClass} onPatch={onPatch} /><SecretInput label={`商户私钥${saved?.wechat_pay_private_key_configured ? '（已配置）' : ''}`} field="wechat_pay_private_key" disabled={disabled} inputClass={inputClass} onPatch={onPatch} /><SecretInput label={`微信平台公钥${saved?.wechat_pay_platform_public_key_configured ? '（已配置）' : ''}`} field="wechat_pay_platform_public_key" disabled={disabled} inputClass={inputClass} onPatch={onPatch} /></div>;
}
function WaffoFields({ draft, saved, disabled, inputClass, onPatch }: { draft: Draft; saved?: AdminPaymentChannel; disabled: boolean; inputClass: string; onPatch: (patch: Partial<Draft>) => void }) {
  return <div className="grid gap-2"><label className="text-xs font-bold">Merchant ID<input className={inputClass} disabled={disabled} value={draft.waffo_merchant_id ?? ''} onChange={(e) => onPatch({ waffo_merchant_id: e.target.value })} /></label><label className="text-xs font-bold">API Base URL<input className={inputClass} disabled={disabled} value={draft.waffo_api_base_url ?? ''} onChange={(e) => onPatch({ waffo_api_base_url: e.target.value })} /></label><label className="text-xs font-bold">默认 Product ID<input className={inputClass} disabled={disabled} value={draft.waffo_product_id ?? ''} onChange={(e) => onPatch({ waffo_product_id: e.target.value })} /></label><label className="text-xs font-bold">结算币种<input className={inputClass} disabled={disabled} value={draft.waffo_checkout_currency ?? 'USD'} onChange={(e) => onPatch({ waffo_checkout_currency: e.target.value })} /></label><label className="text-xs font-bold">CNY/USD 汇率<input className={inputClass} disabled={disabled} value={draft.waffo_cny_per_usd ?? '7.2'} onChange={(e) => onPatch({ waffo_cny_per_usd: e.target.value })} /></label><label className="text-xs font-bold">Webhook 环境<input className={inputClass} disabled={disabled} placeholder="prod 或留空" value={draft.waffo_webhook_env ?? ''} onChange={(e) => onPatch({ waffo_webhook_env: e.target.value })} /></label><label className="text-xs font-bold">Product ID Map（JSON）<textarea className={`${inputClass} min-h-20 font-mono`} disabled={disabled} value={draft.waffo_product_id_map ?? ''} onChange={(e) => onPatch({ waffo_product_id_map: e.target.value })} /></label><SecretInput label={`Waffo 私钥${saved?.waffo_private_key_configured ? '（已配置）' : ''}`} field="waffo_private_key" disabled={disabled} inputClass={inputClass} onPatch={onPatch} /></div>;
}

function SecretInput({ label, field, disabled, inputClass, onPatch }: { label: string; field: keyof Draft; disabled: boolean; inputClass: string; onPatch: (patch: Partial<Draft>) => void }) {
  const configured = label.includes('已配置');
  return <label className="text-xs font-bold text-secondary"><span className="flex items-center justify-between gap-2"><span>{label.replace('（已配置）', '')}</span><span className={`rounded-control border px-1.5 py-0.5 text-xs ${configured ? 'border-success bg-success-soft text-success' : 'border-warning bg-warning-soft text-warning'}`}>{configured ? '已配置 · 留空保留' : '未配置'}</span></span><textarea className={`${inputClass} min-h-20 font-mono`} disabled={disabled} placeholder={configured ? '输入新值以替换现有密钥' : '输入密钥'} autoComplete="new-password" spellCheck={false} onChange={(e) => onPatch({ [field]: e.target.value } as Partial<Draft>)} /></label>;
}
