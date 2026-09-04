'use client';

import { AlertTriangle, GitBranch, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { deleteModelRoutingRule, listModelRoutingRules, upsertModelRoutingRule, type AdminModelRoutingRule, type AdminModelRoutingRuleInput } from '@/lib/api/admin';
import { FOCUS_RING, type AdminLabels } from './adminUtils';
import { ConfirmDialog, type ConfirmDialogState, MetricCard, SectionHeader } from './AdminSectionPrimitives';

type RoutingProviderOption = Readonly<{
  provider: string;
}>;

type RoutingModelOption = Readonly<{
  id: string;
  provider: string;
  upstream_model_id: string;
  type: 'image' | 'video';
}>;

type RoutingRuleForm = Readonly<{
  id: string;
  enabled: boolean;
  task_type: 'image' | 'video';
  source_provider: string;
  source_provider_model: string;
  duration_seconds: string;
  target_provider: string;
  target_provider_model: string;
  traffic_percent: string;
  strategy: string;
  note: string;
}>;

const EMPTY_FORM: RoutingRuleForm = {
  id: '',
  enabled: false,
  task_type: 'video',
  source_provider: '',
  source_provider_model: '',
  duration_seconds: '15',
  target_provider: '',
  target_provider_model: '',
  traffic_percent: '0',
  strategy: 'deterministic_hash',
  note: '',
};

export function AdminModelRoutingSection(props: Readonly<{
  labels: AdminLabels;
  providers: readonly RoutingProviderOption[];
  models: readonly RoutingModelOption[];
}>) {
  const { showToast } = useToast();
  const [rules, setRules] = useState<readonly AdminModelRoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editingID, setEditingID] = useState<string>('');
  const [form, setForm] = useState<RoutingRuleForm>(() => defaultRoutingForm());
  const [savingID, setSavingID] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();

  const providerOptions = useMemo(() => props.providers.map((item) => item.provider).filter(Boolean), [props.providers]);
  const modelOptions = useMemo(() => buildProviderModelOptions(props.models), [props.models]);
  const enabledRules = rules.filter((rule) => rule.enabled).length;
  const riskWarnings = useMemo(() => buildRoutingRiskWarnings(rules), [rules]);

  const loadRules = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      setRules(await listModelRoutingRules());
    } catch (loadError) {
      const message = toAdminRoutingMessage(loadError, props.labels.loadFailed);
      setError(message);
      showToast({ kind: 'error', message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [props.labels.loadFailed, showToast]);

  useEffect(() => {
    void loadRules(true);
  }, [loadRules]);

  const patchForm = (patch: Partial<RoutingRuleForm>) => setForm((current) => ({ ...current, ...patch }));
  const startCreate = () => {
    setEditingID('');
    setForm(defaultRoutingForm());
  };
  const startEdit = (rule: AdminModelRoutingRule) => {
    setEditingID(rule.id);
    setForm(formFromRule(rule));
  };

  const saveRule = async () => {
    const input = inputFromForm(form, editingID);
    const validation = validateRoutingInput(input);
    if (validation) {
      showToast({ kind: 'error', message: validation });
      return;
    }
    setSavingID(editingID || 'new');
    try {
      const saved = await upsertModelRoutingRule(input);
      await loadRules(false);
      setEditingID(saved.id);
      setForm(formFromRule(saved));
      showToast({ kind: 'success', message: props.labels.saved });
    } catch (saveError) {
      showToast({ kind: 'error', message: toAdminRoutingMessage(saveError, props.labels.saveFailed) });
    } finally {
      setSavingID('');
    }
  };

  const toggleRule = async (rule: AdminModelRoutingRule, enabled: boolean) => {
    setSavingID(`toggle:${rule.id}`);
    try {
      await upsertModelRoutingRule({ ...inputFromRule(rule), enabled });
      await loadRules(false);
      if (editingID === rule.id) patchForm({ enabled });
      showToast({ kind: 'success', message: props.labels.saved });
    } catch (saveError) {
      showToast({ kind: 'error', message: toAdminRoutingMessage(saveError, props.labels.saveFailed) });
    } finally {
      setSavingID('');
    }
  };

  const removeRule = async (rule: AdminModelRoutingRule) => {
    setSavingID(`delete:${rule.id}`);
    try {
      await deleteModelRoutingRule(rule.id);
      await loadRules(false);
      if (editingID === rule.id) startCreate();
      showToast({ kind: 'success', message: '灰度规则已删除' });
    } catch (deleteError) {
      showToast({ kind: 'error', message: toAdminRoutingMessage(deleteError, props.labels.saveFailed) });
    } finally {
      setSavingID('');
    }
  };

  const requestRemoveRule = (rule: AdminModelRoutingRule) => {
    setConfirmDialog({
      title: '删除灰度路由规则？',
      description: `${rule.id} 将停止参与新任务路由。已创建或已经路由的任务不会回滚。`,
      confirmLabel: '删除规则',
      tone: 'danger',
      onConfirm: () => void removeRule(rule),
    });
  };

  const sourceModelChoices = modelOptions.get(form.source_provider) ?? [];
  const targetModelChoices = modelOptions.get(form.target_provider) ?? [];

  return (
    <section className="admin-config-section">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeader icon={<GitBranch size={16} />} eyebrow="灰度路由" title="模型灰度规则" subtitle="配置新任务创建时的模型路由规则。禁用后只影响新任务，已创建或已路由任务不会回滚。" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={startCreate} className={`inline-flex min-h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}><Plus size={14} />新建规则</button>
          <button type="button" onClick={() => void loadRules(false)} disabled={refreshing} className={`inline-flex min-h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />刷新</button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="规则总数" value={String(rules.length)} />
        <MetricCard label="启用中" value={String(enabledRules)} tone="emerald" />
        <MetricCard label="最高流量" value={`${Math.max(0, ...rules.map((rule) => rule.traffic_percent))}%`} tone="indigo" />
      </div>

      {error ? <div className="mt-4 rounded-surface border border-danger bg-danger-soft px-3 py-2 text-sm font-bold text-danger">{error}</div> : null}
      {riskWarnings.length > 0 ? (
        <div className="mt-4 rounded-surface border border-warning bg-warning-soft px-3 py-3 text-sm font-bold text-warning">
          <div className="mb-2 flex items-center gap-2 font-black"><AlertTriangle size={15} />灰度规则风险提示</div>
          <ul className="list-disc space-y-1 pl-5">
            {riskWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-x-auto rounded-surface border border-line bg-surface">
          {!loading && rules.length > 0 ? <div className="space-y-2 p-2 md:hidden">
            {rules.map((rule) => (
              <article key={rule.id} className={`rounded-surface border p-3 ${editingID === rule.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="admin-mono break-all text-xs font-black text-ink">{rule.id}</div><div className="mt-1 text-xs font-semibold text-secondary">{rule.task_type} · {rule.duration_seconds ? `${rule.duration_seconds}s` : '不限时长'}</div></div>
                  <label className="inline-flex shrink-0 items-center gap-2 text-xs font-black text-secondary"><input type="checkbox" checked={rule.enabled} disabled={savingID === `toggle:${rule.id}`} onChange={(event) => void toggleRule(rule, event.target.checked)} className="size-4 accent-[var(--ui-accent)]" />{rule.enabled ? '启用' : '禁用'}</label>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-control bg-subtle p-2"><ModelPath provider={rule.source_provider} model={rule.source_provider_model} /><span aria-hidden="true" className="text-muted">→</span><ModelPath provider={rule.target_provider} model={rule.target_provider_model} /></div>
                <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${Math.min(100, rule.traffic_percent)}%` }} /></div><span className="admin-mono text-xs font-black text-accent">{rule.traffic_percent}%</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => startEdit(rule)} className={`min-h-9 rounded-control border border-line text-xs font-black text-secondary ${FOCUS_RING}`}>编辑规则</button><button type="button" onClick={() => requestRemoveRule(rule)} className={`min-h-9 rounded-control border border-danger text-xs font-black text-danger ${FOCUS_RING}`}>删除规则</button></div>
              </article>
            ))}
          </div> : null}
          <div className="hidden grid-cols-[80px_minmax(220px,1fr)_140px_minmax(220px,1fr)_minmax(170px,0.8fr)_120px] gap-2 border-b border-line bg-subtle px-3 py-2 text-xs font-black text-secondary md:grid">
            <span>状态</span><span>源模型</span><span>条件</span><span>目标模型</span><span>策略/备注</span><span>操作</span>
          </div>
          {loading ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-bold text-secondary"><Loader2 size={16} className="animate-spin" />加载规则中…</div> : null}
          {!loading && rules.length === 0 ? <div className="flex min-h-40 items-center justify-center text-sm font-bold text-secondary">暂无灰度规则</div> : null}
          {!loading && rules.map((rule) => (
            <div key={rule.id} className={`hidden grid-cols-[80px_minmax(220px,1fr)_140px_minmax(220px,1fr)_minmax(170px,0.8fr)_120px] items-center gap-2 border-b border-line px-3 py-3 text-sm last:border-b-0 md:grid ${editingID === rule.id ? 'bg-accent-soft' : 'bg-surface'}`}>
              <label className="inline-flex items-center gap-2 text-xs font-black text-secondary">
                <input type="checkbox" checked={rule.enabled} disabled={savingID === `toggle:${rule.id}`} onChange={(event) => void toggleRule(rule, event.target.checked)} className="size-4 accent-[var(--ui-accent)]" />
                {rule.enabled ? '启用' : '禁用'}
              </label>
              <ModelPath provider={rule.source_provider} model={rule.source_provider_model} />
              <div className="text-xs font-bold text-secondary"><div>{rule.task_type}</div><div>{rule.duration_seconds ? `${rule.duration_seconds}s` : '不限时长'}</div></div>
              <ModelPath provider={rule.target_provider} model={rule.target_provider_model} />
              <div className="min-w-0 text-xs font-bold text-secondary"><div className="font-black text-ink">{rule.traffic_percent}% · {strategyLabel(rule.strategy)}</div>{rule.note ? <div className="truncate text-secondary" title={rule.note}>{rule.note}</div> : <div className="text-muted">无备注</div>}</div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => startEdit(rule)} className={`rounded-control border border-line bg-surface px-2 py-1 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle ${FOCUS_RING}`}>编辑</button>
                <button type="button" onClick={() => requestRemoveRule(rule)} disabled={savingID === `delete:${rule.id}`} className={`inline-flex size-7 items-center justify-center rounded-control border border-danger bg-surface text-danger hover:bg-danger-soft disabled:opacity-50 ${FOCUS_RING}`} title="删除" aria-label={`删除规则 ${rule.id}`}><Trash2 size={13} aria-hidden="true" /></button>
              </div>
            </div>
          ))}
        </div>

        <aside className="admin-card rounded-surface p-3 xl:sticky xl:top-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-ink">{editingID ? '编辑灰度规则' : '新建灰度规则'}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-secondary">支持启用/禁用、源/目标模型、时长条件、流量比例、策略和备注；新建时不会预填跨环境硬编码模型。</p>
            </div>
            {editingID ? <span className="rounded-control border border-accent bg-accent-soft px-2 py-1 text-xs font-black text-accent">{editingID}</span> : null}
          </div>

          <div className="mt-3 space-y-3">
            <Field label="规则 ID">
              <input name="admin-routing-id" autoComplete="off" spellCheck={false} value={form.id} onChange={(event) => patchForm({ id: event.target.value })} disabled={Boolean(editingID)} placeholder="留空自动生成…" className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="任务类型">
                <select name="admin-routing-task-type" autoComplete="off" value={form.task_type} onChange={(event) => patchForm({ task_type: event.target.value as 'image' | 'video' })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`}><option value="video">video</option><option value="image">image</option></select>
              </Field>
              <div><span className="mb-1 block text-xs font-black text-secondary">启用</span><label className="flex min-h-10 items-center gap-2 rounded-control border border-line bg-subtle px-3 text-sm font-black text-secondary"><input type="checkbox" name="admin-routing-enabled" checked={form.enabled} onChange={(event) => patchForm({ enabled: event.target.checked })} className="size-4 accent-[var(--ui-accent)]" />启用规则</label></div>
            </div>
            <div className="rounded-surface border border-line bg-subtle p-2">
              <p className="mb-2 text-xs font-black text-secondary">源模型</p>
              <div className="grid gap-2">
                <ProviderSelect label="源 Provider" name="admin-routing-source-provider" value={form.source_provider} options={providerOptions} onChange={(value) => patchForm({ source_provider: value, source_provider_model: firstModelForProvider(modelOptions, value) })} />
                <ModelSelect label="源 Provider Model" name="admin-routing-source-model" value={form.source_provider_model} options={sourceModelChoices} onChange={(value) => patchForm({ source_provider_model: value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="时长秒数">
                <input name="admin-routing-duration" value={form.duration_seconds} onChange={(event) => patchForm({ duration_seconds: event.target.value })} placeholder="留空 = 不限…" inputMode="numeric" className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} />
              </Field>
              <Field label="流量比例">
                <input name="admin-routing-traffic" value={form.traffic_percent} onChange={(event) => patchForm({ traffic_percent: event.target.value })} inputMode="numeric" className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[0, 10, 20, 50, 100].map((value) => <button key={value} type="button" onClick={() => patchForm({ traffic_percent: String(value) })} className={`rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>{value}%</button>)}
            </div>
            <div className="rounded-surface border border-line bg-subtle p-2">
              <p className="mb-2 text-xs font-black text-secondary">目标模型</p>
              <div className="grid gap-2">
                <ProviderSelect label="目标 Provider" name="admin-routing-target-provider" value={form.target_provider} options={providerOptions} onChange={(value) => patchForm({ target_provider: value, target_provider_model: firstModelForProvider(modelOptions, value) })} />
                <ModelSelect label="目标 Provider Model" name="admin-routing-target-model" value={form.target_provider_model} options={targetModelChoices} onChange={(value) => patchForm({ target_provider_model: value })} />
              </div>
            </div>
            <Field label="策略">
              <select name="admin-routing-strategy" autoComplete="off" value={form.strategy} onChange={(event) => patchForm({ strategy: event.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`}>
                <option value="deterministic_hash">deterministic_hash（稳定哈希）</option>
              </select>
            </Field>
            <Field label="备注">
              <textarea name="admin-routing-note" autoComplete="off" value={form.note} onChange={(event) => patchForm({ note: event.target.value })} rows={3} className={`aics-control w-full resize-none rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} />
            </Field>
            <button type="button" onClick={() => void saveRule()} disabled={Boolean(savingID)} className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-black text-white hover:bg-accent-hover disabled:opacity-60 ${FOCUS_RING}`}>{savingID ? <Loader2 size={15} className="animate-spin" /> : null}{props.labels.saveAction}</button>
          </div>
        </aside>
      </div>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </section>
  );
}


function buildRoutingRiskWarnings(rules: readonly AdminModelRoutingRule[]): readonly string[] {
  const warnings: string[] = [];
  const groups = new Map<string, { total: number; count: number; label: string }>();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const duration = rule.duration_seconds == null ? '不限时长' : `${rule.duration_seconds}s`;
    const key = [rule.task_type, rule.source_provider, rule.source_provider_model, rule.duration_seconds ?? ''].join('::');
    const label = `${rule.task_type} / ${rule.source_provider} / ${rule.source_provider_model} / ${duration}`;
    const current = groups.get(key) ?? { total: 0, count: 0, label };
    groups.set(key, { ...current, total: current.total + rule.traffic_percent, count: current.count + 1 });
  }
  for (const group of groups.values()) {
    if (group.count > 1) warnings.push(`${group.label} 存在 ${group.count} 条启用规则，可能产生匹配冲突。`);
    if (group.total > 100) warnings.push(`${group.label} 启用流量合计 ${group.total}%，超过 100%。`);
  }
  return warnings;
}

function Field(props: Readonly<{ label: string; children: ReactNode }>) {
  return <label className="block"><span className="mb-1 block text-xs font-black text-secondary">{props.label}</span>{props.children}</label>;
}

function ProviderSelect(props: Readonly<{ label: string; name: string; value: string; options: readonly string[]; onChange: (value: string) => void }>) {
  return <select name={props.name} autoComplete="off" aria-label={props.label} value={props.value} onChange={(event) => props.onChange(event.target.value)} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`}><option value="">选择 provider</option>{props.options.map((item) => <option key={item} value={item}>{item}</option>)}</select>;
}

function ModelSelect(props: Readonly<{ label: string; name: string; value: string; options: readonly string[]; onChange: (value: string) => void }>) {
  return <select name={props.name} autoComplete="off" aria-label={props.label} value={props.value} onChange={(event) => props.onChange(event.target.value)} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`}><option value="">选择 provider model</option>{props.options.map((item) => <option key={item} value={item}>{item}</option>)}</select>;
}

function ModelPath(props: Readonly<{ provider: string; model: string }>) {
  return <div className="min-w-0"><div className="truncate text-xs font-bold text-secondary" title={props.provider}>{props.provider}</div><div className="truncate text-sm font-black text-ink" title={props.model}>{props.model}</div></div>;
}

function buildProviderModelOptions(models: readonly RoutingModelOption[]): Map<string, readonly string[]> {
  const values = new Map<string, Set<string>>();
  for (const model of models) {
    const provider = model.provider.trim();
    const upstream = model.upstream_model_id.trim();
    if (!provider || !upstream) continue;
    if (!values.has(provider)) values.set(provider, new Set<string>());
    values.get(provider)?.add(upstream);
  }
  return new Map(Array.from(values.entries()).map(([provider, set]) => [provider, Array.from(set).sort()]));
}

function firstModelForProvider(options: Map<string, readonly string[]>, provider: string): string {
  return options.get(provider)?.[0] ?? '';
}

function defaultRoutingForm(): RoutingRuleForm {
  return EMPTY_FORM;
}

function formFromRule(rule: AdminModelRoutingRule): RoutingRuleForm {
  return {
    id: rule.id,
    enabled: rule.enabled,
    task_type: rule.task_type,
    source_provider: rule.source_provider,
    source_provider_model: rule.source_provider_model,
    duration_seconds: rule.duration_seconds ? String(rule.duration_seconds) : '',
    target_provider: rule.target_provider,
    target_provider_model: rule.target_provider_model,
    traffic_percent: String(rule.traffic_percent),
    strategy: rule.strategy || 'deterministic_hash',
    note: rule.note ?? '',
  };
}

function strategyLabel(strategy: string): string {
  if (strategy === 'deterministic_hash') return '稳定哈希';
  return strategy || '未设置';
}

function inputFromRule(rule: AdminModelRoutingRule): AdminModelRoutingRuleInput {
  return {
    id: rule.id,
    enabled: rule.enabled,
    task_type: rule.task_type,
    source_provider: rule.source_provider,
    source_provider_model: rule.source_provider_model,
    duration_seconds: rule.duration_seconds ?? null,
    target_provider: rule.target_provider,
    target_provider_model: rule.target_provider_model,
    traffic_percent: rule.traffic_percent,
    strategy: rule.strategy,
    note: rule.note,
  };
}

function inputFromForm(form: RoutingRuleForm, editingID: string): AdminModelRoutingRuleInput {
  const duration = form.duration_seconds.trim() === '' ? null : Number(form.duration_seconds);
  return {
    id: editingID || form.id.trim() || undefined,
    enabled: form.enabled,
    task_type: form.task_type,
    source_provider: form.source_provider.trim(),
    source_provider_model: form.source_provider_model.trim(),
    duration_seconds: Number.isFinite(duration) ? duration : null,
    target_provider: form.target_provider.trim(),
    target_provider_model: form.target_provider_model.trim(),
    traffic_percent: Number(form.traffic_percent),
    strategy: form.strategy || 'deterministic_hash',
    note: form.note.trim(),
  };
}

function validateRoutingInput(input: AdminModelRoutingRuleInput): string {
  if (!input.source_provider || !input.source_provider_model || !input.target_provider || !input.target_provider_model) return '源模型和目标模型不能为空';
  if (input.source_provider === input.target_provider && input.source_provider_model === input.target_provider_model) return '源模型和目标模型不能相同';
  if (input.duration_seconds != null && (!Number.isInteger(input.duration_seconds) || input.duration_seconds <= 0)) return '时长必须是正整数，或留空表示不限';
  if (!Number.isInteger(input.traffic_percent) || input.traffic_percent < 0 || input.traffic_percent > 100) return '流量比例必须是 0-100 的整数';
  if ((input.strategy || 'deterministic_hash') !== 'deterministic_hash') return '当前仅支持 deterministic_hash 策略';
  return '';
}

function toAdminRoutingMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
