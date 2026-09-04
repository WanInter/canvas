'use client';

import { Banknote, Coins, Copy, Eye, Loader2, MessageSquareText, Search, ShoppingCart, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayFocus } from '@/components/ui/overlayFocus';
import { manualCompleteAdminOrder, syncAdminOrderStatus, type AdminOrder, type AdminOrderList, type AdminOrderStatusFilter } from '@/lib/api/admin';
import { FOCUS_RING, type AdminLabels } from './adminUtils';
import { AdminKeyValueGrid, AdminMobileCard, ConfirmDialog, type ConfirmDialogState, EmptyList, FilterPill, InlineBadge, MetricCard, SectionHeader } from './AdminSectionPrimitives';

const STATUS_FILTERS: readonly AdminOrderStatusFilter[] = ['all', 'pending', 'paid', 'expired', 'failed', 'canceled'];
const PROVIDER_FILTERS = ['all', 'alipay', 'wechat', 'waffo', 'stripe', 'paypal'] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type OrderSortKey = 'created_at' | 'paid_at' | 'amount' | 'credits' | 'status' | 'provider';
type OrderSortState = Readonly<{ key: OrderSortKey; direction: 'asc' | 'desc' }>;

export function OrdersSection({
  orders,
  stats,
  summary,
  total,
  limit,
  offset,
  query,
  statusFilter,
  providerFilter,
  loading,
  error,
  onQueryChange,
  onStatusChange,
  onProviderChange,
  onPage,
  onPageSizeChange,
}: Readonly<{
  labels: AdminLabels;
  orders: readonly AdminOrder[];
  stats: AdminOrderList['stats'];
  summary?: AdminOrderList['stats'];
  total: number;
  limit: number;
  offset: number;
  query: string;
  statusFilter: AdminOrderStatusFilter;
  providerFilter: string;
  loading: boolean;
  error?: string;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: AdminOrderStatusFilter) => void;
  onProviderChange: (provider: string) => void;
  onPage: (offset: number) => void;
  onPageSizeChange: (limit: number) => void;
}>) {
  const activeSummary = summary ?? stats;
  const hasAppliedFilters = query.length > 0 || statusFilter !== 'all' || providerFilter !== 'all';
  const emptyStateTitle = activeSummary.total === 0 ? '暂无订单数据' : hasAppliedFilters ? '当前筛选无结果' : '暂无订单记录';
  const pageStart = total > 0 ? offset + 1 : 0;
  const pageEnd = Math.min(offset + limit, total);
  const [draftQuery, setDraftQuery] = useState(query);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [copyNotice, setCopyNotice] = useState('');
  const [sort, setSort] = useState<OrderSortState>({ key: 'created_at', direction: 'desc' });
  const initialSelectedOrderIDRef = useRef(typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('order_selected') ?? '');
  const sortedOrders = useMemo(() => sortOrders(orders, sort), [orders, sort]);
  const hasActiveFilters = Boolean(query || draftQuery || statusFilter !== 'all' || providerFilter !== 'all');
  const toggleSort = (key: OrderSortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }));
  const resetFilters = () => { setDraftQuery(''); onQueryChange(''); onStatusChange('all'); onProviderChange('all'); };

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftQuery.trim() !== query) {
        onQueryChange(draftQuery);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftQuery, onQueryChange, query]);

  useEffect(() => {
    if (!selectedOrder) {
      const requestedID = initialSelectedOrderIDRef.current;
      const requested = orders.find((order) => order.id === requestedID);
      if (requested) {
        initialSelectedOrderIDRef.current = '';
        setSelectedOrder(requested);
      }
      return;
    }
    const nextSelectedOrder = orders.find((order) => order.id === selectedOrder.id);
    if (nextSelectedOrder && nextSelectedOrder !== selectedOrder) {
      setSelectedOrder(nextSelectedOrder);
    }
  }, [orders, selectedOrder]);

  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('tab') !== 'orders') return;
    const url = new URL(window.location.href);
    if (selectedOrder) url.searchParams.set('order_selected', selectedOrder.id); else url.searchParams.delete('order_selected');
    window.history.replaceState({ ...window.history.state, selectedOrder: selectedOrder?.id }, '', url);
  }, [selectedOrder]);

  return (
    <section className="admin-config-section">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeader icon={<ShoppingCart size={16} />} eyebrow="订单运营" title="订单管理" subtitle="查看全站充值订单、支付状态、用户、商品与到账积分。" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[640px]">
          <MetricCard label="订单总数" value={String(activeSummary.total)} />
          <MetricCard label="已支付金额" value={formatMoney(activeSummary.paid_amount_cents, 'cny')} tone="indigo" />
          <MetricCard label="到账积分" value={String(activeSummary.paid_credits)} tone="emerald" />
          <MetricCard label="待处理" value={String(activeSummary.counts.pending)} hint={`过期 ${activeSummary.counts.expired}`} tone="amber" />
        </div>
      </div>

      <div className="admin-toolbar mt-4 rounded-surface p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <label className="admin-config-search flex min-w-0 flex-1 items-center gap-2 px-3">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="搜索订单号、支付单号、用户邮箱、产品…"
              aria-label="搜索订单号、支付单号、用户邮箱或产品"
              name="admin-order-search"
              autoComplete="off"
              className="min-h-8 w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((status) => <FilterPill key={status} active={statusFilter === status} onClick={() => onStatusChange(status)} count={statusCount(activeSummary, status)}>{statusLabel(status)}</FilterPill>)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROVIDER_FILTERS.map((provider) => <FilterPill key={provider} active={providerFilter === provider} onClick={() => onProviderChange(provider)}>{provider === 'all' ? '全部渠道' : provider}</FilterPill>)}
          {hasActiveFilters ? <button type="button" onClick={resetFilters} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>重置筛选</button> : null}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-surface border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line bg-subtle px-3 py-2 text-xs font-bold text-secondary">
          <span>显示 {pageStart}-{pageEnd} / {total} · 当前页排序</span>
          <label className="flex items-center gap-2">每页
            <select value={limit} onChange={(event) => onPageSizeChange(Number(event.target.value))} className={`rounded-control border border-line bg-surface px-2 py-1 text-xs font-bold text-ink ${FOCUS_RING}`}>
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
        <div className="relative min-h-[320px]">
        {loading ? <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-control border border-line bg-surface/95 px-3 py-1.5 text-xs font-black text-secondary shadow-surface"><Loader2 size={14} className="animate-spin" />刷新中…</div> : null}
        {error ? <div className="m-2 rounded-control border border-danger bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}
        {loading && orders.length === 0 ? <div className="flex min-h-[320px] items-center justify-center gap-2 px-4 py-10 text-sm font-bold text-secondary"><Loader2 size={17} className="animate-spin" />正在加载订单…</div> : null}
        {!loading && orders.length === 0 ? <div className="p-4"><EmptyList title={emptyStateTitle} /></div> : null}
        {orders.length > 0 ? (
          <>
          <OrderMobileList orders={sortedOrders} loading={loading} onOpen={setSelectedOrder} />
          <div className={`admin-desktop-only overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-[1080px] w-full text-left text-xs">
              <thead className="bg-subtle text-xs font-black text-secondary">
                <tr>
                  <th className="px-2.5 py-2">订单</th><th className="px-2.5 py-2">用户</th><th className="px-2.5 py-2">产品</th><OrderSortableHeader label="渠道" sortKey="provider" sort={sort} onSort={toggleSort} /><OrderSortableHeader label="金额" sortKey="amount" sort={sort} onSort={toggleSort} /><OrderSortableHeader label="积分" sortKey="credits" sort={sort} onSort={toggleSort} /><OrderSortableHeader label="状态" sortKey="status" sort={sort} onSort={toggleSort} /><OrderSortableHeader label="创建时间" sortKey="created_at" sort={sort} onSort={toggleSort} /><OrderSortableHeader label="支付时间" sortKey="paid_at" sort={sort} onSort={toggleSort} /><th className="sticky right-0 bg-subtle px-2.5 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="align-top transition-colors hover:bg-subtle">
                    <td className="px-2.5 py-2"><div className="admin-mono font-black text-ink">{order.id}</div>{order.provider_payment_id ? <div className="admin-mono mt-0.5 text-xs font-semibold text-secondary">{order.provider_payment_id}</div> : null}</td>
                    <td className="px-2.5 py-2"><div className="font-black text-ink">{order.user.name || '未命名'}</div><div className="admin-mono text-xs font-semibold text-secondary">{order.user.email || order.user.id}</div></td>
                    <td className="px-2.5 py-2"><div className="font-black text-ink">{order.product_name}</div><div className="admin-mono text-xs font-semibold text-secondary">{order.product_id}</div>{order.promotion ? <div className="mt-1"><PromotionBadge promotion={order.promotion} /></div> : null}</td>
                    <td className="px-2.5 py-2"><InlineBadge tone="slate">{order.provider}</InlineBadge></td>
                    <td className="px-2.5 py-2 font-black text-ink"><Banknote size={14} className="mr-0.5 inline text-secondary" />{formatMoney(order.amount_cents, order.currency)}</td>
                    <td className="px-2.5 py-2 font-black text-ink"><Coins size={14} className="mr-0.5 inline text-secondary" />{order.credits}{order.promotion ? <div className="mt-0.5 text-xs font-bold text-success">{promotionCreditsText(order.promotion)}</div> : null}</td>
                    <td className="px-2.5 py-2"><InlineBadge tone={statusTone(order.status)}>{statusLabel(order.status as AdminOrderStatusFilter)}</InlineBadge></td>
                    <td className="px-2.5 py-2 text-xs font-semibold text-secondary">{formatDateTime(order.created_at)}</td>
                    <td className="px-2.5 py-2 text-xs font-semibold text-secondary">{order.paid_at ? formatDateTime(order.paid_at) : '—'}</td>
                    <td className="sticky right-0 bg-surface px-2.5 py-2 text-right">
                      <button type="button" onClick={() => setSelectedOrder(order)} className={`inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>
                        <Eye size={13} />详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-subtle px-3 py-2">
          <button type="button" onClick={() => onPage(Math.max(0, offset - limit))} disabled={offset <= 0 || loading} className={`rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}>上一页</button>
          <button type="button" onClick={() => onPage(offset + limit)} disabled={offset + limit >= total || loading} className={`rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}>下一页</button>
        </div>
      </div>
      {copyNotice ? <div className="sr-only" aria-live="polite">{copyNotice}</div> : null}
      {selectedOrder ? <OrderDetailsDrawer order={selectedOrder} onCopied={setCopyNotice} onRefresh={() => onPage(offset)} onClose={() => setSelectedOrder(null)} /> : null}
    </section>
  );
}

function OrderMobileList({ orders, loading, onOpen }: Readonly<{ orders: readonly AdminOrder[]; loading: boolean; onOpen: (order: AdminOrder) => void }>) {
  return <div className={`admin-mobile-only space-y-2 p-2 ${loading ? 'opacity-60' : ''}`}>{orders.map((order) => (
    <AdminMobileCard key={order.id} title={order.product_name || order.id} subtitle={<><span className="admin-mono break-all">{order.id}</span><br />{order.user.name || order.user.email || order.user.id}</>} badge={<InlineBadge tone={statusTone(order.status)}>{statusLabel(order.status as AdminOrderStatusFilter)}</InlineBadge>} action={<button type="button" onClick={() => onOpen(order)} className={`inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-control border border-line text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}><Eye size={14} aria-hidden="true" />查看订单详情</button>}>
      <AdminKeyValueGrid items={[{ label: '金额', value: formatMoney(order.amount_cents, order.currency) }, { label: '到账积分', value: order.credits }, { label: '支付渠道', value: order.provider }, { label: '创建时间', value: formatDateTime(order.created_at) }]} />
    </AdminMobileCard>
  ))}</div>;
}

function OrderSortableHeader({ label, sortKey, sort, onSort }: Readonly<{ label: string; sortKey: OrderSortKey; sort: OrderSortState; onSort: (key: OrderSortKey) => void }>) {
  const active = sort.key === sortKey;
  return (
    <th className="px-2.5 py-2">
      <button type="button" onClick={() => onSort(sortKey)} className={`inline-flex items-center gap-1 rounded-control px-1 py-0.5 text-left hover:bg-surface hover:text-ink ${FOCUS_RING}`}>
        {label}<span className={active ? 'text-accent' : 'text-muted'}>{active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

function sortOrders(orders: readonly AdminOrder[], sort: OrderSortState): readonly AdminOrder[] {
  return [...orders].sort((left, right) => {
    const compared = compareOrders(left, right, sort.key);
    return sort.direction === 'asc' ? compared : -compared;
  });
}

function compareOrders(left: AdminOrder, right: AdminOrder, key: OrderSortKey): number {
  if (key === 'amount') return left.amount_cents - right.amount_cents;
  if (key === 'credits') return left.credits - right.credits;
  if (key === 'created_at') return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  if (key === 'paid_at') return new Date(left.paid_at || 0).getTime() - new Date(right.paid_at || 0).getTime();
  if (key === 'status') return left.status.localeCompare(right.status);
  return left.provider.localeCompare(right.provider);
}

function OrderDetailsDrawer({ order, onCopied, onRefresh, onClose }: Readonly<{ order: AdminOrder; onCopied: (message: string) => void; onRefresh: () => void; onClose: () => void }>) {
  const [actionBusy, setActionBusy] = useState<string>();
  const [actionNotice, setActionNotice] = useState<{ kind: 'success' | 'error'; message: string }>();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useOverlayFocus({ containerRef: drawerRef, initialFocusRef: closeRef, enabled: true, onClose });
  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    onCopied(`已复制${label}`);
  };
  const executeOrderAction = async (action: 'sync' | 'manual') => {
    if (actionBusy) return;
    setActionBusy(action);
    setActionNotice(undefined);
    try {
      if (action === 'sync') await syncAdminOrderStatus(order.id);
      else await manualCompleteAdminOrder(order.id, { reason: 'admin_manual_complete' });
      onRefresh();
      setActionNotice({ kind: 'success', message: action === 'sync' ? '已同步支付状态。' : '已执行人工补单。' });
    } catch (error) {
      setActionNotice({ kind: 'error', message: error instanceof Error ? error.message : '操作失败' });
    } finally {
      setActionBusy(undefined);
    }
  };
  const runOrderAction = (action: 'sync' | 'manual') => {
    if (action === 'sync') return void executeOrderAction(action);
    setConfirmDialog({ title: '确认人工补单？', description: `${order.id} 将被标记为已支付并立即发放权益。请先核对支付渠道流水。`, confirmLabel: '执行人工补单', tone: 'danger', onConfirm: () => void executeOrderAction('manual') });
  };
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="ui-final fixed inset-0 z-overlay" role="dialog" aria-modal="true" aria-label="订单详情">
      <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 cursor-default bg-[var(--ui-overlay)]" onClick={onClose} />
      <aside ref={drawerRef} tabIndex={-1} className="absolute right-0 top-0 flex h-full w-full max-w-[500px] flex-col overflow-hidden border-l border-line bg-subtle shadow-floating">
        <div className="border-b border-line bg-surface px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-xs font-black text-secondary"><ShoppingCart size={14} />订单详情</div>
              <h3 className="admin-mono mt-2 truncate text-lg font-black text-ink">{order.id}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2"><InlineBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</InlineBadge><InlineBadge tone="slate">{order.provider}</InlineBadge></div>
              <button type="button" onClick={() => void copyText(orderDebugInfo(order), '排查信息')} className={`mt-3 inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>
                <Copy size={13} />复制排查信息
              </button>
              <button type="button" onClick={() => void copyText(orderCustomerReplyTemplate(order), '客服回复')} className={`ml-2 mt-3 inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>
                <MessageSquareText size={13} />复制客服回复
              </button>
              <button type="button" disabled={!!actionBusy} onClick={() => void runOrderAction('sync')} className={`ml-2 mt-3 inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink disabled:opacity-60 ${FOCUS_RING}`}>
                {actionBusy === 'sync' ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}同步支付
              </button>
              {order.status !== 'paid' && order.status !== 'succeeded' ? <button type="button" disabled={!!actionBusy} onClick={() => void runOrderAction('manual')} className={`ml-2 mt-3 inline-flex items-center gap-1.5 rounded-control border border-danger bg-danger-soft px-3 py-1.5 text-xs font-black text-danger hover:brightness-95 disabled:opacity-60 ${FOCUS_RING}`}>
                {actionBusy === 'manual' ? <Loader2 size={13} className="animate-spin" /> : <Banknote size={13} />}人工补单
              </button> : null}
            </div>
            <button ref={closeRef} type="button" onClick={onClose} className={`rounded-full p-2 text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label="关闭订单详情"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {actionNotice ? <div className={`mb-4 rounded-control border px-3 py-2 text-sm font-bold ${actionNotice.kind === 'success' ? 'border-success bg-success-soft text-success' : 'border-danger bg-danger-soft text-danger'}`} role="status" aria-live="polite">{actionNotice.message}</div> : null}
          <div className="grid grid-cols-2 gap-3">
            <DetailMetric label="金额" value={formatMoney(order.amount_cents, order.currency)} icon={<Banknote size={16} />} />
            <DetailMetric label="积分" value={String(order.credits)} icon={<Coins size={16} />} />
          </div>
          {order.promotion ? <PromotionSummary promotion={order.promotion} /> : null}
          <div className="mt-4 grid gap-3 rounded-surface border border-line bg-surface p-4">
            <DetailRow label="用户" value={`${order.user.name || '未命名'} · ${order.user.email || order.user.id}`} />
            <DetailRow label="产品" value={`${order.product_name} · ${order.product_id}`} />
            {order.promotion ? <DetailRow label="专属优惠" value={promotionDetailText(order.promotion)} /> : null}
            <DetailRow label="订单号" value={order.id} copy />
            {order.provider_order_id ? <DetailRow label="渠道订单" value={order.provider_order_id} copy /> : null}
            {order.provider_payment_id ? <DetailRow label="支付单号" value={order.provider_payment_id} copy /> : null}
            <DetailRow label="创建时间" value={formatDateTime(order.created_at)} />
            <DetailRow label="过期时间" value={formatDateTime(order.expires_at)} />
            {order.status === 'pending' ? <DetailRow label="剩余有效期" value={formatExpiryRemaining(order.expires_at)} /> : null}
            <DetailRow label="支付时间" value={order.paid_at ? formatDateTime(order.paid_at) : '—'} />
            <DetailRow label="支付耗时" value={order.paid_at ? formatDurationBetween(order.created_at, order.paid_at) : '—'} />
          </div>
        </div>
      </aside>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </div>,
    document.body,
  );
}


function PromotionBadge({ promotion }: Readonly<{ promotion: NonNullable<AdminOrder['promotion']> }>) {
  return <span className="inline-flex items-center rounded-full border border-success bg-success-soft px-2 py-0.5 text-xs font-black text-success">{promotionBadgeText(promotion)}</span>;
}

function PromotionSummary({ promotion }: Readonly<{ promotion: NonNullable<AdminOrder['promotion']> }>) {
  return (
    <div className="mt-4 rounded-surface border border-success bg-success-soft p-4 text-success">
      <div className="text-xs font-black">专属优惠</div>
      <div className="mt-1 text-sm font-black">{promotionBadgeText(promotion)}</div>
      <div className="mt-1 text-xs font-bold leading-5">{promotionCreditsText(promotion)}</div>
      {promotion.id ? <div className="admin-mono mt-1 text-xs font-semibold">{promotion.id}</div> : null}
    </div>
  );
}

function orderDebugInfo(order: AdminOrder): string {
  return [
    `订单ID: ${order.id}`,
    `状态: ${order.status}`,
    `渠道: ${order.provider}`,
    `渠道订单: ${order.provider_order_id || '-'}`,
    `支付单号: ${order.provider_payment_id || '-'}`,
    `用户: ${order.user.email || order.user.id}`,
    `产品: ${order.product_name} (${order.product_id})`,
    `金额: ${formatMoney(order.amount_cents, order.currency)}`,
    `积分: ${order.credits}`,
    `专属优惠: ${order.promotion ? promotionDetailText(order.promotion) : '-'}`,
    `创建: ${formatDateTime(order.created_at)}`,
    `过期: ${formatDateTime(order.expires_at)}`,
    `支付: ${order.paid_at ? formatDateTime(order.paid_at) : '-'}`,
    `支付耗时: ${order.paid_at ? formatDurationBetween(order.created_at, order.paid_at) : '-'}`,
  ].join('\n');
}

function orderCustomerReplyTemplate(order: AdminOrder): string {
  const user = order.user.email || order.user.name || order.user.id;
  if (order.status === 'paid' || order.status === 'succeeded') {
    return `您好，查询到您的订单 ${order.id} 已支付成功，商品「${order.product_name}」已到账 ${order.credits} 点。支付时间：${order.paid_at ? formatDateTime(order.paid_at) : '—'}。如前台未刷新，请重新登录或刷新页面后查看。`;
  }
  if (order.status === 'pending') {
    return `您好，查询到您的订单 ${order.id} 当前为待支付状态，商品「${order.product_name}」，金额 ${formatMoney(order.amount_cents, order.currency)}，订单将在 ${formatDateTime(order.expires_at)} 过期（${formatExpiryRemaining(order.expires_at)}）。如已付款但未到账，请提供支付截图和支付单号，我们会继续核对。`;
  }
  return `您好，查询到您的订单 ${order.id} 当前状态为「${statusLabel(order.status)}」，用户 ${user}，商品「${order.product_name}」，创建时间 ${formatDateTime(order.created_at)}。如状态与实际支付不一致，请提供支付截图和支付单号，我们会继续核对。`;
}

function formatExpiryRemaining(value: string): string {
  const diff = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(diff)) return '—';
  if (diff <= 0) return '已过期';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '不足 1 分钟';
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (hours < 24) return `${hours} 小时${restMinutes ? ` ${restMinutes} 分钟` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} 天 ${hours % 24} 小时`;
}

function DetailMetric({ label, value, icon }: Readonly<{ label: string; value: string; icon: React.ReactNode }>) {
  return <div className="rounded-surface border border-line bg-surface p-4"><div className="flex items-center gap-2 text-xs font-black text-muted">{icon}{label}</div><div className="admin-mono mt-2 text-2xl font-black text-ink">{value}</div></div>;
}

function DetailRow({ label, value, copy }: Readonly<{ label: string; value: string; copy?: boolean }>) {
  return <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><div className="text-xs font-black text-muted">{label}</div><div className="min-w-0 break-all text-sm font-bold text-ink">{value}{copy ? <button type="button" onClick={() => void navigator.clipboard.writeText(value)} className={`ml-2 inline-flex rounded-control p-1 text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label={`复制${label}`}><Copy size={13} /></button> : null}</div></div>;
}


function promotionBadgeText(promotion: NonNullable<AdminOrder['promotion']>): string {
  const name = promotion.name?.trim();
  const rate = formatBPSPercent(promotion.bonus_rate_bps);
  if (name) return rate ? `${name} · +${rate}` : name;
  if (rate) return `专属优惠 +${rate}`;
  return '专属优惠';
}

function promotionCreditsText(promotion: NonNullable<AdminOrder['promotion']>): string {
  const parts = [];
  if (promotion.base_credits > 0) parts.push(`基础 ${promotion.base_credits}`);
  if (promotion.bonus_credits > 0) parts.push(`赠送 ${promotion.bonus_credits}`);
  return parts.length > 0 ? parts.join(' + ') : '已应用专属优惠';
}

function promotionDetailText(promotion: NonNullable<AdminOrder['promotion']>): string {
  return [promotionBadgeText(promotion), promotionCreditsText(promotion)].filter(Boolean).join(' · ');
}

function formatBPSPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const percent = value / 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
}

function statusCount(stats: AdminOrderList['stats'], status: AdminOrderStatusFilter): number | undefined {
  if (status === 'all') return stats.total;
  return stats.counts[status as keyof typeof stats.counts] ?? undefined;
}
function statusLabel(status: string): string { return ({ all: '全部', pending: '待支付', paid: '已支付', succeeded: '已支付', failed: '失败', canceled: '已取消', expired: '已过期' } as Record<string, string>)[status] ?? status; }
function statusTone(status: string): 'indigo' | 'emerald' | 'slate' | 'amber' { return status === 'paid' || status === 'succeeded' ? 'emerald' : status === 'pending' ? 'indigo' : status === 'expired' ? 'amber' : 'slate'; }
function formatMoney(cents: number, currency: string): string { const symbol = currency.toLowerCase() === 'cny' ? '¥' : currency.toUpperCase() + ' '; return `${symbol}${(cents / 100).toFixed(2)}`; }
function formatDurationBetween(start: string, end: string): string { const diff = new Date(end).getTime() - new Date(start).getTime(); if (!Number.isFinite(diff) || diff < 0) return '—'; const minutes = Math.floor(diff / 60000); const seconds = Math.round((diff % 60000) / 1000); if (minutes < 1) return `${seconds}s`; if (minutes < 60) return `${minutes}m ${seconds}s`; const hours = Math.floor(minutes / 60); return `${hours}h ${minutes % 60}m`; }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short', hour12: false, timeZone: 'Asia/Shanghai' }).format(new Date(value)); }
