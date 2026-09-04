'use client';

import { AlertTriangle, CheckCircle2, Clock3, Copy, Cpu, Loader2, Power, Save, Server, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AdminWorker, AdminWorkerList } from '@/lib/api/admin';
import { FOCUS_RING, type AdminLabels } from './adminUtils';
import { AdminKeyValueGrid, AdminMobileCard, EmptyList, FilterPill, InlineBadge, MetricCard, SectionHeader } from './AdminSectionPrimitives';

type WorkerStatus = 'online' | 'busy' | 'offline' | 'disabled' | string;
type WorkerViewFilter = 'all' | 'online' | 'busy' | 'offline' | 'disabled' | 'risk';

export function WorkersSection({ labels, workers, stats, loading, savingWorkerID, onToggleEnabled, onUpdateConcurrency }: Readonly<{ labels: AdminLabels; workers: readonly AdminWorker[]; stats: AdminWorkerList['stats']; loading: boolean; savingWorkerID?: string; onToggleEnabled: (worker: AdminWorker, enabled: boolean) => void; onUpdateConcurrency: (worker: AdminWorker, concurrency: number) => void }>) {
  const hydrated = useHydrated();
  const heartbeatRiskCount = useHeartbeatRiskCount(workers);
  const [viewFilter, setViewFilter] = useState<WorkerViewFilter>(() => initialWorkerFilter());
  const [notice, setNotice] = useState('');
  const filteredWorkers = useMemo(() => workers.filter((worker) => matchesWorkerFilter(worker, viewFilter, hydrated)), [hydrated, viewFilter, workers]);
  const sortedWorkers = useMemo(() => [...filteredWorkers].sort((a, b) => workerPriority(a, hydrated) - workerPriority(b, hydrated) || a.id.localeCompare(b.id)), [filteredWorkers, hydrated]);
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('tab') !== 'workers') return;
    const url = new URL(window.location.href);
    if (viewFilter === 'all') url.searchParams.delete('worker_status'); else url.searchParams.set('worker_status', viewFilter);
    window.history.replaceState({ ...window.history.state, workerStatus: viewFilter }, '', url);
  }, [viewFilter]);
  return (
    <section className="admin-config-section">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeader icon={<Server size={16} />} eyebrow="Worker Fleet" title="Worker 管理" subtitle="查看远程 Worker 心跳、能力、并发和任务执行情况，用于排查排队与执行异常。" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[640px]">
          <MetricCard label="在线" value={`${stats.online}/${stats.total}`} tone="emerald" />
          <MetricCard label="忙碌" value={String(stats.busy)} tone="indigo" />
          <MetricCard label="总并发" value={String(stats.capacity)} />
          <MetricCard label="执行中" value={String(stats.active_tasks)} tone="amber" />
        </div>
      </div>

      <WorkerHealthNotice stats={stats} heartbeatRiskCount={heartbeatRiskCount} />

      <div className="admin-toolbar mt-4 flex flex-wrap gap-2 rounded-surface p-3">
        <FilterPill active={viewFilter === 'all'} onClick={() => setViewFilter('all')} count={workers.length}>全部</FilterPill>
        <FilterPill active={viewFilter === 'online'} onClick={() => setViewFilter('online')} count={workers.filter((worker) => worker.status === 'online').length}>在线</FilterPill>
        <FilterPill active={viewFilter === 'busy'} onClick={() => setViewFilter('busy')} count={workers.filter((worker) => worker.status === 'busy').length}>忙碌</FilterPill>
        <FilterPill active={viewFilter === 'offline'} onClick={() => setViewFilter('offline')} count={workers.filter((worker) => worker.status === 'offline').length}>离线</FilterPill>
        <FilterPill active={viewFilter === 'disabled'} onClick={() => setViewFilter('disabled')} count={workers.filter((worker) => worker.status === 'disabled' || !worker.enabled).length}>禁用</FilterPill>
        <FilterPill active={viewFilter === 'risk'} onClick={() => setViewFilter('risk')} count={heartbeatRiskCount}>心跳风险</FilterPill>
        {viewFilter !== 'all' ? <button type="button" onClick={() => setViewFilter('all')} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>重置筛选</button> : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-surface border border-line bg-surface">
        {loading ? <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm font-bold text-secondary"><Loader2 size={16} className="animate-spin" />{labels.loadingTitle}</div> : null}
        {!loading && workers.length === 0 ? <EmptyList title="暂无 Worker。还没有 Worker 注册或发送心跳，启动 remote-worker 后会出现在这里。" /> : null}
        {!loading && workers.length > 0 && sortedWorkers.length === 0 ? <EmptyList title="没有符合当前筛选的 Worker" /> : null}
        {!loading && sortedWorkers.length > 0 ? (
          <>
          <div className="admin-mobile-only space-y-2 p-2">
            {sortedWorkers.map((worker) => {
              const loadPercent = worker.concurrency > 0 ? Math.min(100, Math.round((worker.active_task_count / worker.concurrency) * 100)) : 0;
              const heartbeatRisk = hydrated && isHeartbeatRisk(worker);
              return (
                <AdminMobileCard
                  key={worker.id}
                  title={<span className="admin-mono break-all">{worker.id}</span>}
                  subtitle={worker.hostname || '未报告主机名'}
                  badge={<InlineBadge tone={heartbeatRisk ? 'amber' : workerStatusTone(worker.status)}>{heartbeatRisk ? '心跳风险' : workerStatusLabel(worker.status)}</InlineBadge>}
                  action={<div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-secondary">允许领取新任务</span><WorkerEnabledSwitch enabled={worker.enabled} saving={savingWorkerID === worker.id} onChange={(enabled) => onToggleEnabled(worker, enabled)} /></div>}
                >
                  <AdminKeyValueGrid items={[
                    { label: '并发上限', value: <WorkerConcurrencyControl worker={worker} saving={savingWorkerID === worker.id} onSave={onUpdateConcurrency} /> },
                    { label: '当前负载', value: `${worker.active_task_count}/${worker.concurrency} (${loadPercent}%)` },
                    { label: '等待任务', value: worker.queued_task_count },
                    { label: '最后心跳', value: <DateWithAgo value={worker.last_heartbeat_at} /> },
                    { label: '能力', value: worker.capabilities.length > 0 ? worker.capabilities.join('、') : '未声明' },
                  ]} />
                  {worker.last_error_message ? <div className="mt-3"><WorkerErrorDetails message={worker.last_error_message} onCopied={setNotice} /></div> : null}
                </AdminMobileCard>
              );
            })}
          </div>
          <div className="admin-desktop-only overflow-x-auto">
            <table className="min-w-[1280px] w-full table-fixed text-left text-xs">
              <thead className="bg-subtle text-xs font-black text-secondary">
                <tr>
                  <th className="w-[84px] px-3 py-2.5">启用</th>
                  <th className="w-[250px] px-3 py-2.5">Worker</th>
                  <th className="w-[90px] px-3 py-2.5">状态</th>
                  <th className="w-[120px] px-3 py-2.5">能力</th>
                  <th className="w-[160px] px-3 py-2.5">并发/负载</th>
                  <th className="w-[180px] px-3 py-2.5">任务统计</th>
                  <th className="w-[130px] px-3 py-2.5">最后心跳</th>
                  <th className="w-[130px] px-3 py-2.5">最近任务</th>
                  <th className="px-3 py-2.5">最近错误</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sortedWorkers.map((worker) => <WorkerRow key={worker.id} worker={worker} saving={savingWorkerID === worker.id} onCopied={setNotice} onToggleEnabled={onToggleEnabled} onUpdateConcurrency={onUpdateConcurrency} />)}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
      </div>
      {notice ? <div className="sr-only" aria-live="polite">{notice}</div> : null}
    </section>
  );
}

function initialWorkerFilter(): WorkerViewFilter {
  if (typeof window === 'undefined') return 'all';
  const value = new URLSearchParams(window.location.search).get('worker_status');
  return ['all', 'online', 'busy', 'offline', 'disabled', 'risk'].includes(value ?? '') ? value as WorkerViewFilter : 'all';
}


function matchesWorkerFilter(worker: AdminWorker, filter: WorkerViewFilter, hydrated: boolean): boolean {
  if (filter === 'all') return true;
  if (filter === 'risk') return hydrated && isHeartbeatRisk(worker);
  if (filter === 'disabled') return worker.status === 'disabled' || !worker.enabled;
  return worker.status === filter;
}

function workerPriority(worker: AdminWorker, includeHeartbeatRisk: boolean): number {
  if (includeHeartbeatRisk && isHeartbeatRisk(worker)) return 0;
  if (worker.status === 'offline') return 1;
  if (worker.status === 'disabled' || !worker.enabled) return 2;
  if (worker.status === 'busy') return 3;
  return 4;
}

function WorkerRow({ worker, saving, onCopied, onToggleEnabled, onUpdateConcurrency }: Readonly<{ worker: AdminWorker; saving: boolean; onCopied: (message: string) => void; onToggleEnabled: (worker: AdminWorker, enabled: boolean) => void; onUpdateConcurrency: (worker: AdminWorker, concurrency: number) => void }>) {
  const loadPercent = worker.concurrency > 0 ? Math.min(100, Math.round((worker.active_task_count / worker.concurrency) * 100)) : 0;
  const heartbeatRisk = useHeartbeatRisk(worker);
  return (
    <tr className={`align-top transition-colors hover:bg-subtle ${heartbeatRisk || worker.status === 'offline' ? 'bg-warning-soft' : worker.status === 'disabled' ? 'bg-subtle' : ''}`}>
      <td className="px-3 py-2">
        <WorkerEnabledSwitch enabled={worker.enabled} saving={saving} onChange={(enabled) => onToggleEnabled(worker, enabled)} />
      </td>
      <td className="px-3 py-2">
        <div className="admin-mono max-w-[240px] truncate text-xs font-black text-ink" title={worker.id}>{worker.id}</div>
        <div className="mt-1 max-w-[240px] truncate text-xs font-bold text-secondary" title={worker.hostname || '—'}>{worker.hostname || '—'}</div>
        {worker.version ? <div className="admin-mono mt-1 text-xs font-bold text-muted">{worker.version}</div> : null}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col items-start gap-1">
          <InlineBadge tone={workerStatusTone(worker.status)}>{workerStatusLabel(worker.status)}</InlineBadge>
          {heartbeatRisk ? <InlineBadge tone="amber">心跳风险</InlineBadge> : null}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex max-w-[300px] flex-wrap gap-1.5">
          {worker.capabilities.length > 0 ? worker.capabilities.slice(0, 3).map((capability) => <span key={capability} className="rounded-control border border-line bg-subtle px-2 py-1 text-xs font-black text-secondary">{capability}</span>) : <span className="text-xs font-semibold text-muted">未声明</span>}
          {worker.capabilities.length > 3 ? <span className="rounded-control border border-line bg-surface px-2 py-1 text-xs font-black text-secondary" title={worker.capabilities.join('、')}>+{worker.capabilities.length - 3}</span> : null}
        </div>
      </td>
      <td className="px-3 py-2">
        <WorkerConcurrencyControl worker={worker} saving={saving} onSave={onUpdateConcurrency} />
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-subtle" title={`负载 ${loadPercent}%`}>
          <div className={`h-full rounded-full ${loadPercent >= 90 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.max(loadPercent, worker.active_task_count > 0 ? 8 : 0)}%` }} />
        </div>
        <div className="mt-1 text-xs font-semibold text-secondary">Queued {worker.queued_task_count}</div>
      </td>
      <td className="px-3 py-2">
        <TaskStatsBar total={worker.total_task_count} succeeded={worker.succeeded_task_count} failed={worker.failed_task_count} />
      </td>
      <td className="px-3 py-2">
        <DateWithAgo value={worker.last_heartbeat_at} />
        <div className={`mt-1 text-xs font-semibold ${heartbeatRisk ? 'text-warning' : 'text-muted'}`}>interval {Math.round(worker.heartbeat_interval_ms / 1000)}s{heartbeatRisk ? ' · 超阈值' : ''}</div>
      </td>
      <td className="px-3 py-2"><DateWithAgo value={worker.last_task_at} empty="暂无任务" /></td>
      <td className="px-3 py-2">
        {worker.last_error_message ? <WorkerErrorDetails message={worker.last_error_message} onCopied={onCopied} /> : <span className="text-xs font-semibold text-muted">—</span>}
      </td>
    </tr>
  );
}


function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

function useHeartbeatRisk(worker: AdminWorker): boolean {
  const hydrated = useHydrated();
  return hydrated ? isHeartbeatRisk(worker) : false;
}

function useHeartbeatRiskCount(workers: readonly AdminWorker[]): number {
  const hydrated = useHydrated();
  return hydrated ? workers.filter(isHeartbeatRisk).length : 0;
}

function isHeartbeatRisk(worker: AdminWorker): boolean {
  if (!worker.enabled || worker.status === 'offline' || worker.status === 'disabled') return false;
  const heartbeatAt = new Date(worker.last_heartbeat_at).getTime();
  if (!Number.isFinite(heartbeatAt)) return false;
  const interval = Math.max(worker.heartbeat_interval_ms || 0, 30_000);
  return Date.now() - heartbeatAt > interval * 3;
}

function WorkerHealthNotice({ stats, heartbeatRiskCount }: Readonly<{ stats: AdminWorkerList['stats']; heartbeatRiskCount: number }>) {
  if (heartbeatRiskCount > 0) {
    return (
      <div className="mt-3 rounded-surface border border-warning bg-warning-soft px-3 py-2 text-xs font-bold leading-5 text-warning" role="status">
        <AlertTriangle size={16} className="mr-2 inline" aria-hidden="true" />当前有 {heartbeatRiskCount} 个 Worker 心跳超过预期阈值，可能即将离线或网络抖动，请优先检查进程与代理。
      </div>
    );
  }
  if (stats.offline > 0) {
    return (
      <div className="mt-3 rounded-surface border border-warning bg-warning-soft px-3 py-2 text-xs font-bold leading-5 text-warning" role="status">
        <AlertTriangle size={16} className="mr-2 inline" aria-hidden="true" />当前有 {stats.offline} 个 Worker 离线，请检查进程、网络、REMOTE_WORKER_TOKEN 和代理配置。
      </div>
    );
  }
  if (stats.total > 0 && stats.online + stats.busy === stats.total) {
    return (
      <div className="mt-3 rounded-surface border border-success bg-success-soft px-3 py-2 text-xs font-bold leading-5 text-success" role="status">
        <CheckCircle2 size={16} className="mr-2 inline" aria-hidden="true" />Worker Fleet 正常，当前可用并发 {stats.capacity}，执行中 {stats.active_tasks}。
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-surface border border-line bg-subtle px-3 py-2 text-xs font-bold leading-5 text-secondary" role="status">
      <Zap size={16} className="mr-2 inline" aria-hidden="true" />等待 Worker 心跳数据，启动 remote-worker 后会自动刷新状态。
    </div>
  );
}

function TaskStatsBar({ total, succeeded, failed }: Readonly<{ total: number; succeeded: number; failed: number }>) {
  const safeTotal = Math.max(total, 0);
  const successWidth = safeTotal > 0 ? Math.max(4, Math.round((succeeded / safeTotal) * 100)) : 0;
  const failedWidth = safeTotal > 0 ? Math.max(failed > 0 ? 4 : 0, Math.round((failed / safeTotal) * 100)) : 0;
  const tooltip = `总任务 ${safeTotal}，成功 ${succeeded}，失败 ${failed}`;
  return (
    <div className="w-[150px]" title={tooltip} aria-label={tooltip}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-black leading-4 text-ink"><span>Total {safeTotal}</span><span className="text-xs font-bold text-muted">{succeeded}/{failed}</span></div>
      <div className="flex h-2 overflow-hidden rounded-full bg-subtle">
        {succeeded > 0 ? <div className="bg-success" style={{ width: `${successWidth}%` }} /> : null}
        {failed > 0 ? <div className="bg-warning" style={{ width: `${failedWidth}%` }} /> : null}
      </div>
    </div>
  );
}

function WorkerEnabledSwitch({ enabled, saving, onChange }: Readonly<{ enabled: boolean; saving: boolean; onChange: (enabled: boolean) => void }>) {
  return (
    <button
      type="button"
      disabled={saving}
      onClick={() => onChange(!enabled)}
      className={`inline-flex h-7 w-14 items-center rounded-full border px-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? 'border-success bg-success-soft' : 'border-line bg-subtle'}`}
      title={enabled ? '点击禁用该 Worker，禁用后不再领取新任务' : '点击启用该 Worker'}
      aria-label={enabled ? '禁用 Worker' : '启用 Worker'}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-surface transition ${enabled ? 'translate-x-7 text-success' : 'translate-x-0 text-muted'}`}>{saving ? <Loader2 size={11} className="animate-spin" /> : <Power size={11} />}</span>
    </button>
  );
}

function WorkerConcurrencyControl({ worker, saving, onSave }: Readonly<{ worker: AdminWorker; saving: boolean; onSave: (worker: AdminWorker, concurrency: number) => void }>) {
  const [draft, setDraft] = useState(String(worker.concurrency));
  useEffect(() => setDraft(String(worker.concurrency)), [worker.concurrency]);
  const parsed = Number(draft);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000;
  const changed = valid && parsed !== worker.concurrency;
  const save = () => {
    if (changed && !saving) onSave(worker, parsed);
  };
  return (
    <div className="inline-flex items-center gap-1.5">
      <Cpu size={13} className="shrink-0 text-secondary" aria-hidden="true" />
      <span className="font-black text-ink">{worker.active_task_count}/</span>
      <input
        type="number"
        min={1}
        max={1000}
        step={1}
        inputMode="numeric"
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save();
          if (event.key === 'Escape') setDraft(String(worker.concurrency));
        }}
        aria-label={`${worker.id} 并发上限`}
        aria-invalid={!valid}
        className={`h-7 w-14 rounded-control border bg-surface px-1.5 text-center text-xs font-black tabular-nums text-ink disabled:cursor-not-allowed disabled:opacity-60 ${valid ? 'border-line' : 'border-danger'} ${FOCUS_RING}`}
      />
      <button
        type="button"
        disabled={!changed || saving}
        onClick={save}
        title="保存并发上限"
        aria-label={`保存 ${worker.id} 并发上限`}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-secondary transition hover:border-line-strong hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
      </button>
    </div>
  );
}

function WorkerErrorDetails({ message, onCopied }: Readonly<{ message: string; onCopied: (message: string) => void }>) {
  const [expanded, setExpanded] = useState(false);
  const actions = (
    <div className="flex shrink-0 gap-1.5">
      <button type="button" onClick={() => setExpanded((value) => !value)} className={`rounded-control border border-warning bg-surface px-1.5 py-0.5 text-xs font-black text-warning hover:brightness-95 ${FOCUS_RING}`}>{expanded ? '收起' : '展开'}</button>
      <button type="button" onClick={() => void navigator.clipboard.writeText(message).then(() => onCopied('已复制 Worker 错误信息'))} className={`inline-flex items-center gap-1 rounded-control border border-warning bg-surface px-1.5 py-0.5 text-xs font-black text-warning hover:brightness-95 ${FOCUS_RING}`}><Copy size={10} />复制</button>
    </div>
  );
  return (
    <div className="w-full rounded-control border border-warning bg-warning-soft px-2.5 py-1.5 text-xs font-bold leading-4 text-warning" title={message}>
      {expanded ? <div className="whitespace-pre-wrap break-all">{message}</div> : null}
      <div className={expanded ? 'mt-1.5 flex justify-end' : 'flex min-w-0 items-center gap-2'}>
        {!expanded ? <div className="min-w-0 flex-1 truncate whitespace-nowrap">{message}</div> : null}
        {actions}
      </div>
    </div>
  );
}

function DateWithAgo({ value, empty = '—' }: Readonly<{ value?: string; empty?: string }>) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!value) return <span className="text-xs font-semibold text-muted">{empty}</span>;
  return <div><div className="font-bold leading-4 text-ink">{formatCompactDate(value)}</div><div className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold leading-3 text-secondary"><Clock3 size={11} />{hydrated ? formatAgo(value) : '—'}</div></div>;
}

function workerStatusLabel(status: WorkerStatus): string {
  if (status === 'busy') return '忙碌';
  if (status === 'online') return '在线';
  if (status === 'offline') return '离线';
  if (status === 'disabled') return '已禁用';
  return status || '未知';
}

function workerStatusTone(status: WorkerStatus): 'slate' | 'indigo' | 'amber' | 'emerald' {
  if (status === 'busy') return 'indigo';
  if (status === 'online') return 'emerald';
  if (status === 'offline') return 'amber';
  if (status === 'disabled') return 'slate';
  return 'slate';
}

function formatCompactDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }).format(date);
}

function formatAgo(value: string): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s 前`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m 前`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h 前`;
  return `${Math.round(hours / 24)}d 前`;
}
