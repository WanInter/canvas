'use client';

import { ArrowDown, ArrowUp, Ban, ChevronLeft, ChevronRight, Coins, Gift, KeyRound,  Loader2, MoreHorizontal, RotateCcw, Search, ShieldCheck, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { listAdminInvitedUsers } from '@/lib/api/admin';
import type { AdminInvitedUserPage, AdminSortOrder, AdminUser, AdminUserList, AdminUserSortField, AdminUserStatusFilter, UserRechargePromotion, UserRechargePromotionInput } from '@/lib/api/admin';
import type { InvitedUserRechargeSummary } from '@/lib/types';
import type { AdminLabels, ProductEntry } from './adminUtils';
import { FOCUS_RING } from './adminUtils';
import { AdminKeyValueGrid, AdminMobileCard, AdminModal, ConfirmDialog, type ConfirmDialogState, EmptyList, FilterPill, InlineBadge, SecondaryButton, SectionHeader, useViewportContainedPosition } from './AdminSectionPrimitives';
import { UserRechargePromotionDialog } from './AdminUserRechargePromotionsSection';

export function UsersSection({
  labels,
  users,
  total,
  counts,
  limit,
  offset,
  query,
  loading,
  refreshing,
  savingKey,
  currentUserID,
  promotions,
  promotionsLoading,
  promotionSavingID,
  productEntries,
  statusFilter,
  sortField,
  sortOrder,
  onQueryChange,
  onStatusChange,
  onSortChange,
  onPage,
  onPageSizeChange,
  onUpdateUser,
  onResetPassword,
  onLoadPromotions,
  onSavePromotion,
  onDeletePromotion,
}: Readonly<{
  labels: AdminLabels;
  users: readonly AdminUser[];
  total: number;
  counts: AdminUserList['counts'];
  limit: number;
  offset: number;
  query: string;
  loading: boolean;
  refreshing: boolean;
  savingKey?: string;
  currentUserID?: string;
  promotions: readonly UserRechargePromotion[];
  promotionsLoading: boolean;
  promotionSavingID?: string;
  productEntries: readonly ProductEntry[];
  statusFilter: AdminUserStatusFilter;
  sortField: AdminUserSortField;
  sortOrder: AdminSortOrder;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: AdminUserStatusFilter) => void;
  onSortChange: (field: AdminUserSortField) => void;
  onPage: (offset: number) => void;
  onPageSizeChange: (limit: number) => void;
  onUpdateUser: (user: AdminUser, patch: Readonly<{ is_admin?: boolean; disabled?: boolean; deleted?: boolean; credit_balance?: number; referral_rewards_disabled?: boolean }>) => void;
  onResetPassword: (user: AdminUser, password: string) => void;
  onLoadPromotions: (userID?: string, showLoading?: boolean) => Promise<void>;
  onSavePromotion: (input: UserRechargePromotionInput) => Promise<void>;
  onDeletePromotion: (id: string) => Promise<void>;
  }>) {
  const [draftQuery, setDraftQuery] = useState(query);
  const canGoPrev = offset > 0;
  const canGoNext = offset + users.length < total;

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    if (draftQuery === query) return;
    const timer = window.setTimeout(() => {
      onQueryChange(draftQuery);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [draftQuery, onQueryChange, query]);

  const submitSearch = () => {
    onQueryChange(draftQuery);
  };

  return (
    <section className="admin-config-section">
      <SectionHeader icon={<UsersRound size={16} />} eyebrow="用户运营" title="用户管理" subtitle="查看账号状态、积分来源、邀请关系和专属充值优惠，并执行受确认保护的账号操作。" />
      <div className="admin-toolbar mt-4 flex flex-col gap-3 rounded-surface p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="admin-config-search flex min-h-10 items-center gap-3 px-3 xl:min-w-[360px] xl:max-w-[540px] xl:flex-1">
          <Search size={15} className="text-muted" aria-hidden="true" />
          <input
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitSearch();
            }}
            placeholder={labels.usersSearchPlaceholder}
            aria-label={labels.usersSearchPlaceholder}
            name="admin-users-search"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted"
          />
          <button type="button" onClick={submitSearch} className={`min-w-12 shrink-0 whitespace-nowrap rounded-control px-2 py-1 text-xs font-black text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>
            {labels.searchAction}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill active={statusFilter === 'active'} onClick={() => onStatusChange('active')} count={counts.active}>{refreshing ? labels.refreshing : labels.usersActive}</FilterPill>
          <FilterPill active={statusFilter === 'today'} onClick={() => onStatusChange('today')} count={counts.today_new}>{labels.usersTodayNew}</FilterPill>
          <FilterPill active={statusFilter === 'admin'} onClick={() => onStatusChange('admin')} count={counts.admins}>{labels.usersAdmins}</FilterPill>
          <FilterPill active={statusFilter === 'disabled'} onClick={() => onStatusChange('disabled')} count={counts.disabled}>{labels.usersDisabled}</FilterPill>
          <FilterPill active={statusFilter === 'deleted'} onClick={() => onStatusChange('deleted')} count={counts.deleted}>{labels.usersDeleted}</FilterPill>
        </div>
      </div>

      <UsersMobileList labels={labels} users={users} loading={loading} currentUserID={currentUserID} savingKey={savingKey} promotions={promotions} promotionsLoading={promotionsLoading} promotionSavingID={promotionSavingID} productEntries={productEntries} onLoadPromotions={onLoadPromotions} onSavePromotion={onSavePromotion} onDeletePromotion={onDeletePromotion} onUpdateUser={onUpdateUser} onResetPassword={onResetPassword} />

      <div className="admin-desktop-only mt-4 overflow-x-auto rounded-surface border border-line bg-surface">
        <div className="min-w-[1360px]">
          <div className="grid w-full grid-cols-[230px_210px_minmax(360px,1fr)_230px_115px_130px_130px_110px] gap-3 border-b border-line bg-subtle px-4 py-2.5 text-xs font-black text-secondary">
            <SortableHeader label={labels.usersAccount} field="email" activeField={sortField} order={sortOrder} onSort={onSortChange} className="sticky left-0 z-sticky bg-subtle" />
            <span>{labels.usersRole}</span>
            <SortableHeader label={`${labels.usersCredits} / 专属优惠`} field="credit_balance" activeField={sortField} order={sortOrder} onSort={onSortChange} />
            <span className="pl-8">{labels.usersInvitation}</span>
            <SortableHeader label={labels.usersTasks} field="task_count" activeField={sortField} order={sortOrder} onSort={onSortChange} />
            <SortableHeader label={labels.usersCreatedAt} field="created_at" activeField={sortField} order={sortOrder} onSort={onSortChange} />
            <SortableHeader label={labels.usersLastSeen} field="last_seen_at" activeField={sortField} order={sortOrder} onSort={onSortChange} />
            <span className="sticky right-0 z-sticky bg-subtle">{labels.usersActions}</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-bold text-secondary">
              <Loader2 size={16} className="animate-spin" />
              {labels.loadingTitle}
            </div>
          ) : users.length === 0 ? (
            <div className="p-4"><EmptyList title={labels.noSearchResult} /></div>
          ) : (
            <div className="divide-y divide-line">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  labels={labels}
                  user={user}
                  currentUserID={currentUserID}
                  saving={savingKey === `user:${user.id}`}
                  promotions={promotions.filter((item) => item.user_id === user.id)}
                  promotionsLoading={promotionsLoading}
                  promotionSavingID={promotionSavingID}
                  productEntries={productEntries}
                  onLoadPromotions={onLoadPromotions}
                  onSavePromotion={onSavePromotion}
                  onDeletePromotion={onDeletePromotion}
                  onUpdateUser={(patch) => onUpdateUser(user, patch)}
                  onResetPassword={(password) => onResetPassword(user, password)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-secondary">
        <span>{labels.usersPageRange(Math.min(offset + 1, total), Math.min(offset + users.length, total), total)}</span>
        <label className="flex items-center gap-2 whitespace-nowrap text-xs font-black text-secondary">
          {labels.usersPageSize}
          <select value={limit} onChange={(event) => onPageSizeChange(Number(event.target.value))} className={`rounded-control border border-line bg-surface px-3 py-2 text-sm font-black text-ink outline-none ${FOCUS_RING}`}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <div className="flex gap-2">
          <SecondaryButton icon={<ChevronLeft size={16} />} onClick={() => onPage(Math.max(0, offset - limit))} disabled={!canGoPrev}>
            {labels.previousPage}
          </SecondaryButton>
          <SecondaryButton icon={<ChevronRight size={16} />} onClick={() => onPage(offset + limit)} disabled={!canGoNext}>
            {labels.nextPage}
          </SecondaryButton>
        </div>
        <div className="sr-only" aria-live="polite">{canGoPrev ? labels.previousPage : ''}{canGoNext ? labels.nextPage : ''}</div>
      </div>
    </section>
  );
}

function UsersMobileList(props: Readonly<{
  labels: AdminLabels;
  users: readonly AdminUser[];
  loading: boolean;
  currentUserID?: string;
  savingKey?: string;
  promotions: readonly UserRechargePromotion[];
  promotionsLoading: boolean;
  promotionSavingID?: string;
  productEntries: readonly ProductEntry[];
  onLoadPromotions: (userID?: string, showLoading?: boolean) => Promise<void>;
  onSavePromotion: (input: UserRechargePromotionInput) => Promise<void>;
  onDeletePromotion: (id: string) => Promise<void>;
  onUpdateUser: (user: AdminUser, patch: Readonly<{ is_admin?: boolean; disabled?: boolean; deleted?: boolean; credit_balance?: number; referral_rewards_disabled?: boolean }>) => void;
  onResetPassword: (user: AdminUser, password: string) => void;
}>) {
  return <div className="admin-mobile-only mt-4 space-y-2">
    {props.loading ? <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-secondary"><Loader2 size={16} className="animate-spin" />{props.labels.loadingTitle}</div> : null}
    {!props.loading && props.users.length === 0 ? <EmptyList title={props.labels.noSearchResult} /> : null}
    {!props.loading ? props.users.map((user) => <UserRow key={user.id} compact labels={props.labels} user={user} currentUserID={props.currentUserID} saving={props.savingKey === `user:${user.id}`} promotions={props.promotions.filter((item) => item.user_id === user.id)} promotionsLoading={props.promotionsLoading} promotionSavingID={props.promotionSavingID} productEntries={props.productEntries} onLoadPromotions={props.onLoadPromotions} onSavePromotion={props.onSavePromotion} onDeletePromotion={props.onDeletePromotion} onUpdateUser={(patch) => props.onUpdateUser(user, patch)} onResetPassword={(password) => props.onResetPassword(user, password)} />) : null}
  </div>;
}


function SortableHeader({ label, field, activeField, order, onSort, className = '' }: Readonly<{ label: string; field: AdminUserSortField; activeField: AdminUserSortField; order: AdminSortOrder; onSort: (field: AdminUserSortField) => void; className?: string }>) {
  const active = activeField === field;
  return (
    <button type="button" onClick={() => onSort(field)} className={`inline-flex items-center gap-1 text-left transition hover:text-ink ${className} ${FOCUS_RING}`} aria-label={`${label}${active ? `，当前${order === 'asc' ? '升序' : '降序'}` : '，点击排序'}`}>
      <span>{label}</span>
      {active ? (order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowDown size={12} className="opacity-25" />}
    </button>
  );
}

function DateCell({ value, empty = '-' }: Readonly<{ value?: string; empty?: string }>) {
  if (!value) return <div className="text-xs font-semibold text-muted">{empty}</div>;
  return (
    <div className="min-w-0 text-xs font-semibold text-secondary" title={formatDate(value)}>
      <div className="truncate text-ink">{relativeDate(value)}</div>
      <div className="mt-0.5 truncate text-xs text-muted">{formatShortDate(value)}</div>
    </div>
  );
}

function UserRow({
  compact = false,
  labels,
  user,
  currentUserID,
  saving,
  promotions,
  promotionsLoading,
  promotionSavingID,
  productEntries,
  onLoadPromotions,
  onSavePromotion,
  onDeletePromotion,
  onUpdateUser,
  onResetPassword,
}: Readonly<{
  compact?: boolean;
  labels: AdminLabels;
  user: AdminUser;
  currentUserID?: string;
  saving: boolean;
  promotions: readonly UserRechargePromotion[];
  promotionsLoading: boolean;
  promotionSavingID?: string;
  productEntries: readonly ProductEntry[];
  onLoadPromotions: (userID?: string, showLoading?: boolean) => Promise<void>;
  onSavePromotion: (input: UserRechargePromotionInput) => Promise<void>;
  onDeletePromotion: (id: string) => Promise<void>;
  onUpdateUser: (patch: Readonly<{ is_admin?: boolean; disabled?: boolean; deleted?: boolean; credit_balance?: number; referral_rewards_disabled?: boolean }>) => void;
  onResetPassword: (password: string) => void;
}>) {
  const isCurrentUser = currentUserID === user.id;
  const isDisabled = Boolean(user.disabled_at);
  const isDeleted = Boolean(user.deleted_at);
  const referralRewardsDisabled = Boolean(user.referral_rewards_disabled_at);
  const roleLabel = user.is_admin ? labels.usersAdminRole : labels.usersMemberRole;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [invitedOpen, setInvitedOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const requestRiskAction = (action: UserRiskAction, onConfirm: () => void) => {
    setConfirmDialog({ title: '确认高风险用户操作？', description: userRiskMessage(labels, user, action).replaceAll('\n', ' '), confirmLabel: labels.confirmAction, tone: action === 'restore' || action === 'enable' || action === 'enable-referral-rewards' ? 'warning' : 'danger', onConfirm });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (menuRef.current?.contains(target) || menuPanelRef.current?.contains(target))) return;
      setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useViewportContainedPosition(menuOpen, menuPosition, menuPanelRef, setMenuPosition);

  const rechargeCredits = () => {
    setRechargeOpen(true);
  };

  const configurePromotion = () => {
    setPromotionOpen(true);
    if (promotions.length === 0) {
      void onLoadPromotions('', false);
    }
  };

  const viewInvitedUsers = () => {
    setInvitedOpen(true);
  };

  const submitRecharge = (delta: number) => {
    onUpdateUser({ credit_balance: user.credit_balance + delta });
    setRechargeOpen(false);
  };

  const deleteUser = () => {
    requestRiskAction('delete', () => onUpdateUser({ deleted: true }));
  };

  const restoreUser = () => {
    requestRiskAction('restore', () => onUpdateUser({ deleted: false, disabled: false }));
  };

  const toggleReferralRewards = () => {
    const action = referralRewardsDisabled ? 'enable-referral-rewards' : 'disable-referral-rewards';
    requestRiskAction(action, () => onUpdateUser({ referral_rewards_disabled: !referralRewardsDisabled }));
  };

  const toggleAdminRole = () => {
    const action = user.is_admin ? 'remove-admin' : 'make-admin';
    requestRiskAction(action, () => onUpdateUser({ is_admin: !user.is_admin }));
  };

  const toggleDisabled = () => {
    const action = isDisabled ? 'enable' : 'disable';
    requestRiskAction(action, () => onUpdateUser({ disabled: !isDisabled }));
  };

  const openMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const rect = menuRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition({ top: rect.bottom + 8, left: Math.max(12, rect.right - 160) });
    }
    setMenuOpen(true);
  };

  const resetPassword = () => {
    setPasswordDraft('');
    setPasswordError('');
    setResetPasswordOpen(true);
  };

  const submitResetPassword = () => {
    const normalized = passwordDraft.trim();
    if (normalized.length < 6) return setPasswordError(labels.userResetPasswordMinLength);
    requestRiskAction('reset-password', () => { onResetPassword(normalized); setResetPasswordOpen(false); setPasswordDraft(''); });
  };

  const copyEmail = async () => {
    await copyToClipboard(user.email);
    setEmailCopied(true);
    window.setTimeout(() => setEmailCopied(false), 1200);
  };

  return (
    <>
      {compact ? (
        <AdminMobileCard
          title={user.name || user.email}
          subtitle={<button type="button" onClick={() => void copyEmail()} className={`break-all text-left ${FOCUS_RING}`}>{user.email}{emailCopied ? ' · 已复制' : ''}</button>}
          badge={<InlineBadge tone={isDeleted ? 'slate' : isDisabled ? 'amber' : 'emerald'}>{isDeleted ? labels.usersDeleted : isDisabled ? labels.usersDisabled : labels.usersEnabled}</InlineBadge>}
          action={(
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={rechargeCredits} disabled={saving || isDeleted} className={`min-h-9 rounded-control border border-line text-xs font-black text-secondary hover:bg-subtle disabled:opacity-50 ${FOCUS_RING}`}>调整积分</button>
                <button type="button" onClick={configurePromotion} disabled={saving || isDeleted} className={`min-h-9 rounded-control border border-line text-xs font-black text-secondary hover:bg-subtle disabled:opacity-50 ${FOCUS_RING}`}>专属优惠</button>
              </div>
              <details className="rounded-control border border-line bg-subtle p-2">
                <summary className={`cursor-pointer list-none text-center text-xs font-black text-secondary ${FOCUS_RING}`}>更多账号操作</summary>
                <div className="mt-2 grid gap-1 border-t border-line pt-2">
                  <MenuAction onClick={viewInvitedUsers} icon={<UsersRound size={13} />}>{invitedUserButtonTitle(user, labels)}</MenuAction>
                  <MenuAction onClick={toggleReferralRewards} disabled={saving || isDeleted} icon={<Gift size={13} />}>{referralRewardsDisabled ? '恢复邀请送分' : '禁止邀请送分'}</MenuAction>
                  <MenuAction onClick={resetPassword} disabled={saving || isDeleted} icon={<KeyRound size={13} />}>{labels.resetPassword}</MenuAction>
                  <MenuAction onClick={toggleAdminRole} disabled={saving || isCurrentUser || isDeleted} icon={<ShieldCheck size={13} />}>{user.is_admin ? labels.removeAdminAction : labels.makeAdminAction}</MenuAction>
                  <MenuAction onClick={toggleDisabled} disabled={saving || isCurrentUser || isDeleted} icon={isDisabled ? <RotateCcw size={13} /> : <Ban size={13} />}>{isDisabled ? labels.enableUser : labels.disableUser}</MenuAction>
                  {isDeleted ? <MenuAction onClick={restoreUser} disabled={saving} icon={<RotateCcw size={13} />}>{labels.restoreUser}</MenuAction> : <MenuAction tone="danger" onClick={deleteUser} disabled={saving || isCurrentUser} icon={<Trash2 size={13} />}>{labels.deleteUser}</MenuAction>}
                </div>
              </details>
            </div>
          )}
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            <InlineBadge tone={user.is_admin ? 'emerald' : 'slate'}>{roleLabel}</InlineBadge>
            {isCurrentUser ? <InlineBadge tone="amber">{labels.usersCurrentUser}</InlineBadge> : null}
            {referralRewardsDisabled ? <InlineBadge tone="amber">邀请不送分</InlineBadge> : null}
          </div>
          <AdminKeyValueGrid items={[
            { label: '积分余额', value: user.credit_balance },
            { label: '任务', value: labels.usersTaskBreakdown(user.succeeded_count, user.failed_count) },
            { label: '注册时间', value: <DateCell value={user.created_at} /> },
            { label: '最近访问', value: <DateCell value={user.last_seen_at} empty={labels.usersNeverSeen} /> },
          ]} />
        </AdminMobileCard>
      ) : (
      <div className={`group grid w-full grid-cols-[230px_210px_minmax(360px,1fr)_230px_115px_130px_130px_110px] items-center gap-3 px-4 py-3 text-sm transition hover:bg-subtle ${isDeleted ? 'bg-subtle opacity-75' : ''}`}>
      <div className="sticky left-0 z-10 min-w-0 bg-surface pr-2 group-hover:bg-subtle">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-line bg-subtle text-secondary">
            <UserRound size={15} />
          </span>
          <div className="min-w-0">
            <div className="truncate font-black text-ink">{user.name || user.email}</div>
            <button type="button" onClick={() => void copyEmail()} className={`flex max-w-full items-center gap-1 truncate text-left text-xs font-semibold text-secondary hover:text-ink ${FOCUS_RING}`} title={`点击复制邮箱：${user.email}`}>
              <span className="truncate">{user.email}</span>
              {emailCopied ? <span className="shrink-0 rounded-full bg-success-soft px-1.5 py-0.5 text-xs font-black text-success">已复制</span> : null}
            </button>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
        <InlineBadge tone={user.is_admin ? 'emerald' : 'slate'}>{roleLabel}</InlineBadge>
        {isDeleted ? <InlineBadge tone="slate">{labels.usersDeleted}</InlineBadge> : isDisabled ? <InlineBadge tone="amber">{labels.usersDisabled}</InlineBadge> : <InlineBadge tone="emerald">{labels.usersEnabled}</InlineBadge>}
        {isCurrentUser ? <InlineBadge tone="amber">{labels.usersCurrentUser}</InlineBadge> : null}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <CreditSourceSummary user={user} labels={labels} className="w-[220px] max-w-[220px] shrink-0" />
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="flex min-w-[120px] items-center gap-2 rounded-control border border-line bg-subtle px-2.5 py-1.5">
            <Coins size={14} className="shrink-0 text-secondary" />
            <span className="admin-mono truncate text-sm font-black text-ink">{user.credit_balance}</span><span className="shrink-0 text-xs font-black text-muted">Credits</span>
          </div>
          <PromotionCell compact promotions={promotions} loading={promotionsLoading && promotions.length === 0} disabled={isDeleted} onClick={configurePromotion} />
        </div>
      </div>
      <div className="min-w-0 pl-8 text-xs font-semibold text-secondary">
        <div className="truncate text-ink">{inviterLabel(user, labels)}</div>
        <div className="mt-1 min-w-0">
          <div className="truncate" title={`${labels.usersInviteCode}: ${user.invite_code || '-'}`}>{labels.usersInviteCode}: {user.invite_code || '-'}</div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            {referralRewardsDisabled ? <span className="shrink-0 rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-xs font-black text-warning">邀请不送分</span> : null}
            <button type="button" onClick={viewInvitedUsers} className={`inline-flex shrink-0 items-center gap-1 rounded-control border border-line bg-surface px-2 py-0.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle ${FOCUS_RING}`} title={invitedUserButtonTitle(user, labels)}>
              <UsersRound size={12} />
              {user.invited_count ?? 0}
            </button>
          </div>
        </div>
      </div>
      <div>
        <div className="truncate text-xs font-semibold text-secondary">{labels.usersTaskBreakdown(user.succeeded_count, user.failed_count)}</div>
      </div>
      <DateCell value={user.created_at} />
      <DateCell value={user.last_seen_at} empty={labels.usersNeverSeen} />
      <div className="sticky right-0 z-10 flex items-center gap-2 overflow-visible whitespace-nowrap bg-surface pl-2 group-hover:bg-subtle">
        {isDeleted ? (
          <button type="button" onClick={restoreUser} disabled={saving} className={`inline-flex min-h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-black text-secondary hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>
            <RotateCcw size={13} />
            {labels.restoreUser}
          </button>
        ) : null}
        <div ref={menuRef} className="relative">
          <button type="button" onClick={openMenu} className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-black text-secondary transition hover:border-line-strong hover:bg-subtle ${FOCUS_RING}`} aria-haspopup="menu" aria-expanded={menuOpen}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <MoreHorizontal size={14} />}
            {labels.moreActions}
          </button>
          {menuOpen && menuPosition && typeof document !== 'undefined' ? createPortal(
            <div ref={menuPanelRef} className="ui-final fixed z-popover w-44 overflow-hidden rounded-surface border border-line bg-surface p-1 shadow-floating" style={{ top: menuPosition.top, left: menuPosition.left }} role="menu" aria-label={labels.moreActions}>
              <MenuAction onClick={() => { setMenuOpen(false); rechargeCredits(); }} disabled={saving || isDeleted} icon={<Coins size={13} />}>{labels.rechargeCreditsAction}</MenuAction>
              <MenuAction onClick={() => { setMenuOpen(false); viewInvitedUsers(); }} icon={<UsersRound size={13} />}>{invitedUserButtonTitle(user, labels)}</MenuAction>
              <MenuAction onClick={() => { setMenuOpen(false); toggleReferralRewards(); }} disabled={saving || isDeleted} icon={<Gift size={13} />}>{referralRewardsDisabled ? '恢复邀请送分' : '禁止邀请送分'}</MenuAction>
              <MenuAction onClick={() => { setMenuOpen(false); configurePromotion(); }} disabled={saving || isDeleted} icon={<Gift size={13} />}>配置专属优惠</MenuAction>
              <MenuAction onClick={() => { setMenuOpen(false); resetPassword(); }} disabled={saving || isDeleted} icon={<KeyRound size={13} />}>{labels.resetPassword}</MenuAction>
              <MenuAction onClick={() => { setMenuOpen(false); toggleAdminRole(); }} disabled={saving || isCurrentUser || isDeleted} icon={<ShieldCheck size={13} />}>{user.is_admin ? labels.removeAdminAction : labels.makeAdminAction}</MenuAction>
              <MenuAction onClick={() => { setMenuOpen(false); toggleDisabled(); }} disabled={saving || isCurrentUser || isDeleted} icon={isDisabled ? <RotateCcw size={13} /> : <Ban size={13} />}>{isDisabled ? labels.enableUser : labels.disableUser}</MenuAction>
              <MenuAction tone="danger" onClick={() => { setMenuOpen(false); deleteUser(); }} disabled={saving || isCurrentUser || isDeleted} icon={<Trash2 size={13} />}>{labels.deleteUser}</MenuAction>
            </div>,
            document.body,
          ) : null}
        </div>
      </div>
      </div>
      )}
      <RechargeCreditsDialog
        labels={labels}
        user={user}
        open={rechargeOpen}
        saving={saving}
        onClose={() => setRechargeOpen(false)}
        onSubmit={submitRecharge}
      />
      <UserRechargePromotionDialog
        userID={user.id}
        userLabel={user.name || user.email}
        open={promotionOpen}
        promotions={promotions}
        productEntries={productEntries}
        savingID={promotionSavingID}
        onClose={() => setPromotionOpen(false)}
        onSave={onSavePromotion}
        onDelete={onDeletePromotion}
      />
      <AdminInvitedUsersDialog labels={labels} user={user} open={invitedOpen} onClose={() => setInvitedOpen(false)} />
      <AdminModal open={resetPasswordOpen} title={labels.resetPassword} subtitle={user.email} onClose={() => setResetPasswordOpen(false)}>
        <div className="mx-auto max-w-md">
          <label htmlFor={`reset-password-${user.id}`} className="text-xs font-black text-secondary">新密码</label>
          <input id={`reset-password-${user.id}`} type="password" value={passwordDraft} onChange={(event) => { setPasswordDraft(event.target.value); setPasswordError(''); }} autoComplete="new-password" className={`aics-control mt-2 w-full rounded-control px-3 py-2 ${FOCUS_RING}`} />
          {passwordError ? <p className="mt-2 text-xs font-bold text-danger" aria-live="polite">{passwordError}</p> : null}
          <div className="mt-4 flex justify-end gap-2"><SecondaryButton icon={<X size={14} />} onClick={() => setResetPasswordOpen(false)}>{labels.cancelAction}</SecondaryButton><button type="button" onClick={submitResetPassword} className={`min-h-10 rounded-control bg-accent px-4 text-sm font-black text-white hover:bg-accent-hover ${FOCUS_RING}`}>{labels.confirmAction}</button></div>
        </div>
      </AdminModal>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </>
  );
}


const ADMIN_INVITED_USERS_PAGE_SIZE = 20;

function AdminInvitedUsersDialog({ labels, user, open, onClose }: Readonly<{ labels: AdminLabels; user: AdminUser; open: boolean; onClose: () => void }>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [items, setItems] = useState<readonly InvitedUserRechargeSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const copy = invitedDialogCopy(labels);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    setItems([]);
    setNextCursor(undefined);
    setError('');
    setLoading(true);
    let canceled = false;
    listAdminInvitedUsers({ userID: user.id, limit: ADMIN_INVITED_USERS_PAGE_SIZE })
      .then((page: AdminInvitedUserPage) => {
        if (canceled) return;
        setItems(page.users);
        setNextCursor(page.nextCursor);
      })
      .catch((err: unknown) => {
        if (canceled) return;
        setError(err instanceof Error ? err.message : copy.loadFailed);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
      if (dialog?.open) dialog.close();
    };
  }, [copy.loadFailed, open, user.id]);

  if (!open || typeof document === 'undefined') return null;

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const page = await listAdminInvitedUsers({ userID: user.id, limit: ADMIN_INVITED_USERS_PAGE_SIZE, cursor: nextCursor });
      setItems((current) => mergeInvitedUsers(current, page.users));
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadFailed);
    } finally {
      setLoadingMore(false);
    }
  };

  return createPortal(
    <dialog ref={dialogRef} className="ui-final m-auto w-full max-w-[920px] overflow-visible bg-transparent p-0 backdrop:bg-[var(--ui-overlay)]" aria-labelledby={`invited-users-title-${user.id}`} onCancel={onClose} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div onMouseDown={(event) => event.stopPropagation()} className="max-h-[82vh] w-full overflow-hidden rounded-shell border border-line bg-surface shadow-floating">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-black text-secondary"><UsersRound size={13} />{copy.badge}</div>
            <h3 id={`invited-users-title-${user.id}`} className="mt-2 text-lg font-black text-ink">{copy.title(user.name || user.email)}</h3>
            <p className="mt-1 break-all text-xs font-semibold leading-5 text-secondary">{copy.subtitle(user.invite_code || '-', user.invited_count ?? 0)}</p>
          </div>
          <button type="button" onClick={onClose} className={`rounded-full p-2 text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label={labels.closeAction}><X size={16} /></button>
        </div>
        <div className="max-h-[58vh] overflow-auto px-5 py-4">
          {error ? <div className="mb-3 rounded-control border border-danger bg-danger-soft px-3 py-2 text-xs font-bold text-danger">{error}</div> : null}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-secondary"><Loader2 size={16} className="animate-spin" />{labels.loadingTitle}</div>
          ) : items.length === 0 ? (
            <EmptyList title={copy.empty} />
          ) : (
            <div className="overflow-hidden rounded-surface border border-line">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-subtle text-xs font-black text-secondary"><tr><th className="px-3 py-2">{copy.user}</th><th className="px-3 py-2">{copy.invitedAt}</th><th className="px-3 py-2">{copy.paidOrders}</th><th className="px-3 py-2">{copy.paidAmount}</th><th className="px-3 py-2">{copy.paidCredits}</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {items.map((item) => <AdminInvitedUserRow key={item.invitee_user_id} item={item} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 bg-subtle px-5 py-4 text-xs font-bold text-secondary">
          <span>{copy.shown(items.length, user.invited_count ?? items.length)}</span>
          <div className="flex gap-2">
            {nextCursor ? <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className={`inline-flex items-center gap-2 rounded-control border border-line bg-surface px-4 py-2 text-sm font-black text-secondary hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>{loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}{copy.loadMore}</button> : null}
            <button type="button" onClick={onClose} className={`rounded-control border border-line bg-surface px-4 py-2 text-sm font-black text-secondary hover:border-line-strong ${FOCUS_RING}`}>{labels.closeAction}</button>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

function AdminInvitedUserRow({ item }: Readonly<{ item: InvitedUserRechargeSummary }>) {
  const name = item.invitee_name || item.invitee_email || item.invitee_user_id;
  return (
    <tr className="align-top">
      <td className="px-3 py-2.5"><div className="font-black text-ink">{name}</div><div className="mt-0.5 break-all text-xs font-semibold text-secondary">{item.invitee_email || item.invitee_user_id}</div></td>
      <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-secondary">{formatDate(item.invited_at)}</td>
      <td className="px-3 py-2.5 font-black text-ink">{item.paid_recharge_count}</td>
      <td className="px-3 py-2.5 font-black text-ink">{formatMoneyCents(item.total_paid_amount_cents)}</td>
      <td className="px-3 py-2.5 font-black text-ink">{formatNumber(item.total_paid_credits)}</td>
    </tr>
  );
}

function mergeInvitedUsers(current: readonly InvitedUserRechargeSummary[], incoming: readonly InvitedUserRechargeSummary[]): readonly InvitedUserRechargeSummary[] {
  const existing = new Set(current.map((item) => item.invitee_user_id));
  return [...current, ...incoming.filter((item) => !existing.has(item.invitee_user_id))];
}

function invitedUserButtonTitle(user: AdminUser, labels: AdminLabels): string {
  const count = user.invited_count ?? 0;
  return labels.usersCredits === '积分' ? `邀请到的人（${count}）` : `Invited users (${count})`;
}

function invitedDialogCopy(labels: AdminLabels) {
  const zh = labels.usersCredits === '积分';
  return zh ? {
    badge: '邀请列表',
    loadFailed: '加载邀请列表失败',
    empty: '这个用户还没有邀请到任何人',
    user: '被邀请用户',
    invitedAt: '邀请时间',
    paidOrders: '已支付订单',
    paidAmount: '已支付金额',
    paidCredits: '已购积分',
    loadMore: '加载更多',
    title: (name: string) => `${name} 邀请到的人`,
    subtitle: (code: string, count: number) => `邀请码 ${code} · 共 ${count} 人`,
    shown: (shown: number, total: number) => `已显示 ${shown} / ${total}`,
  } : {
    badge: 'Invites',
    loadFailed: 'Failed to load invited users',
    empty: 'This user has not invited anyone yet.',
    user: 'Invited user',
    invitedAt: 'Invited at',
    paidOrders: 'Paid orders',
    paidAmount: 'Paid amount',
    paidCredits: 'Paid credits',
    loadMore: 'Load more',
    title: (name: string) => `People invited by ${name}`,
    subtitle: (code: string, count: number) => `Invite code ${code} · ${count} people`,
    shown: (shown: number, total: number) => `Shown ${shown} / ${total}`,
  };
}

function PromotionCell({ promotions, loading, disabled, compact, onClick }: Readonly<{ promotions: readonly UserRechargePromotion[]; loading?: boolean; disabled?: boolean; compact?: boolean; onClick: () => void }>) {
  const active = promotions.filter((item) => item.is_active && isPromotionLive(item));
  const best = active.toSorted((a, b) => b.bonus_rate_bps - a.bonus_rate_bps)[0];
  const label = loading ? '加载中' : best ? `+${best.bonus_rate_bps / 100}%` : '配置';
  const hint = best ? (best.product_id ? `指定产品 · ${best.product_id}` : '全部产品生效') : '无专属优惠';
  const tone = best ? 'border-success bg-success-soft text-success' : 'border-line bg-surface text-secondary';
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-9 ${compact ? 'max-w-[130px] shrink-0' : 'max-w-full'} items-center gap-2 rounded-control border px-2.5 py-1.5 text-left text-xs font-black transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${FOCUS_RING}`} title={hint}>
      <Gift size={13} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
      {!compact ? <span className="hidden max-w-[86px] truncate font-bold opacity-70 xl:inline">{hint}</span> : null}
    </button>
  );
}

function isPromotionLive(item: UserRechargePromotion): boolean {
  const now = Date.now();
  if (item.starts_at && new Date(item.starts_at).getTime() > now) return false;
  if (item.ends_at && new Date(item.ends_at).getTime() <= now) return false;
  return true;
}

async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Ignore clipboard failures; visible text remains selectable.
  }
}

function RechargeCreditsDialog({
  labels,
  user,
  open,
  saving,
  onClose,
  onSubmit,
}: Readonly<{
  labels: AdminLabels;
  user: AdminUser;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (delta: number) => void;
}>) {
  const [value, setValue] = useState('100');
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const delta = Number(value.trim());
  const parsedDelta = Number.isInteger(delta) ? delta : 0;
  const nextBalance = user.credit_balance + parsedDelta;
  const canPreview = Number.isInteger(delta) && delta !== 0;
  const amountToneClass = canPreview && parsedDelta < 0 ? 'text-danger' : 'text-ink';
  const nextBalanceToneClass = canPreview && nextBalance < 0 ? 'text-danger' : canPreview && parsedDelta < 0 ? 'text-danger' : canPreview && parsedDelta > 0 ? 'text-success' : 'text-ink';

  useEffect(() => {
    if (!open) return;
    setValue('100');
    setError('');
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(value.trim());
    if (!Number.isInteger(amount) || amount === 0) {
      setError(labels.rechargeCreditsInvalid);
      return;
    }
    if (user.credit_balance + amount < 0) {
      setError(labels.rechargeCreditsBelowZero);
      return;
    }
    setConfirmDialog({ title: '确认调整用户积分？', description: userRiskMessage(labels, user, 'credits', amount).replaceAll('\n', ' '), confirmLabel: labels.confirmAction, tone: amount < 0 ? 'danger' : 'warning', onConfirm: () => onSubmit(amount) });
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="ui-final m-auto w-full max-w-[440px] overflow-visible bg-transparent p-0 backdrop:bg-[var(--ui-overlay)]"
      aria-labelledby={`recharge-title-${user.id}`}
      onCancel={onClose}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="w-full overflow-hidden rounded-shell border border-line bg-surface shadow-floating">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-black text-secondary"><Coins size={13} />{labels.rechargeCreditsAction}</div>
            <h3 id={`recharge-title-${user.id}`} className="mt-2 text-lg font-black text-ink">{labels.rechargeCreditsTitle}</h3>
            <p className="mt-1 break-all text-xs font-semibold leading-5 text-secondary">{labels.rechargeCreditsPrompt(user.email, user.credit_balance)}</p>
          </div>
          <button type="button" onClick={onClose} className={`rounded-full p-2 text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label={labels.closeAction}>
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-black text-secondary" htmlFor={`recharge-amount-${user.id}`}>{labels.rechargeCreditsAmount}</label>
          <input
            ref={inputRef}
            id={`recharge-amount-${user.id}`}
            value={value}
            onChange={(event) => { setValue(event.target.value); setError(''); }}
            inputMode="numeric"
            autoComplete="off"
            className={`mt-2 w-full rounded-control border border-line bg-subtle px-4 py-3 text-base font-black outline-none ${amountToneClass} ${FOCUS_RING}`}
            placeholder="100"
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
            <div className="rounded-control bg-subtle p-3 text-secondary"><div>{labels.rechargeCreditsCurrent}</div><div className="admin-mono mt-1 text-base text-ink">{user.credit_balance}</div></div>
            <div className="rounded-control bg-subtle p-3 text-secondary"><div>{labels.rechargeCreditsAfter}</div><div className={`admin-mono mt-1 text-base ${nextBalanceToneClass}`}>{canPreview ? nextBalance : '—'}</div></div>
          </div>
          {error ? <div className="mt-3 rounded-control border border-danger bg-danger-soft px-3 py-2 text-xs font-bold text-danger">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-2 bg-subtle px-5 py-4">
          <button type="button" onClick={onClose} className={`rounded-control border border-line bg-surface px-4 py-2 text-sm font-black text-secondary hover:border-line-strong ${FOCUS_RING}`}>{labels.cancelAction}</button>
          <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2 text-sm font-black text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />}
            {labels.confirmAction}
          </button>
        </div>
      </form>
      <ConfirmDialog inline state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </dialog>,
    document.body,
  );
}

function MenuAction({ children, icon, disabled, tone, onClick }: Readonly<{ children: React.ReactNode; icon: React.ReactNode; disabled?: boolean; tone?: 'danger'; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      role="menuitem"
      className={`flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-xs font-black disabled:cursor-not-allowed disabled:opacity-45 ${tone === 'danger' ? 'text-danger hover:bg-danger-soft' : 'text-secondary hover:bg-subtle hover:text-ink'} ${FOCUS_RING}`}
    >
      {icon}
      {children}
    </button>
  );
}

type UserRiskAction = 'delete' | 'restore' | 'disable' | 'enable' | 'make-admin' | 'remove-admin' | 'credits' | 'reset-password' | 'disable-referral-rewards' | 'enable-referral-rewards' | 'delete-promotion';

function userRiskMessage(labels: AdminLabels, user: AdminUser, action: UserRiskAction, creditDelta?: number): string {
  const account = user.name && user.name !== user.email ? `${user.name} <${user.email}>` : user.email;
  const lines = [
    '请二次确认高风险用户操作。',
    '',
    `用户：${account}`,
    `当前身份：${user.is_admin ? labels.usersAdminRole : labels.usersMemberRole}`,
    `当前状态：${user.deleted_at ? labels.usersDeleted : user.disabled_at ? labels.usersDisabled : labels.usersEnabled}`,
    `当前积分：${user.credit_balance}`,
    '',
    userRiskActionDescription(labels, action, creditDelta),
  ];
  if (action === 'delete') lines.push(labels.userDeleteConfirm);
  if (action === 'reset-password') lines.push(labels.userResetPasswordConfirm(user.email));
  return lines.join('\n');
}

function userRiskActionDescription(labels: AdminLabels, action: UserRiskAction, creditDelta?: number): string {
  if (action === 'delete') return '操作：删除用户。风险：用户将从正常列表移除，账号访问与历史数据展示可能受影响。';
  if (action === 'restore') return '操作：恢复用户。风险：用户将重新获得账号可见性，并同步解除禁用状态。';
  if (action === 'disable') return '操作：禁用用户。风险：用户可能无法继续登录、下单或发起生成任务。';
  if (action === 'enable') return '操作：启用用户。风险：用户将恢复使用权限。';
  if (action === 'make-admin') return `操作：授予${labels.usersAdminRole}权限。风险：该用户将获得后台管理能力。`;
  if (action === 'remove-admin') return `操作：移除${labels.usersAdminRole}权限。风险：该用户将失去后台管理能力。`;
  if (action === 'credits') {
    const amount = creditDelta ?? 0;
    return `操作：调整积分 ${amount > 0 ? '+' : ''}${amount}。风险：会直接改变用户可消费余额。`;
  }
  if (action === 'reset-password') return '操作：重置密码。风险：用户原密码将失效，需要使用新密码登录。';
  if (action === 'disable-referral-rewards') return '操作：禁止邀请送分。风险：该用户后续邀请奖励将停止发放。';
  if (action === 'enable-referral-rewards') return '操作：恢复邀请送分。风险：该用户后续邀请奖励将重新生效。';
  return '操作：删除专属充值优惠。风险：该用户后续充值将不再享受这条加赠规则。';
}

function CreditSourceSummary({ user, labels, className = '' }: Readonly<{ user: AdminUser; labels: AdminLabels; className?: string }>) {
  const sources = user.credit_sources ?? { direct_recharge: 0, recharge_bonus: 0, redeem_code: 0, admin_added: 0, signup_bonus: 0, referral_invitee_bonus: 0, referral_inviter_bonus: 0, membership_daily_bonus: 0, generation_refund: 0, generation_spent: 0, other: 0 };
  const items = [
    { label: labels.creditSourceDirectRecharge, value: sources.direct_recharge, color: 'bg-[var(--ui-data-1)]', dot: 'bg-[var(--ui-data-1)]' },
    { label: labels.creditSourceRechargeBonus, value: sources.recharge_bonus, color: 'bg-[var(--ui-data-2)]', dot: 'bg-[var(--ui-data-2)]' },
    { label: labels.creditSourceRedeemCode, value: sources.redeem_code, color: 'bg-[var(--ui-data-3)]', dot: 'bg-[var(--ui-data-3)]' },
    { label: labels.creditSourceAdminAdded, value: sources.admin_added, color: 'bg-[var(--ui-data-4)]', dot: 'bg-[var(--ui-data-4)]' },
    { label: labels.creditSourceSignupBonus, value: sources.signup_bonus, color: 'bg-[var(--ui-data-5)]', dot: 'bg-[var(--ui-data-5)]' },
    { label: labels.creditSourceReferralInvitee, value: sources.referral_invitee_bonus, color: 'bg-[var(--ui-data-6)]', dot: 'bg-[var(--ui-data-6)]' },
    { label: labels.creditSourceReferralInviter, value: sources.referral_inviter_bonus, color: 'bg-[var(--ui-data-7)]', dot: 'bg-[var(--ui-data-7)]' },
    { label: labels.creditSourceMembershipDaily, value: sources.membership_daily_bonus, color: 'bg-[var(--ui-data-8)]', dot: 'bg-[var(--ui-data-8)]' },
    { label: labels.creditSourceGenerationRefund, value: sources.generation_refund ?? 0, color: 'bg-success', dot: 'bg-success', sign: 1 },
    { label: labels.creditSourceGenerationSpent, value: sources.generation_spent ?? 0, color: 'bg-danger', dot: 'bg-danger', sign: -1 },
    { label: labels.creditSourceOther, value: sources.other, color: 'bg-muted', dot: 'bg-muted', sign: 1 },
  ].filter((item) => item.value > 0);
  const positiveItems = items.filter((item) => item.sign !== -1);
  const spentItems = items.filter((item) => item.sign === -1);
  const positiveTotal = positiveItems.reduce((sum, item) => sum + item.value, 0);
  const spentTotal = spentItems.reduce((sum, item) => sum + item.value, 0);
  const spentPercent = positiveTotal > 0 ? Math.min(100, Math.max(2, (spentTotal / positiveTotal) * 100)) : 100;
  const sourceTrackLabel = labels.usersCredits === '积分' ? '来源' : 'Sources';
  const spentTrackLabel = labels.usersCredits === '积分' ? '消耗' : 'Spent';
  const barRef = useRef<HTMLDivElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  if (items.length === 0) {
    return <div className={`text-xs font-bold text-muted ${className}`}>{labels.creditSourceEmpty}</div>;
  }

  const openTooltip = () => {
    const rect = barRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPosition({ top: rect.bottom + 8, left: Math.min(window.innerWidth - 140, Math.max(140, rect.left + rect.width / 2)) });
    }
    setTooltipOpen(true);
  };

  const tooltip = tooltipOpen && tooltipPosition && typeof document !== 'undefined' ? createPortal(
    <div className="ui-final pointer-events-none fixed z-popover w-max max-w-[280px] -translate-x-1/2 rounded-surface border border-line bg-surface px-3 py-2 text-xs font-black text-secondary shadow-floating" style={{ top: tooltipPosition.top, left: tooltipPosition.left }}>
      <div className="mb-1 text-muted">{labels.usersCredits}</div>
      <div className="grid gap-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${item.dot}`} />{item.label}</span>
            <span className={`admin-mono ${item.sign === -1 ? 'text-red-600' : 'text-ink'}`}>{item.sign === -1 ? `-${item.value}` : item.value}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={barRef} className={`relative space-y-1 ${className}`} title={items.map((item) => `${item.label} ${item.sign === -1 ? '-' : ''}${item.value}`).join(' · ')} onMouseEnter={openTooltip} onMouseLeave={() => setTooltipOpen(false)} onFocus={openTooltip} onBlur={() => setTooltipOpen(false)}>
      <div className="flex items-center gap-1.5">
        <span className="w-6 shrink-0 text-xs font-black leading-none text-muted">{sourceTrackLabel}</span>
        <div className="flex h-2 w-full overflow-hidden rounded-full border border-surface bg-line" aria-label={positiveItems.map((item) => `${item.label} ${item.value}`).join('，') || sourceTrackLabel}>
          {positiveTotal > 0 ? positiveItems.map((item) => {
            const percent = Math.max(2, (item.value / positiveTotal) * 100);
            return <div key={item.label} className={`${item.color} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${percent}%` }} />;
          }) : <div className="h-full w-full bg-line" />}
        </div>
      </div>
      {spentTotal > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="w-6 shrink-0 text-xs font-black leading-none text-red-400">{spentTrackLabel}</span>
          <div className="h-2 w-full overflow-hidden rounded-full border border-white bg-red-50 shadow-inner shadow-red-900/5" aria-label={spentItems.map((item) => `${item.label} -${item.value}`).join('，')}>
            <div className="h-full rounded-full bg-danger" style={{ width: `${spentPercent}%` }} />
          </div>
        </div>
      ) : null}
      {tooltip}
    </div>
  );
}

function inviterLabel(user: AdminUser, labels: AdminLabels): string {
  const name = user.invited_by_name || user.invited_by_email || user.invited_by_user_id;
  if (!name) return labels.usersNoInviter;
  const email = user.invited_by_email && user.invited_by_email !== name ? ` / ${user.invited_by_email}` : '';
  return `${name}${email}`;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatMoneyCents(value: number): string {
  return `¥${((value || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function relativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs >= 0 && diffMs < minute) return '刚刚';
  if (diffMs >= 0 && diffMs < hour) return `${Math.floor(diffMs / minute)} 分钟前`;
  if (diffMs >= 0 && diffMs < day) return `${Math.floor(diffMs / hour)} 小时前`;
  if (diffMs >= 0 && diffMs < 7 * day) return `${Math.floor(diffMs / day)} 天前`;
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}
