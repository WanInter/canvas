'use client';

import { AlertTriangle, ChevronDown, CirclePlus, Copy, Database, Eye, EyeOff, LayoutList, Link2, RotateCcw, Search, Table2, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { estimateCredits } from '@/lib/generation/modelParams';
import { IMAGE_PRICING_QUALITY_KEYS, IMAGE_PRICING_RESOLUTION_KEYS, type ImagePricingQualityKey, type ImagePricingResolutionKey } from '@/lib/modelPricing';
import { type AdminBillingProduct, type AdminModelRoutingRule } from '@/lib/api/admin';
import {
  type AdminLabels,
  FOCUS_RING,
  GENERATION_PROVIDER_ADAPTERS,
  filterStorageEntries,
  isModelFormDirty,
  isProviderFormDirty,
  productKindOptions,
  resetProviderForm,
  storageProviderLabel,
  storageProviderOptions,
  storageProviderSelectionPatch,
  storageAutofillSafeProps,
  type ModelEntry,
  type ModelForm,
  type ProductEntry,
  type ProductForm,
  providerAutofillSafeProps,
  type ProviderEntry,
  type ProviderForm,
  type StorageProviderEntry,
  type StorageProviderForm,
} from './adminUtils';
import { AdminKeyValueGrid, AdminMobileCard, AdminModal, AdminTableFrame, AdminTableHeaderRow, AdminTableRow, ConfirmDialog, type ConfirmDialogState, Field, FilterPill, InlineBadge, PrimaryButton, SecondaryButton, SectionHeader, StatusBadge, EmptyList } from './AdminSectionPrimitives';
import { ModelIdentityFields } from './AdminModelIdentityFields';
import { formatProductUnitPrice, ProductCard, productRiskItems, productTypeLabel } from './AdminProductComponents';
import { ModelParamEditor } from './ModelParamEditor';
import { editableInputLimitsSignature, editableParamListSignature, editablePricingConfigSignature, modelFieldDOMID, parseDisplayOrder, serializeEditableParams, serializeEditablePricingConfig, type EditableImagePricingConfig, type EditableInputLimits, type EditableVideoPricingConfig, type ModelValidationIssue } from './modelEditorUtils';

function adminSectionParam(key: string, fallback = ''): string {
  return typeof window === 'undefined' ? fallback : new URLSearchParams(window.location.search).get(key) ?? fallback;
}

function adminSectionEnum<T extends string>(key: string, values: readonly T[], fallback: T): T {
  const value = adminSectionParam(key, fallback);
  return values.includes(value as T) ? value as T : fallback;
}

function useAdminSectionURLState(tab: string, state: Readonly<Record<string, string>>, defaults: Readonly<Record<string, string>>): void {
  const serializedState = JSON.stringify(state);
  const serializedDefaults = JSON.stringify(defaults);
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('tab') !== tab) return;
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(state)) {
      if (!value || value === defaults[key]) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState({ ...window.history.state, adminSection: tab }, '', url);
  // Serialized values keep the effect stable while allowing callers to pass object literals.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedDefaults, serializedState, tab]);
}

export function ProviderSection({
  labels,
  providerEntries,
  modelEntries,
  modelIssues,
  savingKey,
  onChange,
  onAdd,
  onDelete,
  onDismissDraft,
  onSave,
  onTest,
}: Readonly<{
  labels: AdminLabels;
  providerEntries: readonly ProviderEntry[];
  modelEntries: readonly ModelEntry[];
  modelIssues: Readonly<Record<string, readonly ModelValidationIssue[]>>;
  savingKey?: string;
  onChange: (formKey: string, patch: Partial<ProviderForm>) => void;
  onAdd: () => void;
  onDelete: (formKey: string) => Promise<void>;
  onDismissDraft: (formKey: string) => void;
  onSave: (formKey: string) => Promise<void>;
  onTest: (formKey: string) => Promise<void>;
}>) {
  const [query, setQuery] = useState(() => adminSectionParam('provider_query'));
  const [statusFilter, setStatusFilter] = useState<ProviderViewFilter>(() => adminSectionEnum('provider_status', ['all', 'enabled', 'disabled', 'secret-missing', 'dirty', 'linked', 'unlinked', 'draft'] as const, 'all'));
  useAdminSectionURLState('providers', { provider_query: query, provider_status: statusFilter }, { provider_query: '', provider_status: 'all' });
  const providerModelStats = useMemo(() => buildProviderModelStats(modelEntries, modelIssues), [modelEntries, modelIssues]);
  const filteredEntries = useMemo(() => filterProviderEntries(providerEntries, query, statusFilter, providerModelStats), [providerEntries, providerModelStats, query, statusFilter]);
  const enabledCount = providerEntries.filter(([, form]) => form.enabled).length;
  const missingSecretCount = providerEntries.filter(([, form]) => !form.configured && !form.apiKey.trim()).length;
  const disabledCount = providerEntries.length - enabledCount;
  const dirtyCount = providerEntries.filter(([, form]) => isProviderFormDirty(form)).length;
  const draftCount = providerEntries.filter(([, form]) => form.isDraft).length;

  return (
    <section className="admin-config-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader icon={<Database size={16} />} eyebrow={labels.providersEyebrow} title="生成 Provider" subtitle="管理上游适配器、连接地址和密钥；测试通过后再启用供模型调用。" />
        <SecondaryButton onClick={onAdd} icon={<CirclePlus size={16} />}>
          {labels.addProvider}
        </SecondaryButton>
      </div>

      <div className="admin-config-toolbar mt-4 flex flex-col gap-3 px-0 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="admin-config-search flex items-center gap-3 px-3 xl:min-w-[360px] xl:max-w-[520px] xl:flex-1">
          <Search size={15} className="text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${labels.searchPlaceholder} / base url / adapter`}
            aria-label={`${labels.searchPlaceholder} / base url / adapter`}
            name="admin-provider-search"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} count={providerEntries.length}>全部</FilterPill>
          <FilterPill active={statusFilter === 'enabled'} onClick={() => setStatusFilter('enabled')} count={enabledCount}>{labels.enabled}</FilterPill>
          <FilterPill active={statusFilter === 'disabled'} onClick={() => setStatusFilter('disabled')} count={disabledCount}>{labels.disabled}</FilterPill>
          <FilterPill active={statusFilter === 'secret-missing'} onClick={() => setStatusFilter('secret-missing')} count={missingSecretCount}>{labels.secretMissing}</FilterPill>
          <FilterPill active={statusFilter === 'dirty'} onClick={() => setStatusFilter('dirty')} count={dirtyCount}>未保存</FilterPill>
          <FilterPill active={statusFilter === 'linked'} onClick={() => setStatusFilter('linked')} count={providerEntries.filter(([, form]) => (providerModelStats.get(providerStatsKey(form.id || ''))?.total ?? 0) > 0).length}>有模型</FilterPill>
          <FilterPill active={statusFilter === 'unlinked'} onClick={() => setStatusFilter('unlinked')} count={providerEntries.filter(([, form]) => (providerModelStats.get(providerStatsKey(form.id || ''))?.total ?? 0) === 0).length}>无模型</FilterPill>
          <FilterPill active={statusFilter === 'draft'} onClick={() => setStatusFilter('draft')} count={draftCount}>{labels.draftBadge}</FilterPill>
          {(query || statusFilter !== 'all') ? <button type="button" onClick={() => { setQuery(''); setStatusFilter('all'); }} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>重置筛选</button> : null}
        </div>
      </div>

      <div className="mt-4">
        {filteredEntries.length === 0 ? (
          <EmptyList title={labels.noSearchResult} />
        ) : (
          <>
          <div className="space-y-2 md:hidden">
            {filteredEntries.map(([formKey, form]) => (
              <ProviderTableItem key={formKey} mobile labels={labels} formKey={formKey} form={form} modelStats={providerModelStats.get(providerStatsKey(form.id || formKey))} linkedModels={modelsForProvider(modelEntries, modelIssues, form.id || formKey)} savingKey={savingKey} onChange={(patch) => onChange(formKey, patch)} onDelete={() => void onDelete(formKey)} onDismissDraft={() => onDismissDraft(formKey)} onSave={() => void onSave(formKey)} onTest={() => void onTest(formKey)} />
            ))}
          </div>
          <div className="hidden md:block">
          <AdminTableFrame minWidth={1180}>
            <AdminTableHeaderRow columns="grid-cols-[130px_minmax(180px,1fr)_210px_minmax(220px,1.2fr)_130px_150px_140px]">
              <span>状态</span><span>Provider</span><span>Adapter</span><span>Base URL</span><span>密钥</span><span>关联模型</span><span>操作</span>
            </AdminTableHeaderRow>
            {filteredEntries.map(([formKey, form]) => (
              <ProviderTableItem
                key={formKey}
                labels={labels}
                formKey={formKey}
                form={form}
                modelStats={providerModelStats.get(providerStatsKey(form.id || formKey))}
                linkedModels={modelsForProvider(modelEntries, modelIssues, form.id || formKey)}
                savingKey={savingKey}
                onChange={(patch) => onChange(formKey, patch)}
                onDelete={() => void onDelete(formKey)}
                onDismissDraft={() => onDismissDraft(formKey)}
                onSave={() => void onSave(formKey)}
                onTest={() => void onTest(formKey)}
              />
            ))}
          </AdminTableFrame>
          </div>
          </>
        )}
      </div>
    </section>
  );
}


function ProviderTableItem({ mobile = false, labels, formKey, form, modelStats, linkedModels, savingKey, onChange, onDelete, onDismissDraft, onSave, onTest }: Readonly<{
  mobile?: boolean;
  labels: AdminLabels;
  formKey: string;
  form: ProviderForm;
  modelStats?: ProviderModelStats;
  linkedModels: readonly ProviderLinkedModel[];
  savingKey?: string;
  onChange: (patch: Partial<ProviderForm>) => void;
  onDelete: () => void;
  onDismissDraft: () => void;
  onSave: () => void;
  onTest: () => void;
}>) {
  const [modalOpen, setModalOpen] = useState(() => {
    if (!form.isDraft || typeof window === 'undefined') return false;
    return window.matchMedia(mobile ? '(max-width: 767px)' : '(min-width: 768px)').matches;
  });
  const dirty = isProviderFormDirty(form);
  const validation = validateProviderForm(form);
  return (
    <>
      {mobile ? (
        <AdminMobileCard
          title={form.id.trim() || labels.providerDraftTitle}
          subtitle={`${adapterLabel(form.adapter)} · ${form.baseURL || 'Base URL 未配置'}`}
          badge={<StatusBadge active={form.enabled} activeLabel={labels.enabled} inactiveLabel={labels.disabled} />}
          action={<div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setModalOpen(true)} className={`min-h-9 rounded-control border border-line text-xs font-black text-secondary ${FOCUS_RING}`}>编辑配置</button>{!form.isDraft ? <button type="button" onClick={onTest} disabled={savingKey === `provider-test:${formKey}`} className={`min-h-9 rounded-control border border-line text-xs font-black text-secondary disabled:opacity-50 ${FOCUS_RING}`}>测试连接</button> : null}</div>}
        >
          <AdminKeyValueGrid items={[
            { label: '密钥', value: secretStatusText(form, labels) },
            { label: '关联模型', value: `${modelStats?.enabled ?? 0}/${modelStats?.total ?? 0}` },
            { label: '配置状态', value: dirty ? '未保存' : form.isDraft ? labels.draftBadge : '已保存' },
            { label: '校验', value: validation.length > 0 ? `${validation.length} 项需处理` : '正常' },
          ]} />
        </AdminMobileCard>
      ) : (
      <AdminTableRow columns="grid-cols-[130px_minmax(180px,1fr)_210px_minmax(220px,1.2fr)_130px_150px_140px]" active={modalOpen} muted={!form.enabled}>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge active={form.enabled} activeLabel={labels.enabled} inactiveLabel={labels.disabled} />
          {form.isDraft ? <InlineBadge tone="amber">{labels.draftBadge}</InlineBadge> : null}
          {dirty && !form.isDraft ? <InlineBadge tone="amber">未保存</InlineBadge> : null}
          {validation.length > 0 ? <InlineBadge tone={validation.some((item) => item.blocking) ? 'amber' : 'slate'}>{validation.some((item) => item.blocking) ? '需处理' : '提示'}</InlineBadge> : null}
        </div>
        <div className="min-w-0">
          <div className="truncate font-black text-ink" title={form.id.trim() || labels.providerDraftTitle}>{form.id.trim() || labels.providerDraftTitle}</div>
          <div className="mt-1 text-xs font-semibold text-muted">{form.isDraft ? labels.draftBadge : 'Saved'}</div>
        </div>
        <div className="truncate text-xs font-bold text-secondary" title={adapterLabel(form.adapter)}>{adapterLabel(form.adapter)}</div>
        <div className="admin-mono truncate text-xs font-semibold text-secondary" title={form.baseURL || 'https://...'}>{form.baseURL || 'https://...'}</div>
        <span className="text-xs font-black text-secondary">{secretStatusText(form, labels)}</span>
        <div className="flex flex-wrap gap-1.5">
          <InlineBadge tone="slate">{modelStats?.total ?? 0}</InlineBadge>
          <InlineBadge tone="emerald">启用 {modelStats?.enabled ?? 0}</InlineBadge>
          {(modelStats?.issues ?? 0) > 0 ? <InlineBadge tone="amber">Err {modelStats?.issues ?? 0}</InlineBadge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setModalOpen(true)} className={`rounded-control border border-line bg-surface px-2 py-1 text-xs font-black text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>编辑</button>
          {!form.isDraft ? <button type="button" onClick={onTest} disabled={savingKey === `provider-test:${formKey}`} className={`rounded-control border border-line bg-surface px-2 py-1 text-xs font-black text-secondary hover:bg-subtle hover:text-ink disabled:opacity-60 ${FOCUS_RING}`}>测试</button> : null}
        </div>
      </AdminTableRow>
      )}
      <AdminModal open={modalOpen} title={form.id.trim() || labels.providerDraftTitle} subtitle={`${adapterLabel(form.adapter)} · ${form.baseURL || 'Base URL 未配置'}`} badge={<StatusBadge active={form.enabled} activeLabel={labels.enabled} inactiveLabel={labels.disabled} />} onClose={() => setModalOpen(false)}>
        <ProviderCard labels={labels} formKey={formKey} form={form} modelStats={modelStats} linkedModels={linkedModels} savingKey={savingKey} onChange={onChange} onDelete={onDelete} onDismissDraft={onDismissDraft} onSave={onSave} onTest={onTest} />
      </AdminModal>
    </>
  );
}

function ProviderCard({
  labels,
  formKey,
  form,
  modelStats,
  linkedModels,
  savingKey,
  onChange,
  onDelete,
  onDismissDraft,
  onSave,
  onTest,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  form: ProviderForm;
  modelStats?: ProviderModelStats;
  linkedModels: readonly ProviderLinkedModel[];
  savingKey?: string;
  onChange: (patch: Partial<ProviderForm>) => void;
  onDelete: () => void;
  onDismissDraft: () => void;
  onSave: () => void;
  onTest?: () => void;
}>) {
  const providerIDFieldID = `provider-${formKey}-id`;
  const adapterFieldID = `provider-${formKey}-adapter`;
  const baseURLProps = providerAutofillSafeProps(form.id || formKey, 'base-url');
  const apiKeyProps = providerAutofillSafeProps(form.id || formKey, 'api-key');
  const [secretVisible, setSecretVisible] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const dirty = isProviderFormDirty(form);
  const validation = validateProviderForm(form);
  const hasBlockingErrors = validation.some((item) => item.blocking);

  const deleteWithImpact = () => {
    const enabledLinked = linkedModels.filter((model) => model.enabled).length;
    const impact = linkedModels.length > 0 ? `关联模型 ${linkedModels.length} 个，其中启用 ${enabledLinked} 个。删除后这些模型可能无法生成。` : '当前没有关联模型。';
    setConfirmDialog({ title: labels.deleteProviderConfirm, description: impact, confirmLabel: labels.deleteAction, tone: 'danger', onConfirm: onDelete });
  };

  return (
    <div className={`admin-config-editor p-0 transition ${dirty ? 'border-l-2 border-warning pl-3' : ''}`}>
      <ProviderCardSummary labels={labels} form={form} modelStats={modelStats} dirty={dirty} validation={validation} />
      <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <Field htmlFor={providerIDFieldID} label={labels.providerId} changed={form.id !== form.savedState.id} error={validation.find((item) => item.field === 'id')?.message}>
          <input id={providerIDFieldID} name={providerIDFieldID} value={form.id} onChange={(event) => onChange({ id: event.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} placeholder={labels.providerIdPlaceholder} autoComplete="off" spellCheck={false} />
        </Field>
        <Field htmlFor={adapterFieldID} label={labels.adapter} changed={form.adapter !== form.savedState.adapter}>
          <select id={adapterFieldID} name={adapterFieldID} value={form.adapter} onChange={(event) => onChange({ adapter: event.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`}>
            {GENERATION_PROVIDER_ADAPTERS.map((adapter) => <option key={adapter} value={adapter}>{adapterLabel(adapter)}</option>)}
          </select>
        </Field>
        <Field htmlFor={baseURLProps.id} label={labels.baseURL} changed={form.baseURL !== form.savedState.baseURL} error={validation.find((item) => item.field === 'baseURL')?.message}>
          <input value={form.baseURL} onChange={(event) => onChange({ baseURL: event.target.value })} {...baseURLProps} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} placeholder="https://..." />
        </Field>
        <Field htmlFor={apiKeyProps.id} label={labels.apiKey} changed={form.apiKey.trim().length > 0} error={validation.find((item) => item.field === 'apiKey')?.message}>
          <div className="flex rounded-control border border-line bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
            <input type={secretVisible ? 'text' : 'password'} value={form.apiKey} onChange={(event) => onChange({ apiKey: event.target.value })} {...apiKeyProps} className="min-w-0 flex-1 rounded-l-control bg-transparent px-3 py-2 text-sm outline-none" placeholder={secretPlaceholder(form, labels)} />
            <button type="button" onClick={() => setSecretVisible((value) => !value)} className={`shrink-0 rounded-r-control px-3 text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label={secretVisible ? '隐藏密钥' : '显示密钥'}>
              {secretVisible ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
            </button>
          </div>
        </Field>
      </div>
      <ProviderValidationPanel validation={validation} />
      <LinkedModelsPanel labels={labels} models={linkedModels} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 rounded-control border border-line bg-subtle px-3 py-2.5 text-sm font-bold text-secondary">
          <input type="checkbox" checked={form.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} className="h-4 w-4 accent-[var(--ui-accent)]" />
          {labels.enabled}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && !form.isDraft ? <SecondaryButton onClick={() => onChange(resetProviderForm(form))} icon={<RotateCcw size={16} />}>撤销修改</SecondaryButton> : null}
          {!form.isDraft && onTest ? <SecondaryButton onClick={onTest} icon={<Link2 size={16} />} loading={savingKey === `provider-test:${formKey}`}>测试连接</SecondaryButton> : null}
          <PrimaryButton onClick={onSave} disabled={hasBlockingErrors || (!dirty && !form.isDraft)} loading={savingKey === `provider:${formKey}`}>{dirty || form.isDraft ? labels.saveAction : '已保存'}</PrimaryButton>
          <SecondaryButton onClick={form.isDraft ? onDismissDraft : deleteWithImpact} icon={<Trash2 size={16} />} loading={form.isDraft ? false : savingKey === `provider-delete:${formKey}`}>{labels.deleteAction}</SecondaryButton>
        </div>
      </div>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </div>
  );
}

function ProviderCardSummary({ labels, form, modelStats, dirty, validation }: Readonly<{ labels: AdminLabels; form: ProviderForm; modelStats?: ProviderModelStats; dirty: boolean; validation: readonly ProviderValidationItem[] }>) {
  const title = form.id.trim() || labels.providerDraftTitle;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-ink">{title}</h3>
          <InlineBadge tone="indigo">{form.adapter || labels.adapter}</InlineBadge>
          {form.isDraft ? <InlineBadge>{labels.draftBadge}</InlineBadge> : null}
          {dirty && !form.isDraft ? <InlineBadge tone="amber">未保存</InlineBadge> : null}
          {validation.length > 0 ? <InlineBadge tone={validation.some((item) => item.blocking) ? 'amber' : 'slate'}>{validation.some((item) => item.blocking) ? '需处理' : '提示'}</InlineBadge> : null}
        </div>
        <div className="mt-2 grid gap-1 text-xs font-semibold text-secondary sm:grid-cols-2">
          <span className="truncate"><span className="text-muted">{labels.baseURL}: </span>{form.baseURL || 'https://...'}</span>
          <span className="truncate"><span className="text-muted">{labels.apiKey}: </span>{secretStatusText(form, labels)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <InlineBadge tone="slate">{`${modelStats?.total ?? 0} ${labels.modelsTabTitle}`}</InlineBadge>
          <InlineBadge tone="emerald">{`${labels.enabled} ${modelStats?.enabled ?? 0}`}</InlineBadge>
          {(modelStats?.issues ?? 0) > 0 ? <InlineBadge tone="amber">{`Error ${modelStats?.issues ?? 0}`}</InlineBadge> : null}
          {(modelStats?.image ?? 0) > 0 ? <InlineBadge>{`${labels.imageModels} ${modelStats?.image ?? 0}`}</InlineBadge> : null}
          {(modelStats?.video ?? 0) > 0 ? <InlineBadge>{`${labels.videoModels} ${modelStats?.video ?? 0}`}</InlineBadge> : null}
        </div>
      </div>
      <StatusBadge active={form.enabled} activeLabel={labels.enabled} inactiveLabel={labels.disabled} />
    </div>
  );
}

type ProviderValidationItem = Readonly<{
  field?: 'id' | 'baseURL' | 'apiKey';
  message: string;
  blocking?: boolean;
}>;

type ProviderLinkedModel = Readonly<{
  key: string;
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  sortEnabled: boolean;
  sortName: string;
  issues: number;
}>;

function validateProviderForm(form: ProviderForm): readonly ProviderValidationItem[] {
  const items: ProviderValidationItem[] = [];
  const id = form.id.trim();
  const baseURL = form.baseURL.trim();
  if (!id) items.push({ field: 'id', message: 'Provider ID 不能为空', blocking: true });
  if (baseURL) {
    try {
      const url = new URL(baseURL);
      if (!['http:', 'https:'].includes(url.protocol)) items.push({ field: 'baseURL', message: 'Base URL 必须以 http:// 或 https:// 开头', blocking: true });
      if (url.protocol === 'http:' && typeof window !== 'undefined' && window.location.protocol === 'https:') items.push({ field: 'baseURL', message: '生产环境建议使用 HTTPS 上游地址' });
      if (baseURL.endsWith('/')) items.push({ field: 'baseURL', message: '建议去掉末尾 /，避免路径拼接异常' });
    } catch {
      items.push({ field: 'baseURL', message: 'Base URL 格式无效', blocking: true });
    }
  }
  if (!form.configured && !form.apiKey.trim()) items.push({ field: 'apiKey', message: '缺少 API Key，启用后可能无法调用', blocking: false });
  if (form.apiKey.trim()) items.push({ field: 'apiKey', message: '新密钥待保存，保存后不会回显完整密钥' });
  return items;
}

function ProviderValidationPanel({ validation }: Readonly<{ validation: readonly ProviderValidationItem[] }>) {
  if (validation.length === 0) return null;
  return (
    <div className="mt-3 rounded-surface border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
      <div className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><div>{validation.map((item) => <p key={`${item.field ?? 'hint'}:${item.message}`}>{item.message}</p>)}</div></div>
    </div>
  );
}

function LinkedModelsPanel({ labels, models }: Readonly<{ labels: AdminLabels; models: readonly ProviderLinkedModel[] }>) {
  if (models.length === 0) return <p className="mt-3 rounded-surface border border-dashed border-line bg-subtle px-3 py-2 text-xs font-bold text-secondary">暂无关联模型，可在「{labels.modelsTabTitle}」里绑定该渠道。</p>;
  const visible = models.slice(0, 8);
  return (
    <div className="mt-3 rounded-surface border border-line bg-subtle p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-secondary"><span className="inline-flex items-center gap-1.5"><Link2 size={14} aria-hidden="true" />关联模型</span><span>{models.length} 个</span></div>
      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((model) => (
          <div key={model.key} className="min-w-0 rounded-surface bg-white px-2.5 py-2 text-xs ring-1 ring-inset ring-line">
            <div className="truncate font-black text-ink" title={model.name || model.id}>{model.name || model.id}</div>
            <div className="mt-1 flex flex-wrap gap-1 text-xs font-black text-secondary"><span>{model.type}</span><span>{model.enabled ? labels.enabled : labels.disabled}</span>{model.issues > 0 ? <span className="text-amber-700">Error {model.issues}</span> : null}</div>
          </div>
        ))}
      </div>
      {models.length > visible.length ? <p className="mt-2 text-xs font-bold text-secondary">还有 {models.length - visible.length} 个模型未显示，请到模型页查看完整列表。</p> : null}
    </div>
  );
}

function modelsForProvider(entries: readonly ModelEntry[], issues: Readonly<Record<string, readonly ModelValidationIssue[]>>, provider: string): readonly ProviderLinkedModel[] {
  const key = providerStatsKey(provider);
  if (!key) return [];
  return entries
    .filter(([, form]) => providerStatsKey(form.provider || form.listSnapshot.provider) === key)
    .map(([formKey, form]) => ({ key: formKey, id: form.id, name: form.name, sortName: form.savedState.name || form.name || form.id, type: form.type, enabled: form.isEnabled, sortEnabled: form.savedState.isEnabled, issues: issues[formKey]?.length ?? 0 }))
    .sort((left, right) => Number(right.issues > 0) - Number(left.issues > 0) || Number(right.sortEnabled) - Number(left.sortEnabled) || left.sortName.localeCompare(right.sortName));
}

function adapterLabel(adapter: string): string {
  const labels: Record<string, string> = {
    image_openai: 'OpenAI 图片协议',
    image_openai_grsai: 'GPT Image Plus 协议',
    image_gemini: 'Gemini 图片协议',
    image_waninter_async: 'Waninter 异步图片协议',
    video_openai: 'OpenAI 视频协议',
    video_volcengine_ark: '火山 Ark 视频协议',
    video_google_veo: 'Google Veo 协议',
    video_veo_apexer: 'Apexer Veo 协议',
    video_vjimeng: '即梦视频协议',
    video_openai_otuapi: 'OTU OpenAI 视频协议',
    video_openai_shishi: 'Shishi OpenAI 视频协议',
    video_xinghe: '星河 Transit9 视频协议',
    video_jimeng_dimensio: 'Jimeng Dimensio 视频协议',
  };
  return labels[adapter] ? `${labels[adapter]} · ${adapter}` : adapter;
}

function secretStatusText(form: ProviderForm, labels: AdminLabels): string {
  if (form.apiKey.trim()) return '新密钥待保存';
  return form.configured ? labels.secretConfigured : labels.secretMissing;
}

function secretPlaceholder(form: ProviderForm, labels: AdminLabels): string {
  if (form.configured) return '留空则保留现有密钥；输入则替换';
  return labels.apiKeyPlaceholder;
}

export function StorageSection({
  labels,
  storageEntries,
  savingKey,
  onAdd,
  onChange,
  onDelete,
  onDismissDraft,
  onSave,
  onTest,
}: Readonly<{
  labels: AdminLabels;
  storageEntries: readonly StorageProviderEntry[];
  savingKey?: string;
  onAdd: () => void;
  onChange: (formKey: string, patch: Partial<StorageProviderForm>) => void;
  onDelete: (formKey: string) => Promise<void>;
  onDismissDraft: (formKey: string) => void;
  onSave: (formKey: string) => Promise<void>;
  onTest: (formKey: string) => Promise<void>;
}>) {
  const [query, setQuery] = useState(() => adminSectionParam('storage_query'));
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'configured'>(() => adminSectionEnum('storage_status', ['all', 'active', 'inactive', 'configured'] as const, 'all'));
  useAdminSectionURLState('storage', { storage_query: query, storage_status: statusFilter }, { storage_query: '', storage_status: 'all' });
  const filteredEntries = useMemo(() => filterStorageEntries(storageEntries, query, statusFilter), [storageEntries, query, statusFilter]);
  const activeCount = storageEntries.filter(([, form]) => form.isActive).length;
  const configuredCount = storageEntries.filter(([, form]) => form.accessKeyConfigured && form.secretKeyConfigured).length;

  return (
    <section className="admin-config-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader icon={<Database size={16} />} eyebrow={labels.storageProvidersEyebrow} title="对象存储" subtitle="管理上传、公开访问和签名地址。当前生效配置会用于所有新生成资产。" />
        <SecondaryButton onClick={onAdd} icon={<CirclePlus size={16} />}>
          {labels.storageAdd}
        </SecondaryButton>
      </div>

      <div className="admin-config-toolbar mt-4 flex flex-col gap-3 px-0 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="admin-config-search flex items-center gap-3 px-3 xl:min-w-[360px] xl:max-w-[540px] xl:flex-1">
          <Search size={15} className="text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${labels.searchPlaceholder} / endpoint / bucket / region`}
            aria-label={`${labels.searchPlaceholder} / endpoint / bucket / region`}
            name="admin-storage-search"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} count={storageEntries.length}>全部</FilterPill>
          <FilterPill active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} count={activeCount}>{labels.storageCurrentActive}</FilterPill>
          <FilterPill active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} count={storageEntries.length - activeCount}>{labels.storageInactive}</FilterPill>
          <FilterPill active={statusFilter === 'configured'} onClick={() => setStatusFilter('configured')} count={configuredCount}>{labels.storageAccessKeyConfigured}</FilterPill>
          {(query || statusFilter !== 'all') ? <button type="button" onClick={() => { setQuery(''); setStatusFilter('all'); }} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>重置筛选</button> : null}
        </div>
      </div>

      <div className="mt-4">
        {filteredEntries.length === 0 ? (
          <EmptyList title={labels.noSearchResult} />
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(([formKey, form]) => (
              <StorageProviderCard
                key={formKey}
                labels={labels}
                formKey={formKey}
                form={form}
                savingKey={savingKey}
                onChange={(patch) => onChange(formKey, patch)}
                onDelete={() => void onDelete(formKey)}
                onDismissDraft={() => onDismissDraft(formKey)}
                onSave={() => void onSave(formKey)}
                onTest={() => void onTest(formKey)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StorageProviderCard({
  labels,
  formKey,
  form,
  savingKey,
  onChange,
  onDelete,
  onDismissDraft,
  onSave,
  onTest,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  form: StorageProviderForm;
  savingKey?: string;
  onChange: (patch: Partial<StorageProviderForm>) => void;
  onDelete: () => void;
  onDismissDraft: () => void;
  onSave: () => void;
  onTest: () => void;
}>) {
  const providerFieldID = storageFieldID(formKey, 'provider');
  const endpointProps = storageAutofillSafeProps(formKey, 'endpoint-url');
  const uploadEndpointProps = storageAutofillSafeProps(formKey, 'upload-endpoint-url');
  const bucketProps = storageAutofillSafeProps(formKey, 'bucket');
  const regionProps = storageAutofillSafeProps(formKey, 'region');
  const pathStyleFieldID = storageFieldID(formKey, 'pathStyle');
  const publicBaseURLProps = storageAutofillSafeProps(formKey, 'public-base-url');
  const assetPrefixProps = storageAutofillSafeProps(formKey, 'asset-prefix');
  const ttlFieldID = storageFieldID(formKey, 'signedURLTTLSeconds');
  const isAliyunOSS = form.provider === 'aliyun-oss';
  const isTencentCOS = form.provider === 'tencent-cos';
  const hasProviderManagedAddressing = isAliyunOSS || isTencentCOS;
  const endpointPlaceholder = isTencentCOS ? 'https://bucket-appid.cos.region.myqcloud.com' : 'https://oss-cn-shanghai.aliyuncs.com';
  const regionPlaceholder = isTencentCOS ? 'ap-guangzhou' : 'cn-shanghai';
  const publicBaseURLPlaceholder = isTencentCOS ? 'https://bucket-appid.cos.region.myqcloud.com' : 'https://cdn.example.com';
  const accessKeyProps = storageAutofillSafeProps(formKey, 'access-token');
  const secretKeyProps = storageAutofillSafeProps(formKey, 'secret-token');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const requestDelete = () => setConfirmDialog({ title: labels.storageDeleteConfirm, description: form.isActive ? '这是当前生效配置。删除前请先启用另一条存储配置，否则新资产上传会失败。' : `${form.id} 的连接信息和加密凭据将被删除，历史对象不会自动删除。`, confirmLabel: labels.deleteAction, tone: 'danger', onConfirm: onDelete });

  return (
    <details className="admin-card rounded-surface p-3.5" open={form.isDraft || form.isActive ? true : undefined}>
      <summary className="cursor-pointer list-none">
        <StorageProviderSummary labels={labels} form={form} />
      </summary>
      <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <Field htmlFor={fieldID(formKey, 'id')} label={labels.storageId}>
          <input
            id={fieldID(formKey, 'id')}
            name={fieldID(formKey, 'id')}
            value={form.id}
            onChange={(event) => onChange({ id: event.target.value })}
            disabled={!form.isDraft}
            className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${form.isDraft ? FOCUS_RING : 'opacity-70'}`}
            placeholder={labels.storageIdPlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field htmlFor={providerFieldID} label={labels.storageProvider}>
          <select id={providerFieldID} name={providerFieldID} value={form.provider} onChange={(event) => onChange(storageProviderSelectionPatch(form, event.target.value as StorageProviderForm['provider']))} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}>
            {storageProviderOptions(labels).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field htmlFor={endpointProps.id} label={labels.storageEndpointURL}>
          <input value={form.endpointURL} onChange={(event) => onChange({ endpointURL: event.target.value })} {...endpointProps} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder={endpointPlaceholder} />
        </Field>
        {hasProviderManagedAddressing ? (
          <Field htmlFor={uploadEndpointProps.id} label={labels.storageUploadEndpointURL}>
            <input value={form.uploadEndpointURL} onChange={(event) => onChange({ uploadEndpointURL: event.target.value })} {...uploadEndpointProps} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder={endpointPlaceholder} />
          </Field>
        ) : null}
        <Field htmlFor={bucketProps.id} label={labels.storageBucket}>
          <input value={form.bucket} onChange={(event) => onChange({ bucket: event.target.value })} {...bucketProps} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder="my-bucket" />
        </Field>
        <Field htmlFor={regionProps.id} label={labels.storageRegion}>
          <input value={form.region} onChange={(event) => onChange({ region: event.target.value })} {...regionProps} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder={regionPlaceholder} />
        </Field>
        {!hasProviderManagedAddressing ? (
          <Field htmlFor={pathStyleFieldID} label={labels.storagePathStyle}>
            <select id={pathStyleFieldID} name={pathStyleFieldID} value={form.pathStyle || 'auto'} onChange={(event) => onChange({ pathStyle: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}>
              <option value="auto">{labels.storagePathStyleAuto}</option>
              <option value="true">{labels.storagePathStylePath}</option>
              <option value="false">{labels.storagePathStyleVirtual}</option>
            </select>
          </Field>
        ) : null}
        <Field htmlFor={publicBaseURLProps.id} label={labels.storagePublicBaseURL}>
          <input value={form.publicBaseURL} onChange={(event) => onChange({ publicBaseURL: event.target.value })} {...publicBaseURLProps} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder={publicBaseURLPlaceholder} />
        </Field>
        <Field htmlFor={ttlFieldID} label={labels.storageSignedURLTTL}>
          <input type="number" min={1} step={1} value={form.signedURLTTLSeconds} onChange={(event) => onChange({ signedURLTTLSeconds: Number(event.target.value) })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
        </Field>
        <Field htmlFor={assetPrefixProps.id} label={labels.storageGeneratedAssetPrefix}>
          <input value={form.generatedAssetPrefix} onChange={(event) => onChange({ generatedAssetPrefix: event.target.value })} {...assetPrefixProps} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} placeholder="generated" />
        </Field>
        <Field htmlFor={accessKeyProps.id} label={isTencentCOS ? 'SecretId' : labels.storageAccessKey}>
          <input type="text" value={form.accessKey} onChange={(event) => onChange({ accessKey: event.target.value })} {...accessKeyProps} className={`aics-control w-full rounded-surface px-3 py-2 text-sm [-webkit-text-security:disc] ${FOCUS_RING}`} placeholder={labels.apiKeyPlaceholder} />
        </Field>
        <Field htmlFor={secretKeyProps.id} label={isTencentCOS ? 'SecretKey' : labels.storageSecretKey}>
          <input type="text" value={form.secretKey} onChange={(event) => onChange({ secretKey: event.target.value })} {...secretKeyProps} className={`aics-control w-full rounded-surface px-3 py-2 text-sm [-webkit-text-security:disc] ${FOCUS_RING}`} placeholder={labels.apiKeyPlaceholder} />
        </Field>
      </div>
      <StoragePreview form={form} />
      <p className="mt-2 text-xs font-semibold text-muted">{labels.storageSecretsHint}</p>
      {form.isActive && !form.isDraft ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">当前配置正在生效。修改 Bucket、Region 或 Provider 后，新资产将写入新位置，历史资源不会自动迁移。</div> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 rounded-surface border border-line bg-subtle px-3 py-2.5 text-sm font-bold text-secondary">
          <input type="checkbox" checked={form.isActive} onChange={(event) => onChange({ isActive: event.target.checked })} className="h-4 w-4 accent-[var(--ui-accent)]" />
          {labels.storageMarkActive}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {!form.isDraft ? <SecondaryButton onClick={onTest} icon={<Database size={16} />} loading={savingKey === `storage-test:${formKey}`}>{savingKey === `storage-test:${formKey}` ? labels.storageTesting : labels.storageTest}</SecondaryButton> : null}
          <PrimaryButton onClick={onSave} loading={savingKey === `storage:${formKey}`}>{labels.storageSave}</PrimaryButton>
          <SecondaryButton onClick={form.isDraft ? onDismissDraft : requestDelete} icon={<Trash2 size={16} />} loading={form.isDraft ? false : savingKey === `storage-delete:${formKey}`}>{labels.deleteAction}</SecondaryButton>
        </div>
      </div>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </details>
  );
}

function StorageProviderSummary({ labels, form }: Readonly<{ labels: AdminLabels; form: StorageProviderForm }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-ink">{form.id.trim() || labels.storageDraftTitle}</h3>
          <InlineBadge tone="indigo">{storageProviderLabel(form.provider, labels)}</InlineBadge>
          {form.isDraft ? <InlineBadge>{labels.draftBadge}</InlineBadge> : null}
          <InlineBadge tone={form.source === 'env' ? 'amber' : 'slate'}>{form.source === 'env' ? labels.storageSourceEnv : labels.storageSourceDatabase}</InlineBadge>
          <InlineBadge tone={form.isActive ? 'emerald' : 'slate'}>{form.isActive ? labels.storageCurrentActive : labels.storageInactive}</InlineBadge>
        </div>
        <div className="mt-2 grid gap-1 text-xs font-semibold text-secondary sm:grid-cols-2">
          <span className="truncate"><span className="text-muted">{labels.storageEndpointURL}: </span>{form.endpointURL || 'https://...'}</span>
          <span className="truncate"><span className="text-muted">{labels.storageBucket}: </span>{form.bucket || '—'}</span>
          <span className="truncate"><span className="text-muted">{labels.storageGeneratedAssetPrefix}: </span>{form.generatedAssetPrefix || 'generated'}</span>
          <span className="truncate"><span className="text-muted">{labels.storageAccessKey}: </span>{form.accessKeyConfigured ? labels.storageAccessKeyConfigured : labels.storageAccessKeyMissing}</span>
          <span className="truncate"><span className="text-muted">{labels.storageSecretKey}: </span>{form.secretKeyConfigured ? labels.storageSecretKeyConfigured : labels.storageSecretKeyMissing}</span>
        </div>
      </div>
    </div>
  );
}


function StoragePreview({ form }: Readonly<{ form: StorageProviderForm }>) {
  const prefix = form.generatedAssetPrefix.trim() || 'generated';
  const objectKey = `${prefix}/example.png`.replace(/\/+/g, '/');
  const publicURL = joinURL(form.publicBaseURL.trim(), objectKey);
  return (
    <div className="mt-3 rounded-surface border border-line bg-subtle px-3 py-2 text-xs font-semibold leading-5 text-secondary">
      <div className="font-black text-secondary">链路预览</div>
      <div className="mt-1 grid gap-1 md:grid-cols-2">
        <span className="truncate" title={form.bucket || '未填写'}>Bucket：{form.bucket || '未填写'}</span>
        <span className="truncate" title={objectKey}>Object Key：{objectKey}</span>
        <span className="truncate md:col-span-2" title={publicURL}>Public URL：{publicURL || '填写 Public Base URL 后预览'}</span>
      </div>
    </div>
  );
}

function joinURL(base: string, path: string): string {
  if (!base) return '';
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
function storageFieldID(formKey: string, field: string): string {
  return `storage-${formKey}-${field}`;
}

export function ModelsSection({
  labels,
  modelEntries,
  modelIssues,
  providerEntries,
  providerOptions,
  routingRules,
  savingKey,
  hasDirtyChanges,
  onAdd,
  onChange,
  onDismissDraft,
  onReset,
  onDuplicate,
  onDelete,
  onSave,
  onSaveAll,
}: Readonly<{
  labels: AdminLabels;
  modelEntries: readonly ModelEntry[];
  modelIssues: Readonly<Record<string, readonly ModelValidationIssue[]>>;
  providerEntries: readonly ProviderEntry[];
  providerOptions: readonly string[];
  routingRules: readonly AdminModelRoutingRule[];
  savingKey?: string;
  hasDirtyChanges: boolean;
  onAdd: () => string;
  onDuplicate: (formKey: string) => string;
  onChange: (formKey: string, patch: Partial<ModelForm>) => void;
  onDismissDraft: (formKey: string) => void;
  onReset: (formKey: string) => void;
  onDelete: (formKey: string) => void;
  onSave: (formKey: string) => void;
  onSaveAll: () => void;
}>) {
  const [query, setQuery] = useState(() => adminSectionParam('model_query'));
  const [viewFilter, setViewFilter] = useState<ModelViewFilter>(() => adminSectionEnum('model_status', ['all', 'enabled', 'disabled', 'video', 'image', 'dirty', 'issues', 'provider-disabled', 'no-capability', 'draft'] as const, 'all'));
  const [providerFilter, setProviderFilter] = useState(() => adminSectionParam('model_provider', 'all'));
  const [capabilityFilter, setCapabilityFilter] = useState<ModelCapabilityFilter>(() => adminSectionEnum('model_capability', [...MODEL_CAPABILITY_OPTIONS.map((item) => item.value), 'all', 'none'] as ModelCapabilityFilter[], 'all'));
  const [selectedModelKey, setSelectedModelKey] = useState<string>(() => adminSectionParam('model_selected'));
  const [layoutMode, setLayoutMode] = useState<'detail' | 'table'>(() => adminSectionEnum('model_layout', ['detail', 'table'] as const, 'table'));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  useAdminSectionURLState('models', { model_query: query, model_status: viewFilter, model_provider: providerFilter, model_capability: capabilityFilter, model_selected: selectedModelKey, model_layout: layoutMode }, { model_query: '', model_status: 'all', model_provider: 'all', model_capability: 'all', model_selected: '', model_layout: 'table' });
  useEffect(() => {
    if (adminSectionParam('model_layout') || !window.matchMedia('(max-width: 767px)').matches) return;
    setLayoutMode('detail');
  }, []);
  const providerStatusMap = useMemo(() => buildProviderStatusMap(providerEntries), [providerEntries]);
  const providerMetaMap = useMemo(() => buildProviderMetaMap(providerEntries), [providerEntries]);
  const filteredEntries = useMemo(
    () => filterModelEntries(modelEntries, query)
      .filter((entry) => matchesModelViewFilter(entry, viewFilter, modelIssues, providerStatusMap))
      .filter((entry) => matchesProviderFilter(entry, providerFilter))
      .filter((entry) => matchesCapabilityFilter(entry, capabilityFilter)),
    [capabilityFilter, modelEntries, modelIssues, providerFilter, providerStatusMap, query, viewFilter],
  );
  const providerGroups = useMemo(() => groupModelEntriesByProvider(filteredEntries, providerOptions, modelIssues), [filteredEntries, providerOptions, modelIssues]);
  const selectedEntryInAll = selectedModelKey ? (modelEntries.find(([formKey]) => formKey === selectedModelKey) ?? null) : null;
  const selectedEntryInFiltered = selectedModelKey ? (filteredEntries.find(([formKey]) => formKey === selectedModelKey) ?? null) : null;
  const selectedEntry = selectedEntryInFiltered ?? selectedEntryInAll ?? filteredEntries[0] ?? null;
  const effectiveSelectedKey = selectedEntry?.[0] ?? '';
  const selectedHiddenByFilters = Boolean(selectedEntryInAll && !selectedEntryInFiltered);
  const enabledCount = modelEntries.filter((entry) => isModelEffectivelyEnabled(entry, providerStatusMap)).length;
  const disabledCount = modelEntries.length - enabledCount;
  const imageCount = modelEntries.filter(([, form]) => form.type === 'image').length;
  const videoCount = modelEntries.filter(([, form]) => form.type === 'video').length;
  const dirtyCount = modelEntries.filter(([, form]) => isModelFormDirty(form)).length;
  const draftCount = modelEntries.filter(([, form]) => form.isDraft).length;
  const issueCount = modelEntries.filter(([formKey]) => (modelIssues[formKey]?.length ?? 0) > 0).length;
  const disabledProviderCount = modelEntries.filter((entry) => isModelProviderDisabled(entry, providerStatusMap)).length;
  const noCapabilityCount = modelEntries.filter(([, form]) => csvSet(form.capabilitiesText).size === 0).length;
  useEffect(() => {
    if (layoutMode !== 'detail' || selectedModelKey || filteredEntries.length === 0) return;
    setSelectedModelKey(filteredEntries[0][0]);
  }, [filteredEntries, layoutMode, selectedModelKey]);

  const hasPendingModelChanges = hasDirtyChanges || dirtyCount > 0;
  const isSavingModel = savingKey?.startsWith('model:') ?? false;

  const setModelLayoutMode = (mode: 'detail' | 'table') => {
    if (mode === 'detail' && editingKey) setSelectedModelKey(editingKey);
    setLayoutMode(mode);
  };

  const focusModel = (formKey: string) => {
    setSelectedModelKey(formKey);
    setLayoutMode('detail');
    window.requestAnimationFrame(() => document.getElementById(`model-card-${formKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const focusFirstIssue = () => {
    const firstIssue = modelEntries.find(([formKey]) => (modelIssues[formKey]?.length ?? 0) > 0);
    if (firstIssue) focusModel(firstIssue[0]);
  };

  const confirmSaveAllModels = () => {
    const dirtyModels = modelEntries.filter(([, form]) => isModelFormDirty(form));
    if (dirtyModels.length === 0) return;
    const summary = dirtyModels.slice(0, 5).map(([, form]) => form.name || form.id || form.upstreamModelID || '未命名模型').join('、');
    const remaining = dirtyModels.length > 5 ? ` 等 ${dirtyModels.length} 个` : '';
    const issueWarning = issueCount > 0 ? `\n\n注意：当前还有 ${issueCount} 个模型存在校验问题，保存全部时可能会被阻止。` : '';
    setConfirmDialog({ title: `保存 ${dirtyModels.length} 个模型？`, description: `${summary}${remaining}${issueWarning.replaceAll('\n', ' ')}`, confirmLabel: '保存全部', tone: 'warning', onConfirm: onSaveAll });
  };

  const requestDeleteModel = (form: ModelForm, formKey: string) => {
    setConfirmDialog({
      title: labels.deleteModelConfirm,
      description: `${form.name || form.id} · ${modelProviderID(form)} · ${form.type}。删除后该模型将不能再用于新任务。`,
      confirmLabel: labels.deleteAction,
      tone: 'danger',
      onConfirm: () => onDelete(formKey),
    });
  };

  const pricingCopyOptions = useMemo(
    () => modelEntries
      .filter(([k, f]) => f.type === selectedEntry?.[1].type && k !== effectiveSelectedKey && !f.isDraft)
      .map(([k, f]) => ({ key: k, name: f.name || f.id || k, pricingConfig: f.pricingConfig })),
    [modelEntries, selectedEntry, effectiveSelectedKey],
  );

  const editingEntry = editingKey ? (modelEntries.find(([k]) => k === editingKey) ?? null) : null;
  const modalPricingCopyOptions = useMemo(
    () => !editingEntry ? [] : modelEntries
      .filter(([k, f]) => f.type === editingEntry[1].type && k !== editingKey && !f.isDraft)
      .map(([k, f]) => ({ key: k, name: f.name || f.id || k, pricingConfig: f.pricingConfig })),
    [modelEntries, editingEntry, editingKey],
  );

  return (
    <section className="admin-config-section admin-model-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader icon={<Database size={16} />} eyebrow={labels.modelsEyebrow} title="模型目录" subtitle="统一管理模型身份、能力、参数、计费和输入限制。未保存与校验异常会持续标记。" />
        <div className="flex flex-wrap items-center gap-2">
          {hasPendingModelChanges && (
            <button type="button" onClick={confirmSaveAllModels} disabled={dirtyCount === 0 || isSavingModel} className={`inline-flex min-h-9 items-center gap-1.5 rounded-control border border-accent bg-accent px-3 text-xs font-black text-white transition hover:bg-accent-hover disabled:opacity-60 ${FOCUS_RING}`}>
              {isSavingModel ? '保存中…' : `保存全部未保存项（${dirtyCount}）`}
            </button>
          )}
          <div className="flex rounded-control border border-line bg-surface p-0.5">
            <button type="button" onClick={() => setModelLayoutMode('detail')} className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-3 text-xs font-black transition ${layoutMode === 'detail' ? 'bg-ink text-white' : 'text-secondary hover:bg-subtle hover:text-ink'} ${FOCUS_RING}`} aria-label="详情视图"><LayoutList size={13} />详情</button>
            <button type="button" onClick={() => setModelLayoutMode('table')} className={`inline-flex min-h-8 items-center gap-1.5 rounded-control px-3 text-xs font-black transition ${layoutMode === 'table' ? 'bg-ink text-white' : 'text-secondary hover:bg-subtle hover:text-ink'} ${FOCUS_RING}`} aria-label="表格视图"><Table2 size={13} />表格</button>
          </div>
          <SecondaryButton onClick={() => setEditingKey(onAdd())} icon={<CirclePlus size={16} />}>
            {labels.addModel}
          </SecondaryButton>
        </div>
      </div>

      <div className="admin-config-toolbar mt-4 flex flex-col gap-3 px-0 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="admin-config-search flex items-center gap-3 px-3 xl:min-w-[360px] xl:max-w-[540px] xl:flex-1">
          <Search size={15} className="text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            name="admin-model-search"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-black text-secondary outline-none ${FOCUS_RING}`} aria-label="按 Provider 筛选">
            <option value="all">全部 Provider</option>
            {providerOptions.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
          <select value={capabilityFilter} onChange={(event) => setCapabilityFilter(event.target.value as ModelCapabilityFilter)} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-black text-secondary outline-none ${FOCUS_RING}`} aria-label="按能力筛选">
            <option value="all">全部能力</option>
            {MODEL_CAPABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            <option value="none">无能力</option>
          </select>
          <FilterPill active={viewFilter === 'all'} onClick={() => setViewFilter('all')} count={modelEntries.length}>全部</FilterPill>
          <FilterPill active={viewFilter === 'enabled'} onClick={() => setViewFilter('enabled')} count={enabledCount}>{labels.enabled}</FilterPill>
          <FilterPill active={viewFilter === 'disabled'} onClick={() => setViewFilter('disabled')} count={disabledCount}>{labels.disabled}</FilterPill>
          <FilterPill active={viewFilter === 'video'} onClick={() => setViewFilter('video')} count={videoCount}>视频</FilterPill>
          <FilterPill active={viewFilter === 'image'} onClick={() => setViewFilter('image')} count={imageCount}>图片</FilterPill>
          <FilterPill active={viewFilter === 'dirty'} onClick={() => setViewFilter('dirty')} count={dirtyCount}>未保存</FilterPill>
          <FilterPill active={viewFilter === 'issues'} onClick={() => setViewFilter('issues')} count={issueCount}>有错误</FilterPill>
          <FilterPill active={viewFilter === 'provider-disabled'} onClick={() => setViewFilter('provider-disabled')} count={disabledProviderCount}>渠道禁用</FilterPill>
          <FilterPill active={viewFilter === 'no-capability'} onClick={() => setViewFilter('no-capability')} count={noCapabilityCount}>无能力</FilterPill>
          <FilterPill active={viewFilter === 'draft'} onClick={() => setViewFilter('draft')} count={draftCount}>{labels.draftBadge}</FilterPill>
          {(query || viewFilter !== 'all' || providerFilter !== 'all' || capabilityFilter !== 'all') ? <button type="button" onClick={() => { setQuery(''); setViewFilter('all'); setProviderFilter('all'); setCapabilityFilter('all'); }} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>重置筛选</button> : null}
        </div>
      </div>

      {dirtyCount > 0 || draftCount > 0 || issueCount > 0 ? (
        <div className="admin-dirty-bar mt-3 flex flex-wrap items-center gap-2 rounded-surface px-3 py-2 text-xs font-bold text-warning">
          <span className="font-black">待处理项</span>
          {dirtyCount > 0 ? <span>{dirtyCount} 个未保存</span> : null}
          {draftCount > 0 ? <span>{draftCount} 个草稿</span> : null}
          {issueCount > 0 ? <span>{issueCount} 个有校验问题</span> : null}
          <span className="opacity-80">保存全部会依次提交未保存项；有校验问题的模型会停留并提示字段。</span>
          {issueCount > 0 ? <button type="button" onClick={focusFirstIssue} className={`rounded-control border border-warning bg-surface px-2.5 py-1 text-xs font-black text-warning hover:bg-warning-soft ${FOCUS_RING}`}>定位首个错误</button> : null}
        </div>
      ) : null}

      <div className="mt-4">
        {(layoutMode === 'table' && filteredEntries.length === 0) || (layoutMode === 'detail' && !selectedEntry) ? (
          <EmptyList title={labels.noSearchResult} />
        ) : layoutMode === 'table' ? (
          <ModelTableView
            labels={labels}
            entries={filteredEntries}
            issues={modelIssues}
            providerStatusMap={providerStatusMap}
            savingKey={savingKey}
            onSelect={(formKey) => { setSelectedModelKey(formKey); setEditingKey(formKey); }}
            onChange={onChange}
            onSave={onSave}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            {selectedHiddenByFilters ? <div className="rounded-surface border border-line bg-subtle px-3 py-2 text-xs font-bold text-secondary xl:col-span-2">当前编辑模型不匹配筛选条件，已保留详情上下文；左侧导航仅显示筛选结果。</div> : null}
            <ModelNavigator
              labels={labels}
              groups={providerGroups}
              selectedKey={effectiveSelectedKey}
              issues={modelIssues}
              providerStatusMap={providerStatusMap}
              onSelect={setSelectedModelKey}
              onChange={onChange}
              onSave={onSave}
            />
            <>
              <ModelCard
                key={effectiveSelectedKey}
                formKey={selectedEntry![0]}
                labels={labels}
                form={selectedEntry![1]}
                issues={modelIssues[selectedEntry![0]] ?? []}
                providerOptions={providerOptions}
                providerMeta={providerMetaMap.get(providerStatsKey(selectedEntry![1].provider))}
                routingRules={routingRules}
                pricingCopyOptions={pricingCopyOptions}
                saving={savingKey === `model:${selectedEntry![0]}`}
                deleting={savingKey === `model-delete:${selectedEntry![0]}`}
                onChange={(patch) => onChange(selectedEntry![0], patch)}
                onDismissDraft={selectedEntry![1].isDraft ? () => onDismissDraft(selectedEntry![0]) : undefined}
                onReset={() => onReset(selectedEntry![0])}
                onDuplicate={() => { const nextKey = onDuplicate(selectedEntry![0]); setSelectedModelKey(nextKey); }}
                onDelete={() => requestDeleteModel(selectedEntry![1], selectedEntry![0])}
                onSave={() => onSave(selectedEntry![0])}
              />
            </>
          </div>
        )}
      </div>
      {editingEntry && (
        <ModelEditModal
          formKey={editingEntry[0]}
          labels={labels}
          form={editingEntry[1]}
          issues={modelIssues[editingEntry[0]] ?? []}
          providerOptions={providerOptions}
          providerMeta={providerMetaMap.get(providerStatsKey(editingEntry[1].provider))}
          routingRules={routingRules}
          pricingCopyOptions={modalPricingCopyOptions}
          saving={savingKey === `model:${editingEntry[0]}`}
          deleting={savingKey === `model-delete:${editingEntry[0]}`}
          onChange={(patch) => onChange(editingEntry[0], patch)}
          onDismissDraft={editingEntry[1].isDraft ? () => { onDismissDraft(editingEntry[0]); setEditingKey(null); } : undefined}
          onReset={() => onReset(editingEntry[0])}
          onDuplicate={() => { const nextKey = onDuplicate(editingEntry[0]); setEditingKey(nextKey); }}
          onDelete={() => requestDeleteModel(editingEntry[1], editingEntry[0])}
          onSave={() => onSave(editingEntry[0])}
          onClose={() => setEditingKey(null)}
        />
      )}
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </section>
  );
}


function ModelTableView({
  labels,
  entries,
  issues,
  providerStatusMap,
  savingKey,
  onSelect,
  onChange,
  onSave,
}: Readonly<{
  labels: AdminLabels;
  entries: readonly ModelEntry[];
  issues: Readonly<Record<string, readonly ModelValidationIssue[]>>;
  providerStatusMap: ReadonlyMap<string, boolean>;
  savingKey?: string;
  onSelect: (formKey: string) => void;
  onChange: (formKey: string, patch: Partial<ModelForm>) => void;
  onSave: (formKey: string) => void;
}>) {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const allSelected = entries.length > 0 && entries.every(([k]) => selectedKeys.has(k));
  const someSelected = selectedKeys.size > 0;
  const toggleAll = (checked: boolean) => setSelectedKeys(checked ? new Set(entries.map(([k]) => k)) : new Set());
  const toggleOne = (key: string) => setSelectedKeys((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const bulkEnable = (enabled: boolean) => { for (const key of selectedKeys) onChange(key, { isEnabled: enabled }); setSelectedKeys(new Set()); };
  return (
    <div className="overflow-x-auto rounded-surface border border-line bg-surface">
      {someSelected && (
        <div className="flex items-center gap-2 border-b border-line bg-accent-soft px-3 py-2">
          <span className="text-xs font-black text-secondary">已选 {selectedKeys.size} 个</span>
          <button type="button" onClick={() => bulkEnable(true)} className={`rounded-control border border-success bg-success-soft px-2.5 py-1 text-xs font-black text-success hover:brightness-95 ${FOCUS_RING}`}>批量启用</button>
          <button type="button" onClick={() => bulkEnable(false)} className={`rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-black text-secondary hover:bg-subtle ${FOCUS_RING}`}>批量禁用</button>
          <button type="button" onClick={() => setSelectedKeys(new Set())} className={`ml-auto rounded-control px-2 py-1 text-xs font-bold text-muted hover:bg-surface hover:text-secondary ${FOCUS_RING}`}>取消</button>
        </div>
      )}
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-subtle">
            <th className="w-8 px-3 py-2.5"><input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--ui-accent)]" /></th>
            <th className="px-3 py-2.5 text-left text-xs font-black text-secondary">状态</th>
            <th className="px-3 py-2.5 text-left text-xs font-black text-secondary">名称</th>
            <th className="px-3 py-2.5 text-left text-xs font-black text-secondary">公开 ID</th>
            <th className="px-3 py-2.5 text-left text-xs font-black text-secondary">Provider</th>
            <th className="px-3 py-2.5 text-left text-xs font-black text-secondary">Upstream Model ID</th>
            <th className="px-3 py-2.5 text-left text-xs font-black text-secondary">类型</th>
            <th className="px-3 py-2.5 text-left text-xs font-black text-secondary">Capabilities</th>
            <th className="px-3 py-2.5 text-right text-xs font-black text-secondary">默认扣点</th>
            <th className="px-3 py-2.5 text-right text-xs font-black text-secondary">排序</th>
            <th className="px-3 py-2.5 text-left text-xs font-black text-secondary">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entries.map(([formKey, form]) => {
            const rowIssues = issues[formKey] ?? [];
            const isDirty = isModelFormDirty(form);
            const isEffective = form.isEnabled && providerStatusMap.get(providerStatsKey(modelProviderID(form))) === true;
            const isSaving = savingKey === `model:${formKey}`;
            const capabilities = csvSet(form.capabilitiesText);
            const estimatedCredits = estimateModelDefaultCredits(form);
            const dotClass = rowIssues.length > 0 ? 'bg-red-500' : isDirty ? 'bg-amber-400' : isEffective ? 'bg-emerald-500' : 'bg-slate-300';
            const isSelected = selectedKeys.has(formKey);
            return (
              <tr key={formKey} className={`group transition-colors hover:bg-subtle ${isDirty ? 'bg-warning-soft' : ''} ${isSelected ? 'bg-accent-soft' : ''}`}>
                <td className="px-3 py-2.5"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(formKey)} className="h-3.5 w-3.5 accent-[var(--ui-accent)]" /></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                    <label className="cursor-pointer">
                      <input type="checkbox" checked={form.isEnabled} onChange={(event) => onChange(formKey, { isEnabled: event.target.checked })} className="h-3.5 w-3.5 accent-[var(--ui-accent)]" title={form.isEnabled ? labels.enabled : labels.disabled} />
                    </label>
                    {rowIssues.length > 0 ? <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-black text-red-600" title={rowIssues.map((i) => i.message).join('\n')}>{rowIssues.length}错</span> : null}
                    {isDirty ? <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-black text-amber-700">改</span> : null}
                    {form.isDraft ? <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-black text-slate-600">草稿</span> : null}
                  </div>
                </td>
                <td className="max-w-[160px] px-3 py-2.5"><div className="truncate font-black text-ink" title={form.name}>{form.name || <span className="italic text-muted">{labels.modelDraftTitle}</span>}</div></td>
                <td className="max-w-[180px] px-3 py-2.5"><div className="admin-mono truncate text-xs text-ink" title={form.id}>{form.id || <span className="italic text-muted">{labels.pendingId}</span>}</div></td>
                <td className="max-w-[160px] px-3 py-2.5"><div className="admin-mono truncate text-xs text-secondary" title={modelProviderID(form)}>{modelProviderID(form) || '—'}</div></td>
                <td className="max-w-[180px] px-3 py-2.5"><div className="admin-mono truncate text-xs text-secondary" title={form.upstreamModelID}>{form.upstreamModelID || '—'}</div></td>
                <td className="px-3 py-2.5"><span className={`rounded-md border px-1.5 py-0.5 text-xs font-black uppercase tracking-normal ${form.type === 'video' ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-violet-100 bg-violet-50 text-violet-700'}`}>{form.type}</span></td>
                <td className="px-3 py-2.5">
                  {capabilities.size === 0 ? <span className="text-xs text-muted">—</span> : (
                    <div className="flex flex-wrap gap-1">{Array.from(capabilities).map((cap) => <span key={cap} className="rounded-control border border-accent bg-accent-soft px-1.5 py-0.5 text-xs font-black text-accent">{capabilityShortLabel(cap)}</span>)}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right"><span className="admin-mono text-xs font-black text-ink">{estimatedCredits}</span></td>
                <td className="px-3 py-2.5 text-right"><span className="admin-mono text-xs text-muted">{parseDisplayOrder(form.displayOrder)}</span></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => onSelect(formKey)} className={`rounded-control border border-line bg-surface px-2 py-1 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle ${FOCUS_RING}`}>编辑</button>
                    {isDirty ? <button type="button" onClick={() => onSave(formKey)} disabled={isSaving} className={`rounded-control border border-accent bg-accent px-2 py-1 text-xs font-black text-white hover:bg-accent-hover disabled:opacity-60 ${FOCUS_RING}`}>{isSaving ? '…' : '保存'}</button> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function capabilityShortLabel(capability: string): string {
  if (capability === 'text_to_image') return 't2i';
  if (capability === 'image_to_image') return 'i2i';
  if (capability === 'text_to_video') return 't2v';
  if (capability === 'image_to_video') return 'i2v';
  return capability;
}

function ModelNavigator({ labels, groups, selectedKey, issues, providerStatusMap, onSelect, onChange, onSave }: Readonly<{ labels: AdminLabels; groups: readonly ModelProviderGroup[]; selectedKey: string; issues: Readonly<Record<string, readonly ModelValidationIssue[]>>; providerStatusMap: ReadonlyMap<string, boolean>; onSelect: (formKey: string) => void; onChange: (formKey: string, patch: Partial<ModelForm>) => void; onSave: (formKey: string) => void }>) {
  const [collapsedProviders, setCollapsedProviders] = useState<ReadonlySet<string>>(() => new Set());
  const [navSearch, setNavSearch] = useState('');
  const normalizedNavSearch = navSearch.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!normalizedNavSearch) return groups;
    return groups
      .map((group) => ({ ...group, entries: group.entries.filter(([, form]) => modelSearchText(form).includes(normalizedNavSearch)) }))
      .filter((group) => group.entries.length > 0);
  }, [groups, normalizedNavSearch]);
  const allCollapsed = visibleGroups.length > 0 && visibleGroups.every((group) => collapsedProviders.has(group.provider));
  const visibleTotal = visibleGroups.reduce((total, group) => total + group.entries.length, 0);
  const toggleProvider = (provider: string) => {
    setCollapsedProviders((current) => {
      const next = new Set(current);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };
  const toggleAllProviders = () => {
    setCollapsedProviders(allCollapsed ? new Set() : new Set(visibleGroups.map((group) => group.provider)));
  };

  return (
    <aside className="model-nav-scroll max-h-[calc(100vh-220px)] overflow-auto rounded-surface border border-line bg-subtle p-2 xl:sticky xl:top-4">
      <div className="mb-2 rounded-surface border border-line bg-surface px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-black text-secondary">模型导航</div>
            <div className="mt-0.5 text-[12px] font-black text-ink">{visibleTotal} 个模型 · {visibleGroups.length} 个渠道</div>
          </div>
          <button type="button" onClick={toggleAllProviders} className={`shrink-0 rounded-control border border-line bg-subtle px-2.5 py-1 text-xs font-black text-secondary transition hover:border-line-strong hover:bg-surface hover:text-ink ${FOCUS_RING}`}>
            {allCollapsed ? labels.expandAll : labels.collapseAll}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-control border border-line bg-subtle px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
          <Search size={12} className="shrink-0 text-muted" />
          <input value={navSearch} onChange={(e) => setNavSearch(e.target.value)} placeholder="搜索模型…" className="w-full bg-transparent text-xs font-medium text-ink outline-none placeholder:text-muted" />
          {navSearch ? <button type="button" onClick={() => setNavSearch('')} aria-label="清空模型搜索" className={`shrink-0 rounded-control px-1 text-muted hover:bg-surface hover:text-secondary ${FOCUS_RING}`}>✕</button> : null}
        </div>
      </div>
      <div className="space-y-2">
        {visibleGroups.map((group) => {
          const collapsed = collapsedProviders.has(group.provider);
          const selectedInGroup = group.entries.some(([formKey]) => formKey === selectedKey);
          const providerEnabled = providerStatusMap.get(providerStatsKey(group.provider));
          const disabledCount = group.entries.length - group.enabledCount;
          const providerTone = group.issueCount > 0 ? 'bg-red-500' : group.dirtyCount > 0 ? 'bg-amber-400' : providerEnabled === false ? 'bg-slate-300' : 'bg-emerald-500';
          return (
            <div key={group.provider} className={`overflow-hidden rounded-surface border bg-surface transition ${selectedInGroup ? 'border-accent' : 'border-line'}`}>
              <button
                type="button"
                onClick={() => toggleProvider(group.provider)}
                aria-expanded={!collapsed}
                className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition hover:bg-subtle ${FOCUS_RING}`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${collapsed ? '-rotate-90' : 'rotate-0'}`} aria-hidden="true" />
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${providerTone} shadow-[0_0_0_3px_rgba(226,232,240,0.8)]`} title={providerEnabled === false ? labels.disabled : labels.enabled} />
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-black leading-4 text-ink">{group.provider}</div>
                    <div className="mt-0.5 text-xs font-bold text-muted">{group.videoCount} 视频 · {group.imageCount} 图片</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs font-black">
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{group.enabledCount}</span>
                  {disabledCount > 0 ? <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600">{disabledCount}</span> : null}
                  {group.issueCount > 0 ? <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-red-600">错 {group.issueCount}</span> : null}
                  {group.dirtyCount > 0 ? <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700">改 {group.dirtyCount}</span> : null}
                </div>
              </button>
              {!collapsed ? (
                <div className="space-y-1 border-t border-line bg-subtle p-1.5">
                  {group.entries.map(([formKey, form]) => (
                    <ModelNavItem key={formKey} labels={labels} formKey={formKey} form={form} selected={formKey === selectedKey} issues={issues[formKey] ?? []} onSelect={onSelect} onChange={onChange} onSave={onSave} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ModelNavItem({ labels, formKey, form, selected, issues, onSelect, onChange, onSave }: Readonly<{ labels: AdminLabels; formKey: string; form: ModelForm; selected: boolean; issues: readonly ModelValidationIssue[]; onSelect: (formKey: string) => void; onChange: (formKey: string, patch: Partial<ModelForm>) => void; onSave: (formKey: string) => void }>) {
  const isDirty = isModelFormDirty(form);
  const title = form.name.trim() || form.savedState.name.trim() || labels.modelDraftTitle;
  const publicID = form.id.trim() || form.savedState.id.trim() || labels.pendingId;
  const upstreamID = form.upstreamModelID.trim() || form.savedState.upstreamModelID.trim();
  const dotClass = issues.length > 0 ? 'bg-red-500' : isDirty ? 'bg-amber-400' : form.isEnabled ? 'bg-emerald-500' : 'bg-slate-300';
  return (
    <div className={`group relative rounded-control transition ${selected ? 'bg-accent-soft ring-1 ring-accent' : 'hover:bg-surface'}`}>
      <button
        type="button"
        onClick={() => onSelect(formKey)}
        className={`w-full rounded-control px-2.5 py-2 text-left ${FOCUS_RING}`}
        aria-current={selected ? 'true' : undefined}
      >
        <div className="flex min-w-0 items-center gap-1.5 pr-14">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} title={issues.length > 0 ? labels.validationSummaryTitle : isDirty ? labels.dirtyBadge : form.isEnabled ? labels.enabled : labels.disabled} />
          <div className="min-w-0 flex-1 truncate text-[13px] font-black leading-5 text-ink">{title}</div>
          <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-xs font-black uppercase tracking-normal ${form.type === 'video' ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-violet-100 bg-violet-50 text-violet-700'}`}>{form.type}</span>
        </div>
        <div className="mt-1 min-w-0 pl-3.5">
          <div className="admin-mono truncate text-xs font-bold leading-4 text-secondary">{publicID}</div>
          {upstreamID ? <div className="admin-mono truncate text-xs font-semibold leading-4 text-muted">↳ {upstreamID}</div> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1 pl-3.5">
          {!form.isEnabled ? <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-black text-slate-600">{labels.disabled}</span> : null}
          {issues.length > 0 ? <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-black text-red-600" title={labels.validationSummaryTitle}>{issues.length} 错误</span> : null}
          {isDirty ? <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-black text-amber-700" title={labels.dirtyBadge}>{labels.dirtyBadge}</span> : null}
        </div>
      </button>
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <label
          className="flex cursor-pointer items-center"
          title={form.isEnabled ? labels.enabled : labels.disabled}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={form.isEnabled}
            onChange={(event) => onChange(formKey, { isEnabled: event.target.checked })}
            className="h-3.5 w-3.5 accent-[var(--ui-accent)]"
          />
        </label>
        {isDirty ? (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onSave(formKey); }}
            className={`rounded-control bg-accent px-1.5 py-0.5 text-xs font-black text-white hover:bg-accent-hover ${FOCUS_RING}`}
            title={labels.saveModel}
          >
            存
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Keep identity bounded and reserve the flexible track for commercial comparison.
const PRODUCT_TABLE_COLUMNS = 'grid-cols-[118px_minmax(240px,280px)_minmax(470px,1fr)_minmax(140px,180px)_112px]';
const PRODUCT_COMMERCIAL_COLUMNS = 'grid-cols-[minmax(0,1fr)_78px_96px_110px]';

export function ProductsSection({
  labels,
  productEntries,
  effectiveProducts,
  savingKey,
  onAdd,
  onChange,
  onDismissDraft,
  onDelete,
  onSave,
  onToggleActive,
}: Readonly<{
  labels: AdminLabels;
  productEntries: readonly ProductEntry[];
  effectiveProducts: readonly AdminBillingProduct[];
  savingKey?: string;
  onAdd: () => void;
  onChange: (formKey: string, patch: Partial<ProductForm>) => void;
  onDismissDraft: (formKey: string) => void;
  onDelete: (formKey: string) => void;
  onSave: (formKey: string) => void;
  onToggleActive: (formKey: string) => void;
}>) {
  const [query, setQuery] = useState(() => adminSectionParam('product_query'));
  const [viewFilter, setViewFilter] = useState<'all' | 'live' | 'draft' | 'inactive'>(() => adminSectionEnum('product_status', ['all', 'live', 'draft', 'inactive'] as const, 'all'));
  const [kindFilter, setKindFilter] = useState<ProductKindFilter>(() => adminSectionEnum('product_kind', ['all', 'credits', 'subscription'] as ProductKindFilter[], 'all'));
  const [purchaseModeFilter, setPurchaseModeFilter] = useState<ProductPurchaseModeFilter>(() => adminSectionEnum('product_purchase', ['all', 'standard', 'first_order_pack'] as ProductPurchaseModeFilter[], 'all'));
  useAdminSectionURLState('products', { product_query: query, product_status: viewFilter, product_kind: kindFilter, product_purchase: purchaseModeFilter }, { product_query: '', product_status: 'all', product_kind: 'all', product_purchase: 'all' });
  const effectiveIDs = useMemo(() => new Set(effectiveProducts.map((item) => item.id)), [effectiveProducts]);
  const filteredEntries = useMemo(() => filterProductEntries(productEntries, query)
    .filter((entry) => matchesProductViewFilter(entry, viewFilter, effectiveIDs))
    .filter((entry) => matchesProductKindFilter(entry, kindFilter))
    .filter((entry) => matchesProductPurchaseModeFilter(entry, purchaseModeFilter)), [productEntries, query, viewFilter, effectiveIDs, kindFilter, purchaseModeFilter]);
  const draftCount = productEntries.filter(([, form]) => form.isDraft).length;
  const inactiveCount = productEntries.filter(([, form]) => !form.isActive).length;
  const kindOptions = productKindOptions(labels);
  const purchaseModeOptions = productPurchaseModeFilterOptions(labels);
  const hasFilter = query || viewFilter !== 'all' || kindFilter !== 'all' || purchaseModeFilter !== 'all';
  const resetFilters = () => {
    setQuery('');
    setViewFilter('all');
    setKindFilter('all');
    setPurchaseModeFilter('all');
  };

  return (
    <section className="admin-config-section admin-product-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader icon={<Database size={16} />} eyebrow={labels.pricingEyebrow} title="商品与计费" subtitle="配置前台可售商品、到账积分、渠道价格和展示权益。" />
        <SecondaryButton onClick={onAdd} icon={<CirclePlus size={16} />}>
          {labels.addProduct}
        </SecondaryButton>
      </div>

      <div className="admin-config-toolbar mt-4 flex flex-col gap-3 px-0 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="admin-config-search flex items-center gap-3 px-3 xl:min-w-[360px] xl:max-w-[540px] xl:flex-1">
          <Search size={15} className="text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            name="admin-product-search"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill active={viewFilter === 'all'} onClick={() => setViewFilter('all')} count={productEntries.length}>全部</FilterPill>
          <FilterPill active={viewFilter === 'live'} onClick={() => setViewFilter('live')} count={effectiveProducts.length}>{labels.liveNow}</FilterPill>
          <FilterPill active={viewFilter === 'draft'} onClick={() => setViewFilter('draft')} count={draftCount}>{labels.draftBadge}</FilterPill>
          <FilterPill active={viewFilter === 'inactive'} onClick={() => setViewFilter('inactive')} count={inactiveCount}>{labels.inactive}</FilterPill>
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as ProductKindFilter)} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary outline-none ${FOCUS_RING}`} aria-label={`${labels.kind}筛选`}>
            <option value="all">全部类型</option>
            {kindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={purchaseModeFilter} onChange={(event) => setPurchaseModeFilter(event.target.value as ProductPurchaseModeFilter)} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary outline-none ${FOCUS_RING}`} aria-label={`${labels.purchaseMode}筛选`}>
            <option value="all">全部购买模式</option>
            {purchaseModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {hasFilter ? <button type="button" onClick={resetFilters} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>重置筛选</button> : null}
        </div>
      </div>

      <div className="mt-4">
        {filteredEntries.length === 0 ? (
          <EmptyList title={labels.noSearchResult} />
        ) : (
          <>
          <div className="space-y-2 md:hidden">
            {filteredEntries.map(([formKey, form]) => (
              <ProductTableItem key={formKey} mobile formKey={formKey} labels={labels} form={form} saving={savingKey === `product:${formKey}`} deleting={savingKey === `product-delete:${formKey}`} isEffective={effectiveIDs.has(form.id)} onChange={(patch) => onChange(formKey, patch)} onDelete={form.isDraft ? undefined : () => onDelete(formKey)} onDismissDraft={form.isDraft ? () => onDismissDraft(formKey) : undefined} onSave={() => onSave(formKey)} onToggleActive={() => onToggleActive(formKey)} />
            ))}
          </div>
          <div className="hidden md:block">
          <AdminTableFrame minWidth={1180}>
            <AdminTableHeaderRow columns={PRODUCT_TABLE_COLUMNS}>
              <span>状态</span><span>商品</span><ProductCommercialHeader /><span>支付渠道</span><span>操作</span>
            </AdminTableHeaderRow>
            {filteredEntries.map(([formKey, form]) => (
              <ProductTableItem
                key={formKey}
                formKey={formKey}
                labels={labels}
                form={form}
                saving={savingKey === `product:${formKey}`}
                deleting={savingKey === `product-delete:${formKey}`}
                isEffective={effectiveIDs.has(form.id)}
                onChange={(patch) => onChange(formKey, patch)}
                onDelete={form.isDraft ? undefined : () => onDelete(formKey)}
                onDismissDraft={form.isDraft ? () => onDismissDraft(formKey) : undefined}
                onSave={() => onSave(formKey)}
                onToggleActive={() => onToggleActive(formKey)}
              />
            ))}
          </AdminTableFrame>
          </div>
          </>
        )}
      </div>
    </section>
  );
}

function ProductTableItem({ mobile = false, labels, form, saving, deleting, isEffective, onChange, onDismissDraft, onDelete, onSave, onToggleActive }: Readonly<{
  mobile?: boolean;
  labels: AdminLabels;
  formKey: string;
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
  const [modalOpen, setModalOpen] = useState(form.isDraft);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const riskItems = productRiskItems(form);
  const unitPrice = formatProductUnitPrice(form);
  const closeModal = () => {
    setModalOpen(false);
    window.setTimeout(() => editButtonRef.current?.focus(), 0);
  };
  const deleteWithRiskConfirm = onDelete ? () => {
    setConfirmDialog({ title: '删除商品？', description: productRiskMessage(labels, form, isEffective, 'delete').replaceAll('\n', ' '), confirmLabel: labels.deleteAction, tone: 'danger', onConfirm: onDelete });
  } : undefined;
  const toggleActiveWithRiskConfirm = () => {
    if (!form.isActive) return onToggleActive();
    setConfirmDialog({ title: '停用商品？', description: productRiskMessage(labels, form, isEffective, 'disable').replaceAll('\n', ' '), confirmLabel: '停用商品', tone: 'warning', onConfirm: onToggleActive });
  };
  return (
    <>
      {mobile ? (
        <ProductMobileSummary editButtonRef={editButtonRef} labels={labels} form={form} isEffective={isEffective} riskCount={riskItems.length} saving={saving} onEdit={() => setModalOpen(true)} onToggleActive={toggleActiveWithRiskConfirm} />
      ) : (
      <AdminTableRow columns={PRODUCT_TABLE_COLUMNS} active={modalOpen} muted={!form.isActive} className="admin-product-table-row !py-2">
        <ProductTableStatus labels={labels} form={form} isEffective={isEffective} riskItems={riskItems} />
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          <span className="min-w-0 flex-1 truncate font-black text-ink" title={form.name}>{form.name.trim() || labels.productDraftTitle}</span>
          <span className="admin-mono max-w-28 shrink-0 truncate text-xs font-semibold text-secondary" title={form.id}>{form.id.trim() || labels.pendingId}</span>
        </div>
        <ProductCommercialSummary labels={labels} form={form} unitPrice={unitPrice} />
        <ProductProviderSummary providers={form.enabledProviders} />
        <div className="flex flex-nowrap items-center gap-1 whitespace-nowrap">
          <button ref={editButtonRef} type="button" onClick={() => setModalOpen(true)} className={`rounded-control border border-line bg-surface px-2 py-1 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle ${FOCUS_RING}`}>编辑</button>
          {!form.isDraft ? <button type="button" onClick={toggleActiveWithRiskConfirm} disabled={saving} className={`rounded-control border border-line bg-surface px-2 py-1 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle disabled:opacity-60 ${FOCUS_RING}`}>{form.isActive ? '停用' : '启用'}</button> : null}
        </div>
      </AdminTableRow>
      )}
      <AdminModal open={modalOpen} title={form.name.trim() || labels.productDraftTitle} subtitle={`${form.id.trim() || labels.pendingId} · ${productTypeLabel(form)}`} badge={form.isDraft ? <InlineBadge tone="amber">{labels.draftBadge}</InlineBadge> : <InlineBadge tone={isEffective ? 'emerald' : 'slate'}>{isEffective ? labels.liveNow : labels.liveHidden}</InlineBadge>} onClose={closeModal}>
        <ProductCard labels={labels} form={form} saving={saving} deleting={deleting} isEffective={isEffective} onChange={onChange} onDelete={deleteWithRiskConfirm} onDismissDraft={onDismissDraft} onSave={onSave} onToggleActive={toggleActiveWithRiskConfirm} />
      </AdminModal>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </>
  );
}

function ProductTableStatus({ labels, form, isEffective, riskItems }: Readonly<{ labels: AdminLabels; form: ProductForm; isEffective: boolean; riskItems: readonly string[] }>) {
  const status = form.isDraft
    ? labels.draftBadge
    : isEffective
      ? labels.liveNow
      : form.isActive
        ? labels.liveHidden
        : labels.inactive;
  const statusClassName = form.isDraft
    ? 'bg-warning'
    : isEffective
      ? 'bg-success'
      : 'bg-muted';
  const title = [`状态：${status}`, `商品状态：${form.isActive ? labels.active : labels.inactive}`, riskItems.length > 0 ? `配置风险：${riskItems.join('；')}` : '配置风险：无'].join('\n');

  return (
    <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap" title={title}>
      <span className={`size-1.5 shrink-0 rounded-full ${statusClassName}`} aria-hidden="true" />
      <span className="min-w-0 truncate text-xs font-black text-secondary">{status}</span>
      {riskItems.length > 0 ? <span className="inline-flex shrink-0 items-center gap-0.5 text-warning" aria-label={`检测到 ${riskItems.length} 项配置风险`}><AlertTriangle size={13} aria-hidden="true" /><span className="admin-mono text-xs font-black">{riskItems.length}</span></span> : null}
    </div>
  );
}

function ProductCommercialSummary({ labels, form, unitPrice }: Readonly<{ labels: AdminLabels; form: ProductForm; unitPrice: string }>) {
  const kind = productKindDisplayLabel(labels, form.kind);
  const purchaseMode = productPurchaseModeDisplayLabel(labels, form.purchaseMode);
  const saleMode = kind === purchaseMode ? kind : `${kind} · ${purchaseMode}`;
  return (
    <div className={`grid min-w-0 ${PRODUCT_COMMERCIAL_COLUMNS} items-center gap-x-2 whitespace-nowrap`} aria-label={`${labels.kind}：${kind}；${labels.purchaseMode}：${purchaseMode}；价格：¥${(form.amountCents / 100).toFixed(2)}；Credits：${form.credits}；${unitPrice}`}>
      <span className="min-w-0 truncate text-xs font-bold text-secondary" title={`${labels.kind}：${kind}；${labels.purchaseMode}：${purchaseMode}`}>{saleMode}</span>
      <span className="border-l border-line pl-2 text-right font-black tabular-nums text-ink">¥{(form.amountCents / 100).toFixed(2)}</span>
      <span className="text-right text-xs font-black tabular-nums text-secondary">{form.credits} Credits</span>
      <span className="text-right text-xs font-semibold tabular-nums text-muted">{unitPrice}</span>
    </div>
  );
}

function ProductCommercialHeader() {
  return (
    <div className={`grid min-w-0 ${PRODUCT_COMMERCIAL_COLUMNS} items-center gap-x-2`}>
      <span>售卖方式</span><span className="text-right">售价</span><span className="text-right">到账积分</span><span className="text-right">单位价</span>
    </div>
  );
}

function ProductProviderSummary({ providers }: Readonly<{ providers: readonly string[] }>) {
  if (providers.length === 0) return <span className="text-xs font-semibold text-muted">未配置</span>;
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap" title={providers.join(', ')}>
      {providers.slice(0, 1).map((provider) => <span key={provider} title={provider} className="max-w-[88px] shrink-0 truncate rounded-control bg-subtle px-1.5 py-0.5 text-xs font-black text-secondary">{provider}</span>)}
      {providers.length > 1 ? <span className="shrink-0 text-xs font-black text-muted">+{providers.length - 1}</span> : null}
    </div>
  );
}

function ProductMobileSummary({ editButtonRef, labels, form, isEffective, riskCount, saving, onEdit, onToggleActive }: Readonly<{ editButtonRef: React.RefObject<HTMLButtonElement | null>; labels: AdminLabels; form: ProductForm; isEffective: boolean; riskCount: number; saving: boolean; onEdit: () => void; onToggleActive: () => void }>) {
  const actions = <div className="grid grid-cols-2 gap-2"><button ref={editButtonRef} type="button" onClick={onEdit} className={`min-h-9 rounded-control border border-line text-xs font-black text-secondary hover:bg-subtle ${FOCUS_RING}`}>编辑商品</button>{!form.isDraft ? <button type="button" onClick={onToggleActive} disabled={saving} className={`min-h-9 rounded-control border border-line text-xs font-black text-secondary hover:bg-subtle disabled:opacity-50 ${FOCUS_RING}`}>{form.isActive ? '停用商品' : '启用商品'}</button> : null}</div>;
  return <AdminMobileCard title={form.name.trim() || labels.productDraftTitle} subtitle={<span className="admin-mono break-all">{form.id.trim() || labels.pendingId}</span>} badge={<InlineBadge tone={isEffective ? 'emerald' : form.isDraft ? 'amber' : 'slate'}>{form.isDraft ? labels.draftBadge : isEffective ? labels.liveNow : labels.liveHidden}</InlineBadge>} action={actions}>
    <AdminKeyValueGrid items={[{ label: '售价', value: `¥${(form.amountCents / 100).toFixed(2)}` }, { label: '到账积分', value: form.credits }, { label: '商品类型', value: productKindDisplayLabel(labels, form.kind) }, { label: '支付渠道', value: form.enabledProviders.length > 0 ? form.enabledProviders.join('、') : '未配置' }]} />
    {riskCount > 0 ? <div className="mt-3 rounded-control border border-warning bg-warning-soft px-2.5 py-2 text-xs font-bold text-warning">检测到 {riskCount} 项配置风险</div> : null}
  </AdminMobileCard>;
}

function ModelCard({
  formKey,
  labels,
  form,
  issues,
  providerOptions,
  providerMeta,
  routingRules,
  pricingCopyOptions,
  saving,
  deleting,
  onChange,
  onDismissDraft,
  onReset,
  onDuplicate,
  onDelete,
  onSave,
  onClose,
}: Readonly<{
  formKey: string;
  labels: AdminLabels;
  form: ModelForm;
  issues: readonly ModelValidationIssue[];
  providerOptions: readonly string[];
  providerMeta?: ProviderMeta;
  routingRules: readonly AdminModelRoutingRule[];
  pricingCopyOptions: readonly { key: string; name: string; pricingConfig: ModelForm['pricingConfig'] }[];
  saving: boolean;
  deleting: boolean;
  onChange: (patch: Partial<ModelForm>) => void;
  onDismissDraft?: () => void;
  onReset: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: () => void;
  onClose?: () => void;
}>) {
  const isDirty = isModelFormDirty(form);
  const title = form.name.trim() || form.savedState.name.trim() || labels.modelDraftTitle;
  const metaProvider = form.isDraft ? (form.provider.trim() || labels.pendingProvider) : (form.listSnapshot.provider || labels.pendingProvider);
  const publicID = form.id.trim() || form.savedState.id.trim() || labels.pendingId;
  const upstreamID = form.upstreamModelID.trim() || form.savedState.upstreamModelID.trim() || labels.upstreamModelId;
  const estimatedCredits = estimateModelDefaultCredits(form);
  const normalizedCurrentProvider = form.provider.trim();
  const providerChoices = normalizedCurrentProvider && !providerOptions.some((option) => option.toLowerCase() === normalizedCurrentProvider.toLowerCase())
    ? [normalizedCurrentProvider, ...providerOptions]
    : providerOptions;
  const issueMessages = issues.map((issue) => issue.message);
  const fieldIssueMap = useMemo(() => new Map(issues.map((issue) => [issue.field, issue.message])), [issues]);
  const modelProvider = form.provider.trim();
  const modelUpstreamID = form.upstreamModelID.trim();
  const matchingRules = useMemo(
    () => routingRules.filter((rule) =>
      (rule.source_provider === modelProvider && rule.source_provider_model === modelUpstreamID) ||
      (rule.target_provider === modelProvider && rule.target_provider_model === modelUpstreamID),
    ),
    [routingRules, modelProvider, modelUpstreamID],
  );
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (isDirty || form.isDraft) onSave();
      }
    };
    card.addEventListener('keydown', handleKeyDown);
    return () => card.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, form.isDraft, onSave]);

  if (onClose) {
    return (
      <div ref={cardRef} id={`model-card-${formKey}`} className="flex h-full flex-col">
        <ModelEditorSectionNav items={[['基础', `#${modelSectionID(formKey, 'basic')}`], ['能力', `#${modelSectionID(formKey, 'capabilities')}`], ['参数', `#${modelSectionID(formKey, 'params')}`], ['计费', `#${modelSectionID(formKey, 'pricing')}`]]} />
        <div className="min-h-0 flex-1 overflow-y-auto bg-subtle">
          <ModelValidationSummary labels={labels} messages={issueMessages} />
          <div className="space-y-3 p-3">
            <ModelFormSection id={modelSectionID(formKey, 'basic')} title="基础信息" subtitle="影响前台展示、路由选择和上游调用，修改 ID / 渠道 / 上游 ID 前请确认关联关系。" changed={hasBasicInfoChanges(form)}>
              <ProviderModelStatusNotice providerMeta={providerMeta} />
              <ModelIdentityFields labels={labels} formKey={formKey} form={form} providerChoices={providerChoices} normalizedCurrentProvider={normalizedCurrentProvider} fieldIssueMap={fieldIssueMap} onChange={onChange} />
              <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
                <Field htmlFor={fieldID(formKey, 'description')} label={labels.description} error={fieldIssueMap.get('description')} changed={form.description !== form.savedState.description}>
                  <textarea id={fieldID(formKey, 'description')} name={fieldID(formKey, 'description')} value={form.description} onChange={(e) => onChange({ description: e.target.value })} rows={2} className={`aics-control w-full resize-none rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} placeholder={`${labels.description}…`} autoComplete="off" />
                </Field>
                <Field htmlFor={fieldID(formKey, 'tagsText')} label={labels.tagsCSV} changed={form.tagsText !== form.savedState.tagsText}>
                  <input id={fieldID(formKey, 'tagsText')} name={fieldID(formKey, 'tagsText')} value={form.tagsText} onChange={(e) => onChange({ tagsText: e.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} placeholder="tag1, tag2, tag3" autoComplete="off" spellCheck={false} />
                </Field>
              </div>
              <ModelRoutingRulesPanel rules={matchingRules} modelProvider={modelProvider} modelUpstreamID={modelUpstreamID} />
            </ModelFormSection>
            <ModelFormSection id={modelSectionID(formKey, 'capabilities')} title="能力配置" subtitle="控制生成入口和参数可用性，建议只启用模型真实支持的能力。" changed={hasCapabilityChanges(form)}>
              <ModelCapabilitiesEditor labels={labels} form={form} fieldIssueMap={fieldIssueMap} onChange={onChange} />
            </ModelFormSection>
            <CollapsibleModelSection id={modelSectionID(formKey, 'params')} label={labels.paramsSchema} hint="前台表单字段，枚举参数请重点检查默认值和可选项。" count={form.params.length} changed={editableParamListSignature(form.params) !== editableParamListSignature(form.savedState.params)} open={form.isDraft || hasModelIssuePrefix(fieldIssueMap, 'param:')}>
              <ModelParamEditor labels={labels} formKey={formKey} value={form.params} issues={issues} onChange={(params) => onChange({ params })} />
            </CollapsibleModelSection>
            <CollapsibleModelSection id={modelSectionID(formKey, 'pricing')} label={labels.modelPricing} hint={`${labels.modelCreditEstimateHint}：${estimatedCredits} ${labels.modelCreditEstimateUnit}`} changed={editablePricingConfigSignature(form.pricingConfig) !== editablePricingConfigSignature(form.savedState.pricingConfig)} open={form.isDraft || hasModelIssuePrefix(fieldIssueMap, 'pricing:')}>
              <PricingDeltaNotice labels={labels} form={form} />
              {pricingCopyOptions.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-black text-secondary">从其他模型复制：</span>
                  <select defaultValue="" onChange={(e) => { const opt = pricingCopyOptions.find((o) => o.key === e.target.value); if (opt) { onChange({ pricingConfig: opt.pricingConfig }); e.target.value = ''; } }} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 py-0.5 text-xs font-black text-secondary outline-none ${FOCUS_RING}`}>
                    <option value="" disabled>选择模型…</option>
                    {pricingCopyOptions.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <ModelPricingEditor labels={labels} formKey={formKey} form={form} fieldIssueMap={fieldIssueMap} onChange={onChange} />
            </CollapsibleModelSection>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3">
          <label className="inline-flex min-h-9 items-center gap-2 rounded-control border border-line bg-subtle px-3 py-1.5 text-sm font-bold text-secondary">
            <input id={fieldID(formKey, 'isEnabled')} name={fieldID(formKey, 'isEnabled')} type="checkbox" checked={form.isEnabled} onChange={(e) => onChange({ isEnabled: e.target.checked })} className="h-4 w-4 accent-[var(--ui-accent)]" />
            {labels.enabled}
          </label>
          <ModelCardActionButtons labels={labels} form={form} isDirty={isDirty} saving={saving} deleting={deleting} onDismissDraft={onDismissDraft} onReset={onReset} onDuplicate={onDuplicate} onDelete={onDelete} onSave={onSave} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      id={`model-card-${formKey}`}
      className="min-w-0 overflow-hidden rounded-surface border border-line bg-surface"
    >
      <ModelEditorHeader
        labels={labels}
        formKey={formKey}
        form={form}
        title={title}
        type={form.type}
        isDraft={form.isDraft}
        isDirty={isDirty}
        publicID={publicID}
        provider={metaProvider}
        upstreamID={upstreamID}
        estimatedCredits={estimatedCredits}
        providerMeta={providerMeta}
        saving={saving}
        deleting={deleting}
        onChange={onChange}
        onDismissDraft={onDismissDraft}
        onReset={onReset}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onSave={onSave}
        onClose={onClose}
      />

      <ModelValidationSummary labels={labels} messages={issueMessages} />

      <ModelEditorSectionNav
        items={[
          ['基础', `#${modelSectionID(formKey, 'basic')}`],
          ['能力', `#${modelSectionID(formKey, 'capabilities')}`],
          ['参数', `#${modelSectionID(formKey, 'params')}`],
          ['计费', `#${modelSectionID(formKey, 'pricing')}`],
        ]}
      />

      <div className="space-y-3 bg-subtle p-3">
        <ModelFormSection id={modelSectionID(formKey, 'basic')} title="基础信息" subtitle="影响前台展示、路由选择和上游调用，修改 ID / 渠道 / 上游 ID 前请确认关联关系。" changed={hasBasicInfoChanges(form)}>
          <ProviderModelStatusNotice providerMeta={providerMeta} />
          <ModelIdentityFields labels={labels} formKey={formKey} form={form} providerChoices={providerChoices} normalizedCurrentProvider={normalizedCurrentProvider} fieldIssueMap={fieldIssueMap} onChange={onChange} />
          <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
            <Field htmlFor={fieldID(formKey, 'description')} label={labels.description} error={fieldIssueMap.get('description')} changed={form.description !== form.savedState.description}>
              <textarea
                id={fieldID(formKey, 'description')}
                name={fieldID(formKey, 'description')}
                value={form.description}
                onChange={(event) => onChange({ description: event.target.value })}
                rows={2}
                className={`aics-control w-full resize-none rounded-control px-3 py-2 text-sm ${FOCUS_RING}`}
                placeholder={`${labels.description}…`}
                autoComplete="off"
              />
            </Field>
            <Field htmlFor={fieldID(formKey, 'tagsText')} label={labels.tagsCSV} changed={form.tagsText !== form.savedState.tagsText}>
              <input
                id={fieldID(formKey, 'tagsText')}
                name={fieldID(formKey, 'tagsText')}
                value={form.tagsText}
                onChange={(event) => onChange({ tagsText: event.target.value })}
                className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`}
                placeholder="tag1, tag2, tag3"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
          </div>
          <ModelRoutingRulesPanel rules={matchingRules} modelProvider={modelProvider} modelUpstreamID={modelUpstreamID} />
        </ModelFormSection>
        <ModelFormSection id={modelSectionID(formKey, 'capabilities')} title="能力配置" subtitle="控制生成入口和参数可用性，建议只启用模型真实支持的能力。" changed={hasCapabilityChanges(form)}>
          <ModelCapabilitiesEditor labels={labels} form={form} fieldIssueMap={fieldIssueMap} onChange={onChange} />
        </ModelFormSection>
        <CollapsibleModelSection id={modelSectionID(formKey, 'params')} label={labels.paramsSchema} hint="前台表单字段，枚举参数请重点检查默认值和可选项。" count={form.params.length} changed={editableParamListSignature(form.params) !== editableParamListSignature(form.savedState.params)} open={form.isDraft || hasModelIssuePrefix(fieldIssueMap, 'param:')}>
          <ModelParamEditor labels={labels} formKey={formKey} value={form.params} issues={issues} onChange={(params) => onChange({ params })} />
        </CollapsibleModelSection>
        <CollapsibleModelSection id={modelSectionID(formKey, 'pricing')} label={labels.modelPricing} hint={`${labels.modelCreditEstimateHint}：${estimatedCredits} ${labels.modelCreditEstimateUnit}`} changed={editablePricingConfigSignature(form.pricingConfig) !== editablePricingConfigSignature(form.savedState.pricingConfig)} open={form.isDraft || hasModelIssuePrefix(fieldIssueMap, 'pricing:')}>
          <PricingDeltaNotice labels={labels} form={form} />
          {pricingCopyOptions.length > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-black text-secondary">从其他模型复制：</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const opt = pricingCopyOptions.find((o) => o.key === e.target.value);
                  if (opt) { onChange({ pricingConfig: opt.pricingConfig }); e.target.value = ''; }
                }}
                className={`min-h-8 rounded-control border border-line bg-surface px-2.5 py-0.5 text-xs font-black text-secondary outline-none ${FOCUS_RING}`}
              >
                <option value="" disabled>选择模型…</option>
                {pricingCopyOptions.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
              </select>
            </div>
          )}
          <ModelPricingEditor labels={labels} formKey={formKey} form={form} fieldIssueMap={fieldIssueMap} onChange={onChange} />
        </CollapsibleModelSection>
      </div>
    </div>
  );
}



function ModelEditorSectionNav({ items }: Readonly<{ items: readonly (readonly [string, string])[] }>) {
  return (
    <div className="sticky top-0 z-10 border-b border-line bg-surface/90 px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {items.map(([label, href]) => (
          <a
            key={href}
            href={href}
            className={`inline-flex min-h-8 items-center rounded-control border border-line bg-surface px-3 text-xs font-black text-secondary transition hover:border-accent hover:bg-accent-soft hover:text-accent ${FOCUS_RING}`}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function ModelFormSection({ id, title, subtitle, changed, children }: Readonly<{ id?: string; title: string; subtitle?: string; changed?: boolean; children: React.ReactNode }>) {
  return (
    <section id={id} className="scroll-mt-16 rounded-surface border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-[15px] font-black text-ink">
            {title}
            {changed ? <InlineBadge tone="amber">已修改</InlineBadge> : null}
          </div>
          {subtitle ? <p className="mt-1 text-xs font-semibold leading-5 text-secondary">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function ModelRoutingRulesPanel({ rules, modelProvider, modelUpstreamID }: Readonly<{ rules: readonly AdminModelRoutingRule[]; modelProvider: string; modelUpstreamID: string }>) {
  if (rules.length === 0 || !modelProvider || !modelUpstreamID) return null;
  return (
    <div className="mt-3 rounded-surface border border-line bg-subtle p-3">
      <div className="mb-2 text-xs font-black text-secondary">关联路由规则</div>
      <div className="space-y-1.5">
        {rules.map((rule) => {
          const isSource = rule.source_provider === modelProvider && rule.source_provider_model === modelUpstreamID;
          const counterpartProvider = isSource ? rule.target_provider : rule.source_provider;
          const counterpartModel = isSource ? rule.target_provider_model : rule.source_provider_model;
          return (
            <div key={rule.id} className={`flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${rule.enabled ? 'border-accent bg-surface' : 'border-line bg-subtle opacity-60'}`}>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 font-black ${isSource ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>
                {isSource ? '来源' : '目标'}
              </span>
              <span className="shrink-0 font-semibold text-secondary">{rule.traffic_percent}%</span>
              <span className="min-w-0 truncate font-mono text-secondary">
                {counterpartProvider}/{counterpartModel}
              </span>
              {rule.duration_seconds != null && (
                <span className="shrink-0 text-muted">≤{rule.duration_seconds}s</span>
              )}
              <span className="shrink-0 text-muted">{rule.task_type}</span>
              <span className="shrink-0 text-muted">{rule.strategy || 'deterministic_hash'}</span>
              {rule.note ? <span className="min-w-0 truncate text-secondary" title={rule.note}>{rule.note}</span> : null}
              {!rule.enabled && <span className="shrink-0 text-muted">已禁用</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hasBasicInfoChanges(form: ModelForm): boolean {
  return form.id !== form.savedState.id
    || form.name !== form.savedState.name
    || form.provider !== form.savedState.provider
    || form.upstreamModelID !== form.savedState.upstreamModelID
    || form.displayOrder !== form.savedState.displayOrder
    || form.type !== form.savedState.type
    || form.isEnabled !== form.savedState.isEnabled
    || form.description !== form.savedState.description
    || form.tagsText !== form.savedState.tagsText;
}

function modelChangeItems(form: ModelForm): readonly string[] {
  const items: string[] = [];
  if (hasBasicInfoChanges(form)) items.push('基础信息');
  if (hasCapabilityChanges(form)) items.push('能力配置');
  if (editableParamListSignature(form.params) !== editableParamListSignature(form.savedState.params)) items.push('参数字段');
  if (editablePricingConfigSignature(form.pricingConfig) !== editablePricingConfigSignature(form.savedState.pricingConfig)) items.push('计费配置');
  return items;
}

function hasCapabilityChanges(form: ModelForm): boolean {
  return form.capabilitiesText !== form.savedState.capabilitiesText
    || editableInputLimitsSignature(form.inputLimits) !== editableInputLimitsSignature(form.savedState.inputLimits);
}

function ModelCapabilitiesEditor({ labels, form, fieldIssueMap, onChange }: Readonly<{ labels: AdminLabels; form: ModelForm; fieldIssueMap: ReadonlyMap<string, string>; onChange: (patch: Partial<ModelForm>) => void }>) {
  const selected = csvSet(form.capabilitiesText);
  const toggleCapability = (capability: ModelCapabilityOption['value']) => {
    const next = new Set(selected);
    if (next.has(capability)) next.delete(capability);
    else next.add(capability);
    onChange({ capabilitiesText: MODEL_CAPABILITY_OPTIONS.filter((option) => next.has(option.value)).map((option) => option.value).join(', ') });
  };
  const inputLimitFields: readonly Readonly<{ key: keyof EditableInputLimits; label: string }>[] = [
    { key: 'referenceImages', label: labels.referenceImagesLimit },
    { key: 'referenceVideos', label: labels.referenceVideosLimit },
    { key: 'referenceAudios', label: labels.referenceAudiosLimit },
  ];

  return (
    <div className="px-1 py-1">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-black text-ink">Capabilities</div>
        <div className="text-xs font-semibold text-muted">{selected.size}</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {MODEL_CAPABILITY_OPTIONS.map((option) => {
          const checked = selected.has(option.value);
          return (
            <label key={option.value} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-surface border px-3 py-2 text-sm font-black transition ${checked ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-secondary hover:border-line-strong hover:text-ink'}`}>
              <input type="checkbox" checked={checked} onChange={() => toggleCapability(option.value)} className="h-4 w-4 accent-[var(--ui-accent)]" />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {fieldIssueMap.get('capabilitiesText') ? <p className="mt-2 text-xs font-semibold text-red-600" aria-live="polite">{fieldIssueMap.get('capabilitiesText')}</p> : null}
      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-3">
          <div className="text-sm font-black text-ink">{labels.modelInputLimits}</div>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted">{labels.modelInputLimitsHint}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {inputLimitFields.map((field) => {
            const error = fieldIssueMap.get(`inputLimit:${field.key}`);
            return (
              <label key={field.key} className="text-xs font-black text-secondary">
                <span>{field.label}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.inputLimits[field.key]}
                  onChange={(event) => onChange({ inputLimits: { ...form.inputLimits, [field.key]: event.target.value } })}
                  className={`aics-control mt-1 w-full rounded-surface px-3 py-2 text-sm ${error ? 'border-red-300' : ''} ${FOCUS_RING}`}
                  placeholder={labels.unlimited}
                />
                {error ? <span className="mt-1 block font-semibold text-red-600" aria-live="polite">{error}</span> : null}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ModelCapabilityOption = Readonly<{ value: 'text_to_image' | 'image_to_image' | 'text_to_video' | 'image_to_video' | 'video_to_video' | 'audio_guided_video'; label: string }>;

const MODEL_CAPABILITY_OPTIONS: readonly ModelCapabilityOption[] = [
  { value: 'text_to_image', label: '文生图' },
  { value: 'image_to_image', label: '图生图' },
  { value: 'text_to_video', label: '文生视频' },
  { value: 'image_to_video', label: '图生视频' },
  { value: 'video_to_video', label: '视频参考' },
  { value: 'audio_guided_video', label: '音频参考' },
];

function csvSet(value: string): ReadonlySet<ModelCapabilityOption['value']> {
  const allowed = new Set(MODEL_CAPABILITY_OPTIONS.map((option) => option.value));
  return new Set(value.split(',').map((item) => item.trim()).filter((item): item is ModelCapabilityOption['value'] => allowed.has(item as ModelCapabilityOption['value'])));
}
function CollapsibleModelSection({ id, label, hint, count, changed, open, children }: Readonly<{ id?: string; label: string; hint?: string; count?: number; changed?: boolean; open?: boolean; children: React.ReactNode }>) {
  return (
    <details id={id} className="scroll-mt-16 rounded-surface border border-line bg-white p-4 shadow-sm" open={open ? true : undefined}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[15px] font-black text-ink">
            {label}
            {typeof count === 'number' ? <InlineBadge tone="slate">{String(count)}</InlineBadge> : null}
            {changed ? <InlineBadge tone="amber">已修改</InlineBadge> : null}
          </div>
          {hint ? <div className="text-xs font-semibold text-muted">{hint}</div> : null}
        </div>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function hasModelIssuePrefix(fieldIssueMap: ReadonlyMap<string, string>, prefix: string): boolean {
  for (const key of fieldIssueMap.keys()) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

function ModelPricingEditor({
  labels,
  formKey,
  form,
  fieldIssueMap,
  onChange,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  form: ModelForm;
  fieldIssueMap: ReadonlyMap<string, string>;
  onChange: (patch: Partial<ModelForm>) => void;
}>) {
  if (form.type === 'image' && form.pricingConfig.image) {
    return (
      <ImagePricingMatrixEditor
        labels={labels}
        formKey={formKey}
        form={form}
        pricing={form.pricingConfig.image}
        fieldIssueMap={fieldIssueMap}
        onChange={(resolutionKey, qualityKey, value) => onChange({ pricingConfig: updateImagePricing(form, resolutionKey, qualityKey, value) })}
      />
    );
  }
  if (form.type === 'video' && form.pricingConfig.video) {
    return (
      <VideoPricingEditor
        labels={labels}
        formKey={formKey}
        pricing={form.pricingConfig.video}
        fieldIssueMap={fieldIssueMap}
        onChange={(pricing) => onChange({ pricingConfig: { video: pricing } })}
      />
    );
  }
  return null;
}

function ModelValidationSummary({ labels, messages }: Readonly<{ labels: AdminLabels; messages: readonly string[] }>) {
  if (messages.length === 0) return null;
  return (
    <div className="mt-3 rounded-surface border border-red-200 bg-red-50 px-4 py-3" aria-live="polite">
      <p className="text-sm font-black text-red-700">{labels.validationSummaryTitle}</p>
      <ul className="mt-2 space-y-1 text-sm font-semibold text-red-700">
        {messages.map((message, index) => <li key={`${message}-${index}`}>• {message}</li>)}
      </ul>
    </div>
  );
}

function ModelCardActionButtons({
  labels,
  form,
  isDirty,
  saving,
  deleting,
  onDismissDraft,
  onReset,
  onDuplicate,
  onDelete,
  onSave,
}: Readonly<{
  labels: AdminLabels;
  form: ModelForm;
  isDirty: boolean;
  saving: boolean;
  deleting: boolean;
  onDismissDraft?: () => void;
  onReset: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: () => void;
  compact?: boolean;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PrimaryButton onClick={onSave} loading={saving} disabled={!form.isDraft && !isDirty}>{form.isDraft ? labels.createModel : (isDirty ? labels.saveModel : '无改动')}</PrimaryButton>
      {!form.isDraft ? <SecondaryButton onClick={onDuplicate} icon={<Copy size={16} />}>{labels.duplicateModel}</SecondaryButton> : null}
      {!form.isDraft && isDirty ? <SecondaryButton onClick={onReset} icon={<RotateCcw size={16} />}>{labels.resetChanges}</SecondaryButton> : null}
      {!form.isDraft ? <SecondaryButton onClick={onDelete} icon={<Trash2 size={16} />} loading={deleting}>{labels.deleteAction}</SecondaryButton> : null}
      {onDismissDraft ? <SecondaryButton onClick={onDismissDraft} icon={<X size={16} />}>{labels.cancelDraft}</SecondaryButton> : null}
    </div>
  );
}

function ModelEditorHeader({
  labels,
  formKey,
  form,
  title,
  type,
  isDraft,
  isDirty,
  publicID,
  provider,
  upstreamID,
  estimatedCredits,
  providerMeta,
  saving,
  deleting,
  onChange,
  onDismissDraft,
  onReset,
  onDuplicate,
  onDelete,
  onSave,
  onClose,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  form: ModelForm;
  title: string;
  type: ModelForm['type'];
  isDraft: boolean;
  isDirty: boolean;
  publicID: string;
  provider: string;
  upstreamID: string;
  estimatedCredits: number;
  providerMeta?: ProviderMeta;
  saving: boolean;
  deleting: boolean;
  onChange: (patch: Partial<ModelForm>) => void;
  onDismissDraft?: () => void;
  onReset: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: () => void;
  onClose?: () => void;
}>) {
  const changedCount = modelChangeItems(form).length + (isDraft ? 1 : 0);
  const statusTone = isDirty || isDraft ? 'bg-amber-400' : form.isEnabled ? 'bg-emerald-500' : 'bg-slate-300';
  return (
    <div className="relative border-b border-line bg-white px-4 py-4">
      {onClose && (
        <button type="button" onClick={onClose} aria-label="关闭" className={`absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-subtle text-secondary hover:bg-line hover:text-ink ${FOCUS_RING}`}><X size={14} aria-hidden="true" /></button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-surface text-base font-black text-white ${type === 'video' ? 'bg-accent' : 'bg-ink'}`}>
            {type === 'video' ? 'V' : 'I'}
          </div>
          <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusTone}`} aria-hidden="true" />
            <h3 className="min-w-0 truncate text-xl font-black tracking-normal text-ink">{title}</h3>
            <InlineBadge tone={providerMeta?.enabled === false ? 'amber' : 'slate'}>{provider}</InlineBadge>
            <InlineBadge tone="indigo">{type}</InlineBadge>
            {isDraft ? <InlineBadge>{labels.draftBadge}</InlineBadge> : null}
            {isDirty ? <InlineBadge tone="amber">{labels.dirtyBadge}</InlineBadge> : null}
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-secondary">
            <span className="admin-mono truncate font-black text-secondary">{publicID}</span>
            <span className="text-line-strong">/</span>
            <span className="truncate">{upstreamID}</span>
            <span className="text-line-strong">/</span>
            <span className="admin-mono font-black text-secondary">{estimatedCredits} {labels.modelCreditEstimateUnit}</span>
          </div>
          <div className="mt-3 grid max-w-5xl gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <ModelHeaderMetric label="Provider" value={provider} risky={form.provider !== form.savedState.provider} />
            <ModelHeaderMetric label="Upstream" value={upstreamID} risky={form.upstreamModelID !== form.savedState.upstreamModelID} />
            <ModelHeaderMetric label="Changed" value={`${changedCount}`} risky={changedCount > 0} />
            <ModelHeaderMetric label="Provider状态" value={providerMeta ? providerStatusLabel(providerMeta) : '未知'} risky={providerMeta?.enabled === false || providerMeta?.configured === false} />
          </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="inline-flex min-h-10 items-center gap-2 rounded-surface border border-line bg-subtle px-3 py-2 text-sm font-bold text-secondary">
            <input id={fieldID(formKey, 'isEnabled')} name={fieldID(formKey, 'isEnabled')} type="checkbox" checked={form.isEnabled} onChange={(event) => onChange({ isEnabled: event.target.checked })} className="h-4 w-4 accent-[var(--ui-accent)]" />
            {labels.enabled}
          </label>
          <ModelCardActionButtons labels={labels} form={form} isDirty={isDirty} saving={saving} deleting={deleting} onDismissDraft={onDismissDraft} onReset={onReset} onDuplicate={onDuplicate} onDelete={onDelete} onSave={onSave} />
        </div>
      </div>
    </div>
  );
}

function ModelHeaderMetric({ label, value, risky }: Readonly<{ label: string; value: string; risky?: boolean }>) {
  return (
    <div className={`min-w-0 rounded-surface border px-3 py-2 ${risky ? 'border-amber-200 bg-amber-50' : 'border-line bg-subtle'}`}>
      <div className="admin-mono text-xs font-black uppercase tracking-normal text-muted">{label}</div>
      <div className={`admin-mono mt-1 truncate text-xs font-black ${risky ? 'text-amber-800' : 'text-secondary'}`}>{value}</div>
    </div>
  );
}


function ImagePricingMatrixEditor({
  labels,
  formKey,
  form,
  pricing,
  fieldIssueMap,
  onChange,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  form: ModelForm;
  pricing: EditableImagePricingConfig;
  fieldIssueMap: ReadonlyMap<string, string>;
  onChange: (resolutionKey: ImagePricingResolutionKey, qualityKey: ImagePricingQualityKey, value: string) => void;
}>) {
  const pricingShape = imagePricingShape(form);
  if (pricingShape === 'imageSize') {
    const resolutionKeys = imageSizePricingResolutionKeys();
    return (
      <div className="rounded-surface bg-white p-1">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs font-semibold leading-5 text-muted">按分辨率预设配置单张扣点；宽高比不参与计费。</p>
          <span className="rounded-full border border-line bg-subtle px-2 py-1 text-xs font-black uppercase tracking-normal text-secondary">resolution</span>
        </div>
        <div className="overflow-hidden rounded-surface border border-line bg-white">
          <div className={`grid ${pricingGridClass(resolutionKeys.length)} border-b border-line bg-subtle`}>
            {resolutionKeys.map((resolutionKey) => (
              <MatrixHeaderCell key={resolutionKey}>{pricingResolutionLabel(resolutionKey, labels)}</MatrixHeaderCell>
            ))}
          </div>
          <div className={`grid ${pricingGridClass(resolutionKeys.length)} items-stretch`}>
            {resolutionKeys.map((resolutionKey) => {
              const qualityKey: ImagePricingQualityKey = 'medium';
              const field = pricingFieldKey(resolutionKey, qualityKey);
              return (
                <div key={field} className="border-l first:border-l-0 border-line p-2">
                  <label htmlFor={fieldID(formKey, field)} className="sr-only">{pricingResolutionLabel(resolutionKey, labels)}</label>
                  <div className="relative">
                    <input
                      id={fieldID(formKey, field)}
                      name={fieldID(formKey, field)}
                      type="number"
                      min={1}
                      step={1}
                      value={pricingValue(pricing, resolutionKey, qualityKey)}
                      onChange={(event) => onChange(resolutionKey, qualityKey, event.target.value)}
                      className={`aics-control w-full rounded-lg px-2.5 py-1.5 pr-8 text-sm font-semibold ${FOCUS_RING}`}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-muted">点</span>
                  </div>
                  {fieldIssueMap.get(field) ? <p className="mt-1 text-xs font-semibold text-red-600" aria-live="polite">{fieldIssueMap.get(field)}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-surface bg-white p-1">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold leading-5 text-muted">{labels.modelPricingHint}</p>
        <span className="rounded-full border border-line bg-subtle px-2 py-1 text-xs font-black uppercase tracking-normal text-secondary">quality × resolution</span>
      </div>
      <div className="overflow-hidden rounded-surface border border-line bg-white">
        <div className="grid grid-cols-[112px_repeat(3,minmax(0,1fr))] border-b border-line bg-subtle">
          <MatrixHeaderCell>{labels.type}</MatrixHeaderCell>
          {IMAGE_PRICING_RESOLUTION_KEYS.map((resolutionKey) => (
            <MatrixHeaderCell key={resolutionKey}>{pricingResolutionLabel(resolutionKey, labels)}</MatrixHeaderCell>
          ))}
        </div>
        <div className="divide-y divide-line">
          {IMAGE_PRICING_QUALITY_KEYS.map((qualityKey) => (
            <div key={qualityKey} className="grid grid-cols-[112px_repeat(3,minmax(0,1fr))] items-stretch">
              <div className="flex items-center bg-subtle px-3 py-2 text-xs font-black uppercase tracking-normal text-secondary">{pricingQualityLabel(qualityKey, labels)}</div>
              {IMAGE_PRICING_RESOLUTION_KEYS.map((resolutionKey) => {
                const field = pricingFieldKey(resolutionKey, qualityKey);
                return (
                  <div key={field} className="border-l border-line p-2">
                    <label htmlFor={fieldID(formKey, field)} className="sr-only">{`${pricingQualityLabel(qualityKey, labels)} ${pricingResolutionLabel(resolutionKey, labels)}`}</label>
                    <div className="relative">
                      <input
                        id={fieldID(formKey, field)}
                        name={fieldID(formKey, field)}
                        type="number"
                        min={1}
                        step={1}
                        value={pricingValue(pricing, resolutionKey, qualityKey)}
                        onChange={(event) => onChange(resolutionKey, qualityKey, event.target.value)}
                        className={`aics-control w-full rounded-lg px-2.5 py-1.5 pr-8 text-sm font-semibold ${FOCUS_RING}`}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-muted">点</span>
                    </div>
                    {fieldIssueMap.get(field) ? <p className="mt-1 text-xs font-semibold text-red-600" aria-live="polite">{fieldIssueMap.get(field)}</p> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function imagePricingShape(form: ModelForm): 'qualityResolution' | 'imageSize' {
  void form;
  return isGeminiResolutionPricedImageModel(form) ? 'imageSize' : 'qualityResolution';
}

function imageSizePricingResolutionKeys(): readonly ImagePricingResolutionKey[] {
  return IMAGE_PRICING_RESOLUTION_KEYS;
}

function isGeminiResolutionPricedImageModel(form: ModelForm): boolean {
  if (form.type !== 'image') return false;
  return form.provider.toLowerCase().includes('gemini');
}

function pricingGridClass(columnCount: number): string {
  if (columnCount <= 1) return 'grid-cols-1';
  if (columnCount === 2) return 'grid-cols-2';
  return 'grid-cols-3';
}

function MatrixHeaderCell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="px-3 py-2 text-xs font-black uppercase tracking-normal text-secondary">{children}</div>;
}

function VideoPricingEditor({
  labels,
  formKey,
  pricing,
  fieldIssueMap,
  onChange,
}: Readonly<{
  labels: AdminLabels;
  formKey: string;
  pricing: EditableVideoPricingConfig;
  fieldIssueMap: ReadonlyMap<string, string>;
  onChange: (pricing: EditableVideoPricingConfig) => void;
}>) {
  const patch = (next: Partial<EditableVideoPricingConfig>) => onChange({ ...pricing, ...next });
  return (
    <div className="space-y-3 rounded-surface bg-white p-1">
      <p className="text-xs font-semibold leading-5 text-muted">{labels.modelVideoPricingHint}</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field htmlFor={fieldID(formKey, 'pricing:video:mode')} label={labels.videoPricingMode}>
          <select id={fieldID(formKey, 'pricing:video:mode')} name={fieldID(formKey, 'pricing:video:mode')} value={pricing.mode} onChange={(event) => patch({ mode: event.target.value as EditableVideoPricingConfig['mode'] })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`}>
            <option value="duration">{labels.videoPricingModeDuration}</option>
            <option value="fixed">{labels.videoPricingModeFixed}</option>
          </select>
        </Field>
        {pricing.mode === 'fixed' ? (
          <Field htmlFor={fieldID(formKey, 'pricing:video:credits')} label={labels.videoFixedCredits} error={fieldIssueMap.get('pricing:video:credits')}>
            <input id={fieldID(formKey, 'pricing:video:credits')} name={fieldID(formKey, 'pricing:video:credits')} type="number" min={1} step={1} value={pricing.credits} onChange={(event) => patch({ credits: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
          </Field>
        ) : (
          <>
            <Field htmlFor={fieldID(formKey, 'pricing:video:creditsPerSecond')} label={labels.videoCreditsPerSecond} error={fieldIssueMap.get('pricing:video:creditsPerSecond')}>
              <input id={fieldID(formKey, 'pricing:video:creditsPerSecond')} name={fieldID(formKey, 'pricing:video:creditsPerSecond')} type="number" min={0.01} step={0.01} value={pricing.creditsPerSecond} onChange={(event) => patch({ creditsPerSecond: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
            </Field>
            <Field htmlFor={fieldID(formKey, 'pricing:video:minSeconds')} label={labels.videoMinSeconds} error={fieldIssueMap.get('pricing:video:minSeconds')}>
              <input id={fieldID(formKey, 'pricing:video:minSeconds')} name={fieldID(formKey, 'pricing:video:minSeconds')} type="number" min={0.01} step={0.01} value={pricing.minSeconds} onChange={(event) => patch({ minSeconds: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
            </Field>
            <Field htmlFor={fieldID(formKey, 'pricing:video:durationParam')} label={labels.videoDurationParam} error={fieldIssueMap.get('pricing:video:durationParam')}>
              <input id={fieldID(formKey, 'pricing:video:durationParam')} name={fieldID(formKey, 'pricing:video:durationParam')} value={pricing.durationParam} onChange={(event) => patch({ durationParam: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
            </Field>
            <Field htmlFor={fieldID(formKey, 'pricing:video:countParam')} label={labels.videoCountParam} error={fieldIssueMap.get('pricing:video:countParam')}>
              <input id={fieldID(formKey, 'pricing:video:countParam')} name={fieldID(formKey, 'pricing:video:countParam')} value={pricing.countParam} onChange={(event) => patch({ countParam: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
            </Field>
            <Field htmlFor={fieldID(formKey, 'pricing:video:resolutionParam')} label={labels.videoResolutionParam} error={fieldIssueMap.get('pricing:video:resolutionParam')}>
              <input id={fieldID(formKey, 'pricing:video:resolutionParam')} name={fieldID(formKey, 'pricing:video:resolutionParam')} value={pricing.resolutionParam} onChange={(event) => patch({ resolutionParam: event.target.value })} className={`aics-control w-full rounded-surface px-3 py-2 text-sm ${FOCUS_RING}`} />
            </Field>
            <div className="md:col-span-2 xl:col-span-3">
              <Field htmlFor={fieldID(formKey, 'pricing:video:resolutionMultipliersText')} label={labels.videoResolutionMultipliers} error={fieldIssueMap.get('pricing:video:resolutionMultipliersText')}>
                <textarea id={fieldID(formKey, 'pricing:video:resolutionMultipliersText')} name={fieldID(formKey, 'pricing:video:resolutionMultipliersText')} value={pricing.resolutionMultipliersText} onChange={(event) => patch({ resolutionMultipliersText: event.target.value })} className={`aics-control min-h-[92px] w-full rounded-surface px-3 py-2 font-mono text-sm leading-6 ${FOCUS_RING}`} />
              </Field>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function estimateModelDefaultCredits(form: ModelForm): number {
  const schema = serializeEditableParams(form.params);
  const defaultParams = Object.fromEntries(schema.map((field) => [field.key, field.default]));
  return estimateCredits(form.type, defaultParams, serializeEditablePricingConfig(form.type, form.pricingConfig));
}

function updateImagePricing(
  form: ModelForm,
  resolutionKey: ImagePricingResolutionKey,
  qualityKey: ImagePricingQualityKey,
  value: string,
) {
  if (!form.pricingConfig.image) {
    return form.pricingConfig;
  }
  return {
    image: {
      ...form.pricingConfig.image,
      [resolutionKey]: {
        ...form.pricingConfig.image[resolutionKey],
        [qualityKey]: value,
      },
    },
  };
}

function pricingFieldKey(resolutionKey: ImagePricingResolutionKey, qualityKey: ImagePricingQualityKey): string {
  return `pricing:image:${resolutionKey}:${qualityKey}`;
}

function pricingValue(
  pricing: EditableImagePricingConfig,
  resolutionKey: ImagePricingResolutionKey,
  qualityKey: ImagePricingQualityKey,
): string {
  return pricing[resolutionKey][qualityKey];
}

function pricingResolutionLabel(resolutionKey: ImagePricingResolutionKey, labels: AdminLabels): string {
  if (resolutionKey === 'tier1k') return labels.pricingTier1k;
  if (resolutionKey === 'tier2k') return labels.pricingTier2k;
  return labels.pricingTier4k;
}

function pricingQualityLabel(qualityKey: ImagePricingQualityKey, labels: AdminLabels): string {
  if (qualityKey === 'low') return labels.pricingLow;
  if (qualityKey === 'medium') return labels.pricingMedium;
  return labels.pricingHigh;
}


type ModelProviderGroup = Readonly<{
  provider: string;
  entries: readonly ModelEntry[];
  enabledCount: number;
  imageCount: number;
  videoCount: number;
  dirtyCount: number;
  issueCount: number;
}>;

type ModelViewFilter = 'all' | 'enabled' | 'disabled' | 'video' | 'image' | 'dirty' | 'draft' | 'issues' | 'provider-disabled' | 'no-capability';
type ModelCapabilityFilter = 'all' | 'none' | ModelCapabilityOption['value'];

function buildProviderStatusMap(providerEntries: readonly ProviderEntry[]): ReadonlyMap<string, boolean> {
  const status = new Map<string, boolean>();
  for (const [, form] of providerEntries) {
    const key = providerStatsKey(form.id);
    if (key) status.set(key, form.enabled);
  }
  return status;
}

type ProviderModelStats = Readonly<{
  total: number;
  enabled: number;
  image: number;
  video: number;
  issues: number;
}>;

function providerStatsKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildProviderModelStats(entries: readonly ModelEntry[], issues: Readonly<Record<string, readonly ModelValidationIssue[]>>): ReadonlyMap<string, ProviderModelStats> {
  const stats = new Map<string, { total: number; enabled: number; image: number; video: number; issues: number }>();
  for (const [formKey, form] of entries) {
    const provider = providerStatsKey(form.provider || form.listSnapshot.provider);
    if (!provider) continue;
    const current = stats.get(provider) ?? { total: 0, enabled: 0, image: 0, video: 0, issues: 0 };
    current.total += 1;
    if (form.isEnabled) current.enabled += 1;
    if (form.type === 'image') current.image += 1;
    if (form.type === 'video') current.video += 1;
    if ((issues[formKey]?.length ?? 0) > 0) current.issues += 1;
    stats.set(provider, current);
  }
  return stats;
}

type ProviderViewFilter = 'all' | 'enabled' | 'disabled' | 'secret-missing' | 'dirty' | 'linked' | 'unlinked' | 'draft';

function filterProviderEntries(
  entries: readonly ProviderEntry[],
  query: string,
  filter: ProviderViewFilter,
  stats: ReadonlyMap<string, ProviderModelStats> = new Map(),
): readonly ProviderEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  return entries.filter(([, form]) => {
    const linkedCount = stats.get(providerStatsKey(form.id))?.total ?? 0;
    if (filter === 'enabled' && !form.enabled) return false;
    if (filter === 'disabled' && form.enabled) return false;
    if (filter === 'secret-missing' && (form.configured || form.apiKey.trim())) return false;
    if (filter === 'dirty' && !isProviderFormDirty(form)) return false;
    if (filter === 'linked' && linkedCount === 0) return false;
    if (filter === 'unlinked' && linkedCount > 0) return false;
    if (filter === 'draft' && !form.isDraft) return false;

    if (!normalizedQuery) return true;
    return [form.id, form.adapter, adapterLabel(form.adapter), form.baseURL].join(' ').toLowerCase().includes(normalizedQuery);
  });
}

function matchesModelViewFilter([formKey, form]: ModelEntry, filter: ModelViewFilter, issues: Readonly<Record<string, readonly ModelValidationIssue[]>>, providerStatusMap: ReadonlyMap<string, boolean>): boolean {
  if (filter === 'enabled') return isModelEffectivelyEnabled([formKey, form], providerStatusMap);
  if (filter === 'disabled') return !isModelEffectivelyEnabled([formKey, form], providerStatusMap);
  if (filter === 'video') return form.type === 'video';
  if (filter === 'image') return form.type === 'image';
  if (filter === 'dirty') return isModelFormDirty(form);
  if (filter === 'draft') return form.isDraft;
  if (filter === 'issues') return (issues[formKey]?.length ?? 0) > 0;
  if (filter === 'provider-disabled') return isModelProviderDisabled([formKey, form], providerStatusMap);
  if (filter === 'no-capability') return csvSet(form.capabilitiesText).size === 0;
  return true;
}

function matchesProviderFilter([, form]: ModelEntry, providerFilter: string): boolean {
  if (providerFilter === 'all') return true;
  return providerStatsKey(modelProviderID(form)) === providerStatsKey(providerFilter);
}

function matchesCapabilityFilter([, form]: ModelEntry, capabilityFilter: ModelCapabilityFilter): boolean {
  if (capabilityFilter === 'all') return true;
  const capabilities = csvSet(form.capabilitiesText);
  if (capabilityFilter === 'none') return capabilities.size === 0;
  return capabilities.has(capabilityFilter);
}

function isModelProviderDisabled([, form]: ModelEntry, providerStatusMap: ReadonlyMap<string, boolean>): boolean {
  return providerStatusMap.get(providerStatsKey(modelProviderID(form))) === false;
}

function isModelProviderEnabled([, form]: ModelEntry, providerStatusMap: ReadonlyMap<string, boolean>): boolean {
  return providerStatusMap.get(providerStatsKey(modelProviderID(form))) === true;
}

function isModelEffectivelyEnabled(entry: ModelEntry, providerStatusMap: ReadonlyMap<string, boolean>): boolean {
  return entry[1].isEnabled && isModelProviderEnabled(entry, providerStatusMap);
}

type ProviderMeta = Readonly<{ id: string; adapter: string; enabled: boolean; configured: boolean; dirty: boolean }>;

function buildProviderMetaMap(providerEntries: readonly ProviderEntry[]): ReadonlyMap<string, ProviderMeta> {
  const map = new Map<string, ProviderMeta>();
  for (const [, form] of providerEntries) {
    const key = providerStatsKey(form.id);
    if (!key) continue;
    map.set(key, { id: form.id, adapter: form.adapter, enabled: form.enabled, configured: form.configured || form.apiKey.trim().length > 0, dirty: isProviderFormDirty(form) });
  }
  return map;
}

function providerStatusLabel(meta: ProviderMeta): string {
  if (!meta.enabled) return '已禁用';
  if (!meta.configured) return '缺密钥';
  if (meta.dirty) return '渠道未保存';
  return '正常';
}

function ProviderModelStatusNotice({ providerMeta }: Readonly<{ providerMeta?: ProviderMeta }>) {
  if (!providerMeta) return <div className="mb-3 rounded-surface border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">当前 Provider 不在上游渠道列表中，请先检查渠道配置。</div>;
  if (providerMeta.enabled && providerMeta.configured && !providerMeta.dirty) return null;
  return (
    <div className="mb-3 rounded-surface border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
      Provider 状态：{providerStatusLabel(providerMeta)} · {providerMeta.adapter}
    </div>
  );
}

type ProductKindFilter = 'all' | ProductForm['kind'];
type ProductPurchaseModeFilter = 'all' | ProductForm['purchaseMode'];
type ProductRiskAction = 'delete' | 'disable';

function productRiskMessage(labels: AdminLabels, form: ProductForm, isEffective: boolean, action: ProductRiskAction): string {
  const title = form.name.trim() || labels.productDraftTitle;
  const riskItems = productRiskItems(form);
  const lines = [
    action === 'delete' ? '请确认删除商品。' : '请确认停用商品。',
    '',
    `商品：${title}`,
    `ID：${form.id.trim() || labels.pendingId}`,
    `${labels.kind}：${productKindDisplayLabel(labels, form.kind)}`,
    `${labels.purchaseMode}：${productPurchaseModeDisplayLabel(labels, form.purchaseMode)}`,
    `状态：${form.isActive ? labels.active : labels.inactive} / ${isEffective ? labels.liveNow : labels.liveHidden}`,
    `价格：¥${(form.amountCents / 100).toFixed(2)} · Credits：${form.credits}`,
    `支付渠道：${form.enabledProviders.length > 0 ? form.enabledProviders.join(', ') : '未配置'}`,
    '',
    action === 'delete'
      ? '影响：商品会从后台配置中移除，前台购买入口和指定该商品的本地配置可能不再可用。'
      : '影响：商品会从可售/展示范围移除，用户将不能继续购买该商品。',
  ];
  if (isEffective) lines.push('当前商品处于生效状态，操作会影响线上用户。');
  if (riskItems.length > 0) lines.push(`已检测到配置风险：${riskItems.join('；')}`);
  return lines.join('\n');
}

function productPurchaseModeFilterOptions(labels: AdminLabels): readonly { value: ProductForm['purchaseMode']; label: string }[] {
  return [
    { value: 'credits_pack', label: labels.purchaseModeCreditsPack },
    { value: 'first_order_pack', label: labels.purchaseModeFirstOrder },
    { value: 'weekly_membership', label: labels.purchaseModeWeekly },
    { value: 'monthly_subscription', label: labels.purchaseModeMonthly },
    { value: 'yearly_subscription', label: labels.purchaseModeYearly },
  ];
}

function productKindDisplayLabel(labels: AdminLabels, kind: ProductForm['kind']): string {
  return productKindOptions(labels).find((option) => option.value === kind)?.label ?? kind;
}

function productPurchaseModeDisplayLabel(labels: AdminLabels, purchaseMode: ProductForm['purchaseMode']): string {
  return productPurchaseModeFilterOptions(labels).find((option) => option.value === purchaseMode)?.label ?? purchaseMode;
}

function PricingDeltaNotice({ labels, form }: Readonly<{ labels: AdminLabels; form: ModelForm }>) {
  const before = estimateModelDefaultCredits({ ...form, params: form.savedState.params, pricingConfig: form.savedState.pricingConfig } as ModelForm);
  const after = estimateModelDefaultCredits(form);
  if (before === after && editablePricingConfigSignature(form.pricingConfig) === editablePricingConfigSignature(form.savedState.pricingConfig)) return null;
  const diff = after - before;
  return (
    <div className={`mb-3 rounded-surface border px-3 py-2 text-xs font-black ${diff === 0 ? 'border-line bg-subtle text-secondary' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
      计费变化：保存前 {before} {labels.modelCreditEstimateUnit} → 保存后 {after} {labels.modelCreditEstimateUnit} {diff !== 0 ? `(${diff > 0 ? '+' : ''}${diff})` : ''}
    </div>
  );
}

function matchesProductViewFilter(
  [, form]: ProductEntry,
  filter: 'all' | 'live' | 'draft' | 'inactive',
  effectiveIDs: ReadonlySet<string>,
): boolean {
  if (filter === 'live') return effectiveIDs.has(form.id);
  if (filter === 'draft') return form.isDraft;
  if (filter === 'inactive') return !form.isActive;
  return true;
}

function matchesProductKindFilter([, form]: ProductEntry, filter: ProductKindFilter): boolean {
  return filter === 'all' || form.kind === filter;
}

function matchesProductPurchaseModeFilter([, form]: ProductEntry, filter: ProductPurchaseModeFilter): boolean {
  return filter === 'all' || form.purchaseMode === filter;
}

function filterModelEntries(entries: readonly ModelEntry[], query: string): readonly ModelEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return entries;
  }
  return entries.filter(([, form]) => modelSearchText(form).includes(normalizedQuery));
}

function groupModelEntriesByProvider(
  entries: readonly ModelEntry[],
  providerOptions: readonly string[],
  issues: Readonly<Record<string, readonly ModelValidationIssue[]>>,
): readonly ModelProviderGroup[] {
  const providerOrder = [...providerOptions, ...entries.map(([, form]) => modelProviderID(form))]
    .map((provider) => provider.trim())
    .filter(Boolean);
  const uniqueProviders = Array.from(new Set(providerOrder));
  return uniqueProviders
    .map((provider) => buildModelProviderGroup(provider, sortModelEntries(entries.filter(([, form]) => modelProviderID(form) === provider)), issues))
    .filter((group) => group.entries.length > 0)
    .sort((left, right) => {
      const issueDiff = right.issueCount - left.issueCount;
      if (issueDiff !== 0) return issueDiff;
      const dirtyDiff = right.dirtyCount - left.dirtyCount;
      if (dirtyDiff !== 0) return dirtyDiff;
      return left.provider.localeCompare(right.provider);
    });
}

function buildModelProviderGroup(
  provider: string,
  entries: readonly ModelEntry[],
  issues: Readonly<Record<string, readonly ModelValidationIssue[]>>,
): ModelProviderGroup {
  return {
    provider,
    entries,
    enabledCount: entries.filter(([, form]) => form.isEnabled).length,
    imageCount: entries.filter(([, form]) => form.type === 'image').length,
    videoCount: entries.filter(([, form]) => form.type === 'video').length,
    dirtyCount: entries.filter(([, form]) => isModelFormDirty(form)).length,
    issueCount: entries.filter(([formKey]) => (issues[formKey]?.length ?? 0) > 0).length,
  };
}

function sortModelEntries(entries: readonly ModelEntry[]): readonly ModelEntry[] {
  return [...entries].sort(([leftKey, left], [rightKey, right]) => {
    const leftEnabled = left.isDraft ? left.isEnabled : left.savedState.isEnabled;
    const rightEnabled = right.isDraft ? right.isEnabled : right.savedState.isEnabled;
    if (leftEnabled !== rightEnabled) return leftEnabled ? -1 : 1;
    if (left.isDraft !== right.isDraft) return left.isDraft ? -1 : 1;
    const leftState = left.isDraft ? left : left.savedState;
    const rightState = right.isDraft ? right : right.savedState;
    const nameDiff = (leftState.name.trim() || leftState.id.trim()).localeCompare(rightState.name.trim() || rightState.id.trim());
    if (nameDiff !== 0) return nameDiff;
    return leftKey.localeCompare(rightKey);
  });
}

function modelProviderID(form: ModelForm): string {
  return form.provider.trim() || form.listSnapshot.provider || form.savedState.provider.trim();
}

function filterProductEntries(entries: readonly ProductEntry[], query: string): readonly ProductEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return entries;
  }
  return entries.filter(([, form]) => productSearchText(form).includes(normalizedQuery));
}


function modelSearchText(form: ModelForm): string {
  return [
    form.id,
    form.name,
    form.provider,
    form.upstreamModelID,
    form.type,
    form.description,
    form.tagsText,
    form.capabilitiesText,
    form.savedState.id,
    form.savedState.name,
    form.savedState.provider,
    form.savedState.upstreamModelID,
    form.listSnapshot.searchText,
  ].join(' ').toLowerCase();
}

function productSearchText(form: ProductForm): string {
  return [form.id, form.name, form.kind, form.purchaseMode, form.currency, form.enabledProviders.join(' ')].join(' ').toLowerCase();
}

function fieldID(formKey: string, field: string): string {
  return modelFieldDOMID(formKey, field);
}

function modelSectionID(formKey: string, section: string): string {
  return `model-section-${formKey}-${section}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function ModelEditModal({
  formKey, labels, form, issues, providerOptions, providerMeta, routingRules, pricingCopyOptions,
  saving, deleting, onChange, onDismissDraft, onReset, onDuplicate, onDelete, onSave, onClose,
}: Readonly<{
  formKey: string; labels: AdminLabels; form: ModelForm; issues: readonly ModelValidationIssue[];
  providerOptions: readonly string[]; providerMeta?: ProviderMeta; routingRules: readonly AdminModelRoutingRule[];
  pricingCopyOptions: readonly { key: string; name: string; pricingConfig: ModelForm['pricingConfig'] }[];
  saving: boolean; deleting: boolean;
  onChange: (patch: Partial<ModelForm>) => void; onDismissDraft?: () => void;
  onReset: () => void; onDuplicate: () => void; onDelete: () => void; onSave: () => void; onClose: () => void;
}>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isDirty = isModelFormDirty(form);
  const statusTone = isDirty || form.isDraft ? 'bg-amber-400' : form.isEnabled ? 'bg-emerald-500' : 'bg-slate-300';
  const title = form.name.trim() || form.savedState.name.trim() || labels.modelDraftTitle;
  const publicID = form.id.trim() || form.savedState.id.trim() || labels.pendingId;
  const upstreamID = form.upstreamModelID.trim() || form.savedState.upstreamModelID.trim() || labels.upstreamModelId;
  const estimatedCredits = estimateModelDefaultCredits(form);
  const metaProvider = form.isDraft ? (form.provider.trim() || labels.pendingProvider) : (form.listSnapshot.provider || labels.pendingProvider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative z-10 flex h-[92vh] w-full max-w-[1160px] flex-col overflow-hidden rounded-shell bg-surface shadow-floating">
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-5 py-3.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-surface text-sm font-black text-white ${form.type === 'video' ? 'bg-accent' : 'bg-ink'}`}>
            {form.type === 'video' ? 'V' : 'I'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusTone}`} aria-hidden="true" />
              <h3 className="min-w-0 truncate font-black tracking-normal text-ink">{title}</h3>
              <InlineBadge tone={providerMeta?.enabled === false ? 'amber' : 'slate'}>{metaProvider}</InlineBadge>
              <InlineBadge tone="indigo">{form.type}</InlineBadge>
              {form.isDraft ? <InlineBadge>{labels.draftBadge}</InlineBadge> : null}
              {isDirty ? <InlineBadge tone="amber">{labels.dirtyBadge}</InlineBadge> : null}
            </div>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-xs font-semibold text-secondary">
              <span className="admin-mono font-black text-secondary">{publicID}</span>
              <span className="text-line-strong">/</span>
              <span className="truncate">{upstreamID}</span>
              <span className="text-line-strong">/</span>
              <span className="admin-mono font-black text-secondary">{estimatedCredits} {labels.modelCreditEstimateUnit}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle text-secondary hover:bg-line hover:text-ink ${FOCUS_RING}`}><X size={14} aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 flex-1">
          <ModelCard
            key={formKey}
            formKey={formKey}
            labels={labels}
            form={form}
            issues={issues}
            providerOptions={providerOptions}
            providerMeta={providerMeta}
            routingRules={routingRules}
            pricingCopyOptions={pricingCopyOptions}
            saving={saving}
            deleting={deleting}
            onChange={onChange}
            onDismissDraft={onDismissDraft}
            onReset={onReset}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onSave={onSave}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
