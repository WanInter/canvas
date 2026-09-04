'use client';

import { Ban, Copy, Download, Loader2, Plus, RefreshCw, Search, Ticket, TrendingUp } from 'lucide-react';
import { type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { PageShell } from '@/components/ui/PageShell';
import { ConfirmDialog, type ConfirmDialogState, SectionHeader } from '@/components/admin/AdminSectionPrimitives';
import { FOCUS_RING } from '@/components/admin/adminUtils';
import { authHeaders, createRedeemBatch, disableRedeemBatch, disableRedeemCode, listRedeemBatches, listRedeemCodes, redeemCodesExportUrl, type CreateRedeemBatchInput, type RedeemBatch, type RedeemBatchStats, type RedeemCode, type RedeemRewardType } from '@/lib/api/redeem';

const FOCUS = FOCUS_RING;
const TYPE_OPTIONS: ReadonlyArray<{ value: RedeemRewardType; label: string; prefix: string; defaultValue: number }> = [
  { value: 'points', label: '积分', prefix: 'p_', defaultValue: 100 },
  { value: 'weekly_card', label: '周卡', prefix: 'w_', defaultValue: 7 },
  { value: 'monthly_card', label: '月卡', prefix: 'm_', defaultValue: 30 },
];
const EMPTY_STATS: RedeemBatchStats = { total_batches: 0, active_batches: 0, disabled_batches: 0, total_codes: 0, used_codes: 0, unused_codes: 0, disabled_codes: 0, points_codes: 0, weekly_card_codes: 0, monthly_card_codes: 0, used_points_codes: 0, used_weekly_card_codes: 0, used_monthly_card_codes: 0, used_points_value: 0, gross_value_cents: 0, redeemed_value_cents: 0, cost_cents: 0 };

export function AdminRedeemPageView({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<readonly RedeemBatch[]>([]);
  const [stats, setStats] = useState<RedeemBatchStats>(EMPTY_STATS);
  const [selected, setSelected] = useState<RedeemBatch | null>(null);
  const [codes, setCodes] = useState<readonly RedeemCode[]>([]);
  const [codesTotal, setCodesTotal] = useState(0);
  const [codesOffset, setCodesOffset] = useState(0);
  const [codesLoading, setCodesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exportingBatchID, setExportingBatchID] = useState('');
  const [codeQuery, setCodeQuery] = useState(() => redeemURLParam('redeem_query', ''));
  const [codeStatusFilter, setCodeStatusFilter] = useState<'all' | 'unused' | 'used' | 'disabled'>(() => redeemEnumParam('redeem_code_status', ['all', 'unused', 'used', 'disabled'] as const, 'all'));
  const [batchStatusFilter, setBatchStatusFilter] = useState<'all' | 'active' | 'disabled'>(() => redeemEnumParam('redeem_batch_status', ['all', 'active', 'disabled'] as const, 'all'));
  const [batchTypeFilter, setBatchTypeFilter] = useState<'all' | RedeemRewardType>(() => redeemEnumParam('redeem_type', ['all', 'points', 'weekly_card', 'monthly_card'] as const, 'all'));
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const [form, setForm] = useState<CreateRedeemBatchInput>({ name: '', reward_type: 'points', reward_value: 100, total_count: 10, price_cents: 0, cost_cents: 0, currency: 'cny', channel: '', valid_from: null, valid_until: null, remark: '' });
  const initialBatchIDRef = useRef(redeemURLParam('redeem_batch', ''));
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const typeInfo = useMemo(() => TYPE_OPTIONS.find((item) => item.value === form.reward_type) ?? TYPE_OPTIONS[0], [form.reward_type]);
  const visibleCodes = codes;
  const visibleBatches = useMemo(() => filterRedeemBatches(batches, batchStatusFilter, batchTypeFilter), [batchStatusFilter, batchTypeFilter, batches]);
  const selectedCodeCounts = useMemo(() => countCodeStatuses(codes), [codes]);

  const loadCodes = useCallback(async (batch: RedeemBatch, offset = 0, query = '', status: 'all' | 'unused' | 'used' | 'disabled' = 'all') => {
    setCodesLoading(true);
    try {
      const result = await listRedeemCodes(batch.id, { limit: 50, offset, query, status: status === 'all' ? '' : status });
      setCodes(result.codes);
      setCodesTotal(result.total);
      setCodesOffset(result.offset);
    } finally {
      setCodesLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const page = await listRedeemBatches({ limit: 100 });
      setBatches(page.batches);
      setStats(page.stats ?? EMPTY_STATS);
      const requestedBatchID = selected?.id || initialBatchIDRef.current;
      if (requestedBatchID) {
        const fresh = page.batches.find((item) => item.id === requestedBatchID) ?? null;
        setSelected(fresh);
        if (fresh) await loadCodes(fresh, 0, codeQuery, codeStatusFilter);
      }
      initialBatchIDRef.current = '';
      setBatchesLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [codeQuery, codeStatusFilter, loadCodes, selected]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!embedded || typeof window === 'undefined' || new URLSearchParams(window.location.search).get('tab') !== 'redeem') return;
    const url = new URL(window.location.href);
    if (batchesLoaded) setRedeemURLParam(url, 'redeem_batch', selected?.id ?? '', '');
    setRedeemURLParam(url, 'redeem_query', codeQuery, '');
    setRedeemURLParam(url, 'redeem_code_status', codeStatusFilter, 'all');
    setRedeemURLParam(url, 'redeem_batch_status', batchStatusFilter, 'all');
    setRedeemURLParam(url, 'redeem_type', batchTypeFilter, 'all');
    window.history.replaceState({ ...window.history.state, redeemBatch: selected?.id }, '', url);
  }, [batchStatusFilter, batchTypeFilter, batchesLoaded, codeQuery, codeStatusFilter, embedded, selected?.id]);

  const selectBatch = async (batch: RedeemBatch) => {
    setSelected(batch);
    setCodes([]);
    setError('');
    try { await loadCodes(batch, 0, '', 'all'); setCodeQuery(''); setCodeStatusFilter('all'); }
    catch (err) { setError(err instanceof Error ? err.message : '加载兑换码失败'); }
  };

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => { void loadCodes(selected, 0, codeQuery, codeStatusFilter); }, 250);
    return () => window.clearTimeout(timer);
  }, [codeQuery, codeStatusFilter, loadCodes, selected]);

  const submit = async () => {
    if (form.total_count < 1 || form.total_count > 100) {
      setError('生成数量必须在 1-100 之间');
      return;
    }
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const result = await createRedeemBatch({ ...form, name: form.name || `${typeInfo.label}兑换码 ${new Date().toLocaleString()}` });
      setNotice(`已生成 ${result.batch.total_count} 个兑换码，格式 ${typeInfo.prefix}xxxxxxxxxxxxxxxxxxxx`);
      setSelected(result.batch);
      setCodes(result.codes);
      setCodesTotal(result.codes.length);
      setCodesOffset(0);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const confirmDisableBatch = (batch: RedeemBatch) => {
    setConfirmDialog({
      title: '确认停用兑换码批次？',
      description: `批次“${batch.name}”停用后，未使用兑换码将不能再兑换。`,
      confirmLabel: '停用批次',
      tone: 'danger',
      onConfirm: () => void disableRedeemBatch(batch.id).then(load),
    });
  };

  const confirmDisableCode = (code: RedeemCode) => {
    if (!selected) return;
    setConfirmDialog({
      title: '确认停用单个兑换码？',
      description: `兑换码 ${code.code} 停用后将不能再兑换，不影响同批次其他兑换码。`,
      confirmLabel: '停用兑换码',
      tone: 'danger',
      onConfirm: () => void disableRedeemCode(code.id).then(() => loadCodes(selected, codesOffset, codeQuery, codeStatusFilter)),
    });
  };

  const exportCsv = async (batch: RedeemBatch) => {
    setExportingBatchID(batch.id);
    setError('');
    try {
      const res = await fetch(redeemCodesExportUrl(batch.id), { headers: authHeaders() });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `redeem_codes_${batch.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(`已开始下载批次 ${batch.name} 的 CSV`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExportingBatchID('');
    }
  };

  const copyCodes = async (items: readonly RedeemCode[], label: string) => {
    await navigator.clipboard.writeText(items.map((item) => item.code).join('\n'));
    setNotice(`已复制 ${items.length} 个${label}`);
  };

  if (user && !user.is_admin) return embedded ? <div className="admin-surface rounded-surface p-10 text-center text-sm font-bold text-secondary">需要管理员账号访问兑换码管理。</div> : <PageShell wide title="无权限" subtitle="需要管理员账号访问兑换码管理。"><div /></PageShell>;

  const content = <div className="grid min-w-0 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="admin-surface min-w-0 order-2 rounded-surface p-4 xl:order-1">
        <div className="mb-4 flex items-center gap-2 text-base font-black text-ink"><Ticket size={18}/>创建批次</div>
        <div className="space-y-3">
          <Input name="admin-redeem-batch-name" label="批次名称" value={form.name} onChange={(v)=>setForm({...form,name:v})} placeholder="例如：618 月卡兑换码…" />
          <fieldset><legend className="mb-1 block text-sm font-bold text-secondary">兑换类型</legend><div className="grid grid-cols-3 gap-2">{TYPE_OPTIONS.map((item)=><button key={item.value} type="button" aria-pressed={form.reward_type===item.value} onClick={()=>setForm({...form,reward_type:item.value,reward_value:item.defaultValue})} className={`rounded-control border px-3 py-2.5 text-sm font-black ${FOCUS} ${form.reward_type===item.value?'border-accent bg-accent text-white':'border-line bg-subtle text-secondary hover:border-line-strong hover:text-ink'}`}>{item.label}<span className="block text-xs opacity-70">{item.prefix}</span></button>)}</div></fieldset>
          <div className="grid grid-cols-2 gap-3"><NumberInput name="admin-redeem-reward-value" label={form.reward_type==='points'?'积分数量':'会员天数'} value={form.reward_value} onChange={(v)=>setForm({...form,reward_value:v})}/><NumberInput name="admin-redeem-total-count" label="生成数量（1-100）" value={form.total_count} min={1} max={100} onChange={(v)=>setForm({...form,total_count:v})}/></div>
          <div className="grid grid-cols-2 gap-3"><CurrencyInput name="admin-redeem-price" label="售价（元）" valueCents={form.price_cents} onChange={(v)=>setForm({...form,price_cents:v})}/><CurrencyInput name="admin-redeem-cost" label="成本（元）" valueCents={form.cost_cents} onChange={(v)=>setForm({...form,cost_cents:v})}/></div>
          <Input name="admin-redeem-channel" label="渠道" value={form.channel} onChange={(v)=>setForm({...form,channel:v})} placeholder="例如：douyin / taobao…" />
          <div className="grid grid-cols-2 gap-3"><DateInput name="admin-redeem-valid-from" label="开始时间" value={form.valid_from ?? ''} onChange={(v)=>setForm({...form,valid_from:v||null})}/><DateInput name="admin-redeem-valid-until" label="结束时间" value={form.valid_until ?? ''} onChange={(v)=>setForm({...form,valid_until:v||null})}/></div>
          <Input name="admin-redeem-remark" label="备注" value={form.remark} onChange={(v)=>setForm({...form,remark:v})} placeholder="例如：内部备注…" />
          <div className="rounded-control bg-subtle p-3 text-sm font-bold text-secondary">格式预览：<span className="font-mono text-ink">{typeInfo.prefix}xxxxxxxxxxxxxxxxxxxx</span></div>
          <button type="button" onClick={submit} disabled={creating} className={`inline-flex w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-3 font-black text-white hover:bg-accent-hover disabled:opacity-60 ${FOCUS}`}>{creating?<Loader2 className="animate-spin" size={16} aria-hidden="true"/>:<Plus size={16} aria-hidden="true"/>}生成兑换码</button>
        </div>
      </section>
      <section className="order-1 min-w-0 space-y-4 xl:order-2">
        <RedeemStatsPanel stats={stats} />
        <div className="admin-toolbar flex flex-wrap items-center justify-between gap-3 rounded-surface p-3">
          <div><div className="font-black text-ink">批次列表</div><div className="text-xs font-bold text-secondary">表格视图 · 显示 {visibleBatches.length}/{batches.length} 个批次</div></div>
          <div className="flex flex-wrap items-center gap-2">
            <select name="admin-redeem-batch-status" autoComplete="off" value={batchStatusFilter} onChange={(event)=>setBatchStatusFilter(event.target.value as 'all' | 'active' | 'disabled')} aria-label="按批次状态筛选" className={`rounded-control border border-line bg-surface px-3 py-2 text-xs font-black text-secondary ${FOCUS}`}>
              <option value="all">全部状态</option><option value="active">启用</option><option value="disabled">停用</option>
            </select>
            <select name="admin-redeem-batch-type" autoComplete="off" value={batchTypeFilter} onChange={(event)=>setBatchTypeFilter(event.target.value as 'all' | RedeemRewardType)} aria-label="按兑换类型筛选" className={`rounded-control border border-line bg-surface px-3 py-2 text-xs font-black text-secondary ${FOCUS}`}>
              <option value="all">全部类型</option>{TYPE_OPTIONS.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            {(batchStatusFilter !== 'all' || batchTypeFilter !== 'all') ? <button type="button" onClick={()=>{ setBatchStatusFilter('all'); setBatchTypeFilter('all'); }} className={`rounded-control border border-line bg-surface px-3 py-2 text-xs font-black text-secondary hover:bg-subtle ${FOCUS}`}>重置筛选</button> : null}
            <button type="button" onClick={()=>void load()} className={`inline-flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-sm font-bold text-secondary hover:bg-subtle hover:text-ink ${FOCUS}`}><RefreshCw size={14} className={loading?'animate-spin':''} aria-hidden="true"/>刷新</button>
          </div>
        </div>
        {error && <div className="min-w-0 break-words rounded-surface border border-danger bg-danger-soft p-3 text-sm font-bold text-danger">{error}</div>}{notice && <div className="min-w-0 break-words rounded-surface border border-success bg-success-soft p-3 text-sm font-bold text-success">{notice}</div>}
        <RedeemBatchTable batches={visibleBatches} selectedID={selected?.id} exportingBatchID={exportingBatchID} onSelect={(batch)=>void selectBatch(batch)} onExport={(batch)=>void exportCsv(batch)} onDisable={confirmDisableBatch} />
        {selected && (
          <div className="admin-surface min-w-0 rounded-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-black">兑换码：{selected.name}</div>
                <div className="mt-1 text-xs font-bold text-secondary">使用进度 {selected.used_count}/{selected.total_count} · 当前筛选 {codesTotal} 条 · {batchValidityLabel(selected)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SmallButton onClick={(event)=>{ event.stopPropagation(); void copyCodes(codes, '兑换码'); }}><Copy size={13}/>复制全部</SmallButton>
                <SmallButton onClick={(event)=>{ event.stopPropagation(); void copyCodes(codes.filter((item)=>item.status==='unused'), '未用兑换码'); }}><Copy size={13}/>复制未用</SmallButton>
                <SmallButton onClick={(event)=>{ event.stopPropagation(); void exportCsv(selected); }}><Download size={13}/>下载 CSV</SmallButton>
              </div>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-accent" style={{ width: `${selected.total_count > 0 ? Math.round((selected.used_count / selected.total_count) * 100) : 0}%` }} /></div>
            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              <MiniStat label="未用" value={selectedCodeCounts.unused} />
              <MiniStat label="已用" value={selectedCodeCounts.used} />
              <MiniStat label="停用" value={selectedCodeCounts.disabled} />
            </div>
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <label className="admin-config-search relative block md:min-w-[320px]">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input value={codeQuery} onChange={(event)=>setCodeQuery(event.target.value)} placeholder="搜索兑换码 / 使用人…" aria-label="搜索兑换码或使用人" name="admin-redeem-code-search" autoComplete="off" spellCheck={false} className={`w-full bg-transparent py-2 pl-9 pr-3 text-sm font-semibold text-ink outline-none placeholder:text-muted ${FOCUS}`}/>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['all','unused','used','disabled'] as const).map((status)=><button key={status} type="button" onClick={()=>setCodeStatusFilter(status)} className={`rounded-full border px-2.5 py-1 text-xs font-black ${FOCUS} ${codeStatusFilter===status?'border-accent bg-accent-soft text-accent':'border-line bg-surface text-secondary hover:bg-subtle'}`}>{codeStatusLabel(status)}</button>)}
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto rounded-surface border border-line">
              <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-subtle"><tr><Th>兑换码</Th><Th>状态</Th><Th>使用人</Th><Th>操作</Th></tr></thead><tbody>{visibleCodes.map((c)=><tr key={c.id} className="border-t border-line"><Td><span className="font-mono font-bold">{c.code}</span></Td><Td><CodeStatusBadge status={c.status}/></Td><Td>{c.used_by||'-'}</Td><Td>{c.status==='unused'?<button type="button" onClick={()=>confirmDisableCode(c)} className="font-bold text-danger">停用</button>:'-'}</Td></tr>)}</tbody></table>
              {codesLoading?<div className="p-3 text-center text-sm font-bold text-secondary"><Loader2 size={14} className="mr-1 inline animate-spin"/>加载中…</div>:null}
              {!codesLoading && visibleCodes.length===0?<div className="p-6 text-center text-sm font-bold text-muted">没有匹配的兑换码</div>:null}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-bold text-secondary">
              <span>显示 {codesTotal > 0 ? codesOffset + 1 : 0}-{Math.min(codesOffset + 50, codesTotal)} / {codesTotal}</span>
              <div className="flex gap-2">
                <SmallButton disabled={codesOffset <= 0} onClick={(event)=>{ event.stopPropagation(); if (selected) void loadCodes(selected, Math.max(0, codesOffset - 50), codeQuery, codeStatusFilter); }}>上一页</SmallButton>
                <SmallButton disabled={codesOffset + 50 >= codesTotal} onClick={(event)=>{ event.stopPropagation(); if (selected) void loadCodes(selected, codesOffset + 50, codeQuery, codeStatusFilter); }}>下一页</SmallButton>
              </div>
            </div>
          </div>
        )}
      </section>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </div>;

  if (embedded) {
    return (
      <section className="admin-config-section">
        <div className="mb-4"><SectionHeader icon={<Ticket size={16} />} eyebrow="兑换权益" title="兑换码管理" subtitle="批量生成 p_/w_/m_ 前缀兑换码，随机主体固定 20 位小写字母数字。" /></div>
        {content}
      </section>
    );
  }

  return <PageShell wide title="兑换码管理" subtitle="批量生成 p_/w_/m_ 前缀兑换码，随机主体固定 20 位小写字母数字。">{content}</PageShell>;
}

function RedeemStatsPanel({ stats }: Readonly<{ stats: RedeemBatchStats }>) {
  const usedRate = stats.total_codes > 0 ? Math.round((stats.used_codes / stats.total_codes) * 100) : 0;
  return (
    <section className="border-y border-line py-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-ink"><TrendingUp size={16}/>兑换码统计</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="批次数" value={formatNumber(stats.total_batches)} hint={`启用 ${stats.active_batches} · 停用 ${stats.disabled_batches}`} />
        <StatCard label="兑换码总数" value={formatNumber(stats.total_codes)} hint={`未用 ${stats.unused_codes} · 停用 ${stats.disabled_codes}`} />
        <StatCard label="已兑换" value={`${formatNumber(stats.used_codes)} 个`} hint={`使用率 ${usedRate}% · 金额 ${formatMoney(stats.redeemed_value_cents)}`} />
        <StatCard label="已兑换权益" value={`${formatNumber(stats.used_points_value)} 积分`} hint={`积分码 ${stats.used_points_codes} · 周卡 ${stats.used_weekly_card_codes} · 月卡 ${stats.used_monthly_card_codes}`} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniStat label="积分码" value={`${stats.used_points_codes}/${stats.points_codes} · ${formatNumber(stats.used_points_value)} 积分`}/><MiniStat label="周卡" value={`${stats.used_weekly_card_codes}/${stats.weekly_card_codes}`}/><MiniStat label="月卡" value={`${stats.used_monthly_card_codes}/${stats.monthly_card_codes}`}/>
      </div>
      <div className="mt-2 text-xs font-bold text-muted">金额统计：面值 {formatMoney(stats.gross_value_cents)} · 已兑换 {formatMoney(stats.redeemed_value_cents)} · 成本 {formatMoney(stats.cost_cents)}</div>
    </section>
  );
}

function RedeemBatchTable({ batches, selectedID, exportingBatchID, onSelect, onExport, onDisable }: Readonly<{ batches: readonly RedeemBatch[]; selectedID?: string; exportingBatchID?: string; onSelect: (batch: RedeemBatch) => void; onExport: (batch: RedeemBatch) => void; onDisable: (batch: RedeemBatch) => void }>) {
  if (batches.length === 0) return <div className="admin-surface rounded-surface border-dashed p-10 text-center text-sm font-bold text-secondary">暂无兑换码批次</div>;
  return (
    <div className="admin-surface overflow-hidden rounded-surface shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-subtle text-xs text-secondary"><tr><Th>批次</Th><Th>类型</Th><Th>使用进度</Th><Th>金额</Th><Th>渠道</Th><Th>状态</Th><Th>创建时间</Th><Th>操作</Th></tr></thead>
          <tbody>{batches.map((batch)=><RedeemBatchRow key={batch.id} batch={batch} active={selectedID===batch.id} exporting={exportingBatchID===batch.id} onSelect={()=>onSelect(batch)} onExport={()=>onExport(batch)} onDisable={()=>onDisable(batch)} />)}</tbody>
        </table>
      </div>
    </div>
  );
}

function RedeemBatchRow({ batch, active, exporting, onSelect, onExport, onDisable }: Readonly<{ batch: RedeemBatch; active: boolean; exporting?: boolean; onSelect: () => void; onExport: () => void; onDisable: () => void }>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect();
  };
  const usedRate = batch.total_count > 0 ? Math.round((batch.used_count / batch.total_count) * 100) : 0;
  return (
    <tr tabIndex={0} onClick={onSelect} onKeyDown={handleKeyDown} className={`cursor-pointer border-t border-line transition hover:bg-subtle ${FOCUS} ${active ? 'bg-accent-soft' : 'bg-surface'}`} aria-selected={active}>
      <Td><div className="font-black text-ink">{batch.name}</div><div className="max-w-[240px] truncate font-mono text-xs text-muted">{batch.id}</div></Td>
      <Td><Badge>{labelType(batch.reward_type)}</Badge><div className="mt-1 text-xs font-bold text-secondary">{batch.reward_value}{batch.reward_type==='points'?' 积分':' 天'}</div></Td>
      <Td><div className="font-black text-ink">{batch.used_count}/{batch.total_count}</div><div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-accent" style={{ width: `${usedRate}%` }} /></div><div className="mt-1 text-xs font-bold text-muted">{usedRate}% · {batchValidityLabel(batch)}</div></Td>
      <Td><div className="font-black text-ink">{formatMoney(batch.price_cents)}</div><div className="text-xs font-bold text-muted">成本 {formatMoney(batch.cost_cents)}</div></Td>
      <Td>{batch.channel || '-'}</Td>
      <Td><BatchStatusBadge status={batch.status}/></Td>
      <Td>{formatDate(batch.created_at)}</Td>
      <Td><div className="flex gap-2"><SmallButton disabled={exporting} onClick={(event)=>{ event.stopPropagation(); onExport(); }}>{exporting?<Loader2 size={13} className="animate-spin"/>:<Download size={13}/>}导出</SmallButton>{batch.status==='active'?<SmallButton onClick={(event)=>{ event.stopPropagation(); onDisable(); }}><Ban size={13}/>停用</SmallButton>:null}</div></Td>
    </tr>
  );
}

function countCodeStatuses(codes: readonly RedeemCode[]): { unused: number; used: number; disabled: number } {
  return codes.reduce((acc, code) => {
    if (code.status === 'used') acc.used += 1;
    else if (code.status === 'disabled') acc.disabled += 1;
    else acc.unused += 1;
    return acc;
  }, { unused: 0, used: 0, disabled: 0 });
}

function filterRedeemBatches(batches: readonly RedeemBatch[], status: 'all' | 'active' | 'disabled', type: 'all' | RedeemRewardType): readonly RedeemBatch[] {
  return batches.filter((batch) => (status === 'all' || batch.status === status) && (type === 'all' || batch.reward_type === type));
}

function codeStatusLabel(status: string){return status==='all'?'全部':status==='unused'?'未用':status==='used'?'已用':'停用'}

function labelType(t: string){return t==='points'?'积分':t==='weekly_card'?'周卡':'月卡'}
function formatNumber(value: number){return new Intl.NumberFormat('zh-CN').format(value || 0)}
function formatMoney(cents: number){return `¥${((cents || 0)/100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
function formatDate(value: string){return value ? new Date(value).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }) : '-'}
function batchValidityLabel(batch: Pick<RedeemBatch, 'valid_from' | 'valid_until' | 'status'>){ if (batch.status !== 'active') return '已停用'; const now = Date.now(); const start = batch.valid_from ? new Date(batch.valid_from).getTime() : 0; const end = batch.valid_until ? new Date(batch.valid_until).getTime() : Number.POSITIVE_INFINITY; if (Number.isFinite(start) && now < start) return '未开始'; if (Number.isFinite(end) && now > end) return '已过期'; return '生效中'; }
function Badge(p:{children:ReactNode}){return <span className="rounded-full border border-accent bg-accent-soft px-2 py-1 text-xs font-black text-accent">{p.children}</span>}
function BatchStatusBadge({ status }: Readonly<{ status: string }>) { return <span className={`rounded-full border px-2 py-1 text-xs font-black ${status==='active'?'border-success bg-success-soft text-success':'border-line bg-subtle text-muted'}`}>{status==='active'?'启用':'停用'}</span>; }
function CodeStatusBadge({ status }: Readonly<{ status: string }>) { const cls = status==='used'?'border-accent bg-accent-soft text-accent':status==='unused'?'border-success bg-success-soft text-success':'border-line bg-subtle text-muted'; return <span className={`rounded-full border px-2 py-1 text-xs font-black ${cls}`}>{status==='used'?'已用':status==='unused'?'未用':'停用'}</span>; }
function SmallButton(p:{children:ReactNode;onClick:(e:MouseEvent<HTMLButtonElement>)=>void;disabled?:boolean}){return <button type="button" disabled={p.disabled} onClick={p.onClick} className={`inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2 py-1 text-xs font-bold text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}>{p.children}</button>}
function StatCard(p:{label:string;value:string;hint:string}){return <div className="rounded-surface border border-line bg-surface p-3"><div className="text-xs font-black text-muted">{p.label}</div><div className="mt-1 text-2xl font-black text-ink">{p.value}</div><div className="mt-1 text-xs font-bold text-secondary">{p.hint}</div></div>}
function MiniStat(p:{label:string;value:number|string}){return <div className="flex items-center justify-between rounded-control bg-subtle px-3 py-2 text-sm"><span className="font-bold text-secondary">{p.label}</span><span className="font-black text-ink">{typeof p.value === 'number' ? formatNumber(p.value) : p.value}</span></div>}
function redeemURLParam(key: string, fallback: string): string { return typeof window === 'undefined' ? fallback : new URLSearchParams(window.location.search).get(key) ?? fallback; }
function redeemEnumParam<T extends string>(key: string, values: readonly T[], fallback: T): T { const value = redeemURLParam(key, fallback); return values.includes(value as T) ? value as T : fallback; }
function setRedeemURLParam(url: URL, key: string, value: string, fallback: string): void { if (!value || value === fallback) url.searchParams.delete(key); else url.searchParams.set(key, value); }
function Input(p:{name:string;label:string;value:string;placeholder?:string;onChange:(v:string)=>void}){return <label className="block"><span className="text-sm font-bold text-secondary">{p.label}</span><input name={p.name} autoComplete="off" value={p.value} placeholder={p.placeholder} onChange={(e)=>p.onChange(e.target.value)} className={`mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 font-semibold text-ink placeholder:text-muted ${FOCUS}`}/></label>}
function NumberInput(p:{name:string;label:string;value:number;min?:number;max?:number;onChange:(v:number)=>void}){return <label className="block"><span className="text-sm font-bold text-secondary">{p.label}</span><input name={p.name} type="number" inputMode="numeric" min={p.min} max={p.max} value={p.value} onChange={(e)=>p.onChange(Number(e.target.value))} className={`mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 font-semibold text-ink ${FOCUS}`}/></label>}
function CurrencyInput(p:{name:string;label:string;valueCents:number;onChange:(v:number)=>void}){return <label className="block"><span className="text-sm font-bold text-secondary">{p.label}</span><input name={p.name} type="number" min="0" step="0.01" inputMode="decimal" value={(p.valueCents/100).toFixed(2)} onChange={(e)=>p.onChange(Math.round(Number(e.target.value || 0)*100))} className={`mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 font-semibold text-ink ${FOCUS}`}/></label>}
function DateInput(p:{name:string;label:string;value:string;onChange:(v:string)=>void}){return <label className="block"><span className="text-sm font-bold text-secondary">{p.label}</span><input name={p.name} type="datetime-local" value={p.value} onChange={(e)=>p.onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} className={`mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 font-semibold text-ink ${FOCUS}`}/></label>}
function Th(p:{children:ReactNode}){return <th className="px-3 py-2 font-black">{p.children}</th>}
function Td(p:{children:ReactNode}){return <td className="px-3 py-2 font-semibold text-secondary">{p.children}</td>}
