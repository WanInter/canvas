'use client';

import { AlertTriangle, CheckSquare, ChevronDown, Clock3, Coins, Copy, ExternalLink, Eye, Loader2, RefreshCw, Search, Server, Settings2, SlidersHorizontal, TimerReset, Trash2, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayFocus } from '@/components/ui/overlayFocus';
import { isPotentiallyStuckTask } from '@/lib/adminTaskRisk';
import { displayMediaURL } from '@/lib/mediaUrl';
import { bulkCancelAdminTaskBatches, bulkCancelAdminTasks, bulkDeleteAdminTasks, bulkRequeueAdminTasks, bulkSyncAdminTaskBatches, bulkSyncAdminTasks, cancelAdminTask, cancelAdminTaskBatch, deleteAdminTask, getAdminTaskBatch, getAdminTaskUpstreamRequest, listAdminTaskAudit, listAdminTaskBatches, createAdminTaskNote, requeueAdminTask, retryAdminTask, setAdminTaskUpstreamTaskID, syncAdminTaskStatus, type AdminBulkTaskResult, type AdminTask, type AdminTaskBatch, type AdminTaskBatchList, type AdminTaskErrorCategoryFilter, type AdminTaskList, type AdminTaskRunningStateFilter, type AdminTaskStatusFilter, type AdminTaskTimeRangeFilter, type AdminTaskTypeFilter, type AdminTaskUpstreamStateFilter, type AdminTaskRetryableFilter, type AdminTaskUpstreamRequest, type AdminAuditLog, type AdminWorker } from '@/lib/api/admin';
import { FOCUS_RING, type AdminLabels } from './adminUtils';
import { ConfirmDialog, type ConfirmDialogState, EmptyList, FilterPill, InlineBadge, SectionHeader } from './AdminSectionPrimitives';
import { taskErrorDiagnosticSummary } from './taskErrorPreview';

const STATUS_FILTERS: readonly AdminTaskStatusFilter[] = ['all', 'queued', 'processing', 'succeeded', 'failed'];
const TYPE_FILTERS: readonly AdminTaskTypeFilter[] = ['all', 'image', 'video'];
const ERROR_CATEGORY_FILTERS: readonly AdminTaskErrorCategoryFilter[] = ['all', 'auth', 'quota', 'timeout', 'parameter', 'rate_limit', 'storage', 'worker', 'provider', 'unknown'];
const TIME_RANGE_FILTERS: readonly AdminTaskTimeRangeFilter[] = ['all', '1h', 'today', 'yesterday', '7d'];
const RUNNING_STATE_FILTERS: readonly AdminTaskRunningStateFilter[] = ['all', 'active', 'stuck'];
const UPSTREAM_STATE_FILTERS: readonly AdminTaskUpstreamStateFilter[] = ['all', 'has_task_id', 'missing_task_id', 'repaired', 'recoverable', 'result_unfinished'];
const RETRYABLE_FILTERS: readonly AdminTaskRetryableFilter[] = ['all', 'true', 'false'];
const AUTO_REFRESH_OPTIONS = [0, 10_000, 30_000, 60_000] as const;
const DEFAULT_AUTO_REFRESH_MS = 10_000;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const PROMPT_PREVIEW_LENGTH = 72;
const TASK_TABLE_COLUMN_COUNT = 9;
const TASK_PREFS_DENSITY_KEY = 'aics.admin.tasks.density';
const TASK_PREFS_COLUMNS_KEY = 'aics.admin.tasks.columns';
const TASK_PREFS_AUTO_REFRESH_KEY = 'aics.admin.tasks.auto_refresh_ms';
const TASK_PREFS_AUTO_REFRESH_MIGRATION_KEY = 'aics.admin.tasks.auto_refresh_default_v2';
type TaskViewMode = 'batches' | 'tasks';
type SortDirection = 'asc' | 'desc';
type TaskSortKey = 'task' | 'prompt' | 'batch' | 'user' | 'model' | 'worker' | 'credits' | 'failure' | 'time' | 'status';
type TaskSortState = Readonly<{ key: TaskSortKey; direction: SortDirection }>;
type TaskDensity = 'standard' | 'compact';
type TaskColumnKey = 'task' | 'prompt' | 'user' | 'model' | 'credits' | 'failure' | 'time';
type TaskColumnVisibility = Readonly<Record<TaskColumnKey, boolean>>;
type AdminBulkTaskFailure = AdminBulkTaskResult['failed'][number];
const DEFAULT_TASK_COLUMNS: TaskColumnVisibility = { task: true, prompt: true, user: true, model: true, credits: true, failure: true, time: true };
const DEFAULT_TASK_SORT: TaskSortState = { key: 'time', direction: 'desc' };


export function TasksSection({
  active,
  labels,
  tasks,
  stats,
  summary,
  total,
  limit,
  offset,
  query,
  statusFilter,
  typeFilter,
  workerIDFilter,
  errorCategoryFilter,
  timeRangeFilter,
  runningStateFilter,
  providerFilter,
  providerModelFilter,
  modelFilter,
  batchIDFilter,
  upstreamStateFilter,
  retryableFilter,
  loading,
  workers,
  onQueryChange,
  onStatusChange,
  onTypeChange,
  onWorkerIDChange,
  onErrorCategoryChange,
  onTimeRangeChange,
  onRunningStateChange,
  onAdvancedFiltersChange,
  onPage,
  onRefresh,
  onPageSizeChange,
  onTaskUpdated,
  onTaskDeleted,
}: Readonly<{
  active: boolean;
  labels: AdminLabels;
  tasks: readonly AdminTask[];
  stats: AdminTaskList['stats'];
  summary?: AdminTaskList['stats'];
  total: number;
  limit: number;
  offset: number;
  query: string;
  statusFilter: AdminTaskStatusFilter;
  typeFilter: AdminTaskTypeFilter;
  workerIDFilter: string;
  errorCategoryFilter: AdminTaskErrorCategoryFilter;
  timeRangeFilter: AdminTaskTimeRangeFilter;
  runningStateFilter: AdminTaskRunningStateFilter;
  providerFilter: string;
  providerModelFilter: string;
  modelFilter: string;
  batchIDFilter: string;
  upstreamStateFilter: AdminTaskUpstreamStateFilter;
  retryableFilter: AdminTaskRetryableFilter;
  loading: boolean;
  workers: readonly AdminWorker[];
  onQueryChange: (query: string) => void;
  onStatusChange: (status: AdminTaskStatusFilter) => void;
  onTypeChange: (type: AdminTaskTypeFilter) => void;
  onWorkerIDChange: (workerID: string) => void;
  onErrorCategoryChange: (category: AdminTaskErrorCategoryFilter) => void;
  onTimeRangeChange: (range: AdminTaskTimeRangeFilter) => void;
  onRunningStateChange: (state: AdminTaskRunningStateFilter) => void;
  onAdvancedFiltersChange: (filters: Readonly<{ provider?: string; providerModel?: string; model?: string; batchID?: string; upstreamState?: AdminTaskUpstreamStateFilter; retryable?: AdminTaskRetryableFilter }>) => void;
  onPage: (offset: number) => void;
  onRefresh: () => void;
  onPageSizeChange: (limit: number) => void;
  onTaskUpdated?: (task: AdminTask) => void;
  onTaskDeleted?: (id: string) => void;
}>) {
  const [viewMode, setViewMode] = useState<TaskViewMode>('tasks');
  const [selectedTaskIDs, setSelectedTaskIDs] = useState<readonly string[]>([]);
  const [selectedBatchIDs, setSelectedBatchIDs] = useState<readonly string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkFailures, setBulkFailures] = useState<readonly AdminBulkTaskFailure[]>([]);
  const [autoRefreshMS, setAutoRefreshMS] = useState<(typeof AUTO_REFRESH_OPTIONS)[number]>(() => storedAutoRefreshMS());
  const [density, setDensity] = useState<TaskDensity>(() => storedTaskDensity());
  const [columnVisibility, setColumnVisibility] = useState<TaskColumnVisibility>(() => storedTaskColumns());
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AdminTask>();
  const [expandedBatchID, setExpandedBatchID] = useState<string>();
  const [batchDetails, setBatchDetails] = useState<Readonly<Record<string, AdminTaskBatch>>>({});
  const [loadingBatchID, setLoadingBatchID] = useState<string>();
  const [batches, setBatches] = useState<readonly AdminTaskBatch[]>([]);
  const [batchStats, setBatchStats] = useState<AdminTaskBatchList['stats']>(stats);
  const [batchSummary, setBatchSummary] = useState<AdminTaskBatchList['stats']>(summary ?? stats);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchLimit, setBatchLimit] = useState(limit);
  const [batchOffset, setBatchOffset] = useState(0);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [cancelingID, setCancelingID] = useState<string>();
  const [syncingID, setSyncingID] = useState<string>();
  const [deletingID, setDeletingID] = useState<string>();
  const [retryingID, setRetryingID] = useState<string>();
  const [requeueingID, setRequeueingID] = useState<string>();
  const [savingUpstreamID, setSavingUpstreamID] = useState<string>();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();
  const [notice, setNotice] = useState('');
  const taskSearchInputRef = useRef<HTMLInputElement | null>(null);
  const bulkTaskSelectButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreMobileBulkFocusRef = useRef(false);
  const taskSummary = summary ?? stats;
  const activeSummary = viewMode === 'batches' ? batchSummary : taskSummary;
  const activeStats = viewMode === 'batches' ? batchStats : stats;
  const activeTotal = viewMode === 'batches' ? batchTotal : total;
  const activeLimit = viewMode === 'batches' ? batchLimit : limit;
  const activeOffset = viewMode === 'batches' ? batchOffset : offset;
  const activeLoading = viewMode === 'batches' ? batchLoading : loading;
  const failedRate = activeSummary.total > 0 ? `${Math.round((activeSummary.counts.failed / activeSummary.total) * 100)}%` : '0%';
  const pageStart = activeTotal > 0 ? activeOffset + 1 : 0;
  const pageEnd = Math.min(activeOffset + activeLimit, activeTotal);
  const globalStuckCount = activeStats.stuck_count ?? 0;
  const globalStuckTaskIDs = activeStats.stuck_task_ids ?? [];
  const visibleTaskIDs = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const selectedCount = selectedTaskIDs.length;
  const allVisibleSelected = visibleTaskIDs.length > 0 && visibleTaskIDs.every((id) => selectedTaskIDs.includes(id));
  const workerOptions = useMemo(() => taskWorkerOptions(tasks, workers), [tasks, workers]);
  const advancedFilterCount = [
    workerIDFilter,
    errorCategoryFilter !== 'all',
    timeRangeFilter !== 'all',
    runningStateFilter !== 'all',
    upstreamStateFilter !== 'all',
    retryableFilter !== 'all',
    providerFilter,
    providerModelFilter,
    modelFilter,
    batchIDFilter,
  ].filter(Boolean).length;
  const shouldShowAdvancedFilters = showAdvancedFilters;
  const refreshCurrentView = useCallback(() => {
    if (viewMode === 'batches') {
      setReloadToken((current) => current + 1);
      if (expandedBatchID) {
        setLoadingBatchID(expandedBatchID);
        void getAdminTaskBatch(expandedBatchID)
          .then((detail) => setBatchDetails((current) => ({ ...current, [expandedBatchID]: detail })))
          // Keep the visible child tasks during a transient refresh failure.
          .catch(() => undefined)
          .finally(() => setLoadingBatchID((current) => current === expandedBatchID ? undefined : current));
      }
      return;
    }
    onRefresh();
  }, [expandedBatchID, onRefresh, viewMode]);
  const refreshCurrentViewRef = useRef(refreshCurrentView);

  useEffect(() => {
    refreshCurrentViewRef.current = refreshCurrentView;
  }, [refreshCurrentView]);

  useEffect(() => {
    setSelectedTaskIDs((current) => current.filter((id) => visibleTaskIDs.includes(id)));
  }, [visibleTaskIDs]);

  useEffect(() => {
    if (!restoreMobileBulkFocusRef.current || selectedTaskIDs.length !== 0) return;
    restoreMobileBulkFocusRef.current = false;
    bulkTaskSelectButtonRef.current?.focus();
  }, [selectedTaskIDs.length]);

  useEffect(() => {
    window.localStorage.setItem(TASK_PREFS_DENSITY_KEY, density);
  }, [density]);

  useEffect(() => {
    window.localStorage.setItem(TASK_PREFS_COLUMNS_KEY, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    window.localStorage.setItem(TASK_PREFS_AUTO_REFRESH_KEY, String(autoRefreshMS));
    window.localStorage.setItem(TASK_PREFS_AUTO_REFRESH_MIGRATION_KEY, '1');
  }, [autoRefreshMS]);

  useEffect(() => {
    if (!active) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refreshCurrentViewRef.current();
    };
    refreshIfVisible();
    if (autoRefreshMS === 0) return;
    const timer = window.setInterval(refreshIfVisible, autoRefreshMS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [active, autoRefreshMS]);


  useEffect(() => {
    if (viewMode !== 'batches') return;
    let cancelled = false;
    setBatchLoading(true);
    setBatchError('');
    listAdminTaskBatches({ query, status: statusFilter, type: typeFilter, worker_id: workerIDFilter, error_category: errorCategoryFilter, time_range: timeRangeFilter, running_state: runningStateFilter, provider: providerFilter, provider_model: providerModelFilter, model: modelFilter, batch_id: batchIDFilter, upstream_state: upstreamStateFilter, retryable: retryableFilter, limit: batchLimit, offset: batchOffset })
      .then((result) => {
        if (cancelled) return;
        setBatches(result.batches);
        setBatchStats(result.stats);
        setBatchSummary(result.summary ?? result.stats);
        setBatchTotal(result.total);
        setBatchLimit(result.limit);
        setBatchOffset(result.offset);
      })
      .catch((error) => {
        if (cancelled) return;
        setBatchError(error instanceof Error ? error.message : '加载批次失败');
      })
      .finally(() => {
        if (!cancelled) setBatchLoading(false);
      });
    return () => { cancelled = true; };
  }, [batchIDFilter, batchLimit, batchOffset, errorCategoryFilter, modelFilter, providerFilter, providerModelFilter, query, reloadToken, retryableFilter, runningStateFilter, statusFilter, timeRangeFilter, typeFilter, upstreamStateFilter, viewMode, workerIDFilter]);

  useEffect(() => {
    setBatchOffset(0);
  }, [batchIDFilter, errorCategoryFilter, modelFilter, providerFilter, providerModelFilter, query, retryableFilter, runningStateFilter, statusFilter, timeRangeFilter, typeFilter, upstreamStateFilter, workerIDFilter]);

  const openBatch = async (batch: AdminTaskBatch) => {
    if (expandedBatchID === batch.id) {
      setExpandedBatchID(undefined);
      return;
    }
    setExpandedBatchID(batch.id);
    if (batchDetails[batch.id]?.tasks) return;
    setLoadingBatchID(batch.id);
    try {
      const detail = await getAdminTaskBatch(batch.id);
      setBatchDetails((current) => ({ ...current, [batch.id]: detail }));
    } catch {
      setBatchDetails((current) => ({ ...current, [batch.id]: batch }));
    } finally {
      setLoadingBatchID(undefined);
    }
  };

  const openTaskDetails = (task: AdminTask) => {
    setNotice('');
    setSelectedTask(task);
  };

  const patchTaskEverywhere = (updated: AdminTask) => {
    onTaskUpdated?.(updated);
    setSelectedTask((current) => current?.id === updated.id ? mergeAdminTask(current, updated) : current);
    setBatchDetails((current) => {
      let changed = false;
      const next: Record<string, AdminTaskBatch> = { ...current };
      for (const [batchID, detail] of Object.entries(current)) {
        if (!detail.tasks?.some((task) => task.id === updated.id)) continue;
        next[batchID] = { ...detail, tasks: detail.tasks.map((task) => task.id === updated.id ? mergeAdminTask(task, updated) : task) };
        changed = true;
      }
      return changed ? next : current;
    });
  };

  const removeTaskEverywhere = (id: string) => {
    onTaskDeleted?.(id);
    setSelectedTask((current) => current?.id === id ? undefined : current);
    setBatchDetails((current) => {
      let changed = false;
      const next: Record<string, AdminTaskBatch> = { ...current };
      for (const [batchID, detail] of Object.entries(current)) {
        if (!detail.tasks?.some((task) => task.id === id)) continue;
        next[batchID] = { ...detail, tasks: detail.tasks.filter((task) => task.id !== id) };
        changed = true;
      }
      return changed ? next : current;
    });
  };

  const performCancelTask = async (task: AdminTask) => {
    setCancelingID(task.id);
    try {
      const updated = await cancelAdminTask(task.id);
      patchTaskEverywhere(updated);
      setReloadToken((current) => current + 1);
      setNotice(`任务 ${task.id} 已取消`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '取消任务失败');
    } finally {
      setCancelingID(undefined);
    }
  };

  const cancelTask = (task: AdminTask) => {
    if (!isCancelableTask(task) || cancelingID) return;
    setConfirmDialog({
      title: '确认取消任务？',
      description: `任务 ${task.id} 会被标记为失败，并退回已扣除的积分。`,
      confirmLabel: '取消任务',
      tone: 'danger',
      onConfirm: () => void performCancelTask(task),
    });
  };


  const performDeleteTask = async (task: AdminTask) => {
    setDeletingID(task.id);
    try {
      await deleteAdminTask(task.id);
      removeTaskEverywhere(task.id);
      setReloadToken((current) => current + 1);
      setNotice(`任务 ${task.id} 已删除`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除任务失败');
    } finally {
      setDeletingID(undefined);
    }
  };

  const deleteTask = (task: AdminTask) => {
    if (deletingID) return;
    setConfirmDialog({
      title: '确认删除任务？',
      description: `任务 ${task.id} 会从数据库删除，关联资产和积分流水将解除任务关联。此操作不可恢复。`,
      confirmLabel: '删除任务',
      tone: 'danger',
      onConfirm: () => void performDeleteTask(task),
    });
  };

  const performCancelBatch = async (batch: AdminTaskBatch) => {
    setCancelingID(batch.id);
    try {
      await cancelAdminTaskBatch(batch.id);
      refreshCurrentView();
      setNotice(`批次 ${batch.id} 已取消`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '取消批次失败');
    } finally {
      setCancelingID(undefined);
    }
  };

  const cancelBatch = (batch: AdminTaskBatch) => {
    if (!isCancelableBatch(batch) || cancelingID) return;
    setConfirmDialog({
      title: '确认取消批次？',
      description: `批次 ${batch.id} 中仍在排队/处理的任务会被取消。`,
      confirmLabel: '取消批次',
      tone: 'danger',
      onConfirm: () => void performCancelBatch(batch),
    });
  };



  const performRetryTask = async (task: AdminTask) => {
    setRetryingID(task.id);
    try {
      const created = await retryAdminTask(task.id);
      setNotice(`已创建重试任务：${created.id}`);
      setReloadToken((current) => current + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '重试失败');
    } finally {
      setRetryingID(undefined);
    }
  };

  const retryTask = (task: AdminTask) => {
    if (retryingID) return;
    setConfirmDialog({
      title: '确认重试任务？',
      description: `任务 ${task.id} 会基于原参数创建一个新任务，并重新扣除积分。原任务不会被覆盖。`,
      confirmLabel: '创建重试任务',
      tone: 'warning',
      onConfirm: () => void performRetryTask(task),
    });
  };

  const performRequeueTask = async (task: AdminTask) => {
    setRequeueingID(task.id);
    try {
      const updated = await requeueAdminTask(task.id, 'admin_requeue');
      patchTaskEverywhere(updated);
      setReloadToken((current) => current + 1);
      setNotice(`任务 ${task.id} 已重新入队`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '重新入队失败');
    } finally {
      setRequeueingID(undefined);
    }
  };

  const requeueTask = (task: AdminTask) => {
    if (requeueingID) return;
    setConfirmDialog({
      title: '确认重新入队？',
      description: `任务 ${task.id} 会被放回队列，适用于 Worker 锁定、长时间排队或处理中卡住的场景。`,
      confirmLabel: '重新入队',
      tone: 'warning',
      onConfirm: () => void performRequeueTask(task),
    });
  };

  const syncTaskStatus = async (task: AdminTask) => {
    if (!isSyncableTask(task) || syncingID) return;
    setSyncingID(task.id);
    try {
      const updated = await syncAdminTaskStatus(task.id);
      patchTaskEverywhere(updated);
      setReloadToken((current) => current + 1);
      setNotice(`任务 ${task.id} 同步请求已提交`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '同步状态失败');
    } finally {
      setSyncingID(undefined);
    }
  };

  const setTaskUpstreamTaskID = async (task: AdminTask, upstreamTaskID: string): Promise<AdminTask | undefined> => {
    if (savingUpstreamID) return undefined;
    setSavingUpstreamID(task.id);
    try {
      const updated = await setAdminTaskUpstreamTaskID(task.id, upstreamTaskID);
      patchTaskEverywhere(updated);
      setReloadToken((current) => current + 1);
      setNotice(`任务 ${task.id} 已补填上游 task_id`);
      return updated;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '补填上游 task_id 失败');
      return undefined;
    } finally {
      setSavingUpstreamID(undefined);
    }
  };


  const resetFilters = () => {
    onQueryChange('');
    onStatusChange('all');
    onTypeChange('all');
    onWorkerIDChange('');
    onErrorCategoryChange('all');
    onTimeRangeChange('all');
    onRunningStateChange('all');
    onAdvancedFiltersChange({ provider: '', providerModel: '', model: '', batchID: '', upstreamState: 'all', retryable: 'all' });
    setBatchOffset(0);
  };

  const copyStuckTaskIDs = async () => {
    await navigator.clipboard.writeText(globalStuckTaskIDs.join('\n'));
    setNotice(`已复制 ${globalStuckTaskIDs.length} 个卡住风险任务 ID`);
  };

  const handlePage = (nextOffset: number) => {
    if (viewMode === 'batches') {
      setBatchOffset(Math.max(0, nextOffset));
      return;
    }
    onPage(nextOffset);
  };

  const handlePageSizeChange = (nextLimit: number) => {
    if (viewMode === 'batches') {
      setBatchLimit(nextLimit);
      setBatchOffset(0);
      return;
    }
    onPageSizeChange(nextLimit);
  };

  const toggleTaskSelected = (id: string) => {
    setSelectedTaskIDs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleVisibleTasksSelected = () => {
    setSelectedTaskIDs(allVisibleSelected ? [] : visibleTaskIDs);
  };

  const applyBulkResult = (result: AdminBulkTaskResult, successText: string) => {
    setSelectedTaskIDs((current) => {
      const next = current.filter((id) => !result.succeeded.includes(id));
      if (current.length > 0 && next.length === 0 && window.matchMedia('(max-width: 767px)').matches) {
        restoreMobileBulkFocusRef.current = true;
      }
      return next;
    });
    setReloadToken((current) => current + 1);
    refreshCurrentView();
    setBulkFailures(result.failed);
    const failedText = result.failed.length > 0 ? `，失败 ${result.failed.length} 个` : '';
    setNotice(`${successText} ${result.succeeded.length} 个${failedText}`);
  };

  const confirmBulkAction = (action: 'sync' | 'requeue' | 'cancel' | 'delete') => {
    const config = bulkActionConfig(action, selectedCount);
    if (!config.confirm) {
      void runBulkAction(action);
      return;
    }
    setConfirmDialog({ ...config, onConfirm: () => void runBulkAction(action) });
  };

  const runBulkAction = async (action: 'sync' | 'requeue' | 'cancel' | 'delete') => {
    if (selectedTaskIDs.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      if (action === 'sync') applyBulkResult(await bulkSyncAdminTasks(selectedTaskIDs), '已提交同步请求');
      if (action === 'requeue') applyBulkResult(await bulkRequeueAdminTasks(selectedTaskIDs), '已重新入队');
      if (action === 'cancel') applyBulkResult(await bulkCancelAdminTasks(selectedTaskIDs), '已取消');
      if (action === 'delete') {
        const result = await bulkDeleteAdminTasks(selectedTaskIDs);
        result.succeeded.forEach((id) => removeTaskEverywhere(id));
        applyBulkResult(result, '已删除');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '批量操作失败');
    } finally {
      setBulkBusy(false);
    }
  };

  const visibleBatchIDs = batches.map((batch) => batch.id);
  const allVisibleBatchesSelected = visibleBatchIDs.length > 0 && visibleBatchIDs.every((id) => selectedBatchIDs.includes(id));
  const toggleBatchSelected = (id: string) => {
    setSelectedBatchIDs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const toggleVisibleBatchesSelected = () => {
    setSelectedBatchIDs(allVisibleBatchesSelected ? [] : visibleBatchIDs);
  };
  const confirmBulkBatchAction = (action: 'sync' | 'cancel') => {
    if (action === 'sync') {
      void runBulkBatchAction(action);
      return;
    }
    setConfirmDialog({
      title: '确认批量取消批次？',
      description: `${selectedBatchIDs.length} 个批次中仍在排队/处理的任务会被取消。`,
      confirmLabel: '批量取消批次',
      tone: 'danger',
      onConfirm: () => void runBulkBatchAction(action),
    });
  };
  const runBulkBatchAction = async (action: 'sync' | 'cancel') => {
    if (selectedBatchIDs.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      const result = action === 'sync' ? await bulkSyncAdminTaskBatches(selectedBatchIDs) : await bulkCancelAdminTaskBatches(selectedBatchIDs);
      setBulkFailures(result.failed);
      setSelectedBatchIDs((current) => current.filter((id) => !result.succeeded.includes(id)));
      setReloadToken((current) => current + 1);
      const actionText = action === 'sync' ? '已提交批次同步请求' : '批次取消成功';
      setNotice(`${actionText} ${result.succeeded.length} 个，影响任务 ${result.affected_tasks ?? 0} 个${result.failed.length > 0 ? `，失败 ${result.failed.length} 个` : ''}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '批量批次操作失败');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <section className="admin-config-section">
      <div className="flex flex-col gap-2 md:gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="task-section-header">
          <SectionHeader icon={<CheckSquare size={16} />} eyebrow="任务运营" title="任务与批次" subtitle="监控生成任务、批次执行、Worker 分配和上游状态，并处理异常任务。" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-wrap md:items-center xl:justify-end">
          <CompactMetric className="w-full md:w-auto" label={viewMode === 'batches' ? '批次数' : labels.tasksStatsTotal} value={String(activeSummary.total)} onClick={() => { onStatusChange('all'); setViewMode('tasks'); }} active={viewMode === 'tasks' && statusFilter === 'all'} />
          <CompactMetric className="w-full md:w-auto" label={labels.tasksStatsCredits} value={String(activeSummary.credits_used)} tone="indigo" />
          <CompactMetric className="w-full md:w-auto" label={labels.tasksStatsFailed} value={String(activeSummary.counts.failed)} hint={failedRate} tone="amber" onClick={() => { onStatusChange('failed'); setViewMode('tasks'); }} active={viewMode === 'tasks' && statusFilter === 'failed'} />
          <CompactMetric className="w-full md:w-auto" label={labels.tasksStatsRunning} value={String(activeSummary.counts.queued + activeSummary.counts.processing)} hint={`${labels.tasksQueued} ${activeSummary.counts.queued} / ${labels.tasksProcessing} ${activeSummary.counts.processing}`} compactHint={`${activeSummary.counts.queued}/${activeSummary.counts.processing}`} tone="emerald" onClick={() => { onStatusChange('processing'); setViewMode('tasks'); }} active={viewMode === 'tasks' && statusFilter === 'processing'} />
        </div>
      </div>

      {globalStuckCount > 0 ? (
        <div className="mt-4 rounded-surface border border-warning bg-warning-soft px-3 py-2.5 text-xs font-bold leading-5 text-warning" role="status">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <AlertTriangle size={16} className="mr-2 inline" aria-hidden="true" />
              全站发现 {globalStuckCount} 个卡住风险任务：排队超过 10 分钟、处理超过 45 分钟、租约/Worker 异常，或已有结果但状态未完成。建议优先同步状态、检查 Worker，必要时重新入队。
              {globalStuckTaskIDs.length > 0 ? <span className="admin-mono ml-1 break-all">{globalStuckTaskIDs.join('、')}{globalStuckCount > globalStuckTaskIDs.length ? ` 等 ${globalStuckCount} 个` : ''}</span> : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {globalStuckTaskIDs[0] ? (
                <button type="button" onClick={() => { setViewMode('tasks'); onQueryChange(globalStuckTaskIDs[0] ?? ''); setNotice('已切到任务视图并搜索首个风险任务'); }} className={`rounded-control border border-warning bg-surface px-2.5 py-1 text-xs font-black text-warning hover:brightness-95 ${FOCUS_RING}`}>搜索首个风险任务</button>
              ) : null}
              {globalStuckTaskIDs.length > 0 ? (
                <button type="button" onClick={() => void copyStuckTaskIDs()} className={`rounded-control border border-warning bg-surface px-2.5 py-1 text-xs font-black text-warning hover:brightness-95 ${FOCUS_RING}`}>复制 ID</button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}


      <div className="admin-toolbar mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-surface p-3 md:flex md:flex-row md:flex-wrap md:items-center">
        <div className="flex shrink-0 rounded-control border border-line bg-surface p-0.5" aria-label="任务视图">
          <button type="button" onClick={() => setViewMode('tasks')} aria-pressed={viewMode === 'tasks'} className={`rounded-control px-2.5 py-1.5 text-xs font-black ${viewMode === 'tasks' ? 'bg-accent-soft text-accent' : 'text-secondary hover:bg-subtle hover:text-ink'} ${FOCUS_RING}`}>按任务</button>
          <button type="button" onClick={() => setViewMode('batches')} aria-pressed={viewMode === 'batches'} className={`rounded-control px-2.5 py-1.5 text-xs font-black ${viewMode === 'batches' ? 'bg-accent-soft text-accent' : 'text-secondary hover:bg-subtle hover:text-ink'} ${FOCUS_RING}`}>按批次</button>
        </div>
        <button type="button" onClick={() => setShowAdvancedFilters((current) => !current)} aria-expanded={shouldShowAdvancedFilters} className={`col-start-2 row-start-1 inline-flex items-center justify-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink md:col-auto md:row-auto ${FOCUS_RING}`}>
          <SlidersHorizontal size={13} aria-hidden="true" />
          {shouldShowAdvancedFilters ? '收起筛选' : '更多筛选'}{advancedFilterCount > 0 ? ` · ${advancedFilterCount}` : ''}
        </button>
        <FilterGroup label="状态" inline scrollOnMobile className="col-span-2 min-w-0 md:col-auto md:shrink-0">
          {STATUS_FILTERS.map((status) => <FilterPill key={status} active={statusFilter === status} onClick={() => onStatusChange(status)} count={statusCount(activeSummary, status)}>{taskStatusLabel(labels, status)}</FilterPill>)}
        </FilterGroup>
        <div className="admin-config-search col-span-2 flex min-w-0 w-full flex-1 items-center gap-2 px-3 md:col-auto md:min-w-[280px]">
          <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
          <input ref={taskSearchInputRef} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={labels.tasksSearchPlaceholder} aria-label={labels.tasksSearchPlaceholder} name="admin-task-search" autoComplete="off" spellCheck={false} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted" />
          {query ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onQueryChange(''); taskSearchInputRef.current?.focus(); }}
              aria-label={labels.tasksClearSearch}
              title={labels.tasksClearSearch}
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-control text-muted hover:bg-subtle hover:text-ink ${FOCUS_RING}`}
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <FilterGroup label="类型" inline scrollOnMobile className="col-span-2 min-w-0 md:col-auto md:shrink-0">
          {TYPE_FILTERS.map((type) => <FilterPill key={type} active={typeFilter === type} onClick={() => onTypeChange(type)}>{taskTypeLabel(labels, type)}</FilterPill>)}
        </FilterGroup>
      </div>
      {shouldShowAdvancedFilters ? <div className="admin-toolbar mt-2 flex flex-col gap-2 rounded-surface p-3 lg:flex-row lg:flex-wrap lg:items-center">
        <SelectFilter label="Worker" value={workerIDFilter} onChange={onWorkerIDChange} options={[{ value: '', label: '全部 Worker' }, ...workerOptions]} />
        <SelectFilter label="错误分类" value={errorCategoryFilter} onChange={(value) => onErrorCategoryChange(value as AdminTaskErrorCategoryFilter)} options={ERROR_CATEGORY_FILTERS.map((item) => ({ value: item, label: errorCategoryLabel(item) }))} />
        <SelectFilter label="时间" value={timeRangeFilter} onChange={(value) => onTimeRangeChange(value as AdminTaskTimeRangeFilter)} options={TIME_RANGE_FILTERS.map((item) => ({ value: item, label: timeRangeLabel(item) }))} />
        <SelectFilter label="运行态" value={runningStateFilter} onChange={(value) => onRunningStateChange(value as AdminTaskRunningStateFilter)} options={RUNNING_STATE_FILTERS.map((item) => ({ value: item, label: runningStateLabel(item) }))} />
        <SelectFilter label="上游" value={upstreamStateFilter} onChange={(value) => onAdvancedFiltersChange({ upstreamState: value as AdminTaskUpstreamStateFilter })} options={UPSTREAM_STATE_FILTERS.map((item) => ({ value: item, label: upstreamStateLabel(item) }))} />
        <SelectFilter label="可重试" value={retryableFilter} onChange={(value) => onAdvancedFiltersChange({ retryable: value as AdminTaskRetryableFilter })} options={RETRYABLE_FILTERS.map((item) => ({ value: item, label: retryableLabel(item) }))} />
        <TextFilter label="Provider" value={providerFilter} onChange={(value) => onAdvancedFiltersChange({ provider: value })} />
        <TextFilter label="上游模型" value={providerModelFilter} onChange={(value) => onAdvancedFiltersChange({ providerModel: value })} />
        <TextFilter label="模型" value={modelFilter} onChange={(value) => onAdvancedFiltersChange({ model: value })} />
        <TextFilter label="Batch" value={batchIDFilter} onChange={(value) => onAdvancedFiltersChange({ batchID: value })} />
        <SelectFilter label="自动刷新" value={String(autoRefreshMS)} onChange={(value) => setAutoRefreshMS(Number(value) as (typeof AUTO_REFRESH_OPTIONS)[number])} options={AUTO_REFRESH_OPTIONS.map((item) => ({ value: String(item), label: item === 0 ? '关闭' : `${item / 1000}s` }))} />
        <button type="button" onClick={() => setDensity((current) => current === 'standard' ? 'compact' : 'standard')} className={`rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>密度：{density === 'standard' ? '标准' : '紧凑'}</button>
        <div className="relative">
          <button type="button" onClick={() => setShowColumnMenu((current) => !current)} className={`inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}><Settings2 size={13} />列</button>
          {showColumnMenu ? (
            <div className="absolute right-0 z-popover mt-2 w-40 rounded-surface border border-line bg-surface p-2 text-xs font-bold text-secondary shadow-floating">
              <button type="button" onClick={() => setColumnVisibility(DEFAULT_TASK_COLUMNS)} className={`mb-1 w-full rounded-control border border-line px-2 py-1.5 text-left font-black hover:bg-subtle ${FOCUS_RING}`}>恢复默认列</button>
              {Object.keys(DEFAULT_TASK_COLUMNS).map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 hover:bg-subtle">
                  <input type="checkbox" checked={columnVisibility[key as TaskColumnKey]} onChange={() => setColumnVisibility((current) => ({ ...current, [key]: !current[key as TaskColumnKey] }))} />
                  {taskColumnLabel(labels, key as TaskColumnKey)}
                </label>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-1">
          <span className="px-1 text-xs font-black text-secondary">快捷修复</span>
          <QuickFilterButton onClick={() => onAdvancedFiltersChange({ upstreamState: 'missing_task_id' })}>无 task_id</QuickFilterButton>
          <QuickFilterButton onClick={() => onAdvancedFiltersChange({ upstreamState: 'recoverable' })}>可补偿</QuickFilterButton>
          <QuickFilterButton onClick={() => onAdvancedFiltersChange({ upstreamState: 'repaired' })}>已修复</QuickFilterButton>
          <QuickFilterButton onClick={() => onAdvancedFiltersChange({ upstreamState: 'result_unfinished' })}>结果未完成</QuickFilterButton>
          <QuickFilterButton onClick={() => onAdvancedFiltersChange({ retryable: 'true' })}>可重试</QuickFilterButton>
        </div>
        {(query || statusFilter !== 'all' || typeFilter !== 'all' || workerIDFilter || errorCategoryFilter !== 'all' || timeRangeFilter !== 'all' || runningStateFilter !== 'all' || providerFilter || providerModelFilter || modelFilter || batchIDFilter || upstreamStateFilter !== 'all' || retryableFilter !== 'all') ? <button type="button" onClick={resetFilters} className={`rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>重置筛选</button> : null}
      </div> : null}
      {viewMode === 'tasks' && tasks.length > 0 ? (
        <div className={`admin-task-bulk-toolbar mt-3 flex flex-wrap items-center justify-between gap-2 rounded-surface border border-line bg-surface px-3 py-2 text-xs font-bold text-secondary ${selectedCount > 0 ? 'max-md:sticky max-md:shadow-floating' : ''}`}>
          <button ref={bulkTaskSelectButtonRef} type="button" onClick={toggleVisibleTasksSelected} className={`inline-flex items-center gap-1 rounded-control border border-line px-2 py-1.5 font-black hover:bg-subtle ${FOCUS_RING}`}><CheckSquare size={13} />{allVisibleSelected ? '取消选择本页' : '选择本页'}</button>
          <div className="flex flex-wrap items-center gap-2">
            <span>已选 {selectedCount} 个</span>
            <div className={`flex items-center gap-1.5 ${selectedCount === 0 ? 'max-md:hidden' : ''}`}>
              <button type="button" aria-label="同步选中任务" title="同步选中任务" disabled={selectedCount === 0 || bulkBusy} onClick={() => confirmBulkAction('sync')} className={`inline-flex size-8 items-center justify-center rounded-control border border-line bg-surface font-black hover:bg-subtle disabled:opacity-50 md:h-auto md:w-auto md:px-2 md:py-1.5 ${FOCUS_RING}`}><RefreshCw size={14} aria-hidden="true" /><span className="hidden md:inline">同步</span></button>
              <button type="button" aria-label="将选中任务重新入队" title="将选中任务重新入队" disabled={selectedCount === 0 || bulkBusy} onClick={() => confirmBulkAction('requeue')} className={`inline-flex size-8 items-center justify-center rounded-control border border-warning bg-warning-soft font-black text-warning disabled:opacity-50 md:h-auto md:w-auto md:px-2 md:py-1.5 ${FOCUS_RING}`}><TimerReset size={14} aria-hidden="true" /><span className="hidden md:inline">重新入队</span></button>
              <button type="button" aria-label="取消选中任务" title="取消选中任务" disabled={selectedCount === 0 || bulkBusy} onClick={() => confirmBulkAction('cancel')} className={`inline-flex size-8 items-center justify-center rounded-control border border-danger bg-danger-soft font-black text-danger disabled:opacity-50 md:h-auto md:w-auto md:px-2 md:py-1.5 ${FOCUS_RING}`}><XCircle size={14} aria-hidden="true" /><span className="hidden md:inline">取消</span></button>
              <button type="button" aria-label="删除选中任务" title="删除选中任务" disabled={selectedCount === 0 || bulkBusy} onClick={() => confirmBulkAction('delete')} className={`inline-flex size-8 items-center justify-center rounded-control border border-danger bg-danger-soft font-black text-danger disabled:opacity-50 md:h-auto md:w-auto md:px-2 md:py-1.5 ${FOCUS_RING}`}><Trash2 size={14} aria-hidden="true" /><span className="hidden md:inline">删除</span></button>
            </div>
          </div>
        </div>
      ) : null}
      {viewMode === 'batches' && batches.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-surface border border-line bg-surface px-3 py-2 text-xs font-bold text-secondary">
          <button type="button" onClick={toggleVisibleBatchesSelected} className={`inline-flex items-center gap-1 rounded-control border border-line px-2 py-1.5 font-black hover:bg-subtle ${FOCUS_RING}`}><CheckSquare size={13} />{allVisibleBatchesSelected ? '取消选择本页批次' : '选择本页批次'}</button>
          <div className="flex flex-wrap items-center gap-2">
            <span>已选批次 {selectedBatchIDs.length} 个</span>
            <button type="button" disabled={selectedBatchIDs.length === 0 || bulkBusy} onClick={() => confirmBulkBatchAction('sync')} className={`rounded-control border border-line bg-surface px-2 py-1.5 font-black hover:bg-subtle disabled:opacity-50 ${FOCUS_RING}`}>同步子任务</button>
            <button type="button" disabled={selectedBatchIDs.length === 0 || bulkBusy} onClick={() => confirmBulkBatchAction('cancel')} className={`rounded-control border border-danger bg-danger-soft px-2 py-1.5 font-black text-danger disabled:opacity-50 ${FOCUS_RING}`}>取消批次</button>
            <button type="button" disabled={selectedBatchIDs.length === 0} onClick={() => void navigator.clipboard.writeText(selectedBatchIDs.join('\n'))} className={`rounded-control border border-line bg-surface px-2 py-1.5 font-black hover:bg-subtle disabled:opacity-50 ${FOCUS_RING}`}>复制批次 ID</button>
          </div>
        </div>
      ) : null}
      {notice ? <div className="mt-3 rounded-surface border border-line bg-surface px-3 py-2 text-xs font-bold text-secondary" role="status" aria-live="polite">{notice}</div> : null}
      {bulkFailures.length > 0 ? <BulkFailureDetails failures={bulkFailures} onClear={() => setBulkFailures([])} /> : null}

      <div className="mt-4 overflow-hidden rounded-surface border border-line bg-surface">
        {activeLoading ? <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm font-bold text-secondary"><Loader2 size={16} className="animate-spin" />{labels.loadingTitle}</div> : null}
        {viewMode === 'batches' && batchError ? <div className="m-4 rounded-control border border-danger bg-danger-soft px-4 py-3 text-sm font-bold text-danger">{batchError}</div> : null}
        {!activeLoading && viewMode === 'batches' && batches.length === 0 ? <div className="p-4"><EmptyList title={labels.noSearchResult} /></div> : null}
        {!activeLoading && viewMode === 'batches' && batches.length > 0 ? <BatchTable labels={labels} batches={batches} selectedBatchIDs={selectedBatchIDs} density={density} onToggleBatchSelected={toggleBatchSelected} expandedBatchID={expandedBatchID} batchDetails={batchDetails} loadingBatchID={loadingBatchID} cancelingID={cancelingID} syncingID={syncingID} onOpenBatch={openBatch} onOpenTask={openTaskDetails} onCancelTask={cancelTask} onDeleteTask={deleteTask} onSyncTask={syncTaskStatus} onCancelBatch={cancelBatch} /> : null}
        {!activeLoading && viewMode === 'tasks' && tasks.length === 0 ? <div className="p-4"><EmptyList title={labels.noSearchResult} /></div> : null}
        {!activeLoading && viewMode === 'tasks' && tasks.length > 0 ? <TaskTable labels={labels} tasks={tasks} cancelingID={cancelingID} syncingID={syncingID} selectedTaskIDs={selectedTaskIDs} density={density} columnVisibility={columnVisibility} onToggleTaskSelected={toggleTaskSelected} onOpenTask={openTaskDetails} onCancelTask={cancelTask} onDeleteTask={deleteTask} onSyncTask={syncTaskStatus} /> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-secondary">{labels.usersPageRange(pageStart, pageEnd, activeTotal)}</div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={activeLimit} onChange={(event) => handlePageSizeChange(Number(event.target.value))} className={`aics-control rounded-control px-3 py-2 text-sm font-bold ${FOCUS_RING}`} aria-label={labels.usersPageSize}>
            {PAGE_SIZE_OPTIONS.map((item) => <option key={item} value={item}>{labels.usersPageSize} {item}</option>)}
          </select>
          <button type="button" onClick={() => handlePage(Math.max(0, activeOffset - activeLimit))} disabled={activeOffset <= 0 || activeLoading} className={`rounded-control border border-line bg-surface px-3.5 py-2 text-sm font-black text-secondary hover:border-line-strong hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}>{labels.previousPage}</button>
          <button type="button" onClick={() => handlePage(activeOffset + activeLimit)} disabled={activeOffset + activeLimit >= activeTotal || activeLoading} className={`rounded-control border border-line bg-surface px-3.5 py-2 text-sm font-black text-secondary hover:border-line-strong hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}>{labels.nextPage}</button>
        </div>
      </div>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
      <TaskDetailDialog labels={labels} task={selectedTask} notice={notice} canceling={selectedTask ? cancelingID === selectedTask.id : false} syncing={selectedTask ? syncingID === selectedTask.id : false} deleting={selectedTask ? deletingID === selectedTask.id : false} retrying={selectedTask ? retryingID === selectedTask.id : false} requeueing={selectedTask ? requeueingID === selectedTask.id : false} savingUpstream={selectedTask ? savingUpstreamID === selectedTask.id : false} onCancelTask={cancelTask} onDeleteTask={deleteTask} onSyncTask={syncTaskStatus} onRetryTask={retryTask} onRequeueTask={requeueTask} onSetUpstreamTaskID={setTaskUpstreamTaskID} onClose={() => setSelectedTask(undefined)} />
    </section>
  );
}


function CompactMetric({ label, value, hint, compactHint, tone = 'slate', active = false, onClick, className = '' }: Readonly<{ label: string; value: string; hint?: string; compactHint?: string; tone?: 'slate' | 'indigo' | 'emerald' | 'amber'; active?: boolean; onClick?: () => void; className?: string }>) {
  const toneClassName = tone === 'indigo'
    ? 'text-accent'
    : tone === 'emerald'
      ? 'text-success'
      : tone === 'amber'
        ? 'text-warning'
        : 'text-ink';
  const controlClassName = `inline-flex min-h-9 items-center gap-1.5 rounded-control border px-2.5 py-1 text-left text-xs transition ${active ? 'border-accent bg-accent-soft' : 'border-line bg-surface'} ${onClick ? `cursor-pointer hover:border-line-strong hover:bg-subtle ${FOCUS_RING}` : ''} ${className}`;
  const content = (
    <>
      <span className="whitespace-nowrap text-xs font-black text-muted">{label}</span>
      <span className={`admin-mono flex items-baseline gap-1 text-sm font-black ${toneClassName}`}>
        {value}
        {hint ? (
          <span className="font-sans text-xs font-bold text-secondary">
            {compactHint ? (
              <>
                <span className="md:hidden" aria-hidden="true">{compactHint}</span>
                <span className="sr-only md:hidden">{hint}</span>
                <span className="hidden md:inline">{hint}</span>
              </>
            ) : hint}
          </span>
        ) : null}
      </span>
    </>
  );
  if (onClick) {
    return <button type="button" onClick={onClick} className={controlClassName} title={`筛选：${label}${hint ? `，${hint}` : ''}`}>{content}</button>;
  }
  return <div className={controlClassName}>{content}</div>;
}

function FilterGroup({ label, children, inline = false, scrollOnMobile = false, className = '' }: Readonly<{ label: string; children: React.ReactNode; inline?: boolean; scrollOnMobile?: boolean; className?: string }>) {
  return (
    <div className={`${inline ? 'flex items-center gap-2' : 'min-w-0'} ${className}`}>
      <div className={`admin-mono shrink-0 text-xs font-black text-secondary ${inline ? '' : 'mb-1.5'}`}>{label}</div>
      <div className={`flex min-w-0 flex-wrap items-center gap-1.5 xl:flex-nowrap ${scrollOnMobile ? 'max-md:flex-nowrap max-md:overflow-x-auto max-md:px-1 max-md:py-1 max-md:[&>*]:shrink-0' : ''}`}>{children}</div>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }: Readonly<{ label: string; value: string; options: readonly Readonly<{ value: string; label: string }>[]; onChange: (value: string) => void }>) {
  return (
    <label className="flex items-center gap-2 rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-black text-secondary">
      <span className="shrink-0">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`bg-transparent text-xs font-bold text-ink outline-none ${FOCUS_RING}`}>
        {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}

function TextFilter({ label, value, onChange }: Readonly<{ label: string; value: string; onChange: (value: string) => void }>) {
  return (
    <label className="flex items-center gap-2 rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-black text-secondary">
      <span className="shrink-0">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} onBlur={(event) => onChange(event.target.value.trim())} className={`w-24 bg-transparent text-xs font-bold text-ink outline-none placeholder:text-muted ${FOCUS_RING}`} placeholder="全部" />
    </label>
  );
}

function QuickFilterButton({ children, onClick }: Readonly<{ children: React.ReactNode; onClick: () => void }>) {
  return (
    <button type="button" onClick={onClick} className={`rounded-control border border-line bg-subtle px-2 py-1 text-xs font-black text-secondary hover:border-line-strong hover:bg-surface hover:text-ink ${FOCUS_RING}`}>
      {children}
    </button>
  );
}

function upstreamStateLabel(value: AdminTaskUpstreamStateFilter): string {
  const labels: Record<AdminTaskUpstreamStateFilter, string> = {
    all: '全部上游',
    has_task_id: '有 task_id',
    missing_task_id: '无 task_id',
    repaired: '管理员已修复',
    recoverable: '可补偿恢复',
    result_unfinished: '结果未完成',
  };
  return labels[value];
}

function retryableLabel(value: AdminTaskRetryableFilter): string {
  const labels: Record<AdminTaskRetryableFilter, string> = { all: '全部', true: '可重试', false: '不可重试' };
  return labels[value];
}

function taskWorkerOptions(tasks: readonly AdminTask[], workers: readonly AdminWorker[]): readonly Readonly<{ value: string; label: string }>[] {
  const options = new Map<string, string>();
  for (const worker of workers) {
    if (!worker.id) continue;
    options.set(worker.id, worker.hostname ? `${worker.hostname} · ${worker.id}` : worker.id);
  }
  for (const task of tasks) {
    if (!task.worker?.id) continue;
    if (!options.has(task.worker.id)) {
      options.set(task.worker.id, task.worker.hostname ? `${task.worker.hostname} · ${task.worker.id}` : task.worker.id);
    }
  }
  return [...options.entries()].map(([value, label]) => ({ value, label }));
}

function storedTaskDensity(): TaskDensity {
  if (typeof window === 'undefined') return 'standard';
  return window.localStorage.getItem(TASK_PREFS_DENSITY_KEY) === 'compact' ? 'compact' : 'standard';
}

function storedAutoRefreshMS(): (typeof AUTO_REFRESH_OPTIONS)[number] {
  if (typeof window === 'undefined') return DEFAULT_AUTO_REFRESH_MS;
  if (window.localStorage.getItem(TASK_PREFS_AUTO_REFRESH_MIGRATION_KEY) !== '1') return DEFAULT_AUTO_REFRESH_MS;
  const value = Number(window.localStorage.getItem(TASK_PREFS_AUTO_REFRESH_KEY));
  return AUTO_REFRESH_OPTIONS.includes(value as (typeof AUTO_REFRESH_OPTIONS)[number]) ? value as (typeof AUTO_REFRESH_OPTIONS)[number] : DEFAULT_AUTO_REFRESH_MS;
}

function storedTaskColumns(): TaskColumnVisibility {
  if (typeof window === 'undefined') return DEFAULT_TASK_COLUMNS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TASK_PREFS_COLUMNS_KEY) ?? '{}') as Partial<TaskColumnVisibility>;
    return {
      task: parsed.task !== false,
      prompt: parsed.prompt !== false,
      user: parsed.user !== false,
      model: parsed.model !== false,
      credits: parsed.credits !== false,
      failure: parsed.failure !== false,
      time: parsed.time !== false,
    };
  } catch {
    return DEFAULT_TASK_COLUMNS;
  }
}

function BulkFailureDetails({ failures, onClear }: Readonly<{ failures: readonly AdminBulkTaskFailure[]; onClear: () => void }>) {
  return (
    <details className="mt-3 rounded-surface border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
      <summary className="cursor-pointer select-none">批量操作失败明细（{failures.length}）</summary>
      <div className="mt-2 space-y-1">
        {failures.map((failure) => (
          <div key={failure.id} className="rounded-lg border border-amber-200 bg-white px-2 py-1.5">
            <span className="admin-mono mr-2 text-amber-900">{failure.id}</span>
            <span>{failure.error}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onClear} className={`mt-2 rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-black text-amber-800 hover:bg-amber-100 ${FOCUS_RING}`}>清除明细</button>
    </details>
  );
}

function errorCategoryLabel(value: AdminTaskErrorCategoryFilter): string {
  const labels: Record<AdminTaskErrorCategoryFilter, string> = { all: '全部错误', auth: '认证', quota: '额度', timeout: '超时', parameter: '参数', rate_limit: '限流', storage: '存储', worker: 'Worker', provider: '上游', unknown: '未知' };
  return labels[value];
}

function timeRangeLabel(value: AdminTaskTimeRangeFilter): string {
  const labels: Record<AdminTaskTimeRangeFilter, string> = { all: '全部时间', '1h': '近 1 小时', today: '今天', yesterday: '昨天', '7d': '近 7 天' };
  return labels[value];
}

function runningStateLabel(value: AdminTaskRunningStateFilter): string {
  const labels: Record<AdminTaskRunningStateFilter, string> = { all: '全部运行态', active: '排队/执行中', stuck: '卡住风险' };
  return labels[value];
}

function bulkActionConfig(action: 'sync' | 'requeue' | 'cancel' | 'delete', count: number): ConfirmDialogState & { confirm: boolean } {
  if (action === 'sync') return { confirm: false, title: '', description: '', confirmLabel: '', onConfirm: () => undefined };
  if (action === 'requeue') return { confirm: true, title: '确认批量重新入队？', description: `${count} 个任务会被放回队列。`, confirmLabel: '批量重新入队', tone: 'warning', onConfirm: () => undefined };
  if (action === 'cancel') return { confirm: true, title: '确认批量取消？', description: `${count} 个任务会被取消，并按任务逻辑处理退款。`, confirmLabel: '批量取消', tone: 'danger', onConfirm: () => undefined };
  return { confirm: true, title: '确认批量删除？', description: `${count} 个任务会从数据库删除，此操作不可恢复。`, confirmLabel: '批量删除', tone: 'danger', onConfirm: () => undefined };
}

function taskColumnLabel(labels: AdminLabels, key: TaskColumnKey): string {
  if (key === 'task') return labels.tasksColumnTask;
  if (key === 'prompt') return 'Prompt';
  if (key === 'user') return labels.tasksColumnUser;
  if (key === 'model') return labels.tasksColumnModel;
  if (key === 'credits') return labels.tasksColumnConsumption;
  if (key === 'failure') return labels.tasksColumnFailure;
  return labels.tasksColumnTime;
}


function runningDurationMs(task: AdminTask): number {
  if (task.duration_ms !== undefined && task.duration_ms > 0) return task.duration_ms;
  const createdAt = new Date(task.created_at).getTime();
  if (!Number.isFinite(createdAt)) return 0;
  return Date.now() - createdAt;
}

const BATCH_TABLE_COLUMN_COUNT = 8;

function BatchTable({ labels, batches, selectedBatchIDs, density, expandedBatchID, batchDetails, loadingBatchID, cancelingID, syncingID, onToggleBatchSelected, onOpenBatch, onOpenTask, onCancelTask, onDeleteTask, onSyncTask, onCancelBatch }: Readonly<{
  labels: AdminLabels;
  batches: readonly AdminTaskBatch[];
  selectedBatchIDs: readonly string[];
  density: TaskDensity;
  expandedBatchID?: string;
  batchDetails: Readonly<Record<string, AdminTaskBatch>>;
  loadingBatchID?: string;
  cancelingID?: string;
  syncingID?: string;
  onToggleBatchSelected: (id: string) => void;
  onOpenBatch: (batch: AdminTaskBatch) => void;
  onOpenTask: (task: AdminTask) => void;
  onCancelTask: (task: AdminTask) => void;
  onDeleteTask: (task: AdminTask) => void;
  onSyncTask: (task: AdminTask) => void;
  onCancelBatch: (batch: AdminTaskBatch) => void;
}>) {
  return (
    <>
      <div className="divide-y divide-line md:hidden">
        {batches.map((batch) => {
          const detail = batchDetails[batch.id] ?? batch;
          return (
            <BatchMobileCard
              key={batch.id}
              labels={labels}
              batch={batch}
              detail={detail}
              selected={selectedBatchIDs.includes(batch.id)}
              density={density}
              expanded={expandedBatchID === batch.id}
              loading={loadingBatchID === batch.id}
              onToggleSelected={() => onToggleBatchSelected(batch.id)}
              onOpen={() => onOpenBatch(batch)}
              onOpenTask={onOpenTask}
              onCancelTask={onCancelTask}
              onDeleteTask={onDeleteTask}
              onSyncTask={onSyncTask}
              syncingID={syncingID}
              onCancelBatch={onCancelBatch}
              cancelingID={cancelingID}
            />
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="min-w-[1120px] w-full text-left text-xs">
        <thead className="bg-subtle text-xs font-black uppercase tracking-normal text-secondary">
          <tr>
            <th className="w-[44px] px-2 py-2.5"><span className="sr-only">选择</span></th>
            <th className="px-3 py-2.5">Batch</th>
            <th className="px-3 py-2.5">{labels.tasksColumnUser}</th>
            <th className="px-3 py-2.5">{labels.tasksColumnModel}</th>
            <th className="px-3 py-2.5">进度</th>
            <th className="px-3 py-2.5">{labels.tasksColumnConsumption}</th>
            <th className="w-[118px] px-2 py-2.5">{labels.tasksColumnTime}</th>
            <th className="sticky right-0 z-20 w-[104px] bg-subtle px-2 py-2.5 text-right shadow-[-8px_0_14px_rgba(15,23,42,0.04)]">{labels.tasksColumnActions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {batches.map((batch) => {
            const detail = batchDetails[batch.id] ?? batch;
            const expanded = expandedBatchID === batch.id;
            return (
              <BatchRows
                key={batch.id}
                labels={labels}
                batch={batch}
                detail={detail}
                selected={selectedBatchIDs.includes(batch.id)}
                density={density}
                expanded={expanded}
                loading={loadingBatchID === batch.id}
                onToggleSelected={() => onToggleBatchSelected(batch.id)}
                onOpen={() => onOpenBatch(batch)}
                onOpenTask={onOpenTask}
                onCancelTask={onCancelTask}
                onDeleteTask={onDeleteTask}
                onSyncTask={onSyncTask}
                syncingID={syncingID}
                onCancelBatch={onCancelBatch}
                cancelingID={cancelingID}
              />
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

function BatchMobileCard({ labels, batch, detail, selected, density, expanded, loading, cancelingID, syncingID, onToggleSelected, onOpen, onOpenTask, onCancelTask, onDeleteTask, onSyncTask, onCancelBatch }: Readonly<{ labels: AdminLabels; batch: AdminTaskBatch; detail: AdminTaskBatch; selected: boolean; density: TaskDensity; expanded: boolean; loading: boolean; cancelingID?: string; syncingID?: string; onToggleSelected: () => void; onOpen: () => void; onOpenTask: (task: AdminTask) => void; onCancelTask: (task: AdminTask) => void; onDeleteTask: (task: AdminTask) => void; onSyncTask: (task: AdminTask) => void; onCancelBatch: (batch: AdminTaskBatch) => void }>) {
  return (
    <article className={`px-3 py-3 ${expanded ? 'bg-indigo-50/35' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <input type="checkbox" checked={selected} onChange={onToggleSelected} className="mt-1 h-4 w-4 shrink-0" aria-label={`选择批次 ${batch.id}`} />
        <button type="button" onClick={onOpen} className={`admin-mono min-w-0 flex-1 truncate text-left text-[12px] font-black leading-5 text-accent underline-offset-4 hover:underline ${FOCUS_RING}`} title={batch.id}>{batch.id}</button>
        <div className="flex shrink-0 items-center gap-1">
          <IconActionButton label={expanded ? '收起' : labels.tasksOpenDetails} onClick={onOpen} tone="slate"><Eye size={13} /></IconActionButton>
          {isCancelableBatch(batch) ? <IconActionButton label="取消" busy={cancelingID === batch.id} onClick={() => onCancelBatch(batch)} tone="rose">{cancelingID === batch.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}</IconActionButton> : null}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <InlineBadge tone={statusTone(batch.status)}>{taskStatusLabel(labels, batch.status)}</InlineBadge>
        <InlineBadge tone="slate">{taskTypeLabel(labels, batch.type)}</InlineBadge>
        <ProgressBadge tone="emerald">成功 {batch.succeeded}</ProgressBadge>
        <ProgressBadge tone="amber">失败 {batch.failed}</ProgressBadge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        <MobileTaskField label={labels.tasksColumnUser} value={batch.user.name || labels.usersMemberRole} subValue={batch.user.email || batch.user.id} />
        <MobileTaskField label={labels.tasksColumnModel} value={batch.model_name || batch.model} subValue={batch.model} />
        <MobileTaskField label="进度" value={`${batch.succeeded + batch.failed}/${batch.total}`} subValue={`执行 ${batch.processing} / 排队 ${batch.queued}`} />
        <MobileTaskField label={labels.tasksColumnConsumption} value={`${batch.credits_used}`} subValue={formatCompactDate(batch.created_at)} />
      </div>
      {expanded ? (
        <div className="mt-3 rounded-surface border border-line bg-white shadow-sm">
          <BatchInlineDetail labels={labels} batch={detail} density={density} loading={loading} cancelingID={cancelingID} syncingID={syncingID} onOpenTask={onOpenTask} onCancelTask={onCancelTask} onDeleteTask={onDeleteTask} onSyncTask={onSyncTask} showSummary={false} />
        </div>
      ) : null}
    </article>
  );
}

function ProgressBadge({ children, tone = 'indigo' }: Readonly<{ children: React.ReactNode; tone?: 'indigo' | 'emerald' | 'slate' | 'amber' }>) {
  const toneClassName = tone === 'emerald'
    ? 'border-emerald-200 text-emerald-700'
    : tone === 'amber'
      ? 'border-amber-200 text-amber-700'
      : tone === 'slate'
        ? 'border-slate-200 text-slate-700'
        : 'border-line text-secondary';
  return <span className={`inline-flex shrink-0 items-center rounded-full border bg-white px-2 py-1 text-xs font-black leading-none ${toneClassName}`}>{children}</span>;
}


function BatchRows({ labels, batch, detail, selected, density, expanded, loading, cancelingID, syncingID, onToggleSelected, onOpen, onOpenTask, onCancelTask, onDeleteTask, onSyncTask, onCancelBatch }: Readonly<{
  labels: AdminLabels;
  batch: AdminTaskBatch;
  detail: AdminTaskBatch;
  selected: boolean;
  density: TaskDensity;
  expanded: boolean;
  loading: boolean;
  cancelingID?: string;
  syncingID?: string;
  onToggleSelected: () => void;
  onOpen: () => void;
  onOpenTask: (task: AdminTask) => void;
  onCancelTask: (task: AdminTask) => void;
  onDeleteTask: (task: AdminTask) => void;
  onSyncTask: (task: AdminTask) => void;
  onCancelBatch: (batch: AdminTaskBatch) => void;
}>) {
  return (
    <>
      <BatchRow labels={labels} batch={batch} selected={selected} expanded={expanded} canceling={cancelingID === batch.id} onToggleSelected={onToggleSelected} onOpen={onOpen} onCancel={() => onCancelBatch(batch)} />
      {expanded ? (
        <tr className="bg-subtle">
          <td colSpan={BATCH_TABLE_COLUMN_COUNT} className="px-3 py-3">
            <BatchInlineDetail labels={labels} batch={detail} density={density} loading={loading} cancelingID={cancelingID} syncingID={syncingID} onOpenTask={onOpenTask} onCancelTask={onCancelTask} onDeleteTask={onDeleteTask} onSyncTask={onSyncTask} showSummary={false} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function BatchRow({ labels, batch, selected, expanded, canceling, onToggleSelected, onOpen, onCancel }: Readonly<{ labels: AdminLabels; batch: AdminTaskBatch; selected: boolean; expanded: boolean; canceling: boolean; onToggleSelected: () => void; onOpen: () => void; onCancel: () => void }>) {
  return (
    <tr className={`align-top hover:bg-subtle ${expanded ? 'bg-indigo-50/40' : ''}`}>
      <td className="px-2 py-2">
        <input type="checkbox" checked={selected} onChange={onToggleSelected} className="h-4 w-4" aria-label={`选择批次 ${batch.id}`} />
      </td>
      <td className="px-3 py-2">
        <button type="button" onClick={onOpen} className={`admin-mono max-w-[260px] truncate text-left text-xs font-black text-accent underline-offset-4 hover:underline ${FOCUS_RING}`} title={batch.id}>{batch.id}</button>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <InlineBadge tone={statusTone(batch.status)}>{taskStatusLabel(labels, batch.status)}</InlineBadge>
          <InlineBadge tone="slate">{taskTypeLabel(labels, batch.type)}</InlineBadge>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="font-black text-ink">{batch.user.name || labels.usersMemberRole}</div>
        <div className="mt-0.5 max-w-[180px] truncate text-xs font-semibold text-secondary" title={batch.user.email || batch.user.id}>{batch.user.email || batch.user.id}</div>
      </td>
      <td className="px-3 py-2">
        <div className="font-black text-ink">{batch.model_name || batch.model}</div>
        <div className="mt-0.5 text-xs font-semibold text-secondary">{batch.model}</div>
      </td>
      <td className="min-w-[260px] px-3 py-2">
        <div className="font-black text-ink">{batch.succeeded + batch.failed}/{batch.total}</div>
        <div className="mt-1 flex flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap">
          <ProgressBadge tone="emerald">成功 {batch.succeeded}</ProgressBadge>
          <ProgressBadge tone="amber">失败 {batch.failed}</ProgressBadge>
          <ProgressBadge tone="indigo">执行 {batch.processing}</ProgressBadge>
          <ProgressBadge tone="slate">排队 {batch.queued}</ProgressBadge>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="inline-flex items-center gap-1.5 font-black text-ink"><Coins size={13} />{batch.credits_used}</div>
      </td>
      <td className="w-[118px] min-w-[118px] whitespace-nowrap px-2 py-2">
        <div className="font-bold leading-4 text-ink">{formatCompactDate(batch.created_at)}</div>
        <div className="mt-0.5 text-xs font-semibold leading-3 text-secondary">更新 {formatCompactDate(batch.updated_at)}</div>
      </td>
      <td className={`sticky right-0 z-10 w-[104px] min-w-[104px] px-2 py-2 shadow-[-8px_0_14px_rgba(15,23,42,0.04)] ${expanded ? 'bg-indigo-50' : 'bg-white'}`}>
        <div className="inline-flex w-full flex-nowrap items-center justify-end gap-1">
          <IconActionButton label={expanded ? '收起' : labels.tasksOpenDetails} onClick={onOpen} tone="slate"><Eye size={13} /></IconActionButton>
          {isCancelableBatch(batch) ? <IconActionButton label="取消" busy={canceling} onClick={onCancel} tone="rose">{canceling ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}</IconActionButton> : null}
        </div>
      </td>
    </tr>
  );
}

function BatchInlineDetail({ labels, batch, density, loading, cancelingID, syncingID, onOpenTask, onCancelTask, onDeleteTask, onSyncTask, showSummary = true }: Readonly<{ labels: AdminLabels; batch: AdminTaskBatch; density: TaskDensity; loading: boolean; cancelingID?: string; syncingID?: string; onOpenTask: (task: AdminTask) => void; onCancelTask: (task: AdminTask) => void; onDeleteTask: (task: AdminTask) => void; onSyncTask: (task: AdminTask) => void; showSummary?: boolean }>) {
  return (
    <div className="rounded-surface border border-line bg-white shadow-sm">
      {showSummary ? (
        <div className="grid grid-cols-2 gap-1.5 border-b border-line p-2 text-xs lg:grid-cols-4 lg:gap-2 lg:p-3">
          <MobileTaskField label={labels.tasksColumnUser} value={batch.user.name || labels.usersMemberRole} subValue={batch.user.email || batch.user.id} />
          <MobileTaskField label={labels.tasksColumnModel} value={batch.model_name || batch.model} subValue={batch.model} />
          <MobileTaskField label="进度" value={`${batch.succeeded + batch.failed}/${batch.total}`} subValue={`失败 ${batch.failed}`} />
          <MobileTaskField label={labels.tasksColumnConsumption} value={`${batch.credits_used}`} subValue={labels.credits} />
        </div>
      ) : null}
      <details className="border-b border-line px-3 py-2">
        <summary className="cursor-pointer text-xs font-black text-secondary">参数 JSON</summary>
        <pre className="mt-2 max-h-[180px] overflow-auto rounded-surface bg-navigation p-3 text-xs leading-5 text-white">{JSON.stringify(batch.params, null, 2)}</pre>
      </details>
      <div className="px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-black text-ink">子任务 {batch.tasks?.length ?? 0}</div>
          {loading ? <div className="inline-flex items-center gap-1 text-xs font-bold text-secondary"><Loader2 size={13} className="animate-spin" />加载中</div> : null}
        </div>
        {batch.tasks && batch.tasks.length > 0 ? <TaskTable labels={labels} tasks={batch.tasks} cancelingID={cancelingID} syncingID={syncingID} density={density} onOpenTask={onOpenTask} onCancelTask={onCancelTask} onDeleteTask={onDeleteTask} onSyncTask={onSyncTask} /> : <div className="rounded-surface border border-dashed border-line p-4 text-sm font-bold text-secondary">正在加载或暂无子任务。</div>}
      </div>
    </div>
  );
}


type TaskTableGroup = Readonly<{ key: string; batchId?: string; tasks: readonly AdminTask[] }>;

function TaskTable({ labels, tasks, cancelingID, syncingID, selectedTaskIDs = [], density = 'standard', columnVisibility = DEFAULT_TASK_COLUMNS, onToggleTaskSelected, onOpenTask, onCancelTask, onDeleteTask, onSyncTask }: Readonly<{ labels: AdminLabels; tasks: readonly AdminTask[]; cancelingID?: string; syncingID?: string; selectedTaskIDs?: readonly string[]; density?: TaskDensity; columnVisibility?: TaskColumnVisibility; onToggleTaskSelected?: (id: string) => void; onOpenTask: (task: AdminTask) => void; onCancelTask: (task: AdminTask) => void; onDeleteTask: (task: AdminTask) => void; onSyncTask: (task: AdminTask) => void }>) {
  const [sort, setSort] = useState<TaskSortState>(DEFAULT_TASK_SORT);
  const sortedTasks = useMemo(() => sortTasks(tasks, sort), [tasks, sort]);
  const groups = useMemo(() => groupTasksByBatch(sortedTasks), [sortedTasks]);
  const toggleSort = (key: TaskSortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }));
  };

  return (
    <>
      <div className="divide-y divide-line md:hidden">
        {groups.map((group) => (
          <TaskMobileGroup key={group.key} labels={labels} group={group} cancelingID={cancelingID} syncingID={syncingID} selectedTaskIDs={selectedTaskIDs} density={density} onToggleTaskSelected={onToggleTaskSelected} onOpenTask={onOpenTask} onCancelTask={onCancelTask} onDeleteTask={onDeleteTask} onSyncTask={onSyncTask} />
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="min-w-[1360px] w-full table-fixed text-left text-xs">
        <colgroup>
          <col className="w-[44px]" />
          {columnVisibility.task ? <col className="w-[285px]" /> : null}
          {columnVisibility.failure ? <col className="w-[220px]" /> : null}
          {columnVisibility.prompt ? <col className="w-[390px]" /> : null}
          {columnVisibility.user ? <col className="w-[165px]" /> : null}
          {columnVisibility.model ? <col className="w-[245px]" /> : null}
          {columnVisibility.credits ? <col className="w-[70px]" /> : null}
          {columnVisibility.time ? <col className="w-[90px]" /> : null}
          <col className="w-[96px]" />
        </colgroup>
        <thead className="bg-subtle text-xs font-black uppercase tracking-normal text-secondary">
          <tr>
            <th className="px-2 py-2.5"><span className="sr-only">选择</span></th>
            {columnVisibility.task ? <SortableHeader label={labels.tasksColumnTask} sortKey="task" activeSort={sort} onSort={toggleSort} /> : null}
            {columnVisibility.failure ? <SortableHeader label={labels.tasksColumnFailure} sortKey="failure" activeSort={sort} onSort={toggleSort} /> : null}
            {columnVisibility.prompt ? <SortableHeader label="Prompt" sortKey="prompt" activeSort={sort} onSort={toggleSort} /> : null}
            {columnVisibility.user ? <SortableHeader label={labels.tasksColumnUser} sortKey="user" activeSort={sort} onSort={toggleSort} /> : null}
            {columnVisibility.model ? <SortableHeader label={labels.tasksColumnModel} sortKey="model" activeSort={sort} onSort={toggleSort} /> : null}
            {columnVisibility.credits ? <SortableHeader label={labels.tasksColumnConsumption} sortKey="credits" activeSort={sort} onSort={toggleSort} /> : null}
            {columnVisibility.time ? <SortableHeader label={labels.tasksColumnTime} sortKey="time" activeSort={sort} onSort={toggleSort} className="w-[90px] px-2" /> : null}
            <th className="sticky right-0 z-20 w-[96px] bg-subtle px-2 py-2.5 text-right shadow-[-8px_0_14px_rgba(15,23,42,0.04)]">{labels.tasksColumnActions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {groups.map((group) => (
            <TaskGroupRows key={group.key} labels={labels} group={group} cancelingID={cancelingID} syncingID={syncingID} selectedTaskIDs={selectedTaskIDs} density={density} columnVisibility={columnVisibility} onToggleTaskSelected={onToggleTaskSelected} onOpenTask={onOpenTask} onCancelTask={onCancelTask} onDeleteTask={onDeleteTask} onSyncTask={onSyncTask} />
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}


function mergeAdminTask(current: AdminTask, updated: AdminTask): AdminTask {
  return {
    ...current,
    ...updated,
    user: updated.user ?? current.user,
    worker: updated.worker ?? current.worker,
  };
}

function TaskMobileGroup({ labels, group, cancelingID, syncingID, selectedTaskIDs = [], density, onToggleTaskSelected, onOpenTask, onCancelTask, onDeleteTask, onSyncTask }: Readonly<{ labels: AdminLabels; group: TaskTableGroup; cancelingID?: string; syncingID?: string; selectedTaskIDs?: readonly string[]; density: TaskDensity; onToggleTaskSelected?: (id: string) => void; onOpenTask: (task: AdminTask) => void; onCancelTask: (task: AdminTask) => void; onDeleteTask: (task: AdminTask) => void; onSyncTask: (task: AdminTask) => void }>) {
  const counts = countTaskStatuses(group.tasks);
  return (
    <div className="bg-white">
      {group.batchId ? (
        <div className="border-b border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs font-black text-accent">
          <div className="admin-mono truncate">Batch {group.batchId}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <ProgressBadge tone="slate">{group.tasks.length} 条</ProgressBadge>
            <ProgressBadge tone="emerald">成功 {counts.succeeded}</ProgressBadge>
            <ProgressBadge tone="amber">失败 {counts.failed}</ProgressBadge>
          </div>
        </div>
      ) : null}
      {group.tasks.map((task) => <TaskMobileCard key={task.id} labels={labels} task={task} selected={selectedTaskIDs.includes(task.id)} density={density} canceling={cancelingID === task.id} syncing={syncingID === task.id} onToggleSelected={onToggleTaskSelected ? () => onToggleTaskSelected(task.id) : undefined} onOpen={() => onOpenTask(task)} onCancel={() => onCancelTask(task)} onDelete={() => onDeleteTask(task)} onSync={() => onSyncTask(task)} />)}
    </div>
  );
}

function TaskMobileCard({ labels, task, selected = false, density, canceling, syncing, onToggleSelected, onOpen, onCancel, onDelete, onSync }: Readonly<{ labels: AdminLabels; task: AdminTask; selected?: boolean; density: TaskDensity; canceling: boolean; syncing: boolean; onToggleSelected?: () => void; onOpen: () => void; onCancel: () => void; onDelete: () => void; onSync: () => void }>) {
  const stuck = isPotentiallyStuckTask(task);
  const running = task.status === 'processing';
  const showIdentityDetails = density === 'standard';
  const accentClassName = stuck ? 'border-l-warning bg-warning-soft' : running ? 'border-l-accent bg-accent-soft' : 'border-l-transparent bg-surface';
  return (
    <article className={`border-l-4 px-3 py-2.5 ${accentClassName}`}>
      <div className="flex items-start justify-between gap-2">
        {onToggleSelected ? (
          <label className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center" title={`选择任务 ${task.id}`}>
            <input type="checkbox" checked={selected} onChange={onToggleSelected} className="h-4 w-4" aria-label={`选择任务 ${task.id}`} />
          </label>
        ) : null}
        <button type="button" onClick={onOpen} title={task.id} className={`admin-mono min-w-0 flex-1 truncate text-left text-[12px] font-black leading-5 text-ink underline-offset-4 hover:underline ${FOCUS_RING}`}>{task.id}</button>
        <div className="flex shrink-0 items-center gap-1">
          {isSyncableTask(task) ? <IconActionButton label="同步状态" size="comfortable" busy={syncing} onClick={onSync} tone="indigo">{syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}</IconActionButton> : null}
          {isCancelableTask(task) ? <IconActionButton label="取消" size="comfortable" busy={canceling} onClick={onCancel} tone="rose">{canceling ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}</IconActionButton> : null}
          <IconActionButton label="删除" size="comfortable" onClick={onDelete} tone="rose"><Trash2 size={15} /></IconActionButton>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <TaskStatusInline tone={statusTone(task.status)} label={taskStatusLabel(labels, task.status)} />
        {stuck ? <TaskStatusInline tone="amber" label="风险" title="卡住风险" /> : null}
        {running && !stuck ? <TaskStatusInline tone="indigo" label="排查" title="优先排查" /> : null}
        {task.batch_id ? <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-black text-accent">#{typeof task.batch_index === 'number' ? task.batch_index + 1 : '—'}</span> : <span className="rounded-full border border-line bg-subtle px-2 py-0.5 text-xs font-black text-secondary">单</span>}
      </div>
      <TaskExecutionMeta task={task} />
      <button type="button" onClick={onOpen} title={task.prompt} className={`mt-1.5 line-clamp-2 text-left text-[12px] font-semibold leading-5 text-secondary underline-offset-4 hover:text-ink hover:underline ${FOCUS_RING}`}>{previewText(task.prompt, 120)}</button>
      <div className="mt-2 border-t border-line/80 pt-2 text-xs">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <TaskMobileIdentity label={labels.tasksColumnUser} value={taskUserName(task, labels)} subValue={showIdentityDetails ? taskUserContact(task) : undefined} />
          <TaskMobileIdentity label={labels.tasksColumnModel} value={task.model_name || task.model} subValue={showIdentityDetails ? `${task.provider} / ${task.provider_model || task.model}` : undefined} />
        </div>
        <div className="mt-1.5 grid grid-cols-1 gap-x-3 gap-y-1.5 min-[360px]:grid-cols-2">
          <TaskMobileSummary label={labels.tasksColumnConsumption} value={`${task.credits_used}`} detail={labels.tasksResultCount(task.result_count)} />
          <TaskMobileSummary label={labels.tasksColumnTime} value={formatCompactDate(task.created_at)} detail={formatTaskDuration(task)} />
        </div>
      </div>
      {task.error_message ? <div className="mt-2"><ErrorPreview message={task.error_message} /></div> : null}
    </article>
  );
}

function TaskMobileIdentity({ label, value, subValue }: Readonly<{ label: string; value: string; subValue?: string }>) {
  return (
    <div className="min-w-0 leading-tight">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-xs font-black text-muted">{label}</span>
        <span className="min-w-0 truncate text-xs font-black text-ink" title={value}>{value}</span>
      </div>
      {subValue ? <div className="mt-0.5 truncate text-xs font-semibold text-secondary" title={subValue}>{subValue}</div> : null}
    </div>
  );
}

function TaskMobileSummary({ label, value, detail }: Readonly<{ label: string; value: string; detail?: string }>) {
  return (
    <div className="min-w-0 leading-4">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="shrink-0 text-xs font-black text-muted">{label}</span>
        <span className="whitespace-nowrap text-xs font-bold text-secondary" title={value}>{value}</span>
      </div>
      {detail ? <div className="mt-0.5 whitespace-nowrap text-xs font-semibold text-secondary" title={detail}>{detail}</div> : null}
    </div>
  );
}

function MobileTaskField({ label, value, subValue }: Readonly<{ label: string; value: string; subValue?: string }>) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-subtle px-2 py-1.5 leading-tight">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-xs font-black text-muted">{label}</span>
        <span className="min-w-0 truncate text-xs font-black text-ink" title={value}>{value}</span>
      </div>
      {subValue ? <div className="mt-0.5 truncate text-xs font-semibold text-secondary" title={subValue}>{subValue}</div> : null}
    </div>
  );
}

function taskUserName(task: AdminTask, labels: AdminLabels): string {
  return task.user?.name || labels.usersMemberRole;
}

function taskUserContact(task: AdminTask): string {
  return task.user?.email || task.user?.id || '—';
}

function TaskGroupRows({ labels, group, cancelingID, syncingID, selectedTaskIDs = [], density, columnVisibility, onToggleTaskSelected, onOpenTask, onCancelTask, onDeleteTask, onSyncTask }: Readonly<{ labels: AdminLabels; group: TaskTableGroup; cancelingID?: string; syncingID?: string; selectedTaskIDs?: readonly string[]; density: TaskDensity; columnVisibility: TaskColumnVisibility; onToggleTaskSelected?: (id: string) => void; onOpenTask: (task: AdminTask) => void; onCancelTask: (task: AdminTask) => void; onDeleteTask: (task: AdminTask) => void; onSyncTask: (task: AdminTask) => void }>) {
  return (
    <>
      {group.batchId ? <BatchHeaderRow labels={labels} batchId={group.batchId} tasks={group.tasks} /> : null}
      {group.tasks.map((task) => <TaskRow key={task.id} labels={labels} task={task} selected={selectedTaskIDs.includes(task.id)} density={density} columnVisibility={columnVisibility} canceling={cancelingID === task.id} syncing={syncingID === task.id} onToggleSelected={onToggleTaskSelected ? () => onToggleTaskSelected(task.id) : undefined} onOpen={() => onOpenTask(task)} onCancel={() => onCancelTask(task)} onDelete={() => onDeleteTask(task)} onSync={() => onSyncTask(task)} />)}
    </>
  );
}

function BatchHeaderRow({ labels, batchId, tasks }: Readonly<{ labels: AdminLabels; batchId: string; tasks: readonly AdminTask[] }>) {
  const counts = countTaskStatuses(tasks);
  const credits = tasks.reduce((sum, task) => sum + task.credits_used, 0);
  return (
    <tr className="bg-indigo-50/70">
      <td colSpan={TASK_TABLE_COLUMN_COUNT} className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-accent">
          <span className="admin-mono rounded-lg border border-indigo-200 bg-white px-2 py-1">Batch {batchId}</span>
          <InlineBadge tone="slate">本页 {tasks.length}</InlineBadge>
          <InlineBadge tone="emerald">{labels.tasksSucceeded} {counts.succeeded}</InlineBadge>
          <InlineBadge tone="amber">{labels.tasksFailed} {counts.failed}</InlineBadge>
          <InlineBadge tone="indigo">{labels.tasksProcessing} {counts.processing}</InlineBadge>
          <InlineBadge tone="slate">{labels.tasksQueued} {counts.queued}</InlineBadge>
          <span className="text-secondary">消耗 {credits}</span>
        </div>
      </td>
    </tr>
  );
}

function TaskRow({ labels, task, selected = false, density, columnVisibility, canceling, syncing, onToggleSelected, onOpen, onCancel, onDelete, onSync }: Readonly<{ labels: AdminLabels; task: AdminTask; selected?: boolean; density: TaskDensity; columnVisibility: TaskColumnVisibility; canceling: boolean; syncing: boolean; onToggleSelected?: () => void; onOpen: () => void; onCancel: () => void; onDelete: () => void; onSync: () => void }>) {
  const stuck = isPotentiallyStuckTask(task);
  const running = task.status === 'processing';
  const rowClassName = stuck
    ? 'border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-50'
    : running
      ? 'border-l-4 border-l-indigo-500 bg-indigo-50/50 hover:bg-indigo-50/70'
      : 'border-l-4 border-l-transparent hover:bg-subtle';
  const cellPadding = density === 'compact' ? 'py-1' : 'py-1.5';
  return (
    <tr className={`align-top transition-colors ${rowClassName}`}>
      <td className={`px-2 ${cellPadding}`}>{onToggleSelected ? <input type="checkbox" checked={selected} onChange={onToggleSelected} className="h-4 w-4" aria-label={`选择任务 ${task.id}`} /> : null}</td>
      {columnVisibility.task ? <td className={`w-[285px] px-3 ${cellPadding}`}>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <button type="button" onClick={onOpen} title={task.id} className={`admin-mono block min-w-0 max-w-[225px] shrink truncate text-left text-xs font-black leading-5 text-ink underline-offset-4 hover:underline ${FOCUS_RING}`}>{task.id}</button>
          <TaskStatusInline tone={statusTone(task.status)} label={taskStatusLabel(labels, task.status)} />
          {stuck ? <TaskStatusInline tone="amber" label="风险" title="卡住风险" /> : null}
          {running && !stuck ? <TaskStatusInline tone="indigo" label="排查" title="优先排查" /> : null}
        </div>
        {task.batch_id ? <div className="admin-mono mt-0.5 truncate text-xs font-bold text-secondary" title={task.batch_id}>Batch #{typeof task.batch_index === 'number' ? task.batch_index + 1 : '—'} · {task.batch_id}</div> : null}
        <TaskExecutionMeta task={task} />
      </td> : null}
      {columnVisibility.failure ? <td className={`w-[205px] px-2 ${cellPadding}`}>
        {task.error_message ? <ErrorPreview message={task.error_message} /> : <span className="text-xs font-semibold text-muted">—</span>}
      </td> : null}
      {columnVisibility.prompt ? <td className={`px-3 ${cellPadding}`}>
        <button
          type="button"
          onClick={onOpen}
          title={task.prompt}
          className={`block max-w-full truncate text-left text-xs font-semibold leading-5 text-secondary underline-offset-4 hover:text-ink hover:underline ${FOCUS_RING}`}
        >
          {previewText(task.prompt)}
        </button>
      </td> : null}
      {columnVisibility.user ? <td className={`px-3 ${cellPadding}`}>
        <div className="truncate font-black text-ink" title={taskUserName(task, labels)}>{taskUserName(task, labels)}</div>
        <div className="mt-0.5 max-w-full truncate text-xs font-semibold text-secondary" title={taskUserContact(task)}>{taskUserContact(task)}</div>
      </td> : null}
      {columnVisibility.model ? <td className={`px-3 ${cellPadding}`}>
        <div className="truncate font-black text-ink" title={task.model_name || task.model}>{task.model_name || task.model}</div>
        <div className="mt-0.5 max-w-full truncate text-xs font-semibold text-secondary" title={`${task.provider} / ${task.provider_model || task.model}`}>{task.provider} / {task.provider_model || task.model}</div>
      </td> : null}
      {columnVisibility.credits ? <td className={`px-3 ${cellPadding}`}>
        <div className="inline-flex items-center gap-1.5 font-black text-ink"><Coins size={13} />{task.credits_used}</div>
        <div className="mt-0.5 text-xs font-semibold text-secondary">{labels.tasksResultCount(task.result_count)}</div>
      </td> : null}
      {columnVisibility.time ? <td className={`w-[90px] whitespace-nowrap px-2 ${cellPadding}`}>
        <div className="font-bold leading-4 text-ink">{formatCompactDate(task.created_at)}</div>
        <div className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold leading-3 ${stuck ? 'text-amber-700' : running ? 'text-indigo-700' : 'text-secondary'}`}><Clock3 size={11} />{formatTaskDuration(task)}</div>
      </td> : null}
      <td className={`sticky right-0 z-10 w-[96px] px-2 ${cellPadding} shadow-[-8px_0_14px_rgba(15,23,42,0.04)] ${stuck ? 'bg-amber-50' : running ? 'bg-indigo-50' : 'bg-white'}`}>
        <div className="inline-flex w-full flex-nowrap items-center justify-end gap-1">
          <IconActionButton label={labels.tasksOpenDetails} onClick={onOpen} tone="slate"><Eye size={13} /></IconActionButton>
          {isSyncableTask(task) ? <IconActionButton label="同步状态" busy={syncing} onClick={onSync} tone="indigo">{syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}</IconActionButton> : null}
          {isCancelableTask(task) ? <IconActionButton label="取消" busy={canceling} onClick={onCancel} tone="rose">{canceling ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}</IconActionButton> : null}
          <IconActionButton label="删除" onClick={onDelete} tone="rose"><Trash2 size={13} /></IconActionButton>
        </div>
      </td>
    </tr>
  );
}

function TaskStatusInline({ label, tone, title }: Readonly<{ label: string; tone: 'indigo' | 'emerald' | 'slate' | 'amber'; title?: string }>) {
  const toneClassName = tone === 'emerald'
    ? 'bg-emerald-500 text-emerald-700'
    : tone === 'amber'
      ? 'bg-amber-500 text-amber-700'
      : tone === 'indigo'
        ? 'bg-accent text-accent'
        : 'bg-slate-400 text-slate-600';
  return (
    <span title={title ?? label} className="inline-flex shrink-0 items-center gap-1 text-xs font-black leading-none">
      <span className={`h-1.5 w-1.5 rounded-full ${toneClassName.split(' ')[0]}`} aria-hidden="true" />
      <span className={toneClassName.split(' ').slice(1).join(' ')}>{label}</span>
    </span>
  );
}

function groupTasksByBatch(tasks: readonly AdminTask[]): readonly TaskTableGroup[] {
  const groups: TaskTableGroup[] = [];
  const batchGroups = new Map<string, { key: string; batchId: string; tasks: AdminTask[] }>();
  for (const task of tasks) {
    if (!task.batch_id) {
      groups.push({ key: task.id, tasks: [task] });
      continue;
    }
    let group = batchGroups.get(task.batch_id);
    if (!group) {
      group = { key: `batch-${task.batch_id}`, batchId: task.batch_id, tasks: [] };
      batchGroups.set(task.batch_id, group);
      groups.push(group);
    }
    group.tasks.push(task);
  }
  return groups;
}

function SortableHeader({ label, sortKey, activeSort, onSort, className = 'px-3' }: Readonly<{ label: string; sortKey: TaskSortKey; activeSort: TaskSortState; onSort: (key: TaskSortKey) => void; className?: string }>) {
  const active = activeSort.key === sortKey;
  const directionLabel = activeSort.direction === 'desc' ? '降序' : '升序';
  return (
    <th className={`${className} py-2.5`} aria-sort={active ? (activeSort.direction === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left transition hover:bg-white hover:text-ink ${FOCUS_RING}`}
        title={`按${label}${active && activeSort.direction === 'desc' ? '升序' : '降序'}排列`}
      >
        <span>{label}</span>
        <ChevronDown size={12} className={`transition ${active ? 'text-accent opacity-100' : 'opacity-35 group-hover:opacity-70'} ${active && activeSort.direction === 'asc' ? 'rotate-180' : ''}`} aria-hidden="true" />
        {active ? <span className="sr-only left-0">当前{directionLabel}</span> : null}
      </button>
    </th>
  );
}

function sortTasks(tasks: readonly AdminTask[], sort: TaskSortState): readonly AdminTask[] {
  return [...tasks].sort((left, right) => {
    const compared = compareTaskValues(left, right, sort.key);
    const normalized = compared !== 0 ? compared : compareDates(left.created_at, right.created_at) || left.id.localeCompare(right.id);
    return sort.direction === 'asc' ? normalized : -normalized;
  });
}

function compareTaskValues(left: AdminTask, right: AdminTask, key: TaskSortKey): number {
  switch (key) {
    case 'task':
      return left.id.localeCompare(right.id);
    case 'prompt':
      return left.prompt.localeCompare(right.prompt);
    case 'batch':
      return taskBatchSortValue(left).localeCompare(taskBatchSortValue(right));
    case 'user':
      return taskUserSortValue(left).localeCompare(taskUserSortValue(right));
    case 'model':
      return taskModelSortValue(left).localeCompare(taskModelSortValue(right));
    case 'worker':
      return taskWorkerSortValue(left).localeCompare(taskWorkerSortValue(right));
    case 'credits':
      return left.credits_used - right.credits_used;
    case 'failure':
      return (left.error_message || '').localeCompare(right.error_message || '');
    case 'status':
      return left.status.localeCompare(right.status);
    case 'time':
      return compareDates(left.created_at, right.created_at);
  }
}

function compareDates(left: string, right: string): number {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
  return safeLeft - safeRight;
}

function taskBatchSortValue(task: AdminTask): string {
  const index = typeof task.batch_index === 'number' ? String(task.batch_index).padStart(8, '0') : '';
  return `${task.batch_id || ''}:${index}`;
}

function taskUserSortValue(task: AdminTask): string {
  return `${task.user?.name || ''} ${task.user?.email || ''} ${task.user?.id || ''}`.toLowerCase();
}

function taskModelSortValue(task: AdminTask): string {
  return `${task.model_name || ''} ${task.model || ''} ${task.provider || ''}`.toLowerCase();
}

function taskWorkerSortValue(task: AdminTask): string {
  return `${task.worker?.hostname || ''} ${task.worker?.id || ''} ${task.worker?.status || ''}`.toLowerCase();
}

function countTaskStatuses(tasks: readonly AdminTask[]): Record<AdminTask['status'], number> {
  return tasks.reduce<Record<AdminTask['status'], number>>((acc, task) => {
    acc[task.status] += 1;
    return acc;
  }, { queued: 0, processing: 0, succeeded: 0, failed: 0, canceled: 0 });
}

function TaskDetailDialog({ labels, task, notice, canceling, syncing, deleting, retrying, requeueing, savingUpstream, onCancelTask, onDeleteTask, onSyncTask, onRetryTask, onRequeueTask, onSetUpstreamTaskID, onClose }: Readonly<{ labels: AdminLabels; task?: AdminTask; notice?: string; canceling: boolean; syncing: boolean; deleting: boolean; retrying: boolean; requeueing: boolean; savingUpstream: boolean; onCancelTask: (task: AdminTask) => void; onDeleteTask: (task: AdminTask) => void; onSyncTask: (task: AdminTask) => void; onRetryTask: (task: AdminTask) => void; onRequeueTask: (task: AdminTask) => void; onSetUpstreamTaskID: (task: AdminTask, upstreamTaskID: string) => Promise<AdminTask | undefined>; onClose: () => void }>) {
  const detailJSON = useMemo(() => task ? JSON.stringify(task, null, 2) : '', [task]);
  const referenceURLs = useMemo(() => task ? taskReferenceURLs(task.params) : [], [task]);
  const upstream = useMemo(() => task ? upstreamInfo(task.params) : undefined, [task]);
  const retryParamsJSON = useMemo(() => task ? JSON.stringify(taskRetryParams(task), null, 2) : '', [task]);
  const [upstreamTaskIDInput, setUpstreamTaskIDInput] = useState('');
  const [auditLogs, setAuditLogs] = useState<readonly AdminAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useOverlayFocus({ containerRef: dialogRef, initialFocusRef: closeRef, enabled: Boolean(task), onClose });
  useEffect(() => {
    setUpstreamTaskIDInput(upstream?.taskID ?? '');
  }, [task?.id, upstream?.taskID]);

  const loadAuditLogs = async (taskID: string) => {
    setAuditLoading(true);
    setAuditError('');
    try {
      const result = await listAdminTaskAudit(taskID);
      setAuditLogs(result.logs);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : '加载处理记录失败');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    setNoteText('');
    setAuditLogs([]);
    setAuditError('');
    if (!task?.id) return;
    void loadAuditLogs(task.id);
  }, [task?.id]);

  const saveNote = async () => {
    if (!task || noteSaving) return;
    const note = noteText.trim();
    if (!note) {
      setAuditError('备注不能为空');
      return;
    }
    setNoteSaving(true);
    setAuditError('');
    try {
      await createAdminTaskNote(task.id, note);
      setNoteText('');
      await loadAuditLogs(task.id);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : '保存备注失败');
    } finally {
      setNoteSaving(false);
    }
  };

  if (!task || typeof document === 'undefined') return null;

  const detailSections = [
    { id: 'task-status', label: '状态' },
    { id: 'task-basic', label: '基础信息' },
    { id: 'task-input', label: '输入与结果' },
    { id: 'task-audit', label: '处理记录' },
    { id: 'task-technical', label: '技术信息' },
  ] as const;

  return createPortal(
    <div className="ui-final fixed inset-0 z-overlay flex items-stretch justify-center overflow-hidden overscroll-contain bg-[var(--ui-overlay)] sm:items-center sm:p-5 lg:p-7" role="dialog" aria-modal="true" aria-labelledby={`task-detail-title-${task.id}`} onMouseDown={onClose}>
      <aside ref={dialogRef} tabIndex={-1} className="h-full w-full min-w-0 overflow-x-hidden overflow-y-auto bg-subtle shadow-floating sm:max-h-[min(940px,calc(100dvh-40px))] sm:max-w-[min(1560px,calc(100vw-56px))] sm:rounded-shell sm:border sm:border-line" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-sticky border-b border-line bg-surface/95 px-3 py-3 backdrop-blur sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <InlineBadge tone={statusTone(task.status)}>{taskStatusLabel(labels, task.status)}</InlineBadge>
                <InlineBadge tone="slate">{taskTypeLabel(labels, task.type)}</InlineBadge>
                {isPotentiallyStuckTask(task) ? <InlineBadge tone="amber">卡住风险</InlineBadge> : null}
              </div>
              <h2 id={`task-detail-title-${task.id}`} className="admin-mono mt-1.5 break-all text-base font-black text-ink sm:text-lg">{task.id}</h2>
              <p className="mt-1 break-words text-xs font-semibold text-secondary">{task.model_name || task.model} <span className="text-muted">·</span> {task.provider}{task.provider_model ? <span className="text-muted"> · {task.provider_model}</span> : null}</p>
            </div>
            <button ref={closeRef} type="button" onClick={onClose} className={`shrink-0 rounded-control border border-line bg-surface p-2 text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label={labels.tasksCloseDetails}><X size={18} /></button>
          </div>
          <div className="mt-4 grid gap-3 border-t border-line pt-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="admin-mono text-xs font-black text-secondary">诊断工具</span>
                <span className="text-xs font-medium text-muted">仅复制，不会修改任务</span>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                <CopyFeedbackButton value={taskDebugInfo(task)} idleLabel="复制排查包" copiedLabel="排查包已复制" failedLabel="复制失败" className={`inline-flex min-h-8 items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-black leading-4 text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`} iconSize={12} />
                <CopyFeedbackButton value={retryParamsJSON} idleLabel="复制重试参数" copiedLabel="参数已复制" failedLabel="复制失败" className={`inline-flex min-h-8 items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-black leading-4 text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`} iconSize={12} />
                <CopyUpstreamCurlButton taskID={task.id} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 lg:justify-end">
                <span className="admin-mono text-xs font-black text-secondary">任务操作</span>
                <span className="text-xs font-medium text-muted">危险操作仍需确认</span>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2 lg:justify-end">
                {isSyncableTask(task) ? <SyncButton busy={syncing} onClick={() => onSyncTask(task)}>同步状态</SyncButton> : null}
                {(task.status === 'failed' || task.status === 'canceled') ? <button type="button" disabled={retrying} onClick={() => onRetryTask(task)} className={`inline-flex min-h-8 items-center gap-1 rounded-control border border-warning bg-warning-soft px-2.5 py-1 text-xs font-black leading-4 text-warning hover:brightness-95 disabled:opacity-60 ${FOCUS_RING}`}>{retrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}重试任务</button> : null}
                {(task.status === 'processing' || task.status === 'queued') ? <button type="button" disabled={requeueing} onClick={() => onRequeueTask(task)} className={`inline-flex min-h-8 items-center gap-1 rounded-control border border-warning bg-warning-soft px-2.5 py-1 text-xs font-black leading-4 text-warning hover:brightness-95 disabled:opacity-60 ${FOCUS_RING}`}>{requeueing ? <Loader2 size={12} className="animate-spin" /> : <TimerReset size={12} />}重新入队</button> : null}
                {isCancelableTask(task) ? <CancelButton busy={canceling} onClick={() => onCancelTask(task)}>取消任务</CancelButton> : null}
                <DeleteButton busy={deleting} onClick={() => onDeleteTask(task)}>删除任务</DeleteButton>
              </div>
            </div>
          </div>
          {notice ? <div className="mt-3 rounded-control border border-accent bg-accent-soft px-3 py-2 text-xs font-bold text-accent" role="status" aria-live="polite">{notice}</div> : null}
          <nav className="mt-3 flex min-w-0 gap-1 overflow-x-auto border-t border-line pt-2" aria-label="任务详情分区">
            {detailSections.map((section) => <button key={section.id} type="button" onClick={() => scrollTaskDetailSection(section.id)} className={`shrink-0 rounded-control px-2.5 py-1.5 text-xs font-black text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>{section.label}</button>)}
          </nav>
        </div>

        <div className="min-w-0 space-y-3 p-3 sm:p-4">
          <DetailSection id="task-status" title="状态与排查">
            <TaskStatusSummary labels={labels} task={task} upstream={upstream} />
            {isPotentiallyStuckTask(task) ? <TaskRiskNotice task={task} /> : null}
            {task.error_message ? <DetailBlock title={labels.tasksColumnFailure} value={taskFailureDetail(task)} tone="error" /> : null}
            <TroubleshootingAdvice task={task} />
            <UpstreamDetailBlock upstream={upstream} />
            <AdminUpstreamRepairForm task={task} value={upstreamTaskIDInput} saving={savingUpstream || syncing} onChange={setUpstreamTaskIDInput} onSubmit={() => void onSetUpstreamTaskID(task, upstreamTaskIDInput)} onSubmitAndSync={async () => { const updated = await onSetUpstreamTaskID(task, upstreamTaskIDInput); if (updated) onSyncTask(updated); }} onSync={() => onSyncTask(task)} />
          </DetailSection>
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.75fr)] lg:items-start">
            <div className="min-w-0 space-y-3">
              <DetailSection id="task-input" title="输入与结果">
                <ExpandableDetailBlock title="提示词" value={task.prompt} />
                {task.negative_prompt ? <ExpandableDetailBlock title="反向提示词" value={task.negative_prompt} /> : null}
                <ResultURLBlock labels={labels} status={task.status} type={task.type} urls={task.result_urls} />
              </DetailSection>
              <DetailSection id="task-audit" title="处理记录">
                <div className="rounded-control border border-line bg-subtle/70 px-3 py-2.5">
                  <label className="admin-mono text-xs font-black text-secondary" htmlFor={`task-note-${task.id}`}>管理员备注</label>
                  <textarea id={`task-note-${task.id}`} value={noteText} onChange={(event) => setNoteText(event.target.value.slice(0, 500))} rows={3} placeholder="记录排查结论、上游沟通结果或人工处理说明" className={`mt-2 w-full resize-y rounded-control border border-line bg-surface px-3 py-2 text-sm font-semibold leading-6 text-ink outline-none placeholder:text-muted ${FOCUS_RING}`} />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-secondary">{noteText.trim().length}/500</span>
                    <button type="button" disabled={noteSaving || !noteText.trim()} onClick={() => void saveNote()} className={`inline-flex items-center gap-1 rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}>
                      {noteSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                      保存备注
                    </button>
                  </div>
                </div>
                <TaskAuditTimeline logs={auditLogs} loading={auditLoading} error={auditError} />
              </DetailSection>
              <DetailSection id="task-technical" title="技术信息">
                <JSONBlock title="参数" value={JSON.stringify(task.params, null, 2)} referenceURLs={referenceURLs} referenceTitle={labels.tasksReferencePreview} />
                <JSONBlock title="原始任务 JSON" value={detailJSON} defaultCollapsed />
              </DetailSection>
            </div>
            <aside className="min-w-0 space-y-3 lg:sticky lg:top-4">
              <DetailSection id="task-basic" title="基础信息">
                <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <DetailItem label={labels.tasksColumnUser} value={`${taskUserName(task, labels)} · ${taskUserContact(task)}`} />
                  <DetailItem label={labels.tasksColumnConsumption} value={`${task.credits_used} ${labels.credits}`} />
                  <DetailItem label={labels.tasksColumnModel} value={`${task.model_name || task.model} / ${task.provider}`} />
                  <DetailItem label="执行 Worker" value={taskWorkerDetail(task)} />
                  <DetailItem label="批次" value={task.batch_id ? `${task.batch_id}${typeof task.batch_index === 'number' ? ` · #${task.batch_index + 1}` : ''}` : '单任务'} />
                  <DetailItem label={labels.tasksDuration} value={formatTaskDuration(task)} />
                  <DetailItem label={labels.tasksCreatedAt} value={formatFullDate(task.created_at)} />
                  <DetailItem label={labels.tasksCompletedAt} value={task.completed_at ? formatFullDate(task.completed_at) : '—'} />
                </div>
              </DetailSection>
            </aside>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function TaskStatusSummary({ labels, task, upstream }: Readonly<{ labels: AdminLabels; task: AdminTask; upstream?: UpstreamInfo }>) {
  const lastUpdated = upstream?.updatedAt || task.status_updated_at;
  const workerLabel = task.worker?.status ? workerStatusLabel(task.worker.status) : task.worker?.id ? '已领取' : '未领取';
  return (
    <div className="rounded-control border border-line bg-subtle/70 p-3 sm:p-3.5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <div className="admin-mono text-xs font-black text-muted">本地状态</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-black text-ink"><InlineBadge tone={statusTone(task.status)}>{taskStatusLabel(labels, task.status)}</InlineBadge><span className="truncate text-xs font-semibold text-secondary">已运行 {formatTaskDuration(task)}</span></div>
        </div>
        <div className="min-w-0">
          <div className="admin-mono text-xs font-black text-muted">上游状态</div>
          <div className="mt-1 truncate text-sm font-black text-ink" title={upstream?.status || '未记录'}>{upstream?.status || '未记录'}</div>
        </div>
        <div className="min-w-0">
          <div className="admin-mono text-xs font-black text-muted">Worker</div>
          <div className="mt-1 truncate text-sm font-black text-ink" title={taskWorkerDetail(task)}>{workerLabel}</div>
        </div>
        <div className="min-w-0">
          <div className="admin-mono text-xs font-black text-muted">最近更新</div>
          <div className="mt-1 truncate text-sm font-black text-ink" title={lastUpdated ? formatFullDate(lastUpdated) : '—'}>{lastUpdated ? formatRelativeTime(lastUpdated) : '—'}</div>
        </div>
      </div>
    </div>
  );
}

function TaskRiskNotice({ task }: Readonly<{ task: AdminTask }>) {
  const reasons = taskRiskReasons(task);
  return (
    <section className="rounded-control border border-warning bg-warning-soft px-3 py-2.5 text-warning">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black">卡住风险</h3><span className="rounded-full border border-warning/30 bg-surface/70 px-2 py-0.5 text-xs font-black">需要关注</span></div>
          <div className="mt-2 flex flex-wrap gap-1.5">{reasons.map((reason) => <span key={reason} className="rounded-full border border-warning/30 bg-surface/70 px-2 py-1 text-xs font-bold">{reason}</span>)}</div>
          <p className="mt-2 text-xs font-semibold leading-5">建议先同步状态，核对上游返回、Worker 心跳和本地状态持久化；确认仍未推进后再考虑重新入队。</p>
        </div>
      </div>
    </section>
  );
}

function ExpandableDetailBlock({ title, value }: Readonly<{ title: string; value: string }>) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [value]);
  const long = value.length > 520 || value.split('\n').length > 8;
  return (
    <section className="min-w-0 rounded-control border border-line bg-subtle/60 px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="admin-mono text-xs font-black text-secondary">{title}</h3>
        <div className="flex items-center gap-2">
          {long ? <button type="button" onClick={() => setExpanded((current) => !current)} className={`rounded-control px-2 py-1 text-xs font-black text-secondary hover:bg-surface hover:text-ink ${FOCUS_RING}`}>{expanded ? '收起' : '展开全文'}</button> : null}
          <CopyButton value={value} />
        </div>
      </div>
      <p className={`${expanded ? 'max-h-[min(60vh,680px)]' : 'max-h-36'} overflow-auto whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-ink [scrollbar-width:thin]`}>{value || '—'}</p>
    </section>
  );
}

function TaskAuditTimeline({ logs, loading, error }: Readonly<{ logs: readonly AdminAuditLog[]; loading: boolean; error: string }>) {
  if (loading) {
    return <div className="rounded-surface border border-line bg-surface px-3 py-3 text-sm font-bold text-secondary"><Loader2 size={14} className="mr-2 inline animate-spin" />正在加载处理记录</div>;
  }
  if (error) {
    return <div className="rounded-surface border border-warning bg-warning-soft px-3 py-2 text-sm font-bold text-warning">{error}</div>;
  }
  if (logs.length === 0) {
    return <div className="rounded-surface border border-dashed border-line bg-surface px-3 py-3 text-sm font-bold text-secondary">暂无处理记录。</div>;
  }
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <article key={log.id} className="rounded-surface border border-line bg-surface px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <InlineBadge tone="slate">{auditActionLabel(log.action)}</InlineBadge>
              <span className="admin-mono text-xs font-bold text-secondary">{log.actor_user_id || 'system'}</span>
            </div>
            <time className="text-xs font-bold text-secondary" dateTime={log.created_at}>{formatFullDate(log.created_at)}</time>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-all text-sm font-semibold leading-6 text-secondary">{auditMetadataSummary(log.metadata)}</p>
        </article>
      ))}
    </div>
  );
}

function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'task.note': '备注',
    'task.cancel': '取消',
    'task.delete': '删除',
    'task.sync_status': '同步',
    'task.retry': '重试',
    'task.requeue': '重新入队',
    'task.set_upstream_task_id': '补填上游',
    'task.bulk_cancel': '批量取消',
    'task.bulk_delete': '批量删除',
    'task.bulk_requeue': '批量入队',
    'task.bulk_sync_status': '批量同步',
  };
  return labels[action] ?? action;
}

function auditMetadataSummary(metadata: Record<string, unknown>): string {
  if (typeof metadata.note === 'string') return metadata.note;
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '无附加信息';
  return entries.map(([key, value]) => `${key}: ${auditValueText(value)}`).join('\n');
}

function auditValueText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '—';
  return JSON.stringify(value);
}

function taskFailureDetail(task: AdminTask): string {
  const parts = [task.error_message || ''];
  const tags = [task.error_category ? `分类: ${task.error_category}` : '', task.error_code ? `代码: ${task.error_code}` : '', task.retryable ? '可重试' : '', task.provider_trace_id ? `Trace: ${task.provider_trace_id}` : ''].filter(Boolean);
  if (tags.length > 0) parts.push(tags.join(' · '));
  return parts.filter(Boolean).join('\n');
}

function TroubleshootingAdvice({ task }: Readonly<{ task: AdminTask }>) {
  const suggestions = taskTroubleshootingSuggestions(task);
  if (suggestions.length === 0) return null;
  return (
    <section className="rounded-surface border border-line bg-white px-3 py-2.5">
      <h3 className="admin-mono text-xs font-black uppercase tracking-normal text-secondary">排查建议</h3>
      <ul className="mt-2 space-y-1 text-sm font-semibold leading-6 text-secondary">
        {suggestions.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </section>
  );
}

function taskTroubleshootingSuggestions(task: AdminTask): readonly string[] {
  const items: string[] = [];
  const message = (task.error_message || '').toLowerCase();
  if (isPotentiallyStuckTask(task)) items.push('优先点击“同步状态”，核对上游任务是否已经完成但本地状态未更新。');
  if (/unauthorized|forbidden|api key|401|403|认证|权限/.test(message)) items.push('检查对应 Provider 的 API Key、权限范围和账号是否被禁用。');
  if (/balance|quota|insufficient|余额|额度/.test(message)) items.push('检查上游账号余额、额度、并发限制或模型调用配额。');
  if (/timeout|timed out|deadline|超时/.test(message)) items.push('检查 Worker 网络、代理、上游响应时间，并考虑重试或切换渠道。');
  if (/parameter|invalid|schema|参数/.test(message)) items.push('核对模型参数 Schema、默认值、尺寸/时长/枚举值是否被上游支持。');
  if (!task.worker?.id && (task.status === 'queued' || task.status === 'processing')) items.push('任务尚未被 Worker 领取，检查 Worker 在线状态和能力标签是否匹配。');
  if (task.worker?.status === 'offline') items.push('执行 Worker 已离线，检查 remote-worker 进程和心跳。');
  return items;
}

function taskRetryParams(task: AdminTask): Record<string, unknown> {
  return {
    type: task.type,
    model: task.model,
    model_name: task.model_name,
    provider: task.provider,
    provider_model: task.provider_model,
    prompt: task.prompt,
    negative_prompt: task.negative_prompt || undefined,
    params: task.params,
    source_task_id: task.id,
    source_batch_id: task.batch_id || undefined,
  };
}

function upstreamRequestCurl(request: AdminTaskUpstreamRequest): string {
  const headers = Object.entries(request.headers);
  return [
    `curl -sS -X ${shellQuote(request.method)} ${shellQuote(request.url)} \\`,
    ...headers.map(([name, value]) => `  -H ${shellQuote(`${name}: ${value}`)} \\`),
    `  --data-binary @- <<'JSON'`,
    JSON.stringify(request.body, null, 2),
    'JSON',
  ].join('\n');
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function taskDebugInfo(task: AdminTask): string {
  return [
    `任务ID: ${task.id}`,
    `状态: ${task.status}`,
    `类型: ${task.type}`,
    `用户: ${taskUserContact(task)}`,
    `模型: ${task.model_name || task.model} / ${task.provider} / ${task.provider_model || '-'}`,
    `Worker: ${taskWorkerDetail(task)}`,
    `Batch: ${task.batch_id || '-'}${typeof task.batch_index === 'number' ? ` #${task.batch_index + 1}` : ''}`,
    `消耗: ${task.credits_used}`,
    `结果数: ${task.result_count}`,
    `创建: ${formatFullDate(task.created_at)}`,
    `完成: ${task.completed_at ? formatFullDate(task.completed_at) : '-'}`,
    `耗时: ${formatTaskDuration(task)}`,
    `错误: ${task.error_message || '-'}`,
    `Prompt: ${previewText(task.prompt, 240)}`,
  ].join('\n');
}

function TaskExecutionMeta({ task }: Readonly<{ task: AdminTask }>) {
  const upstreamTaskID = upstreamInfo(task.params)?.taskID ?? '';
  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
      {upstreamTaskID ? (
        <CopyFeedbackButton
          value={upstreamTaskID}
          idleLabel={`upstream task_id: ${upstreamTaskID}`}
          copiedLabel="task_id 已复制"
          failedLabel="task_id 复制失败"
          className={`admin-mono inline-flex min-w-0 flex-1 items-center gap-1 truncate text-xs font-bold leading-4 text-secondary hover:text-ink ${FOCUS_RING}`}
          iconSize={11}
          title={`点击复制 upstream task_id\n${upstreamTaskID}`}
          ariaLabel={`复制 upstream task_id ${upstreamTaskID}`}
        />
      ) : null}
      <TaskWorkerMeta task={task} />
    </div>
  );
}

function TaskWorkerMeta({ task }: Readonly<{ task: AdminTask }>) {
  const worker = task.worker;
  if (!worker?.id) {
    return <div className="inline-flex shrink-0 items-center gap-1 text-muted" title="Worker: 未领取"><Server size={11} aria-hidden="true" /><span className="admin-mono text-[11px] font-medium leading-4">未领取</span></div>;
  }
  const displayName = worker.id || worker.hostname || 'worker';
  const detailTitle = [workerStatusLabel(worker.status), worker.hostname ? `host: ${worker.hostname}` : '', worker.version ? `version: ${worker.version}` : ''].filter(Boolean).join(' · ');
  return (
    <div className="inline-flex min-w-0 shrink-0 items-center gap-1 text-muted" title={`Worker: ${displayName} · ${detailTitle}`}>
      <Server size={11} className="shrink-0" aria-hidden="true" />
      <span className="admin-mono max-w-[124px] truncate text-[11px] font-medium leading-4">
        <span className="sr-only">Worker: </span>{displayName}
      </span>
      {worker.attempt_count > 1 ? <span className="shrink-0 text-[11px] font-semibold leading-4">重试 {worker.attempt_count}</span> : null}
    </div>
  );
}

function taskWorkerDetail(task: AdminTask): string {
  const worker = task.worker;
  if (!worker?.id) return '未领取';
  const parts = [worker.hostname || worker.id, worker.id, worker.status ? workerStatusLabel(worker.status) : '', `attempt ${worker.attempt_count}`].filter(Boolean);
  if (worker.last_task_heartbeat_at) parts.push(`任务心跳 ${formatFullDate(worker.last_task_heartbeat_at)}`);
  if (worker.locked_until) parts.push(`锁定至 ${formatFullDate(worker.locked_until)}`);
  return parts.join(' · ');
}


function workerStatusLabel(status?: string): string {
  if (status === 'busy') return '忙碌';
  if (status === 'online') return '在线';
  if (status === 'offline') return '离线';
  return status || '未知';
}


function ErrorPreview({ message }: Readonly<{ message: string }>) {
  const [copied, setCopied] = useState(false);
  const diagnostic = taskErrorDiagnosticSummary(message);
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={copyMessage}
      className={`box-border w-full max-w-full overflow-hidden rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-left text-xs font-bold leading-4 text-amber-800 transition hover:bg-amber-100 active:scale-[0.99] ${FOCUS_RING}`}
      title={`${message}
点击复制完整错误信息`}
      aria-label="复制错误信息"
    >
      <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-1.5">
        <AlertTriangle size={14} className="mt-px shrink-0" />
        <span className="min-w-0 line-clamp-2 break-words">{copied ? '已复制完整错误信息' : diagnostic}</span>
        <Copy size={12} className="mt-px shrink-0 opacity-70" aria-hidden="true" />
      </span>
    </button>
  );
}

function DetailItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-surface border border-line bg-white px-3 py-2">
      <div className="admin-mono text-xs font-black uppercase tracking-normal text-secondary">{label}</div>
      <div className="mt-0.5 line-clamp-2 min-w-0 break-all text-xs font-bold leading-5 text-ink" title={value}>{value}</div>
    </div>
  );
}

function DetailSection({ id, title, children }: Readonly<{ id?: string; title: string; children: React.ReactNode }>) {
  return (
    <section id={id} className="min-w-0 scroll-mt-28 space-y-2 rounded-surface border border-line bg-surface p-3 sm:p-4">
      <h3 className="admin-mono text-xs font-black uppercase tracking-normal text-secondary">{title}</h3>
      <div className="min-w-0 space-y-2">{children}</div>
    </section>
  );
}

function DetailBlock({ title, value, tone }: Readonly<{ title: string; value: string; tone?: 'error' }>) {
  const className = tone === 'error' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-line bg-white text-ink';
  return (
    <section className={`min-w-0 rounded-surface border px-3 py-2.5 ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="admin-mono text-xs font-black uppercase tracking-normal text-secondary">{title}</h3>
        <CopyButton value={value} />
      </div>
      <p className="max-h-28 overflow-auto whitespace-pre-wrap break-all text-sm font-semibold leading-6 [scrollbar-width:thin] sm:max-h-32">{value}</p>
    </section>
  );
}

type UpstreamInfo = Readonly<{
  taskID: string;
  status: string;
  provider: string;
  progress: string;
  updatedAt: string;
  cancelStatus: string;
  cancelMessage: string;
  cancelError: string;
  cancelUpdatedAt: string;
  repairedByAdmin: boolean;
}>;

function UpstreamDetailBlock({ upstream }: Readonly<{ upstream?: UpstreamInfo }>) {
  if (!upstream || (!upstream.taskID && !upstream.status && !upstream.cancelStatus)) {
    return <DetailBlock title="上游状态" value="暂无上游任务信息。任务可能尚未提交到 provider，或历史任务未记录 upstream 字段。" />;
  }
  const cancelTone = upstream.cancelStatus === 'unsupported' || upstream.cancelError ? 'amber' : upstream.cancelStatus ? 'emerald' : 'slate';
  return (
    <section className="min-w-0 rounded-surface border border-line bg-white px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="admin-mono text-xs font-black uppercase tracking-normal text-secondary">上游状态</h3>
        <div className="flex items-center gap-2">
          {upstream.repairedByAdmin ? <InlineBadge tone="indigo">管理员已修复</InlineBadge> : null}
          {upstream.taskID ? <CopyButton value={upstream.taskID} /> : null}
        </div>
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-4">
        <UpstreamKV label="upstream task_id" value={upstream.taskID} mono copyable />
        <UpstreamKV label="upstream status" value={upstream.status} />
        <UpstreamKV label="provider" value={upstream.provider} />
        <UpstreamKV label="progress" value={upstream.progress} />
        <UpstreamKV label="updated_at" value={upstream.updatedAt} />
        <UpstreamKV label="cancel_status" value={upstream.cancelStatus} tone={cancelTone} />
        <UpstreamKV label="cancel_message" value={upstream.cancelMessage} />
        <UpstreamKV label="cancel_updated_at" value={upstream.cancelUpdatedAt} />
      </div>
      {upstream.cancelError ? <div className="mt-3 rounded-surface border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">cancel_error：{upstream.cancelError}</div> : null}
    </section>
  );
}

function AdminUpstreamRepairForm({ task, value, saving, onChange, onSubmit, onSubmitAndSync, onSync }: Readonly<{ task: AdminTask; value: string; saving: boolean; onChange: (value: string) => void; onSubmit: () => void; onSubmitAndSync: () => Promise<void>; onSync: () => void }>) {
  if (task.status === 'succeeded') return null;
  const trimmed = value.trim();
  const currentUpstreamTaskID = upstreamInfo(task.params)?.taskID ?? '';
  const changed = trimmed !== '' && trimmed !== currentUpstreamTaskID;
  return (
    <section className="rounded-surface border border-indigo-100 bg-indigo-50/40 px-3 py-2.5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1">
          <span className="admin-mono text-xs font-black uppercase tracking-normal text-secondary">手动补填上游 task_id</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="粘贴上游返回的 task_id / id"
            className={`mt-1 w-full rounded-surface border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none placeholder:text-muted ${FOCUS_RING}`}
          />
        </label>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" disabled={!changed || saving} onClick={onSubmit} className={`inline-flex items-center gap-1 rounded-surface border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-accent hover:bg-indigo-50 disabled:opacity-50 ${FOCUS_RING}`}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            保存 task_id
          </button>
          {changed ? <button type="button" disabled={saving} onClick={() => void onSubmitAndSync()} className={`rounded-surface border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 ${FOCUS_RING}`}>保存并同步</button> : null}
          {currentUpstreamTaskID && !changed ? <button type="button" disabled={saving} onClick={onSync} className={`rounded-surface border border-line bg-white px-3 py-2 text-xs font-black text-secondary hover:bg-subtle disabled:opacity-50 ${FOCUS_RING}`}>同步状态</button> : null}
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-secondary">用于修复“已提交上游但本系统未保存 task_id”的任务。保存后会写入 params.upstream.task_id，并可通过现有同步状态逻辑继续追踪结果。</p>
    </section>
  );
}

function UpstreamKV({ label, value, mono, copyable = false, tone = 'slate' }: Readonly<{ label: string; value: string; mono?: boolean; copyable?: boolean; tone?: 'slate' | 'amber' | 'emerald' }>) {
  const toneClassName = tone === 'amber' ? 'text-amber-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-ink';
  return (
    <div className="rounded-lg border border-line bg-subtle px-2 py-1.5">
      <div className="admin-mono text-xs font-black uppercase tracking-normal text-muted">{label}</div>
      {copyable && value ? (
        <CopyFeedbackButton
          value={value}
          idleLabel={value}
          copiedLabel="task_id 已复制"
          failedLabel="复制失败"
          className={`-mx-1 mt-0.5 inline-flex w-[calc(100%+0.5rem)] min-w-0 items-center gap-1 overflow-hidden rounded-control px-1 py-0.5 text-left text-xs font-black hover:bg-surface ${toneClassName} ${mono ? 'admin-mono' : ''} ${FOCUS_RING}`}
          iconSize={11}
          title={`点击复制 ${value}`}
          ariaLabel={`复制 upstream task_id：${value}`}
        />
      ) : (
        <div className={`mt-0.5 line-clamp-1 break-all text-xs font-black ${toneClassName} ${mono ? 'admin-mono' : ''}`} title={value || '—'}>{value || '—'}</div>
      )}
    </div>
  );
}

function JSONBlock({ title, value, defaultCollapsed, referenceURLs = [], referenceTitle = '参考图预览' }: Readonly<{ title: string; value: string; defaultCollapsed?: boolean; referenceURLs?: readonly string[]; referenceTitle?: string }>) {
  return (
    <details open={!defaultCollapsed} className="group min-w-0 rounded-surface border border-line bg-navigation px-3 py-2.5 text-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <ChevronDown size={15} className="text-white/55 transition group-open:rotate-180" aria-hidden="true" />
          <span className="admin-mono text-xs font-black uppercase tracking-normal text-white/60">{title}</span>
        </span>
        <CopyButton value={value} />
      </summary>
      {referenceURLs.length > 0 ? <ReferenceURLPreview title={referenceTitle} urls={referenceURLs} /> : null}
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-surface bg-black/10 p-3 text-xs leading-5 text-slate-100 sm:max-h-64">{value}</pre>
    </details>
  );
}

function ReferenceURLPreview({ title, urls }: Readonly<{ title: string; urls: readonly string[] }>) {
  return (
    <div className="mt-3 rounded-surface border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="admin-mono text-xs font-black uppercase tracking-normal text-white/50">{title}</h4>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-black text-white/60">{urls.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {urls.map((url, index) => (
          <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className={`group/preview overflow-hidden rounded-surface border border-white/10 bg-white/5 text-xs font-bold text-slate-100 transition hover:border-white/35 hover:bg-white/10 ${FOCUS_RING}`} title={url}>
            <span className="block aspect-video bg-slate-900">
              {looksLikeImageURL(url) ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin task references are signed remote URLs and need quick preview.
                <img src={displayMediaURL(url)} alt={`reference-${index + 1}`} className="h-full w-full object-cover transition group-hover/preview:scale-[1.03]" loading="lazy" />
              ) : (
                <span className="flex h-full items-center justify-center text-white/45"><ExternalLink size={20} aria-hidden="true" /></span>
              )}
            </span>
            <span className="flex items-center gap-1 px-2 py-1.5 text-white/70">
              <ExternalLink size={12} aria-hidden="true" />
              <span className="truncate">reference-{index + 1}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function ResultURLBlock({ labels, status, type, urls }: Readonly<{ labels: AdminLabels; status: AdminTask['status']; type: AdminTask['type']; urls: readonly string[] }>) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewID = `task-result-preview-${urls.join('-').replace(/[^a-zA-Z0-9_-]/g, '').slice(-24) || 'empty'}`;
  const selectedURL = urls[previewIndex] ?? urls[0];

  useEffect(() => {
    setPreviewOpen(false);
    setPreviewIndex(0);
  }, [urls]);

  return (
    <section className="rounded-control border border-line bg-subtle/60 px-3 py-2.5">
      <h3 className="admin-mono text-xs font-black uppercase tracking-normal text-secondary">{labels.tasksResultURLs}</h3>
      {urls.length === 0 ? <div className="mt-2 rounded-control border border-dashed border-line bg-surface px-3 py-2.5"><p className="text-sm font-bold text-secondary">暂无结果 URL</p><p className="mt-1 text-xs font-semibold leading-5 text-muted">{resultEmptyHint(status)}</p></div> : null}
      {urls.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CopyFeedbackButton value={urls.join('\n')} idleLabel="复制全部结果" copiedLabel="结果已复制" failedLabel="复制失败" className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle ${FOCUS_RING}`} iconSize={13} />
          <button type="button" onClick={() => setPreviewOpen((open) => !open)} aria-expanded={previewOpen} aria-controls={previewID} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`} title={previewOpen ? '收起结果预览' : '预览结果'}>
            <Eye size={13} aria-hidden="true" />
            {previewOpen ? '收起预览' : '预览'}
          </button>
        </div>
      ) : null}
      {previewOpen && selectedURL ? <TaskResultPreview key={selectedURL} id={previewID} type={type} urls={urls} selectedIndex={previewIndex} onSelect={setPreviewIndex} /> : null}
      <div className="mt-2 space-y-2">
        {urls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-xs font-bold text-secondary hover:border-line-strong hover:text-ink"><ExternalLink size={14} className="shrink-0" /><span className="min-w-0 truncate" title={url}>{url}</span></a>)}
      </div>
    </section>
  );
}

function TaskResultPreview({ id, type, urls, selectedIndex, onSelect }: Readonly<{ id: string; type: AdminTask['type']; urls: readonly string[]; selectedIndex: number; onSelect: (index: number) => void }>) {
  const url = urls[selectedIndex] ?? urls[0];
  const title = `任务结果 #${selectedIndex + 1}`;
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const previewable = isPreviewableResultURL(url);

  useEffect(() => {
    setState('loading');
  }, [url]);

  return (
    <section id={id} className="mt-3 overflow-hidden rounded-control border border-line bg-[var(--ui-preview-canvas)]" aria-label="结果预览">
      {urls.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-line bg-surface p-2" aria-label="选择预览结果">
          {urls.map((resultURL, index) => (
            <button key={resultURL} type="button" onClick={() => onSelect(index)} aria-pressed={selectedIndex === index} className={`min-h-7 rounded-control border px-2 text-xs font-black transition ${selectedIndex === index ? 'border-ink bg-ink text-white' : `border-line bg-surface text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}`}>
              结果 {index + 1}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden p-2 sm:min-h-[360px] sm:p-3">
        {!previewable ? <ResultPreviewFallback title={title} message="该结果链接无法内嵌预览，请通过下方链接打开。" /> : null}
        {previewable && type === 'video' && state !== 'failed' ? <video src={displayMediaURL(url)} controls playsInline preload="metadata" aria-label={`${title} 视频预览`} onLoadedMetadata={() => setState('ready')} onError={() => setState('failed')} className={`max-h-[min(60dvh,560px)] w-full rounded-control bg-navigation object-contain shadow-surface transition-opacity ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`} /> : null}
        {previewable && type === 'image' && state !== 'failed' ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated result URLs are runtime object-storage URLs.
          <img src={displayMediaURL(url)} alt={`${title} 图片预览`} width={1800} height={1800} onLoad={() => setState('ready')} onError={() => setState('failed')} className={`max-h-[min(60dvh,560px)] max-w-full rounded-control object-contain shadow-surface transition-opacity ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`} />
        ) : null}
        {previewable && state === 'loading' ? <div className="absolute inset-0 animate-pulse bg-line motion-reduce:animate-none" role="status" aria-label="正在加载结果预览" /> : null}
        {previewable && state === 'failed' ? <ResultPreviewFallback title={title} message="结果加载失败，请通过下方链接打开。" /> : null}
      </div>
    </section>
  );
}

function ResultPreviewFallback({ title, message }: Readonly<{ title: string; message: string }>) {
  return (
    <div className="rounded-control border border-line bg-surface px-4 py-3 text-center shadow-surface">
      <p className="text-sm font-black text-ink">{title}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{message}</p>
    </div>
  );
}

function isPreviewableResultURL(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function taskReferenceURLs(params: Record<string, unknown>): string[] {
  const candidates = [
    params.reference_asset_url,
    params.reference_asset_urls,
    params.source_asset_url,
    params.source_asset_urls,
    params.image_url,
    params.image_urls,
  ];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    for (const url of stringListValue(candidate)) {
      if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

function upstreamInfo(params: Record<string, unknown>): UpstreamInfo | undefined {
  const raw = params.upstream;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const upstream = raw as Record<string, unknown>;
  return {
    taskID: stringValue(upstream.task_id),
    status: stringValue(upstream.status),
    provider: stringValue(upstream.provider),
    progress: stringValue(upstream.progress),
    updatedAt: stringValue(upstream.updated_at),
    cancelStatus: stringValue(upstream.cancel_status),
    cancelMessage: stringValue(upstream.cancel_message),
    cancelError: stringValue(upstream.cancel_error),
    cancelUpdatedAt: stringValue(upstream.cancel_updated_at),
    repairedByAdmin: upstream.repaired_by_admin === true || stringValue(upstream.repaired_by_admin) === 'true',
  };
}

function stringValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stringListValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(stringListValue);
  if (typeof value !== 'string') return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function looksLikeImageURL(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/.test(lower) || lower.includes('response-content-disposition=inline');
}

function CopyFeedbackButton({
  value,
  idleLabel,
  copiedLabel = '已复制',
  failedLabel = '复制失败',
  className,
  iconSize = 13,
  tone = 'light',
  title,
  ariaLabel,
}: Readonly<{
  value: string;
  idleLabel: string;
  copiedLabel?: string;
  failedLabel?: string;
  className: string;
  iconSize?: number;
  tone?: 'light' | 'dark';
  title?: string;
  ariaLabel?: string;
}>) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
  }, []);

  const scheduleReset = () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setStatus('idle'), 1600);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('success');
    } catch {
      setStatus('error');
    }
    scheduleReset();
  };

  const label = status === 'success' ? copiedLabel : status === 'error' ? failedLabel : idleLabel;
  const statusClassName = tone === 'dark'
    ? status === 'success'
      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:text-emerald-50'
      : status === 'error'
        ? 'border-rose-400/40 bg-rose-500/15 text-rose-100 hover:text-rose-50'
        : ''
    : status === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
      : status === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'
        : '';

  return (
    <button type="button" onClick={() => void handleCopy()} className={`${className} ${statusClassName}`} title={title} aria-label={ariaLabel}>
      {status === 'error' ? <XCircle size={iconSize} className="shrink-0" /> : <Copy size={iconSize} className="shrink-0" />}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function CopyUpstreamCurlButton({ taskID }: Readonly<{ taskID: string }>) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
  }, []);

  const scheduleReset = () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setStatus('idle'), 1800);
  };

  const handleCopy = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const request = await getAdminTaskUpstreamRequest(taskID);
      await navigator.clipboard.writeText(upstreamRequestCurl(request));
      setStatus('success');
    } catch {
      setStatus('error');
    }
    scheduleReset();
  };

  const label = status === 'loading' ? '生成中' : status === 'success' ? '上游 curl 已复制' : status === 'error' ? '生成失败' : '复制上游 curl';
  return (
    <button type="button" disabled={status === 'loading'} onClick={() => void handleCopy()} className={`inline-flex min-h-8 items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-black leading-4 text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink disabled:cursor-wait disabled:opacity-60 ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : ''} ${FOCUS_RING}`}>
      {status === 'loading' ? <Loader2 size={12} className="shrink-0 animate-spin" /> : status === 'error' ? <XCircle size={12} className="shrink-0" /> : <Copy size={12} className="shrink-0" />}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function CopyButton({ value }: Readonly<{ value: string }>) {
  return <CopyFeedbackButton value={value} idleLabel="复制" copiedLabel="已复制" failedLabel="失败" className={`inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs font-black text-secondary hover:text-ink ${FOCUS_RING}`} tone="dark" />;
}


function IconActionButton({ label, busy = false, tone, size = 'compact', children, onClick }: Readonly<{ label: string; busy?: boolean; tone: 'slate' | 'indigo' | 'rose'; size?: 'compact' | 'comfortable'; children: React.ReactNode; onClick: () => void }>) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  };
  const toneClass = tone === 'rose'
    ? 'border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50'
    : tone === 'indigo'
      ? 'border-indigo-200 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50'
      : 'border-line text-secondary hover:border-line-strong hover:text-ink';
  return (
    <button type="button" disabled={busy} onClick={handleClick} title={label} aria-label={label} className={`inline-flex ${size === 'comfortable' ? 'size-8' : 'size-6'} shrink-0 items-center justify-center rounded-md border bg-white disabled:cursor-wait disabled:opacity-60 ${toneClass} ${FOCUS_RING}`}>
      {children}
    </button>
  );
}

function isCancelableTask(task: AdminTask): boolean {
  return task.status === 'queued' || task.status === 'processing';
}

function isSyncableTask(task: AdminTask): boolean {
  return task.status === 'queued' || task.status === 'processing' || task.status === 'failed' || task.status === 'canceled';
}

function isCancelableBatch(batch: AdminTaskBatch): boolean {
  return batch.queued > 0 || batch.processing > 0 || batch.status === 'queued' || batch.status === 'processing';
}

function SyncButton({ busy, children, onClick }: Readonly<{ busy: boolean; children: React.ReactNode; onClick: () => void }>) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  };
  return (
    <button type="button" disabled={busy} onClick={handleClick} className={`inline-flex min-h-8 whitespace-nowrap items-center gap-1 rounded-control border border-accent bg-accent-soft px-2.5 py-1 text-xs font-black leading-4 text-accent hover:border-accent hover:bg-accent-soft disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}>
      {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}{children}
    </button>
  );
}

function DeleteButton({ busy, children, onClick }: Readonly<{ busy: boolean; children: React.ReactNode; onClick: () => void }>) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  };
  return (
    <button type="button" disabled={busy} onClick={handleClick} className={`inline-flex whitespace-nowrap items-center gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 py-1 text-xs font-black leading-4 text-red-700 hover:border-red-300 hover:bg-red-100 disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}>
      {busy ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}{children}
    </button>
  );
}

function CancelButton({ busy, children, onClick }: Readonly<{ busy: boolean; children: React.ReactNode; onClick: () => void }>) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  };
  return (
    <button type="button" disabled={busy} onClick={handleClick} className={`inline-flex whitespace-nowrap items-center gap-1 rounded-md border border-rose-200 bg-white px-1.5 py-1 text-xs font-black leading-4 text-rose-700 hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 ${FOCUS_RING}`}>
      {busy ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}{children}
    </button>
  );
}

function statusCount(stats: AdminTaskList['stats'], status: AdminTaskStatusFilter): number {
  return status === 'all' ? stats.total : stats.counts[status];
}

function taskStatusLabel(labels: AdminLabels, status: AdminTaskStatusFilter | AdminTask['status']): string {
  return ({ all: labels.tasksAll, queued: labels.tasksQueued, processing: labels.tasksProcessing, succeeded: labels.tasksSucceeded, failed: labels.tasksFailed, canceled: labels.tasksFailed })[status];
}

function taskTypeLabel(labels: AdminLabels, type: AdminTaskTypeFilter | AdminTask['type']): string {
  return ({ all: labels.tasksAllTypes, image: labels.imageModels, video: labels.videoModels })[type];
}

function statusTone(status: AdminTask['status']): 'indigo' | 'emerald' | 'slate' | 'amber' {
  if (status === 'succeeded') return 'emerald';
  if (status === 'failed') return 'amber';
  if (status === 'processing') return 'indigo';
  return 'slate';
}

function previewText(value: string, maxLength = PROMPT_PREVIEW_LENGTH): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function formatCompactDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' }).format(date);
}

function formatFullDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' }).format(date);
}

function formatRelativeTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function scrollTaskDetailSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function taskRiskReasons(task: AdminTask): readonly string[] {
  const reasons: string[] = [];
  const now = Date.now();
  if (task.result_count > 0 || task.result_urls.length > 0) reasons.push('已有结果但本地状态未完成');
  if (task.status === 'queued' && elapsedSince(task.next_attempt_at || task.status_updated_at || task.created_at, now) >= 10 * 60 * 1000) reasons.push('排队超过 10 分钟');
  if (task.status === 'processing' && task.worker?.status === 'offline') reasons.push('执行 Worker 已离线');
  if (task.status === 'processing' && task.worker?.locked_until && Date.parse(task.worker.locked_until) < now) reasons.push('Worker 租约已过期');
  if (task.status === 'processing' && task.worker?.id && elapsedSince(task.worker.last_task_heartbeat_at || task.processing_started_at || task.created_at, now) >= 2 * 60 * 1000) reasons.push('任务心跳/进展超过 2 分钟');
  if (task.status === 'processing' && elapsedSince(task.processing_started_at || task.status_updated_at || task.created_at, now) >= 45 * 60 * 1000) reasons.push('处理超过 45 分钟');
  return reasons.length > 0 ? reasons : ['命中任务卡住风险规则'];
}

function elapsedSince(value: string, now: number): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : 0;
}

function resultEmptyHint(status: AdminTask['status']): string {
  if (status === 'queued') return '任务仍在队列中，尚未产生结果。';
  if (status === 'processing') return '任务仍在执行中，结果 URL 可能尚未持久化。';
  if (status === 'failed' || status === 'canceled') return '任务未生成可用结果。';
  return '任务已完成，但当前记录没有结果 URL。';
}

function formatTaskDuration(task: AdminTask): string {
  if ((task.status === 'queued' || task.status === 'processing') && task.duration_ms === undefined) {
    return formatDuration(runningDurationMs(task));
  }
  return formatDuration(task.duration_ms);
}

function formatDuration(value?: number): string {
  if (typeof value !== 'number') return '—';
  if (value < 1000) return `${value}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes < 60) return restSeconds > 0 ? `${minutes}m ${restSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours}h ${restMinutes}m` : `${hours}h`;
}
