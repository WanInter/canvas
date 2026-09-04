'use client';

import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { useToast } from '@/components/ui/ToastProvider';
import {
  deleteAdminModel,
  deleteGenerationProvider,
  testGenerationProvider,
  deleteStorageProvider,
  deleteBillingProduct,
  getAdminOverview,
  listAdminOrders,
  listAdminTasks,
  listAdminUsers,
  listAdminWorkers,
  updateAdminWorker,
  listUserRechargePromotions,
  upsertUserRechargePromotion,
  deleteUserRechargePromotion,
  type AdminBillingProduct,
  type AdminPaymentChannel,
  type AdminOrder,
  type AdminOrderList,
  type AdminOrderStatusFilter,
  type AdminTask,
  type AdminTaskList,
  type AdminWorker,
  type AdminWorkerList,
  type AdminTaskStatusFilter,
  type AdminTaskTypeFilter,
  type AdminTaskErrorCategoryFilter,
  type AdminTaskTimeRangeFilter,
  type AdminTaskRunningStateFilter,
  type AdminTaskUpstreamStateFilter,
  type AdminTaskRetryableFilter,
  type AdminSortOrder,
  type AdminUser,
  type AdminUserList,
  type AdminUserSortField,
  type AdminUserStatusFilter,
  type UserRechargePromotion,
  type UserRechargePromotionInput,
  updateAdminModel,
  updateAdminUser,
  resetAdminUserPassword,
  updateBillingProduct,
  updateGenerationProvider,
  updateStorageProvider,
  testStorageProvider,
  listModelRoutingRules,
  type AdminModelRoutingRule,
} from '@/lib/api/admin';
import { AdminRedeemPageView } from '@/components/redeem/AdminRedeemPage';
import { AdminAnnouncementsSection } from './AdminAnnouncementsSection';
import { AdminModelRoutingSection } from './AdminModelRoutingSection';
import { AdminPaymentChannelsSection } from './AdminPaymentChannelsSection';
import { AdminPurchaseModeLabelsSection } from './AdminPurchaseModeLabelsSection';
import { ModelsSection, ProductsSection, ProviderSection, StorageSection } from './AdminSections';
import { EmptyState } from './AdminSectionPrimitives';
import { OrdersSection } from './AdminOrdersSection';
import { TasksSection } from './AdminTasksSection';
import { WorkersSection } from './AdminWorkersSection';
import { UsersSection } from './AdminUsersSection';
import { AdminWorkspaceNavigation, type AdminNavigationItem } from './AdminWorkspaceNavigation';
import {
  createDraftKey,
  emptyProviderForm,
  emptyModelForm,
  duplicateModelDraftForm,
  emptyProductForm,
  emptyStorageProviderForm,
  getLabels,
  FOCUS_RING,
  isModelFormDirty,
  isValueSubscriptionMode,
  modelForm,
  parseCSV,
  parseProviderPricesText,
  parseProductBenefitsText,
  patchRecordEntry,
  productForm,
  providerForm,
  removeRecordEntry,
  resetModelForm,
  replaceRecordEntry,
  type ModelEntry,
  type ModelForm,
  type ProductEntry,
  type ProductForm,
  type ProviderEntry,
  type ProviderForm,
  type StorageProviderEntry,
  type StorageProviderForm,
  storageProviderForm,
} from './adminUtils';
import {
  defaultEditableParamsForProvider,
  defaultEditablePricingConfig,
  editableParamListSignature,
  editablePricingConfigSignature,
  modelFieldDOMID,
  parseDisplayOrder,
  serializeEditableParams,
  serializeEditableInputLimits,
  serializeEditablePricingConfig,
  validateModelState,
  type ModelValidationIssue,
} from './modelEditorUtils';

export function AdminPageView() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const labels = useMemo(() => getLabels(language), [language]);
  const {
    loading,
    refreshing,
    accessState,
    error,
    providerForms,
    setProviderForms,
    storageForms,
    setStorageForms,
    modelForms,
    setModelForms,
    productForms,
    setProductForms,
    modelIssues,
    setModelIssues,
    effectiveBillingProducts,
    setEffectiveBillingProducts,
    paymentChannels,
    userCounts,
    savingKey,
    setSavingKey,
    providerEntries,
    storageEntries,
    modelEntries,
    productEntries,
    providerOptions,
    hasDirtyModels,
    loadOverview,
  } = useAdminOverviewData(labels, showToast);
  const refreshOverviewAfterUserChange = useCallback(() => loadOverview(false), [loadOverview]);
  const {
    adminOrders,
    adminOrdersTotal,
    adminOrdersLimit,
    adminOrdersOffset,
    adminOrdersQuery,
    adminOrdersStatus,
    adminOrdersProvider,
    adminOrdersStats,
    adminOrdersSummary,
    adminOrdersLoading,
    adminOrdersRefreshing,
    adminOrdersLoaded,
    adminOrdersError,
    setAdminOrdersQuery,
    setAdminOrdersStatus,
    setAdminOrdersProvider,
    setAdminOrdersPageSize,
    loadAdminOrders,
  } = useAdminOrdersData(labels, showToast);
  const {
    adminTasks,
    adminTasksTotal,
    adminTasksLimit,
    adminTasksOffset,
    adminTasksQuery,
    adminTasksStatus,
    adminTasksType,
    adminTasksStats,
    adminTasksSummary,
    adminTasksWorkerID,
    adminTasksErrorCategory,
    adminTasksTimeRange,
    adminTasksRunningState,
    adminTasksProvider,
    adminTasksProviderModel,
    adminTasksModel,
    adminTasksBatchID,
    adminTasksUpstreamState,
    adminTasksRetryable,
    adminTasksLoading,
    adminTasksRefreshing,
    adminTasksLoaded,
    adminTasksError,
    setAdminTasksQuery,
    setAdminTasksStatus,
    setAdminTasksType,
    setAdminTasksWorkerID,
    setAdminTasksErrorCategory,
    setAdminTasksTimeRange,
    setAdminTasksRunningState,
    setAdminTasksAdvancedFilters,
    setAdminTasksPageSize,
    patchAdminTask,
    removeAdminTask,
    loadAdminTasks,
  } = useAdminTasksData(labels, showToast);
  const {
    workers,
    workerStats,
    workersLoading,
    workersRefreshing,
    workersLoaded,
    workersError,
    savingWorkerID,
    loadWorkers,
    toggleWorkerEnabled,
    updateWorkerConcurrency,
  } = useAdminWorkersData(labels, showToast);
  const {
    users,
    usersTotal,
    usersLimit,
    usersOffset,
    usersQuery,
    usersStatus,
    usersSort,
    usersOrder,
    usersCounts,
    usersLoading,
    usersRefreshing,
    usersLoaded,
    usersError,
    savingUserID,
    setUsersQuery,
    setUsersStatus,
    setUsersSortChange,
    setUsersPageSize,
    loadUsers,
    saveUserAdmin,
    resetUserPassword,
  } = useAdminUsersData(labels, showToast, refreshOverviewAfterUserChange);
  const {
    userRechargePromotions,
    userRechargePromotionQueryUserID,
    userRechargePromotionsLoading,
    userRechargePromotionsLoaded,
    userRechargePromotionsError,
    savingUserRechargePromotionID,
    setUserRechargePromotionQueryUserID,
    loadUserRechargePromotions,
    saveUserRechargePromotion,
    removeUserRechargePromotion,
  } = useUserRechargePromotionsData(labels, showToast);
  const { routingRules, loadRoutingRules } = useRoutingRulesData();
  const {
    patchStorageForm,
    patchProviderForm,
    patchModelForm,
    patchProductForm,
    addModelDraft,
    duplicateModelDraft,
    addProviderDraft,
    addStorageDraft,
    addProductDraft,
    dismissModelDraft,
    dismissProviderDraft,
    dismissStorageDraft,
    dismissProductDraft,
    saveProvider,
    deleteProvider,
    testProvider,
    saveStorage,
    testStorage,
    deleteStorage,
    saveModel,
    saveAllDirtyModels,
    deleteModel,
    deleteProduct,
    saveProduct,
    toggleProductActive,
    resetModelChanges,
  } = useAdminActions({
    labels,
    showToast,
    providerForms,
    setProviderForms,
    storageForms,
    setStorageForms,
    modelForms,
    setModelForms,
    productForms,
    setProductForms,
    setModelIssues,
    setEffectiveBillingProducts,
    setSavingKey,
    providerOptions,
    loadOverview,
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    void loadOverview();
    void loadAdminOrders(0, '', 'all', 'all', ADMIN_ORDERS_PAGE_SIZE, false);
    void loadAdminTasks(0, '', 'all', 'all', ADMIN_TASKS_PAGE_SIZE, false);
    void loadWorkers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  useModelBeforeUnload(hasDirtyModels, labels.unsavedChangesWarning);

  const providerCount = providerEntries.length;
  const activeProviderCount = providerEntries.filter(([, form]) => form.enabled).length;
  const storageCount = storageEntries.length;
  const activeStorageCount = storageEntries.filter(([, form]) => form.isActive).length;
  const modelCount = modelEntries.length;
  const activeModelCount = modelEntries.filter(([, form]) => form.isEnabled).length;
  const liveProductCount = effectiveBillingProducts.length;
  const productCount = productEntries.length;
  const dirtyModelEntries = modelEntries.filter(([, form]) => hasModelUnsavedChanges(form));
  const draftProductCount = productEntries.filter(([, form]) => form.isDraft).length;
  const firstDirtyModelKey = dirtyModelEntries[0]?.[0];
  const dirtyModelCount = dirtyModelEntries.length;

  if (accessState === 'forbidden') {
    return (
      <section className="admin-shell px-2 py-5 sm:px-3">
        <div className="w-full">
          <EmptyState icon={<ShieldCheck size={18} />} title={labels.forbiddenTitle} description={labels.forbiddenBody} />
        </div>
      </section>
    );
  }

  return (
    <AdminConsoleContent
      labels={labels}
      loading={loading}
      refreshing={refreshing}
      error={error}
      providerEntries={providerEntries}
      storageEntries={storageEntries}
      modelEntries={modelEntries}
      modelIssues={modelIssues}
      productEntries={productEntries}
      providerOptions={providerOptions}
      effectiveBillingProducts={effectiveBillingProducts}
      paymentChannels={paymentChannels}
      userCounts={userCounts}
      savingKey={savingKey}
      hasDirtyModels={hasDirtyModels}
      routingRules={routingRules}
      onLoadRoutingRules={loadRoutingRules}
      providerCount={providerCount}
      activeProviderCount={activeProviderCount}
      storageCount={storageCount}
      activeStorageCount={activeStorageCount}
      modelCount={modelCount}
      activeModelCount={activeModelCount}
      liveProductCount={liveProductCount}
      productCount={productCount}
      dirtyModelCount={dirtyModelCount}
      draftProductCount={draftProductCount}
      adminOrders={adminOrders}
      adminOrdersTotal={adminOrdersTotal}
      adminOrdersLimit={adminOrdersLimit}
      adminOrdersOffset={adminOrdersOffset}
      adminOrdersQuery={adminOrdersQuery}
      adminOrdersStatus={adminOrdersStatus}
      adminOrdersProvider={adminOrdersProvider}
      adminOrdersStats={adminOrdersStats}
      adminOrdersSummary={adminOrdersSummary}
      adminOrdersLoading={adminOrdersLoading}
      adminOrdersRefreshing={adminOrdersRefreshing}
      adminOrdersLoaded={adminOrdersLoaded}
      adminOrdersError={adminOrdersError}
      adminTasks={adminTasks}
      adminTasksTotal={adminTasksTotal}
      adminTasksLimit={adminTasksLimit}
      adminTasksOffset={adminTasksOffset}
      adminTasksQuery={adminTasksQuery}
      adminTasksStatus={adminTasksStatus}
      adminTasksType={adminTasksType}
      adminTasksStats={adminTasksStats}
      adminTasksSummary={adminTasksSummary}
      adminTasksWorkerID={adminTasksWorkerID}
      adminTasksErrorCategory={adminTasksErrorCategory}
      adminTasksTimeRange={adminTasksTimeRange}
      adminTasksRunningState={adminTasksRunningState}
      adminTasksProvider={adminTasksProvider}
      adminTasksProviderModel={adminTasksProviderModel}
      adminTasksModel={adminTasksModel}
      adminTasksBatchID={adminTasksBatchID}
      adminTasksUpstreamState={adminTasksUpstreamState}
      adminTasksRetryable={adminTasksRetryable}
      adminTasksLoading={adminTasksLoading}
      adminTasksRefreshing={adminTasksRefreshing}
      adminTasksLoaded={adminTasksLoaded}
      adminTasksError={adminTasksError}
      workers={workers}
      workerStats={workerStats}
      workersLoading={workersLoading}
      workersRefreshing={workersRefreshing}
      workersLoaded={workersLoaded}
      workersError={workersError}
      users={users}
      usersTotal={usersTotal}
      usersLimit={usersLimit}
      usersOffset={usersOffset}
      usersQuery={usersQuery}
      usersStatus={usersStatus}
      usersSort={usersSort}
      usersOrder={usersOrder}
      usersCounts={usersCounts}
      usersLoading={usersLoading}
      usersRefreshing={usersRefreshing}
      usersLoaded={usersLoaded}
      usersError={usersError}
      userRechargePromotions={userRechargePromotions}
      userRechargePromotionQueryUserID={userRechargePromotionQueryUserID}
      userRechargePromotionsLoading={userRechargePromotionsLoading}
      userRechargePromotionsLoaded={userRechargePromotionsLoaded}
      userRechargePromotionsError={userRechargePromotionsError}
      savingUserRechargePromotionID={savingUserRechargePromotionID}
      savingWorkerID={savingWorkerID}
      savingUserID={savingUserID}
      currentUserID={user?.id}
      onAddProvider={addProviderDraft}
      onAddStorage={addStorageDraft}
      onChangeProvider={patchProviderForm}
      onChangeStorage={patchStorageForm}
      onDeleteProvider={deleteProvider}
      onDeleteStorage={deleteStorage}
      onDismissProviderDraft={dismissProviderDraft}
      onDismissStorageDraft={dismissStorageDraft}
      onSaveProvider={saveProvider}
      onSaveStorage={saveStorage}
      onTestProvider={testProvider}
      onTestStorage={testStorage}
      onAddModel={addModelDraft}
      onDuplicateModel={duplicateModelDraft}
      onChangeModel={patchModelForm}
      onDismissModelDraft={dismissModelDraft}
      onResetModel={resetModelChanges}
      onDeleteModel={deleteModel}
      onSaveModel={saveModel}
      onSaveAllModels={saveAllDirtyModels}
      onAddProduct={addProductDraft}
      onChangeProduct={patchProductForm}
      onDeleteProduct={deleteProduct}
      onDismissProductDraft={dismissProductDraft}
      onSaveProduct={saveProduct}
      onToggleProductActive={toggleProductActive}
      onRefresh={() => loadOverview(false)}
      onLoadAdminOrders={loadAdminOrders}
      onChangeAdminOrdersQuery={setAdminOrdersQuery}
      onChangeAdminOrdersStatus={setAdminOrdersStatus}
      onChangeAdminOrdersProvider={setAdminOrdersProvider}
      onChangeAdminOrdersPageSize={setAdminOrdersPageSize}
      onLoadAdminTasks={loadAdminTasks}
      onChangeAdminTasksQuery={setAdminTasksQuery}
      onChangeAdminTasksStatus={setAdminTasksStatus}
      onChangeAdminTasksType={setAdminTasksType}
      onChangeAdminTasksWorkerID={setAdminTasksWorkerID}
      onChangeAdminTasksErrorCategory={setAdminTasksErrorCategory}
      onChangeAdminTasksTimeRange={setAdminTasksTimeRange}
      onChangeAdminTasksRunningState={setAdminTasksRunningState}
      onChangeAdminTasksAdvancedFilters={setAdminTasksAdvancedFilters}
      onChangeAdminTasksPageSize={setAdminTasksPageSize}
      onPatchAdminTask={patchAdminTask}
      onRemoveAdminTask={removeAdminTask}
      onLoadWorkers={loadWorkers}
      onToggleWorkerEnabled={toggleWorkerEnabled}
      onUpdateWorkerConcurrency={updateWorkerConcurrency}
      onLoadUsers={loadUsers}
      onChangeUsersQuery={setUsersQuery}
      onChangeUsersStatus={setUsersStatus}
      onChangeUsersSort={setUsersSortChange}
      onChangeUsersPageSize={setUsersPageSize}
      onSaveUserAdmin={saveUserAdmin}
      onResetUserPassword={resetUserPassword}
      onChangeUserRechargePromotionQueryUserID={setUserRechargePromotionQueryUserID}
      onLoadUserRechargePromotions={loadUserRechargePromotions}
      onSaveUserRechargePromotion={saveUserRechargePromotion}
      onDeleteUserRechargePromotion={removeUserRechargePromotion}
      firstDirtyModelKey={firstDirtyModelKey}
    />
  );
}

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isAdminAccessError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }
  return ['FORBIDDEN', 'UNAUTHORIZED'].includes(String(error.code));
}

function useAdminOverviewData(labels: ReturnType<typeof getLabels>, showToast: ReturnType<typeof useToast>['showToast']) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'forbidden'>('checking');
  const [error, setError] = useState('');
  const [providerForms, setProviderForms] = useState<Record<string, ProviderForm>>({});
  const [storageForms, setStorageForms] = useState<Record<string, StorageProviderForm>>({});
  const [modelForms, setModelForms] = useState<Record<string, ModelForm>>({});
  const [productForms, setProductForms] = useState<Record<string, ProductForm>>({});
  const [modelIssues, setModelIssues] = useState<Record<string, readonly ModelValidationIssue[]>>({});
  const [effectiveBillingProducts, setEffectiveBillingProducts] = useState<readonly AdminBillingProduct[]>([]);
  const [paymentChannels, setPaymentChannels] = useState<readonly AdminPaymentChannel[]>([]);
  const [userCounts, setUserCounts] = useState<{ total: number; active: number; deleted: number }>({ total: 0, active: 0, deleted: 0 });
  const [savingKey, setSavingKey] = useState<string>();

  const providerEntries = useMemo(() => sortProviderEntries(Object.entries(providerForms) as ProviderEntry[]), [providerForms]);
  const storageEntries = useMemo(() => sortStorageProviderEntries(Object.entries(storageForms) as StorageProviderEntry[]), [storageForms]);
  const modelEntries = useMemo(() => sortAdminModelEntries(Object.entries(modelForms) as ModelEntry[]), [modelForms]);
  const productEntries = useMemo(() => sortProductEntries(Object.entries(productForms) as ProductEntry[]), [productForms]);
  const providerOptions = useMemo(() => buildProviderOptions(providerEntries), [providerEntries]);
  const hasDirtyModels = useMemo(() => modelEntries.some(([, form]) => hasModelUnsavedChanges(form)), [modelEntries]);

  const applyOverview = useCallback((overview: Awaited<ReturnType<typeof getAdminOverview>>) => {
    setProviderForms(Object.fromEntries(overview.generation_providers.map((item) => [item.provider, providerForm(item)])));
    setStorageForms(Object.fromEntries(overview.storage_providers.map((item) => [item.id, storageProviderForm(item)])));
    setModelForms(Object.fromEntries(overview.models.map((item) => [item.id, modelForm(item)])));
    setProductForms(Object.fromEntries(overview.billing_products.map((item) => [item.id, productForm(item)])));
    setEffectiveBillingProducts(overview.effective_billing_products);
    setPaymentChannels(overview.payment_channels);
    setUserCounts(overview.user_counts);
    setModelIssues({});
  }, []);

  const loadOverview = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');
    try {
      applyOverview(await getAdminOverview());
      setAccessState('allowed');
    } catch (loadError) {
      if (isAdminAccessError(loadError)) {
        setAccessState('forbidden');
        return;
      }
      const message = toMessage(loadError, labels.loadFailed);
      setError(message);
      showToast({ kind: 'error', message });
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [applyOverview, labels.loadFailed, showToast]);

  return {
    loading,
    refreshing,
    accessState,
    error,
    providerForms,
    setProviderForms,
    storageForms,
    setStorageForms,
    modelForms,
    setModelForms,
    productForms,
    setProductForms,
    modelIssues,
    setModelIssues,
    effectiveBillingProducts,
    setEffectiveBillingProducts,
    paymentChannels,
    setPaymentChannels,
    userCounts,
    savingKey,
    setSavingKey,
    providerEntries,
    storageEntries,
    modelEntries,
    productEntries,
    providerOptions,
    hasDirtyModels,
    loadOverview,
  };
}


function sortProviderEntries(entries: readonly ProviderEntry[]): ProviderEntry[] {
  return [...entries].sort((left, right) => {
    const statusDiff = Number(right[1].savedState.enabled) - Number(left[1].savedState.enabled);
    if (statusDiff !== 0) return statusDiff;
    return stableProviderName(left).localeCompare(stableProviderName(right));
  });
}

function stableProviderName([key, form]: ProviderEntry): string {
  return (form.savedState.id || form.id || key).trim().toLowerCase();
}

function sortStorageProviderEntries(entries: readonly StorageProviderEntry[]): StorageProviderEntry[] {
  return [...entries].sort((left, right) => {
    const statusDiff = Number(right[1].isActive) - Number(left[1].isActive);
    if (statusDiff !== 0) return statusDiff;
    return stableStorageName(left).localeCompare(stableStorageName(right));
  });
}

function stableStorageName([key, form]: StorageProviderEntry): string {
  return (form.id || key).trim().toLowerCase();
}

function sortAdminModelEntries(entries: readonly ModelEntry[]): ModelEntry[] {
  return [...entries].sort((left, right) => {
    const statusDiff = Number(stableModelEnabled(right)) - Number(stableModelEnabled(left));
    if (statusDiff !== 0) return statusDiff;
    const nameDiff = stableModelName(left).localeCompare(stableModelName(right));
    if (nameDiff !== 0) return nameDiff;
    return left[0].localeCompare(right[0]);
  });
}

function stableModelEnabled([, form]: ModelEntry): boolean {
  return form.isDraft ? form.isEnabled : form.savedState.isEnabled;
}

function stableModelName([key, form]: ModelEntry): string {
  const state = form.isDraft ? form : form.savedState;
  return (state.name.trim() || state.id.trim() || key).toLowerCase();
}

function sortProductEntries(entries: readonly ProductEntry[]): ProductEntry[] {
  return [...entries].sort((left, right) => {
    const statusDiff = Number(right[1].isActive) - Number(left[1].isActive);
    if (statusDiff !== 0) return statusDiff;
    return stableProductName(left).localeCompare(stableProductName(right));
  });
}

function stableProductName([key, form]: ProductEntry): string {
  return (form.name.trim() || form.id.trim() || key).toLowerCase();
}



const ADMIN_ORDERS_PAGE_SIZE = 25;
const DEFAULT_ADMIN_ORDER_STATS = { total: 0, paid_amount_cents: 0, paid_credits: 0, counts: { pending: 0, paid: 0, failed: 0, canceled: 0, expired: 0 } } as const;
const ADMIN_ORDER_STATUS_FILTERS = ['all', 'pending', 'paid', 'succeeded', 'expired', 'failed', 'canceled'] as const satisfies readonly AdminOrderStatusFilter[];

function initialAdminOrdersURLState() {
  const params = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const statusValue = params.get('order_status');
  return {
    query: params.get('order_query')?.trim() ?? '',
    status: ADMIN_ORDER_STATUS_FILTERS.includes(statusValue as AdminOrderStatusFilter) ? statusValue as AdminOrderStatusFilter : 'all',
    provider: params.get('order_provider') || 'all',
    limit: positiveIntParam(params.get('order_limit'), ADMIN_ORDERS_PAGE_SIZE),
    offset: nonNegativeIntParam(params.get('order_offset'), 0),
  };
}

function writeAdminOrdersStateToURL(state: ReturnType<typeof initialAdminOrdersURLState>): void {
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get(ADMIN_TAB_QUERY_KEY) !== 'orders') return;
  const url = new URL(window.location.href);
  setOrDeleteSearchParam(url.searchParams, 'order_query', state.query, '');
  setOrDeleteSearchParam(url.searchParams, 'order_status', state.status, 'all');
  setOrDeleteSearchParam(url.searchParams, 'order_provider', state.provider, 'all');
  setOrDeleteSearchParam(url.searchParams, 'order_limit', String(state.limit), String(ADMIN_ORDERS_PAGE_SIZE));
  setOrDeleteSearchParam(url.searchParams, 'order_offset', String(state.offset), '0');
  window.history.replaceState({ ...window.history.state, adminOrders: state }, '', url);
}

function useAdminOrdersData(labels: ReturnType<typeof getLabels>, showToast: ReturnType<typeof useToast>['showToast']) {
  const [initialURLState] = useState(initialAdminOrdersURLState);
  const [adminOrders, setAdminOrders] = useState<readonly AdminOrder[]>([]);
  const [adminOrdersTotal, setAdminOrdersTotal] = useState(0);
  const [adminOrdersLimit, setAdminOrdersLimit] = useState(initialURLState.limit);
  const [adminOrdersOffset, setAdminOrdersOffset] = useState(initialURLState.offset);
  const [adminOrdersQuery, setAdminOrdersQueryState] = useState(initialURLState.query);
  const [adminOrdersStatus, setAdminOrdersStatusState] = useState<AdminOrderStatusFilter>(initialURLState.status);
  const [adminOrdersProvider, setAdminOrdersProviderState] = useState(initialURLState.provider);
  const [adminOrdersStats, setAdminOrdersStats] = useState<AdminOrderList['stats']>(DEFAULT_ADMIN_ORDER_STATS);
  const [adminOrdersSummary, setAdminOrdersSummary] = useState<AdminOrderList['stats']>(DEFAULT_ADMIN_ORDER_STATS);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
  const [adminOrdersRefreshing, setAdminOrdersRefreshing] = useState(false);
  const [adminOrdersLoaded, setAdminOrdersLoaded] = useState(false);
  const [adminOrdersError, setAdminOrdersError] = useState('');
  const adminOrdersLoadingRef = useRef(false);

  useEffect(() => {
    if (!adminOrdersLoaded) return;
    writeAdminOrdersStateToURL({ query: adminOrdersQuery, status: adminOrdersStatus, provider: adminOrdersProvider, limit: adminOrdersLimit, offset: adminOrdersOffset });
  }, [adminOrdersLimit, adminOrdersLoaded, adminOrdersOffset, adminOrdersProvider, adminOrdersQuery, adminOrdersStatus]);

  const loadAdminOrders = useCallback(async (offset = adminOrdersOffset, query = adminOrdersQuery, status = adminOrdersStatus, provider = adminOrdersProvider, limit = adminOrdersLimit, showLoading = !adminOrdersLoaded) => {
    if (adminOrdersLoadingRef.current) return;
    adminOrdersLoadingRef.current = true;
    if (showLoading) setAdminOrdersLoading(true); else setAdminOrdersRefreshing(true);
    setAdminOrdersError('');
    try {
      const result = await listAdminOrders({ query, status, provider, limit, offset });
      setAdminOrders(result.orders);
      setAdminOrdersTotal(result.total);
      setAdminOrdersLimit(result.limit);
      setAdminOrdersOffset(result.offset);
      setAdminOrdersStatusState(status);
      setAdminOrdersProviderState(provider);
      setAdminOrdersStats(result.stats);
      setAdminOrdersSummary(result.summary ?? result.stats);
      setAdminOrdersLoaded(true);
    } catch (loadError) {
      const message = toMessage(loadError, labels.loadFailed);
      setAdminOrdersError(message);
      showToast({ kind: 'error', message });
    } finally {
      adminOrdersLoadingRef.current = false;
      setAdminOrdersLoading(false);
      setAdminOrdersRefreshing(false);
    }
  }, [adminOrdersLimit, adminOrdersLoaded, adminOrdersOffset, adminOrdersProvider, adminOrdersQuery, adminOrdersStatus, labels.loadFailed, showToast]);

  const setAdminOrdersQuery = useCallback((query: string) => {
    const normalized = query.trim();
    setAdminOrdersQueryState(normalized);
    void loadAdminOrders(0, normalized, adminOrdersStatus, adminOrdersProvider, adminOrdersLimit, true);
  }, [adminOrdersLimit, adminOrdersProvider, adminOrdersStatus, loadAdminOrders]);

  const setAdminOrdersStatus = useCallback((status: AdminOrderStatusFilter) => {
    setAdminOrdersStatusState(status);
    void loadAdminOrders(0, adminOrdersQuery, status, adminOrdersProvider, adminOrdersLimit, true);
  }, [adminOrdersLimit, adminOrdersProvider, adminOrdersQuery, loadAdminOrders]);

  const setAdminOrdersProvider = useCallback((provider: string) => {
    setAdminOrdersProviderState(provider);
    void loadAdminOrders(0, adminOrdersQuery, adminOrdersStatus, provider, adminOrdersLimit, true);
  }, [adminOrdersLimit, adminOrdersQuery, adminOrdersStatus, loadAdminOrders]);

  const setAdminOrdersPageSize = useCallback((limit: number) => {
    void loadAdminOrders(0, adminOrdersQuery, adminOrdersStatus, adminOrdersProvider, limit, true);
  }, [adminOrdersProvider, adminOrdersQuery, adminOrdersStatus, loadAdminOrders]);

  return { adminOrders, adminOrdersTotal, adminOrdersLimit, adminOrdersOffset, adminOrdersQuery, adminOrdersStatus, adminOrdersProvider, adminOrdersStats, adminOrdersSummary, adminOrdersLoading, adminOrdersRefreshing, adminOrdersLoaded, adminOrdersError, setAdminOrdersQuery, setAdminOrdersStatus, setAdminOrdersProvider, setAdminOrdersPageSize, loadAdminOrders };
}

const ADMIN_TASKS_PAGE_SIZE = 25;
const ADMIN_TASK_PREFS_PREFIX = 'aics.admin.tasks.filters.';
const ADMIN_TASK_STATUS_FILTERS = ['all', 'queued', 'processing', 'succeeded', 'failed'] as const satisfies readonly AdminTaskStatusFilter[];
const ADMIN_TASK_TYPE_FILTERS = ['all', 'image', 'video'] as const satisfies readonly AdminTaskTypeFilter[];
const ADMIN_TASK_ERROR_CATEGORY_FILTERS = ['all', 'auth', 'quota', 'timeout', 'parameter', 'rate_limit', 'storage', 'worker', 'provider', 'unknown'] as const satisfies readonly AdminTaskErrorCategoryFilter[];
const ADMIN_TASK_TIME_RANGE_FILTERS = ['all', '1h', 'today', 'yesterday', '7d'] as const satisfies readonly AdminTaskTimeRangeFilter[];
const ADMIN_TASK_RUNNING_STATE_FILTERS = ['all', 'active', 'stuck'] as const satisfies readonly AdminTaskRunningStateFilter[];
const ADMIN_TASK_UPSTREAM_STATE_FILTERS = ['all', 'has_task_id', 'missing_task_id', 'repaired', 'recoverable', 'result_unfinished'] as const satisfies readonly AdminTaskUpstreamStateFilter[];
const ADMIN_TASK_RETRYABLE_FILTERS = ['all', 'true', 'false'] as const satisfies readonly AdminTaskRetryableFilter[];
const ADMIN_WORKERS_AUTO_REFRESH_MS = 30_000;
const DEFAULT_ADMIN_TASK_STATS = { total: 0, credits_used: 0, counts: { queued: 0, processing: 0, succeeded: 0, failed: 0 } } as const;


function mergeAdminTaskPatch(current: AdminTask, updated: AdminTask): AdminTask {
  return {
    ...current,
    ...updated,
    user: updated.user ?? current.user,
    worker: updated.worker ?? current.worker,
  };
}


function storedAdminTaskString(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(`${ADMIN_TASK_PREFS_PREFIX}${key}`) ?? fallback;
}

function storeAdminTaskString(key: string, value: string): void {
  window.localStorage.setItem(`${ADMIN_TASK_PREFS_PREFIX}${key}`, value);
}

function storedAdminTaskLimit(): number {
  const value = Number(storedAdminTaskString('limit', String(ADMIN_TASKS_PAGE_SIZE)));
  return [10, 25, 50, 100].includes(value) ? value : ADMIN_TASKS_PAGE_SIZE;
}

function initialAdminTaskString(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get(`task_${key}`) ?? storedAdminTaskString(key, fallback);
}

function initialAdminTaskEnum<T extends string>(key: string, values: readonly T[], fallback: T): T {
  const value = initialAdminTaskString(key, fallback);
  return values.includes(value as T) ? value as T : fallback;
}

function initialAdminTaskLimit(): number {
  const value = Number(initialAdminTaskString('limit', String(storedAdminTaskLimit())));
  return [10, 25, 50, 100].includes(value) ? value : ADMIN_TASKS_PAGE_SIZE;
}

function writeAdminTasksStateToURL(state: Readonly<Record<string, string | number>>): void {
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get(ADMIN_TAB_QUERY_KEY) !== 'tasks') return;
  const url = new URL(window.location.href);
  const defaults: Readonly<Record<string, string>> = { query: '', status: 'all', type: 'all', worker_id: '', error_category: 'all', time_range: 'all', running_state: 'all', provider: '', provider_model: '', model: '', batch_id: '', upstream_state: 'all', retryable: 'all', limit: String(ADMIN_TASKS_PAGE_SIZE), offset: '0' };
  for (const [key, value] of Object.entries(state)) setOrDeleteSearchParam(url.searchParams, `task_${key}`, String(value), defaults[key] ?? '');
  window.history.replaceState({ ...window.history.state, adminTasks: state }, '', url);
}

function useAdminTasksData(labels: ReturnType<typeof getLabels>, showToast: ReturnType<typeof useToast>['showToast']) {
  const [adminTasks, setAdminTasks] = useState<readonly AdminTask[]>([]);
  const [adminTasksTotal, setAdminTasksTotal] = useState(0);
  const [adminTasksLimit, setAdminTasksLimit] = useState(initialAdminTaskLimit);
  const [adminTasksOffset, setAdminTasksOffset] = useState(() => nonNegativeIntParam(typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('task_offset'), 0));
  const [adminTasksQuery, setAdminTasksQueryState] = useState(() => initialAdminTaskString('query', ''));
  const [adminTasksStatus, setAdminTasksStatusState] = useState<AdminTaskStatusFilter>(() => initialAdminTaskEnum('status', ADMIN_TASK_STATUS_FILTERS, 'all'));
  const [adminTasksType, setAdminTasksTypeState] = useState<AdminTaskTypeFilter>(() => initialAdminTaskEnum('type', ADMIN_TASK_TYPE_FILTERS, 'all'));
  const [adminTasksWorkerID, setAdminTasksWorkerIDState] = useState(() => initialAdminTaskString('worker_id', ''));
  const [adminTasksErrorCategory, setAdminTasksErrorCategoryState] = useState<AdminTaskErrorCategoryFilter>(() => initialAdminTaskEnum('error_category', ADMIN_TASK_ERROR_CATEGORY_FILTERS, 'all'));
  const [adminTasksTimeRange, setAdminTasksTimeRangeState] = useState<AdminTaskTimeRangeFilter>(() => initialAdminTaskEnum('time_range', ADMIN_TASK_TIME_RANGE_FILTERS, 'all'));
  const [adminTasksRunningState, setAdminTasksRunningStateState] = useState<AdminTaskRunningStateFilter>(() => initialAdminTaskEnum('running_state', ADMIN_TASK_RUNNING_STATE_FILTERS, 'all'));
  const [adminTasksProvider, setAdminTasksProviderState] = useState(() => initialAdminTaskString('provider', ''));
  const [adminTasksProviderModel, setAdminTasksProviderModelState] = useState(() => initialAdminTaskString('provider_model', ''));
  const [adminTasksModel, setAdminTasksModelState] = useState(() => initialAdminTaskString('model', ''));
  const [adminTasksBatchID, setAdminTasksBatchIDState] = useState(() => initialAdminTaskString('batch_id', ''));
  const [adminTasksUpstreamState, setAdminTasksUpstreamStateState] = useState<AdminTaskUpstreamStateFilter>(() => initialAdminTaskEnum('upstream_state', ADMIN_TASK_UPSTREAM_STATE_FILTERS, 'all'));
  const [adminTasksRetryable, setAdminTasksRetryableState] = useState<AdminTaskRetryableFilter>(() => initialAdminTaskEnum('retryable', ADMIN_TASK_RETRYABLE_FILTERS, 'all'));
  const [adminTasksStats, setAdminTasksStats] = useState<AdminTaskList['stats']>(DEFAULT_ADMIN_TASK_STATS);
  const [adminTasksSummary, setAdminTasksSummary] = useState<AdminTaskList['stats']>(DEFAULT_ADMIN_TASK_STATS);
  const [adminTasksLoading, setAdminTasksLoading] = useState(false);
  const [adminTasksRefreshing, setAdminTasksRefreshing] = useState(false);
  const [adminTasksLoaded, setAdminTasksLoaded] = useState(false);
  const [adminTasksError, setAdminTasksError] = useState('');
  const adminTasksLoadingRef = useRef(false);

  useEffect(() => {
    storeAdminTaskString('query', adminTasksQuery);
    storeAdminTaskString('status', adminTasksStatus);
    storeAdminTaskString('type', adminTasksType);
    storeAdminTaskString('worker_id', adminTasksWorkerID);
    storeAdminTaskString('error_category', adminTasksErrorCategory);
    storeAdminTaskString('time_range', adminTasksTimeRange);
    storeAdminTaskString('running_state', adminTasksRunningState);
    storeAdminTaskString('provider', adminTasksProvider);
    storeAdminTaskString('provider_model', adminTasksProviderModel);
    storeAdminTaskString('model', adminTasksModel);
    storeAdminTaskString('batch_id', adminTasksBatchID);
    storeAdminTaskString('upstream_state', adminTasksUpstreamState);
    storeAdminTaskString('retryable', adminTasksRetryable);
    storeAdminTaskString('limit', String(adminTasksLimit));
  }, [adminTasksBatchID, adminTasksErrorCategory, adminTasksLimit, adminTasksModel, adminTasksProvider, adminTasksProviderModel, adminTasksQuery, adminTasksRetryable, adminTasksRunningState, adminTasksStatus, adminTasksTimeRange, adminTasksType, adminTasksUpstreamState, adminTasksWorkerID]);

  useEffect(() => {
    if (!adminTasksLoaded) return;
    writeAdminTasksStateToURL({ query: adminTasksQuery, status: adminTasksStatus, type: adminTasksType, worker_id: adminTasksWorkerID, error_category: adminTasksErrorCategory, time_range: adminTasksTimeRange, running_state: adminTasksRunningState, provider: adminTasksProvider, provider_model: adminTasksProviderModel, model: adminTasksModel, batch_id: adminTasksBatchID, upstream_state: adminTasksUpstreamState, retryable: adminTasksRetryable, limit: adminTasksLimit, offset: adminTasksOffset });
  }, [adminTasksBatchID, adminTasksErrorCategory, adminTasksLimit, adminTasksLoaded, adminTasksModel, adminTasksOffset, adminTasksProvider, adminTasksProviderModel, adminTasksQuery, adminTasksRetryable, adminTasksRunningState, adminTasksStatus, adminTasksTimeRange, adminTasksType, adminTasksUpstreamState, adminTasksWorkerID]);

  const loadAdminTasks = useCallback(async (offset = adminTasksOffset, query = adminTasksQuery, status = adminTasksStatus, type = adminTasksType, limit = adminTasksLimit, showLoading = !adminTasksLoaded, workerID = adminTasksWorkerID, errorCategory = adminTasksErrorCategory, timeRange = adminTasksTimeRange, runningState = adminTasksRunningState, provider = adminTasksProvider, providerModel = adminTasksProviderModel, model = adminTasksModel, batchID = adminTasksBatchID, upstreamState = adminTasksUpstreamState, retryable = adminTasksRetryable) => {
    if (adminTasksLoadingRef.current) return;
    adminTasksLoadingRef.current = true;
    if (showLoading) {
      setAdminTasksLoading(true);
    } else {
      setAdminTasksRefreshing(true);
    }
    setAdminTasksError('');
    try {
      const result = await listAdminTasks({ query, status, type, limit, offset, worker_id: workerID, error_category: errorCategory, time_range: timeRange, running_state: runningState, provider, provider_model: providerModel, model, batch_id: batchID, upstream_state: upstreamState, retryable });
      setAdminTasks(result.tasks);
      setAdminTasksTotal(result.total);
      setAdminTasksLimit(result.limit);
      setAdminTasksOffset(result.offset);
      setAdminTasksStatusState(status);
      setAdminTasksTypeState(type);
      setAdminTasksWorkerIDState(workerID);
      setAdminTasksErrorCategoryState(errorCategory);
      setAdminTasksTimeRangeState(timeRange);
      setAdminTasksRunningStateState(runningState);
      setAdminTasksProviderState(provider);
      setAdminTasksProviderModelState(providerModel);
      setAdminTasksModelState(model);
      setAdminTasksBatchIDState(batchID);
      setAdminTasksUpstreamStateState(upstreamState);
      setAdminTasksRetryableState(retryable);
      setAdminTasksStats(result.stats);
      setAdminTasksSummary(result.summary ?? result.stats);
      setAdminTasksLoaded(true);
    } catch (loadError) {
      const message = toMessage(loadError, labels.loadFailed);
      setAdminTasksError(message);
      showToast({ kind: 'error', message });
    } finally {
      adminTasksLoadingRef.current = false;
      setAdminTasksLoading(false);
      setAdminTasksRefreshing(false);
    }
  }, [adminTasksBatchID, adminTasksErrorCategory, adminTasksLimit, adminTasksLoaded, adminTasksModel, adminTasksOffset, adminTasksProvider, adminTasksProviderModel, adminTasksQuery, adminTasksRetryable, adminTasksRunningState, adminTasksStatus, adminTasksTimeRange, adminTasksType, adminTasksUpstreamState, adminTasksWorkerID, labels.loadFailed, showToast]);

  const setAdminTasksQuery = useCallback((query: string) => {
    const normalized = query.trim();
    setAdminTasksQueryState(normalized);
    void loadAdminTasks(0, normalized, adminTasksStatus, adminTasksType, adminTasksLimit, true);
  }, [adminTasksLimit, adminTasksStatus, adminTasksType, loadAdminTasks]);

  const setAdminTasksStatus = useCallback((status: AdminTaskStatusFilter) => {
    setAdminTasksStatusState(status);
    void loadAdminTasks(0, adminTasksQuery, status, adminTasksType, adminTasksLimit, true);
  }, [adminTasksLimit, adminTasksQuery, adminTasksType, loadAdminTasks]);

  const setAdminTasksType = useCallback((type: AdminTaskTypeFilter) => {
    setAdminTasksTypeState(type);
    void loadAdminTasks(0, adminTasksQuery, adminTasksStatus, type, adminTasksLimit, true);
  }, [adminTasksLimit, adminTasksQuery, adminTasksStatus, loadAdminTasks]);

  const setAdminTasksPageSize = useCallback((limit: number) => {
    void loadAdminTasks(0, adminTasksQuery, adminTasksStatus, adminTasksType, limit, true);
  }, [adminTasksQuery, adminTasksStatus, adminTasksType, loadAdminTasks]);

  const setAdminTasksWorkerID = useCallback((workerID: string) => {
    setAdminTasksWorkerIDState(workerID);
    void loadAdminTasks(0, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksLimit, true, workerID);
  }, [adminTasksLimit, adminTasksQuery, adminTasksStatus, adminTasksType, loadAdminTasks]);

  const setAdminTasksErrorCategory = useCallback((category: AdminTaskErrorCategoryFilter) => {
    setAdminTasksErrorCategoryState(category);
    void loadAdminTasks(0, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksLimit, true, adminTasksWorkerID, category);
  }, [adminTasksLimit, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksWorkerID, loadAdminTasks]);

  const setAdminTasksTimeRange = useCallback((range: AdminTaskTimeRangeFilter) => {
    setAdminTasksTimeRangeState(range);
    void loadAdminTasks(0, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksLimit, true, adminTasksWorkerID, adminTasksErrorCategory, range);
  }, [adminTasksErrorCategory, adminTasksLimit, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksWorkerID, loadAdminTasks]);

  const setAdminTasksRunningState = useCallback((state: AdminTaskRunningStateFilter) => {
    setAdminTasksRunningStateState(state);
    void loadAdminTasks(0, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksLimit, true, adminTasksWorkerID, adminTasksErrorCategory, adminTasksTimeRange, state);
  }, [adminTasksErrorCategory, adminTasksLimit, adminTasksQuery, adminTasksStatus, adminTasksTimeRange, adminTasksType, adminTasksWorkerID, loadAdminTasks]);

  const setAdminTasksAdvancedFilters = useCallback((filters: Readonly<{ provider?: string; providerModel?: string; model?: string; batchID?: string; upstreamState?: AdminTaskUpstreamStateFilter; retryable?: AdminTaskRetryableFilter }>) => {
    const provider = filters.provider ?? adminTasksProvider;
    const providerModel = filters.providerModel ?? adminTasksProviderModel;
    const model = filters.model ?? adminTasksModel;
    const batchID = filters.batchID ?? adminTasksBatchID;
    const upstreamState = filters.upstreamState ?? adminTasksUpstreamState;
    const retryable = filters.retryable ?? adminTasksRetryable;
    setAdminTasksProviderState(provider);
    setAdminTasksProviderModelState(providerModel);
    setAdminTasksModelState(model);
    setAdminTasksBatchIDState(batchID);
    setAdminTasksUpstreamStateState(upstreamState);
    setAdminTasksRetryableState(retryable);
    void loadAdminTasks(0, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksLimit, true, adminTasksWorkerID, adminTasksErrorCategory, adminTasksTimeRange, adminTasksRunningState, provider, providerModel, model, batchID, upstreamState, retryable);
  }, [adminTasksBatchID, adminTasksErrorCategory, adminTasksLimit, adminTasksModel, adminTasksProvider, adminTasksProviderModel, adminTasksQuery, adminTasksRetryable, adminTasksRunningState, adminTasksStatus, adminTasksTimeRange, adminTasksType, adminTasksUpstreamState, adminTasksWorkerID, loadAdminTasks]);


  const patchAdminTask = useCallback((updated: AdminTask) => {
    setAdminTasks((current) => current.map((task) => task.id === updated.id ? mergeAdminTaskPatch(task, updated) : task));
  }, []);

  const removeAdminTask = useCallback((id: string) => {
    setAdminTasks((current) => current.filter((task) => task.id !== id));
    setAdminTasksTotal((current) => Math.max(0, current - 1));
  }, []);

  return {
    adminTasks,
    adminTasksTotal,
    adminTasksLimit,
    adminTasksOffset,
    adminTasksQuery,
    adminTasksStatus,
    adminTasksType,
    adminTasksStats,
    adminTasksSummary,
    adminTasksWorkerID,
    adminTasksErrorCategory,
    adminTasksTimeRange,
    adminTasksRunningState,
    adminTasksProvider,
    adminTasksProviderModel,
    adminTasksModel,
    adminTasksBatchID,
    adminTasksUpstreamState,
    adminTasksRetryable,
    adminTasksLoading,
    adminTasksRefreshing,
    adminTasksLoaded,
    adminTasksError,
    setAdminTasksQuery,
    setAdminTasksStatus,
    setAdminTasksType,
    setAdminTasksWorkerID,
    setAdminTasksErrorCategory,
    setAdminTasksTimeRange,
    setAdminTasksRunningState,
    setAdminTasksAdvancedFilters,
    setAdminTasksPageSize,
    patchAdminTask,
    removeAdminTask,
    loadAdminTasks,
  };
}

const DEFAULT_ADMIN_WORKER_STATS = { total: 0, online: 0, offline: 0, busy: 0, capacity: 0, active_tasks: 0, succeeded_tasks: 0, failed_tasks: 0 } as const;

function useAdminWorkersData(labels: ReturnType<typeof getLabels>, showToast: ReturnType<typeof useToast>['showToast']) {
  const [workers, setWorkers] = useState<readonly AdminWorker[]>([]);
  const [workerStats, setWorkerStats] = useState<AdminWorkerList['stats']>(DEFAULT_ADMIN_WORKER_STATS);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workersRefreshing, setWorkersRefreshing] = useState(false);
  const [workersLoaded, setWorkersLoaded] = useState(false);
  const [workersError, setWorkersError] = useState('');
  const [savingWorkerID, setSavingWorkerID] = useState<string | undefined>();
  const workersLoadPromiseRef = useRef<Promise<void> | null>(null);

  const loadWorkers = useCallback(async (showLoading = !workersLoaded, afterCurrent = false) => {
    if (workersLoadPromiseRef.current) {
      await workersLoadPromiseRef.current;
      if (!afterCurrent) return;
    }
    if (workersLoadPromiseRef.current) {
      await workersLoadPromiseRef.current;
      return;
    }
    const request = (async () => {
      if (showLoading) {
        setWorkersLoading(true);
      } else {
        setWorkersRefreshing(true);
      }
      setWorkersError('');
      try {
        const result = await listAdminWorkers();
        setWorkers(result.workers);
        setWorkerStats(result.stats);
        setWorkersLoaded(true);
      } catch (loadError) {
        const message = toMessage(loadError, labels.loadFailed);
        setWorkersError(message);
        showToast({ kind: 'error', message });
      } finally {
        setWorkersLoading(false);
        setWorkersRefreshing(false);
      }
    })();
    workersLoadPromiseRef.current = request;
    try {
      await request;
    } finally {
      if (workersLoadPromiseRef.current === request) workersLoadPromiseRef.current = null;
    }
  }, [labels.loadFailed, showToast, workersLoaded]);

  const toggleWorkerEnabled = useCallback(async (worker: AdminWorker, enabled: boolean) => {
    setSavingWorkerID(worker.id);
    setWorkersError('');
    try {
      await updateAdminWorker(worker.id, { enabled });
      await loadWorkers(false, true);
      showToast({ kind: 'success', message: `${worker.id} 已${enabled ? '启用' : '禁用'}` });
    } catch (saveError) {
      const message = toMessage(saveError, labels.saveFailed);
      setWorkersError(message);
      showToast({ kind: 'error', message });
    } finally {
      setSavingWorkerID(undefined);
    }
  }, [labels.saveFailed, loadWorkers, showToast]);

  const updateWorkerConcurrency = useCallback(async (worker: AdminWorker, concurrency: number) => {
    setSavingWorkerID(worker.id);
    setWorkersError('');
    try {
      await updateAdminWorker(worker.id, { concurrency });
      await loadWorkers(false, true);
      showToast({ kind: 'success', message: `${worker.id} 并发已调整为 ${concurrency}` });
    } catch (saveError) {
      const message = toMessage(saveError, labels.saveFailed);
      setWorkersError(message);
      showToast({ kind: 'error', message });
    } finally {
      setSavingWorkerID(undefined);
    }
  }, [labels.saveFailed, loadWorkers, showToast]);

  return { workers, workerStats, workersLoading, workersRefreshing, workersLoaded, workersError, savingWorkerID, loadWorkers, toggleWorkerEnabled, updateWorkerConcurrency };
}

const ADMIN_USERS_PAGE_SIZE = 20;
const DEFAULT_ADMIN_USER_COUNTS = { active: 0, admins: 0, disabled: 0, deleted: 0, failed: 0, today_new: 0 } as const;

function useAdminUsersData(labels: ReturnType<typeof getLabels>, showToast: ReturnType<typeof useToast>['showToast'], onUsersChanged: () => Promise<void>) {
  const [users, setUsers] = useState<readonly AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [initialURLState] = useState<AdminUsersURLState>(initialAdminUsersStateFromURL);
  const [usersLimit, setUsersLimit] = useState(initialURLState.limit);
  const [usersOffset, setUsersOffset] = useState(initialURLState.offset);
  const [usersQuery, setUsersQueryState] = useState(initialURLState.query);
  const [usersStatus, setUsersStatusState] = useState<AdminUserStatusFilter>(initialURLState.status);
  const [usersSort, setUsersSort] = useState<AdminUserSortField>(initialURLState.sort);
  const [usersOrder, setUsersOrder] = useState<AdminSortOrder>(initialURLState.order);
  const [usersCounts, setUsersCounts] = useState<AdminUserList['counts']>(DEFAULT_ADMIN_USER_COUNTS);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersRefreshing, setUsersRefreshing] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [savingUserID, setSavingUserID] = useState<string>();

  const loadUsers = useCallback(async (offset = usersOffset, query = usersQuery, status = usersStatus, limit = usersLimit, showLoading = !usersLoaded, sort = usersSort, order = usersOrder) => {
    if (showLoading) {
      setUsersLoading(true);
    } else {
      setUsersRefreshing(true);
    }
    setUsersError('');
    try {
      const result = await listAdminUsers({ query, status, limit, offset, sort, order });
      setUsers(result.users);
      setUsersTotal(result.total);
      setUsersLimit(result.limit);
      setUsersOffset(result.offset);
      setUsersQueryState(query);
      setUsersStatusState(status);
      setUsersSort(sort);
      setUsersOrder(order);
      setUsersCounts(result.counts);
      setUsersLoaded(true);
      writeAdminUsersStateToURL({ query, status, limit: result.limit, offset: result.offset, sort, order });
    } catch (loadError) {
      const message = toMessage(loadError, labels.loadFailed);
      setUsersError(message);
      showToast({ kind: 'error', message });
    } finally {
      setUsersLoading(false);
      setUsersRefreshing(false);
    }
  }, [labels.loadFailed, showToast, usersLimit, usersLoaded, usersOffset, usersQuery, usersStatus, usersSort, usersOrder]);

  const setUsersQuery = useCallback((query: string) => {
    const normalized = query.trim();
    setUsersQueryState(normalized);
    void loadUsers(0, normalized, usersStatus, usersLimit, true, usersSort, usersOrder);
  }, [loadUsers, usersLimit, usersStatus, usersSort, usersOrder]);

  const setUsersStatus = useCallback((status: AdminUserStatusFilter) => {
    setUsersStatusState(status);
    void loadUsers(0, usersQuery, status, usersLimit, true, usersSort, usersOrder);
  }, [loadUsers, usersLimit, usersQuery, usersSort, usersOrder]);

  const setUsersSortChange = useCallback((field: AdminUserSortField) => {
    const nextOrder: AdminSortOrder = usersSort === field && usersOrder === 'desc' ? 'asc' : 'desc';
    setUsersSort(field);
    setUsersOrder(nextOrder);
    void loadUsers(0, usersQuery, usersStatus, usersLimit, true, field, nextOrder);
  }, [loadUsers, usersLimit, usersOrder, usersQuery, usersSort, usersStatus]);

  const setUsersPageSize = useCallback((limit: number) => {
    void loadUsers(0, usersQuery, usersStatus, limit, true, usersSort, usersOrder);
  }, [loadUsers, usersQuery, usersStatus, usersSort, usersOrder]);

  const saveUserAdmin = useCallback(async (user: AdminUser, patch: Readonly<{ is_admin?: boolean; disabled?: boolean; deleted?: boolean; credit_balance?: number; referral_rewards_disabled?: boolean }>) => {
    setSavingUserID(user.id);
    try {
      const updated = await updateAdminUser({ id: user.id, ...patch });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      await loadUsers(usersOffset, usersQuery, usersStatus, usersLimit, false, usersSort, usersOrder);
      await onUsersChanged();
      showToast({ kind: 'success', message: labels.userUpdated });
    } catch (saveError) {
      showToast({ kind: 'error', message: toMessage(saveError, labels.saveFailed) });
    } finally {
      setSavingUserID(undefined);
    }
  }, [labels.saveFailed, labels.userUpdated, loadUsers, onUsersChanged, showToast, usersLimit, usersOffset, usersQuery, usersStatus, usersSort, usersOrder]);

  const resetUserPassword = useCallback(async (user: AdminUser, password: string) => {
    setSavingUserID(user.id);
    try {
      const updated = await resetAdminUserPassword({ id: user.id, password });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      await loadUsers(usersOffset, usersQuery, usersStatus, usersLimit, false, usersSort, usersOrder);
      showToast({ kind: 'success', message: labels.userPasswordReset });
    } catch (saveError) {
      showToast({ kind: 'error', message: toMessage(saveError, labels.saveFailed) });
    } finally {
      setSavingUserID(undefined);
    }
  }, [labels.saveFailed, labels.userPasswordReset, loadUsers, showToast, usersLimit, usersOffset, usersQuery, usersStatus, usersSort, usersOrder]);

  return {
    users,
    usersTotal,
    usersLimit,
    usersOffset,
    usersQuery,
    usersStatus,
    usersSort,
    usersOrder,
    usersCounts,
    usersLoading,
    usersRefreshing,
    usersLoaded,
    usersError,
    savingUserID,
    setUsersQuery,
    setUsersStatus,
    setUsersSortChange,
    setUsersPageSize,
    loadUsers,
    saveUserAdmin,
    resetUserPassword,
  };
}


function useUserRechargePromotionsData(labels: ReturnType<typeof getLabels>, showToast: ReturnType<typeof useToast>['showToast']) {
  const [userRechargePromotions, setUserRechargePromotions] = useState<readonly UserRechargePromotion[]>([]);
  const [userRechargePromotionQueryUserID, setUserRechargePromotionQueryUserID] = useState('');
  const [userRechargePromotionsLoading, setUserRechargePromotionsLoading] = useState(false);
  const [userRechargePromotionsLoaded, setUserRechargePromotionsLoaded] = useState(false);
  const [userRechargePromotionsError, setUserRechargePromotionsError] = useState('');
  const [savingUserRechargePromotionID, setSavingUserRechargePromotionID] = useState<string>();

  const loadUserRechargePromotions = useCallback(async (userID = userRechargePromotionQueryUserID, showLoading = !userRechargePromotionsLoaded) => {
    if (showLoading) setUserRechargePromotionsLoading(true);
    setUserRechargePromotionsError('');
    try {
      const normalizedUserID = userID.trim();
      const items = await listUserRechargePromotions(normalizedUserID || undefined);
      setUserRechargePromotions(items);
      setUserRechargePromotionQueryUserID(normalizedUserID);
      setUserRechargePromotionsLoaded(true);
    } catch (loadError) {
      const message = toMessage(loadError, labels.loadFailed);
      setUserRechargePromotionsError(message);
      showToast({ kind: 'error', message });
    } finally {
      setUserRechargePromotionsLoading(false);
    }
  }, [labels.loadFailed, showToast, userRechargePromotionQueryUserID, userRechargePromotionsLoaded]);

  const saveUserRechargePromotion = useCallback(async (input: UserRechargePromotionInput) => {
    const savingID = input.id || 'new';
    setSavingUserRechargePromotionID(savingID);
    try {
      await upsertUserRechargePromotion(input);
      await loadUserRechargePromotions(userRechargePromotionQueryUserID, false);
      showToast({ kind: 'success', message: labels.saved });
    } catch (saveError) {
      showToast({ kind: 'error', message: toMessage(saveError, labels.saveFailed) });
    } finally {
      setSavingUserRechargePromotionID(undefined);
    }
  }, [labels.saveFailed, labels.saved, loadUserRechargePromotions, showToast, userRechargePromotionQueryUserID]);

  const removeUserRechargePromotion = useCallback(async (id: string) => {
    setSavingUserRechargePromotionID(`delete:${id}`);
    try {
      await deleteUserRechargePromotion(id);
      await loadUserRechargePromotions(userRechargePromotionQueryUserID, false);
      showToast({ kind: 'success', message: '优惠规则已删除' });
    } catch (deleteError) {
      showToast({ kind: 'error', message: toMessage(deleteError, labels.saveFailed) });
    } finally {
      setSavingUserRechargePromotionID(undefined);
    }
  }, [labels.saveFailed, loadUserRechargePromotions, showToast, userRechargePromotionQueryUserID]);

  return {
    userRechargePromotions,
    userRechargePromotionQueryUserID,
    userRechargePromotionsLoading,
    userRechargePromotionsLoaded,
    userRechargePromotionsError,
    savingUserRechargePromotionID,
    setUserRechargePromotionQueryUserID,
    loadUserRechargePromotions,
    saveUserRechargePromotion,
    removeUserRechargePromotion,
  };
}

function useRoutingRulesData() {
  const [routingRules, setRoutingRules] = useState<readonly AdminModelRoutingRule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (loaded) return;
    try {
      setRoutingRules(await listModelRoutingRules());
      setLoaded(true);
    } catch { /* non-critical: routing panel still works standalone */ }
  }, [loaded]);
  return { routingRules, loadRoutingRules: load };
}

type AdminActionsOptions = Readonly<{
  labels: ReturnType<typeof getLabels>;
  showToast: ReturnType<typeof useToast>['showToast'];
  providerForms: Record<string, ProviderForm>;
  setProviderForms: Dispatch<SetStateAction<Record<string, ProviderForm>>>;
  storageForms: Record<string, StorageProviderForm>;
  setStorageForms: Dispatch<SetStateAction<Record<string, StorageProviderForm>>>;
  modelForms: Record<string, ModelForm>;
  setModelForms: Dispatch<SetStateAction<Record<string, ModelForm>>>;
  productForms: Record<string, ProductForm>;
  setProductForms: Dispatch<SetStateAction<Record<string, ProductForm>>>;
  setModelIssues: Dispatch<SetStateAction<Record<string, readonly ModelValidationIssue[]>>>;
  setEffectiveBillingProducts: Dispatch<SetStateAction<readonly AdminBillingProduct[]>>;
  setSavingKey: Dispatch<SetStateAction<string | undefined>>;
  providerOptions: readonly string[];
  loadOverview: (showLoading?: boolean) => Promise<void>;
}>;

function useAdminActions(options: AdminActionsOptions) {
  const patchProviderForm = (provider: string, patch: Partial<ProviderForm>) => {
    options.setProviderForms((current) => patchRecordEntry(current, provider, patch));
  };

  const patchStorageForm = (formKey: string, patch: Partial<StorageProviderForm>) => {
    options.setStorageForms((current) => patchRecordEntry(current, formKey, patch));
  };

  const patchModelForm = (formKey: string, patch: Partial<ModelForm>) => {
    options.setModelForms((current) => {
      const form = current[formKey];
      if (!form) {
        return current;
      }
      const nextPatch = { ...patch };
      const nextType = patch.type;
      const nextProvider = patch.provider ?? form.provider;
      const nextUpstreamModelID = patch.upstreamModelID ?? form.upstreamModelID;
      const currentAdapter = providerAdapterForModel(form, options.providerForms);
      const nextAdapter = providerAdapterForModel({ ...form, provider: nextProvider } as ModelForm, options.providerForms);
      if (
        nextPatch.params === undefined &&
        form.isDraft &&
        shouldReplaceDraftParamsForProviderChange(form, nextType ?? form.type, currentAdapter, nextAdapter, nextUpstreamModelID)
      ) {
        nextPatch.params = defaultEditableParamsForProvider(nextType ?? form.type, nextAdapter, nextUpstreamModelID);
      }
      if (
        nextType &&
        nextType !== form.type &&
        nextPatch.pricingConfig === undefined &&
        form.isDraft &&
        shouldReplaceDraftPricingForTypeChange(form, nextType)
      ) {
        nextPatch.pricingConfig = defaultEditablePricingConfig(nextType);
      }
      return patchRecordEntry(current, formKey, nextPatch);
    });
    options.setModelIssues((current) => removeRecordEntry(current, formKey));
  };

  const patchProductForm = (formKey: string, patch: Partial<ProductForm>) => {
    options.setProductForms((current) => patchRecordEntry(current, formKey, patch));
  };

  const draftActions = createAdminDraftActions(options);
  const persistenceActions = createAdminPersistenceActions(options);

  return {
    patchProviderForm,
    patchStorageForm,
    patchModelForm,
    patchProductForm,
    ...draftActions,
    ...persistenceActions,
  };
}

function createAdminDraftActions(options: AdminActionsOptions) {
  const addModelDraft = (): string => {
    const formKey = createDraftKey('model');
    const provider = options.providerOptions[0] ?? '';
    const adapter = providerAdapterForProvider(provider, options.providerForms);
    const draft = emptyModelForm(provider);
    draft.params = defaultEditableParamsForProvider(draft.type, adapter, draft.upstreamModelID);
    options.setModelForms((current) => ({ [formKey]: draft, ...current }));
    return formKey;
  };

  const duplicateModelDraft = (sourceKey: string): string => {
    const formKey = createDraftKey('model');
    options.setModelForms((current) => {
      const source = current[sourceKey];
      if (!source) return current;
      return { [formKey]: duplicateModelDraftForm(source), ...current };
    });
    options.setModelIssues((current) => removeRecordEntry(current, formKey));
    return formKey;
  };

  const addProviderDraft = () => {
    const formKey = createDraftKey('provider');
    options.setProviderForms((current) => ({ [formKey]: emptyProviderForm(), ...current }));
  };

  const addStorageDraft = () => {
    const formKey = createDraftKey('storage');
    options.setStorageForms((current) => ({ [formKey]: emptyStorageProviderForm(defaultStorageProviderType(current)), ...current }));
  };

  const addProductDraft = () => {
    const formKey = createDraftKey('product');
    options.setProductForms((current) => ({ [formKey]: emptyProductForm(), ...current }));
  };

  const dismissModelDraft = (formKey: string) => {
    options.setModelForms((current) => removeRecordEntry(current, formKey));
    options.setModelIssues((current) => removeRecordEntry(current, formKey));
  };

  const dismissProviderDraft = (formKey: string) => {
    options.setProviderForms((current) => removeRecordEntry(current, formKey));
  };

  const dismissStorageDraft = (formKey: string) => {
    options.setStorageForms((current) => removeRecordEntry(current, formKey));
  };

  const dismissProductDraft = (formKey: string) => {
    options.setProductForms((current) => removeRecordEntry(current, formKey));
  };

  return {
    addModelDraft,
    duplicateModelDraft,
    addProviderDraft,
    addStorageDraft,
    addProductDraft,
    dismissModelDraft,
    dismissProviderDraft,
    dismissStorageDraft,
    dismissProductDraft,
  };
}

function defaultStorageProviderType(forms: Record<string, StorageProviderForm>): StorageProviderForm['provider'] {
  const activeForm = Object.values(forms).find((form) => form.isActive);
  if (activeForm) {
    return activeForm.provider;
  }
  const firstForm = Object.values(forms)[0];
  return firstForm?.provider ?? 'aliyun-oss';
}

function createAdminPersistenceActions(options: AdminActionsOptions) {
  const saveProvider = async (formKey: string) => {
    const form = options.providerForms[formKey];
    if (!form) return;

    options.setSavingKey(`provider:${formKey}`);
    try {
      await updateGenerationProvider(form.isDraft ? form.id.trim() : formKey, {
        provider: form.id.trim(),
        adapter: form.adapter.trim(),
        enabled: form.enabled,
        base_url: form.baseURL,
        api_key: form.apiKey.trim() || undefined,
      });
      await options.loadOverview(false);
      options.showToast({ kind: 'success', message: options.labels.saved });
    } catch (saveError) {
      options.showToast({ kind: 'error', message: toMessage(saveError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const deleteProvider = async (formKey: string) => {
    const form = options.providerForms[formKey];
    if (!form || form.isDraft) return;
    options.setSavingKey(`provider-delete:${formKey}`);
    try {
      await deleteGenerationProvider(formKey);
      await options.loadOverview(false);
      options.showToast({ kind: 'success', message: options.labels.providerDeleted });
    } catch (deleteError) {
      options.showToast({ kind: 'error', message: toMessage(deleteError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const testProvider = async (formKey: string) => {
    const form = options.providerForms[formKey];
    if (!form || form.isDraft) return;
    options.setSavingKey(`provider-test:${formKey}`);
    try {
      const result = await testGenerationProvider(form.isDraft ? form.id.trim() : formKey);
      if (result.ok) {
        options.showToast({ kind: 'success', message: `${options.labels.providerTestSucceeded} (${result.message})` });
      } else {
        options.showToast({ kind: 'error', message: result.message || options.labels.saveFailed });
      }
    } catch (testError) {
      options.showToast({ kind: 'error', message: toMessage(testError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const saveStorage = async (formKey: string) => {
    const form = options.storageForms[formKey];
    if (!form) return;

    options.setSavingKey(`storage:${formKey}`);
    try {
      const updated = await updateStorageProvider(form.isDraft ? form.id.trim() : formKey, {
        id: form.id.trim(),
        provider: form.provider,
        endpoint_url: form.endpointURL.trim(),
        upload_endpoint_url: form.uploadEndpointURL.trim(),
        access_key: form.accessKey.trim() || undefined,
        secret_key: form.secretKey.trim() || undefined,
        bucket: form.bucket.trim(),
        region: form.region.trim(),
        path_style: form.pathStyle.trim(),
        public_base_url: form.publicBaseURL.trim(),
        signed_url_ttl_seconds: Number(form.signedURLTTLSeconds),
        generated_asset_prefix: form.generatedAssetPrefix.trim(),
        is_active: form.isActive,
      });
      options.setStorageForms((current) => replaceRecordEntry(current, formKey, updated.id, storageProviderForm(updated)));
      options.showToast({ kind: 'success', message: options.labels.saved });
      await options.loadOverview(false);
    } catch (saveError) {
      options.showToast({ kind: 'error', message: toMessage(saveError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const testStorage = async (formKey: string) => {
    const form = options.storageForms[formKey];
    if (!form || form.isDraft) return;

    options.setSavingKey(`storage-test:${formKey}`);
    try {
      await testStorageProvider(formKey);
      options.showToast({ kind: 'success', message: options.labels.storageTestSucceeded });
    } catch (testError) {
      options.showToast({ kind: 'error', message: toMessage(testError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const deleteStorage = async (formKey: string) => {
    const form = options.storageForms[formKey];
    if (!form || form.isDraft) return;
    options.setSavingKey(`storage-delete:${formKey}`);
    try {
      await deleteStorageProvider(formKey);
      options.setStorageForms((current) => removeRecordEntry(current, formKey));
      options.showToast({ kind: 'success', message: options.labels.storageDeleted });
    } catch (deleteError) {
      options.showToast({ kind: 'error', message: toMessage(deleteError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const persistProduct = async (formKey: string, form: ProductForm) => {
    let providerPrices: Record<string, string>;
    let benefits;
    try {
      providerPrices = parseProviderPricesText(form.providerPricesText, options.labels);
      benefits = parseProductBenefitsText(form.benefitsText);
    } catch (parseError) {
      options.showToast({ kind: 'error', message: toMessage(parseError, options.labels.providerPricesInvalid) });
      return;
    }

    options.setSavingKey(`product:${formKey}`);
    try {
      const updated = await updateBillingProduct({
        id: form.id.trim(),
        name: form.name.trim(),
        kind: form.kind,
        purchase_mode: form.purchaseMode,
        // 超值月卡/年卡：credits 列约定为 基础+赠送 的总数，保存时按权益配置强制推导，
        // 与表单里"只填基础/赠送、总数自动算"的交互保持一致。
        credits: isValueSubscriptionMode(form.purchaseMode) ? benefits.base_credits + benefits.bonus_credits : Number(form.credits),
        amount_cents: Number(form.amountCents),
        original_price_cents: form.originalPriceCents,
        first_purchase_price_cents: form.firstPurchasePriceCents,
        currency: form.currency.trim().toLowerCase(),
        benefits,
        provider_prices: providerPrices,
        enabled_providers: form.enabledProviders,
        is_active: form.isActive,
      });
      options.setProductForms((current) => replaceRecordEntry(current, formKey, updated.id, productForm(updated)));
      await refreshEffectiveProducts(options.setEffectiveBillingProducts);
      options.showToast({ kind: 'success', message: options.labels.saved });
    } catch (saveError) {
      options.showToast({ kind: 'error', message: toMessage(saveError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const saveModel = async (formKey: string) => {
    const form = options.modelForms[formKey];
    if (!form) return;

    const validationIssues = validateModelState(form, options.labels);
    if (validationIssues.length > 0) {
      options.setModelIssues((current) => ({ ...current, [formKey]: validationIssues }));
      focusModelField(formKey, validationIssues[0].field);
      options.showToast({ kind: 'error', message: options.labels.validationSummaryTitle });
      return;
    }

    options.setSavingKey(`model:${formKey}`);
    try {
      const updated = await updateAdminModel({
        id: form.id.trim(),
        original_id: form.savedState.id.trim() || form.id.trim(),
        name: form.name.trim(),
        provider: form.provider.trim(),
        upstream_model_id: form.upstreamModelID.trim(),
        type: form.type,
        description: form.description.trim(),
        tags: parseCSV(form.tagsText),
        capabilities: parseCSV(form.capabilitiesText),
        paramsSchema: serializeEditableParams(form.params),
        pricingConfig: serializeEditablePricingConfig(form.type, form.pricingConfig),
        inputLimits: serializeEditableInputLimits(form.inputLimits),
        display_order: parseDisplayOrder(form.displayOrder),
        is_enabled: form.isEnabled,
      });
      options.setModelForms((current) => replaceRecordEntry(current, formKey, updated.id, modelForm(updated)));
      options.setModelIssues((current) => removeRecordEntry(current, formKey));
      options.showToast({ kind: 'success', message: options.labels.saved });
    } catch (saveError) {
      options.showToast({ kind: 'error', message: toMessage(saveError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const deleteModel = async (formKey: string) => {
    const form = options.modelForms[formKey];
    if (!form || form.isDraft) return;

    options.setSavingKey(`model-delete:${formKey}`);
    try {
      await deleteAdminModel((form.savedState.id.trim() || form.id.trim()));
      options.setModelForms((current) => removeRecordEntry(current, formKey));
      options.setModelIssues((current) => removeRecordEntry(current, formKey));
      options.showToast({ kind: 'success', message: options.labels.modelDeleted });
    } catch (deleteError) {
      options.showToast({ kind: 'error', message: toMessage(deleteError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const saveProduct = async (formKey: string) => {
    const form = options.productForms[formKey];
    if (!form) return;
    await persistProduct(formKey, form);
  };

  const toggleProductActive = async (formKey: string) => {
    const form = options.productForms[formKey];
    if (!form || form.isDraft) return;
    await persistProduct(formKey, { ...form, isActive: !form.isActive });
  };

  const deleteProduct = async (formKey: string) => {
    const form = options.productForms[formKey];
    if (!form || form.isDraft) return;
    options.setSavingKey(`product-delete:${formKey}`);
    try {
      await deleteBillingProduct(form.id.trim());
      options.setProductForms((current) => removeRecordEntry(current, formKey));
      await refreshEffectiveProducts(options.setEffectiveBillingProducts);
      options.showToast({ kind: 'success', message: options.labels.productDeleted });
    } catch (deleteError) {
      options.showToast({ kind: 'error', message: toMessage(deleteError, options.labels.saveFailed) });
    } finally {
      options.setSavingKey(undefined);
    }
  };

  const resetModelChanges = (formKey: string) => {
    const form = options.modelForms[formKey];
    if (!form) return;
    options.setModelForms((current) => patchRecordEntry(current, formKey, resetModelForm(form)));
    options.setModelIssues((current) => removeRecordEntry(current, formKey));
  };

  const saveAllDirtyModels = async () => {
    const dirtyEntries = Object.entries(options.modelForms).filter(([, form]) => hasModelUnsavedChanges(form));
    if (dirtyEntries.length === 0) return;
    let savedCount = 0;
    let failedCount = 0;
    for (const [formKey] of dirtyEntries) {
      try {
        await saveModel(formKey);
        savedCount++;
      } catch {
        failedCount++;
      }
    }
    if (failedCount === 0) {
      options.showToast({ kind: 'success', message: `已保存 ${savedCount} 个模型` });
    } else {
      options.showToast({ kind: 'error', message: `保存完成：${savedCount} 成功，${failedCount} 失败` });
    }
  };

  return {
    saveProvider,
    deleteProvider,
    testProvider,
    saveStorage,
    testStorage,
    deleteStorage,
    saveModel,
    saveAllDirtyModels,
    deleteModel,
    deleteProduct,
    saveProduct,
    toggleProductActive,
    resetModelChanges,
  };
}

function shouldReplaceDraftParamsForProviderChange(form: ModelForm, nextType: ModelForm['type'], currentAdapter: string, nextAdapter: string, nextUpstreamModelID: string): boolean {
  if (!form.isDraft) {
    return false;
  }
  if (form.params.length === 0) {
    return true;
  }
  if (nextType !== form.type || nextAdapter !== currentAdapter || nextUpstreamModelID !== form.upstreamModelID) {
    return editableParamListSignature(form.params) === editableParamListSignature(defaultEditableParamsForProvider(form.type, currentAdapter, form.upstreamModelID));
  }
  return false;
}

function providerAdapterForModel(form: Pick<ModelForm, 'provider'>, providerForms: Record<string, ProviderForm>): string {
  return providerAdapterForProvider(form.provider, providerForms);
}

function providerAdapterForProvider(provider: string, providerForms: Record<string, ProviderForm>): string {
  return providerForms[provider]?.adapter ?? 'image_openai';
}

function shouldReplaceDraftPricingForTypeChange(form: ModelForm, nextType: ModelForm['type']): boolean {
  if (!form.isDraft || nextType === form.type) {
    return false;
  }
  return editablePricingConfigSignature(form.pricingConfig) === editablePricingConfigSignature(defaultEditablePricingConfig(form.type));
}

function hasModelUnsavedChanges(form: ModelForm): boolean {
  return form.isDraft || isModelFormDirty(form);
}

function useModelBeforeUnload(hasDirtyModels: boolean, message: string): void {
  useEffect(() => {
    if (!hasDirtyModels) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDirtyModels, message]);
}

async function refreshEffectiveProducts(setEffectiveBillingProducts: Dispatch<SetStateAction<readonly AdminBillingProduct[]>>): Promise<void> {
  const overview = await getAdminOverview();
  setEffectiveBillingProducts(overview.effective_billing_products);
}

type AdminSectionID = 'providers' | 'storage' | 'payment_channels' | 'models' | 'routing' | 'products' | 'orders' | 'workers' | 'tasks' | 'users' | 'announcements' | 'redeem' | 'ai_logs' | 'credit_logs' | 'agent_skills' | 'assets' | 'prompts';
type AdminWorkspaceTab = AdminSectionID;

const ADMIN_TAB_QUERY_KEY = 'tab';
const DEFAULT_ADMIN_TAB: AdminWorkspaceTab = 'providers';
const ADMIN_WORKSPACE_TABS = ['providers', 'storage', 'payment_channels', 'models', 'routing', 'products', 'orders', 'workers', 'tasks', 'users', 'announcements', 'redeem', 'ai_logs', 'credit_logs', 'agent_skills', 'assets', 'prompts'] as const satisfies readonly AdminWorkspaceTab[];

function initialAdminTabFromURL(): AdminWorkspaceTab {
  if (typeof window === 'undefined') {
    return DEFAULT_ADMIN_TAB;
  }
  return normalizeAdminTab(new URLSearchParams(window.location.search).get(ADMIN_TAB_QUERY_KEY));
}

function normalizeAdminTab(value: string | null): AdminWorkspaceTab {
  return ADMIN_WORKSPACE_TABS.includes(value as AdminWorkspaceTab) ? value as AdminWorkspaceTab : DEFAULT_ADMIN_TAB;
}

function writeAdminTabToURL(tab: AdminWorkspaceTab): void {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set(ADMIN_TAB_QUERY_KEY, tab);
  window.history.pushState({ ...window.history.state, adminTab: tab }, '', url);
}


const ADMIN_USERS_QUERY_KEYS = {
  query: 'user_query',
  status: 'user_status',
  limit: 'user_limit',
  offset: 'user_offset',
  sort: 'user_sort',
  order: 'user_order',
} as const;
const ADMIN_USER_STATUS_FILTERS = ['active', 'admin', 'disabled', 'deleted', 'failed', 'today', 'all'] as const satisfies readonly AdminUserStatusFilter[];
const ADMIN_USER_SORT_FIELDS = ['created_at', 'last_seen_at', 'credit_balance', 'succeeded_count', 'failed_count', 'task_count', 'email', 'name'] as const satisfies readonly AdminUserSortField[];
const ADMIN_USER_SORT_ORDERS = ['asc', 'desc'] as const satisfies readonly AdminSortOrder[];

type AdminUsersURLState = Readonly<{
  query: string;
  status: AdminUserStatusFilter;
  limit: number;
  offset: number;
  sort: AdminUserSortField;
  order: AdminSortOrder;
}>;

function initialAdminUsersStateFromURL(): AdminUsersURLState {
  if (typeof window === 'undefined') {
    return defaultAdminUsersURLState();
  }
  return adminUsersStateFromSearchParams(new URLSearchParams(window.location.search));
}

function defaultAdminUsersURLState(): AdminUsersURLState {
  return { query: '', status: 'active', limit: ADMIN_USERS_PAGE_SIZE, offset: 0, sort: 'last_seen_at', order: 'desc' };
}

function adminUsersStateFromSearchParams(params: URLSearchParams): AdminUsersURLState {
  const fallback = defaultAdminUsersURLState();
  const limit = positiveIntParam(params.get(ADMIN_USERS_QUERY_KEYS.limit), fallback.limit);
  const offset = nonNegativeIntParam(params.get(ADMIN_USERS_QUERY_KEYS.offset), fallback.offset);
  const status = normalizeAdminUserStatusParam(params.get(ADMIN_USERS_QUERY_KEYS.status));
  const sort = normalizeAdminUserSortParam(params.get(ADMIN_USERS_QUERY_KEYS.sort));
  const order = normalizeAdminUserOrderParam(params.get(ADMIN_USERS_QUERY_KEYS.order));
  return {
    query: params.get(ADMIN_USERS_QUERY_KEYS.query)?.trim() ?? fallback.query,
    status,
    limit,
    offset,
    sort,
    order,
  };
}

function writeAdminUsersStateToURL(state: AdminUsersURLState): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const fallback = defaultAdminUsersURLState();
  url.searchParams.set(ADMIN_TAB_QUERY_KEY, 'users');
  setOrDeleteSearchParam(url.searchParams, ADMIN_USERS_QUERY_KEYS.query, state.query, fallback.query);
  setOrDeleteSearchParam(url.searchParams, ADMIN_USERS_QUERY_KEYS.status, state.status, fallback.status);
  setOrDeleteSearchParam(url.searchParams, ADMIN_USERS_QUERY_KEYS.limit, String(state.limit), String(fallback.limit));
  setOrDeleteSearchParam(url.searchParams, ADMIN_USERS_QUERY_KEYS.offset, String(state.offset), String(fallback.offset));
  setOrDeleteSearchParam(url.searchParams, ADMIN_USERS_QUERY_KEYS.sort, state.sort, fallback.sort);
  setOrDeleteSearchParam(url.searchParams, ADMIN_USERS_QUERY_KEYS.order, state.order, fallback.order);
  window.history.replaceState({ ...window.history.state, adminTab: 'users', adminUsers: state }, '', url);
}

function setOrDeleteSearchParam(params: URLSearchParams, key: string, value: string, fallback: string): void {
  if (!value || value === fallback) {
    params.delete(key);
    return;
  }
  params.set(key, value);
}

function positiveIntParam(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function nonNegativeIntParam(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function normalizeAdminUserStatusParam(raw: string | null): AdminUserStatusFilter {
  return ADMIN_USER_STATUS_FILTERS.includes(raw as AdminUserStatusFilter) ? raw as AdminUserStatusFilter : 'active';
}

function normalizeAdminUserSortParam(raw: string | null): AdminUserSortField {
  return ADMIN_USER_SORT_FIELDS.includes(raw as AdminUserSortField) ? raw as AdminUserSortField : 'last_seen_at';
}

function normalizeAdminUserOrderParam(raw: string | null): AdminSortOrder {
  return ADMIN_USER_SORT_ORDERS.includes(raw as AdminSortOrder) ? raw as AdminSortOrder : 'desc';
}

function AdminConsoleContent(props: Readonly<{
  labels: ReturnType<typeof getLabels>;
  loading: boolean;
  refreshing: boolean;
  error: string;
  providerEntries: readonly ProviderEntry[];
  storageEntries: readonly StorageProviderEntry[];
  modelEntries: readonly ModelEntry[];
  modelIssues: Readonly<Record<string, readonly ModelValidationIssue[]>>;
  productEntries: readonly ProductEntry[];
  providerOptions: readonly string[];
  effectiveBillingProducts: readonly AdminBillingProduct[];
  paymentChannels: readonly AdminPaymentChannel[];
  userCounts: { total: number; active: number; deleted: number };
  savingKey?: string;
  hasDirtyModels: boolean;
  routingRules: readonly AdminModelRoutingRule[];
  onLoadRoutingRules: () => Promise<void>;
  providerCount: number;
  activeProviderCount: number;
  storageCount: number;
  activeStorageCount: number;
  modelCount: number;
  activeModelCount: number;
  liveProductCount: number;
  productCount: number;
  dirtyModelCount: number;
  draftProductCount: number;
  adminOrders: readonly AdminOrder[];
  adminOrdersTotal: number;
  adminOrdersLimit: number;
  adminOrdersOffset: number;
  adminOrdersQuery: string;
  adminOrdersStatus: AdminOrderStatusFilter;
  adminOrdersProvider: string;
  adminOrdersStats: AdminOrderList['stats'];
  adminOrdersSummary: AdminOrderList['stats'];
  adminOrdersLoading: boolean;
  adminOrdersRefreshing: boolean;
  adminOrdersLoaded: boolean;
  adminOrdersError: string;
  adminTasks: readonly AdminTask[];
  adminTasksTotal: number;
  adminTasksLimit: number;
  adminTasksOffset: number;
  adminTasksQuery: string;
  adminTasksStatus: AdminTaskStatusFilter;
  adminTasksType: AdminTaskTypeFilter;
  adminTasksStats: AdminTaskList['stats'];
  adminTasksSummary: AdminTaskList['stats'];
  adminTasksWorkerID: string;
  adminTasksErrorCategory: AdminTaskErrorCategoryFilter;
  adminTasksTimeRange: AdminTaskTimeRangeFilter;
  adminTasksRunningState: AdminTaskRunningStateFilter;
  adminTasksProvider: string;
  adminTasksProviderModel: string;
  adminTasksModel: string;
  adminTasksBatchID: string;
  adminTasksUpstreamState: AdminTaskUpstreamStateFilter;
  adminTasksRetryable: AdminTaskRetryableFilter;
  adminTasksLoading: boolean;
  adminTasksRefreshing: boolean;
  adminTasksLoaded: boolean;
  adminTasksError: string;
  workers: readonly AdminWorker[];
  workerStats: AdminWorkerList['stats'];
  workersLoading: boolean;
  workersRefreshing: boolean;
  workersLoaded: boolean;
  workersError: string;
  savingWorkerID?: string;
  users: readonly AdminUser[];
  usersTotal: number;
  usersLimit: number;
  usersOffset: number;
  usersQuery: string;
  usersStatus: AdminUserStatusFilter;
  usersSort: AdminUserSortField;
  usersOrder: AdminSortOrder;
  usersCounts: AdminUserList['counts'];
  usersLoading: boolean;
  usersRefreshing: boolean;
  usersLoaded: boolean;
  usersError: string;
  userRechargePromotions: readonly UserRechargePromotion[];
  userRechargePromotionQueryUserID: string;
  userRechargePromotionsLoading: boolean;
  userRechargePromotionsLoaded: boolean;
  userRechargePromotionsError: string;
  savingUserRechargePromotionID?: string;
  savingUserID?: string;
  currentUserID?: string;
  firstDirtyModelKey?: string;
  onAddProvider: () => void;
  onAddStorage: () => void;
  onChangeProvider: (formKey: string, patch: Partial<ProviderForm>) => void;
  onChangeStorage: (formKey: string, patch: Partial<StorageProviderForm>) => void;
  onDeleteProvider: (formKey: string) => Promise<void>;
  onDeleteStorage: (formKey: string) => Promise<void>;
  onDismissProviderDraft: (formKey: string) => void;
  onDismissStorageDraft: (formKey: string) => void;
  onSaveProvider: (formKey: string) => Promise<void>;
  onSaveStorage: (formKey: string) => Promise<void>;
  onTestProvider: (formKey: string) => Promise<void>;
  onTestStorage: (formKey: string) => Promise<void>;
  onAddModel: () => string;
  onDuplicateModel: (formKey: string) => string;
  onChangeModel: (formKey: string, patch: Partial<ModelForm>) => void;
  onDismissModelDraft: (formKey: string) => void;
  onResetModel: (formKey: string) => void;
  onDeleteModel: (formKey: string) => void;
  onSaveModel: (formKey: string) => void;
  onSaveAllModels: () => Promise<void>;
  onAddProduct: () => void;
  onChangeProduct: (formKey: string, patch: Partial<ProductForm>) => void;
  onDeleteProduct: (formKey: string) => void;
  onDismissProductDraft: (formKey: string) => void;
  onSaveProduct: (formKey: string) => void;
  onToggleProductActive: (formKey: string) => void;
  onRefresh: () => void;
  onLoadAdminOrders: (offset?: number, query?: string, status?: AdminOrderStatusFilter, provider?: string, limit?: number, showLoading?: boolean) => Promise<void>;
  onChangeAdminOrdersQuery: (query: string) => void;
  onChangeAdminOrdersStatus: (status: AdminOrderStatusFilter) => void;
  onChangeAdminOrdersProvider: (provider: string) => void;
  onChangeAdminOrdersPageSize: (limit: number) => void;
  onLoadAdminTasks: (offset?: number, query?: string, status?: AdminTaskStatusFilter, type?: AdminTaskTypeFilter, limit?: number, showLoading?: boolean, workerID?: string, errorCategory?: AdminTaskErrorCategoryFilter, timeRange?: AdminTaskTimeRangeFilter, runningState?: AdminTaskRunningStateFilter, provider?: string, providerModel?: string, model?: string, batchID?: string, upstreamState?: AdminTaskUpstreamStateFilter, retryable?: AdminTaskRetryableFilter) => Promise<void>;
  onChangeAdminTasksQuery: (query: string) => void;
  onChangeAdminTasksStatus: (status: AdminTaskStatusFilter) => void;
  onChangeAdminTasksType: (type: AdminTaskTypeFilter) => void;
  onChangeAdminTasksWorkerID: (workerID: string) => void;
  onChangeAdminTasksErrorCategory: (category: AdminTaskErrorCategoryFilter) => void;
  onChangeAdminTasksTimeRange: (range: AdminTaskTimeRangeFilter) => void;
  onChangeAdminTasksRunningState: (state: AdminTaskRunningStateFilter) => void;
  onChangeAdminTasksAdvancedFilters: (filters: Readonly<{ provider?: string; providerModel?: string; model?: string; batchID?: string; upstreamState?: AdminTaskUpstreamStateFilter; retryable?: AdminTaskRetryableFilter }>) => void;
  onChangeAdminTasksPageSize: (limit: number) => void;
  onPatchAdminTask: (task: AdminTask) => void;
  onRemoveAdminTask: (id: string) => void;
  onLoadWorkers: (showLoading?: boolean) => Promise<void>;
  onToggleWorkerEnabled: (worker: AdminWorker, enabled: boolean) => void;
  onUpdateWorkerConcurrency: (worker: AdminWorker, concurrency: number) => void;
  onLoadUsers: (offset?: number, query?: string, status?: AdminUserStatusFilter, limit?: number, showLoading?: boolean, sort?: AdminUserSortField, order?: AdminSortOrder) => Promise<void>;
  onChangeUsersQuery: (query: string) => void;
  onChangeUsersStatus: (status: AdminUserStatusFilter) => void;
  onChangeUsersSort: (field: AdminUserSortField) => void;
  onChangeUsersPageSize: (limit: number) => void;
  onSaveUserAdmin: (user: AdminUser, patch: Readonly<{ is_admin?: boolean; disabled?: boolean; deleted?: boolean; credit_balance?: number }>) => void;
  onResetUserPassword: (user: AdminUser, password: string) => void;
  onChangeUserRechargePromotionQueryUserID: (userID: string) => void;
  onLoadUserRechargePromotions: (userID?: string, showLoading?: boolean) => Promise<void>;
  onSaveUserRechargePromotion: (input: UserRechargePromotionInput) => Promise<void>;
  onDeleteUserRechargePromotion: (id: string) => Promise<void>;
}>) {
  const [activeTab, setActiveTab] = useState<AdminWorkspaceTab>(initialAdminTabFromURL);
  const [dirtyJumpPending, setDirtyJumpPending] = useState(false);
  const [lastManualRefreshAt, setLastManualRefreshAt] = useState<Date | null>(null);
  const { onLoadAdminOrders, onLoadAdminTasks, onLoadWorkers, onLoadUsers, adminOrdersLoaded, adminOrdersLoading, adminOrdersQuery, adminOrdersStatus, adminOrdersProvider, adminOrdersLimit, adminTasksLoaded, adminTasksLoading, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksLimit, workersLoaded, workersLoading, usersLoaded, usersLoading, usersQuery, usersStatus, usersLimit, usersSort, usersOrder } = props;
  const loadWorkersRef = useRef(onLoadWorkers);
  const workerTabActiveRef = useRef(activeTab === 'workers');
  useEffect(() => {
    loadWorkersRef.current = onLoadWorkers;
  }, [onLoadWorkers]);
  const sectionItems: ReadonlyArray<AdminNavigationItem<AdminWorkspaceTab>> = [
    { id: 'providers', label: props.labels.providersTabTitle, current: props.activeProviderCount, total: props.providerCount },
    { id: 'models', label: props.labels.modelsTabTitle, current: props.activeModelCount, total: props.modelCount },
    { id: 'routing', label: '灰度路由', current: props.routingRules.filter((rule) => rule.enabled).length, total: props.routingRules.length },
    { id: 'storage', label: props.labels.storageTabTitle, current: props.activeStorageCount, total: props.storageCount },
    { id: 'payment_channels', label: '支付通道', current: props.paymentChannels.filter((item) => item.is_active).length, total: props.paymentChannels.length },
    { id: 'products', label: props.labels.productsTabTitle, current: props.liveProductCount, total: props.productCount },
    { id: 'orders', label: '订单管理', current: props.adminOrdersSummary.counts.pending, total: props.adminOrdersSummary.total },
    { id: 'workers', label: 'Worker管理', current: props.workerStats.online, total: props.workerStats.total },
    { id: 'tasks', label: props.labels.tasksTabTitle, current: props.adminTasksSummary.counts.processing + props.adminTasksSummary.counts.queued, total: props.adminTasksSummary.total },
    { id: 'users', label: props.labels.usersTabTitle, current: props.userCounts.active, total: props.userCounts.total },
    { id: 'announcements', label: '公告管理', current: 0, total: 0, badge: false, tooltip: '管理前台公告、展示周期与启用状态' },
    { id: 'redeem', label: '兑换码管理', current: 0, total: 0, badge: false, tooltip: '生成、导出并追踪兑换码批次' },
    { id: 'ai_logs', label: 'AI调用日志', current: 0, total: 0, badge: false, tooltip: '查看AI模型调用记录与统计' },
    { id: 'credit_logs', label: '积分日志', current: 0, total: 0, badge: false, tooltip: '管理用户积分变动记录' },
    { id: 'agent_skills', label: 'Agent技能', current: 0, total: 0, badge: false, tooltip: '管理系统级Agent技能库' },
    { id: 'assets', label: '素材库', current: 0, total: 0, badge: false, tooltip: '管理公共素材资源' },
    { id: 'prompts', label: '提示词库', current: 0, total: 0, badge: false, tooltip: '管理系统提示词模板' },
  ];
  const navigationItems = sectionItems.map((item) => ({ ...item, tooltip: item.tooltip || tabTooltip(item) }));
  const navigationGroups = [
    { id: 'configuration' as const, label: '配置中心', description: '管理生成能力、模型路由与对象存储', items: navigationItems.filter((item) => ['providers', 'models', 'routing', 'storage'].includes(item.id)) },
    { id: 'commerce' as const, label: '商业化', description: '管理支付、商品、订单与兑换码', items: navigationItems.filter((item) => ['payment_channels', 'products', 'orders', 'redeem'].includes(item.id)) },
    { id: 'operations' as const, label: '运行中心', description: '监控 Worker 与生成任务', items: navigationItems.filter((item) => ['workers', 'tasks'].includes(item.id)) },
    { id: 'audience' as const, label: '用户运营', description: '管理用户、优惠与公告', items: navigationItems.filter((item) => ['users', 'announcements'].includes(item.id)) },
    { id: 'content' as const, label: '内容管理', description: '管理AI日志、积分、技能、素材与提示词', items: navigationItems.filter((item) => ['ai_logs', 'credit_logs', 'agent_skills', 'assets', 'prompts'].includes(item.id)) },
  ];
  useEffect(() => {
    const handlePopState = () => {
      setDirtyJumpPending(false);
      setActiveTab(initialAdminTabFromURL());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const changeActiveTab = useCallback((tab: AdminWorkspaceTab) => {
    setDirtyJumpPending(false);
    setActiveTab(tab);
    writeAdminTabToURL(tab);
  }, []);

  useEffect(() => {
    if (!dirtyJumpPending || activeTab !== 'models' || !props.firstDirtyModelKey) {
      return;
    }
    const timer = window.setTimeout(() => {
      document.getElementById(`model-card-${props.firstDirtyModelKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setDirtyJumpPending(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, dirtyJumpPending, props.firstDirtyModelKey]);

  useEffect(() => {
    if (activeTab !== 'orders' || adminOrdersLoaded || adminOrdersLoading) {
      return;
    }
    void onLoadAdminOrders(0, adminOrdersQuery, adminOrdersStatus, adminOrdersProvider, adminOrdersLimit, true);
  }, [activeTab, adminOrdersLimit, adminOrdersLoaded, adminOrdersLoading, adminOrdersProvider, adminOrdersQuery, adminOrdersStatus, onLoadAdminOrders]);

  useEffect(() => {
    if (activeTab !== 'tasks' || adminTasksLoaded || adminTasksLoading) {
      return;
    }
    void onLoadAdminTasks(0, adminTasksQuery, adminTasksStatus, adminTasksType, adminTasksLimit, true, props.adminTasksWorkerID, props.adminTasksErrorCategory, props.adminTasksTimeRange, props.adminTasksRunningState, props.adminTasksProvider, props.adminTasksProviderModel, props.adminTasksModel, props.adminTasksBatchID, props.adminTasksUpstreamState, props.adminTasksRetryable);
  }, [activeTab, adminTasksLimit, adminTasksLoaded, adminTasksLoading, adminTasksQuery, adminTasksStatus, adminTasksType, onLoadAdminTasks, props.adminTasksWorkerID, props.adminTasksErrorCategory, props.adminTasksTimeRange, props.adminTasksRunningState, props.adminTasksProvider, props.adminTasksProviderModel, props.adminTasksModel, props.adminTasksBatchID, props.adminTasksUpstreamState, props.adminTasksRetryable]);

  useEffect(() => {
    if ((activeTab !== 'workers' && activeTab !== 'tasks') || workersLoaded || workersLoading) {
      return;
    }
    void onLoadWorkers(activeTab === 'workers');
  }, [activeTab, onLoadWorkers, workersLoaded, workersLoading]);

  const { onLoadRoutingRules } = props;
  useEffect(() => {
    if (activeTab === 'models' || activeTab === 'routing') void onLoadRoutingRules();
  }, [activeTab, onLoadRoutingRules]);

  useEffect(() => {
    if (activeTab !== 'workers' || !workersLoaded) {
      return;
    }
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void loadWorkersRef.current(false);
    };
    const timer = window.setInterval(refreshIfVisible, ADMIN_WORKERS_AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [activeTab, workersLoaded]);

  useEffect(() => {
    const wasActive = workerTabActiveRef.current;
    const isActive = activeTab === 'workers';
    workerTabActiveRef.current = isActive;
    if (isActive && !wasActive && workersLoaded && document.visibilityState === 'visible') {
      void loadWorkersRef.current(false);
    }
  }, [activeTab, workersLoaded]);

  useEffect(() => {
    if (activeTab !== 'users' || usersLoaded || usersLoading) {
      return;
    }
    void onLoadUsers(props.usersOffset, usersQuery, usersStatus, usersLimit, true, usersSort, usersOrder);
  }, [activeTab, onLoadUsers, props.usersOffset, usersLimit, usersLoaded, usersLoading, usersQuery, usersStatus, usersSort, usersOrder]);

  useEffect(() => {
    if (activeTab !== 'users' || props.userRechargePromotionsLoaded || props.userRechargePromotionsLoading) {
      return;
    }
    void props.onLoadUserRechargePromotions('', true);
  }, [activeTab, props]);


  const getTabPanelId = (tab: AdminWorkspaceTab) => `admin-tab-panel-${tab}`;
  const getTabButtonId = (tab: AdminWorkspaceTab) => `admin-tab-button-${tab}`;
  function tabTooltip(item: { id: AdminWorkspaceTab; label: string; current: number; total: number }) {
    if (item.id === 'orders') return `待支付 ${item.current} / 总订单 ${item.total}`;
    if (item.id === 'workers') return `在线 ${item.current} / Worker 总数 ${item.total}`;
    if (item.id === 'tasks') return `排队或执行中 ${item.current} / 任务总数 ${item.total}`;
    if (item.id === 'users') return `活跃用户 ${item.current} / 用户总数 ${item.total}`;
    if (item.id === 'providers') return `启用渠道 ${item.current} / 渠道总数 ${item.total}`;
    if (item.id === 'models') return `启用模型 ${item.current} / 模型总数 ${item.total}`;
    if (item.id === 'routing') return `启用规则 ${item.current} / 规则总数 ${item.total}`;
    if (item.id === 'storage') return `当前对象存储 ${item.current} / 存储配置 ${item.total}`;
    if (item.id === 'products') return `生效产品 ${item.current} / 产品总数 ${item.total}`;
    if (item.id === 'payment_channels') return `当前通道 ${item.current} / 支付通道 ${item.total}`;
    return item.label;
  }
  const activeRefreshing = activeTab === 'users' ? props.usersRefreshing : activeTab === 'orders' ? props.adminOrdersRefreshing : activeTab === 'tasks' ? props.adminTasksRefreshing : activeTab === 'workers' ? props.workersRefreshing : props.refreshing;
  const refreshActiveTab = () => {
    setLastManualRefreshAt(new Date());
    if (activeTab === 'users') return void props.onLoadUsers(props.usersOffset, props.usersQuery, props.usersStatus, props.usersLimit, false, props.usersSort, props.usersOrder);
    if (activeTab === 'orders') return void props.onLoadAdminOrders(props.adminOrdersOffset, props.adminOrdersQuery, props.adminOrdersStatus, props.adminOrdersProvider, props.adminOrdersLimit, false);
    if (activeTab === 'tasks') return void props.onLoadAdminTasks(props.adminTasksOffset, props.adminTasksQuery, props.adminTasksStatus, props.adminTasksType, props.adminTasksLimit, false, props.adminTasksWorkerID, props.adminTasksErrorCategory, props.adminTasksTimeRange, props.adminTasksRunningState, props.adminTasksProvider, props.adminTasksProviderModel, props.adminTasksModel, props.adminTasksBatchID, props.adminTasksUpstreamState, props.adminTasksRetryable);
    if (activeTab === 'workers') return void props.onLoadWorkers(false);
    return props.onRefresh();
  };

  return (
    <section className="admin-shell text-ink">
      <div className="admin-console-layout w-full px-2 py-3 sm:px-3 2xl:px-5">
        <AdminWorkspaceNavigation
          groups={navigationGroups}
          activeTab={activeTab}
          title={props.labels.title}
          onChange={changeActiveTab}
          action={(
            <button
              type="button"
              onClick={refreshActiveTab}
              disabled={activeRefreshing}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              aria-label={activeRefreshing ? props.labels.refreshing : props.labels.refreshData}
              title={lastManualRefreshAt ? `上次手动刷新：${formatAdminRefreshTime(lastManualRefreshAt)}` : (activeRefreshing ? props.labels.refreshing : props.labels.refreshData)}
            >
              <RefreshCw size={15} className={activeRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
              <span className="hidden lg:inline">{activeRefreshing ? props.labels.refreshing : props.labels.refreshData}</span>
            </button>
          )}
        />

        <div className="admin-console-main min-w-0 space-y-4">
          {props.loading ? <EmptyState icon={<Loader2 size={18} className="animate-spin" />} title={props.labels.loadingTitle} description={props.labels.loadingBody} /> : null}
          {!props.loading && props.error ? <div className="rounded-surface border border-red-200 bg-red-50/95 px-4 py-3 text-sm font-semibold text-red-700">{props.error}</div> : null}
          {!props.loading && !props.error ? (
            <div className="space-y-4">
              <div id={getTabPanelId('providers')} role="tabpanel" aria-labelledby={getTabButtonId('providers')} hidden={activeTab !== 'providers'} className="admin-section-anchor">
                <ProviderSection labels={props.labels} providerEntries={props.providerEntries} modelEntries={props.modelEntries} modelIssues={props.modelIssues} savingKey={props.savingKey} onAdd={props.onAddProvider} onChange={props.onChangeProvider} onDelete={props.onDeleteProvider} onDismissDraft={props.onDismissProviderDraft} onSave={props.onSaveProvider} onTest={props.onTestProvider} />
              </div>
              <div id={getTabPanelId('storage')} role="tabpanel" aria-labelledby={getTabButtonId('storage')} hidden={activeTab !== 'storage'} className="admin-section-anchor">
                <StorageSection labels={props.labels} storageEntries={props.storageEntries} savingKey={props.savingKey} onAdd={props.onAddStorage} onChange={props.onChangeStorage} onDelete={props.onDeleteStorage} onDismissDraft={props.onDismissStorageDraft} onSave={props.onSaveStorage} onTest={props.onTestStorage} />
              </div>
              <div id={getTabPanelId('payment_channels')} role="tabpanel" aria-labelledby={getTabButtonId('payment_channels')} hidden={activeTab !== 'payment_channels'} className="admin-section-anchor">
                <AdminPaymentChannelsSection channels={props.paymentChannels} onRefresh={() => props.onRefresh()} />
              </div>
              <div id={getTabPanelId('models')} role="tabpanel" aria-labelledby={getTabButtonId('models')} hidden={activeTab !== 'models'} className="admin-section-anchor">
                <ModelsSection labels={props.labels} modelEntries={props.modelEntries} modelIssues={props.modelIssues} providerEntries={props.providerEntries} providerOptions={props.providerOptions} routingRules={props.routingRules} savingKey={props.savingKey} hasDirtyChanges={props.hasDirtyModels} onAdd={props.onAddModel} onDuplicate={props.onDuplicateModel} onChange={props.onChangeModel} onDismissDraft={props.onDismissModelDraft} onReset={props.onResetModel} onDelete={props.onDeleteModel} onSave={props.onSaveModel} onSaveAll={props.onSaveAllModels} />
              </div>
              <div id={getTabPanelId('routing')} role="tabpanel" aria-labelledby={getTabButtonId('routing')} hidden={activeTab !== 'routing'} className="admin-section-anchor">
                <AdminModelRoutingSection labels={props.labels} providers={props.providerEntries.map(([, form]) => ({ provider: form.id }))} models={props.modelEntries.map(([, form]) => ({ id: form.id, provider: form.provider, upstream_model_id: form.upstreamModelID, type: form.type }))} />
              </div>
              <div id={getTabPanelId('products')} role="tabpanel" aria-labelledby={getTabButtonId('products')} hidden={activeTab !== 'products'} className="admin-section-anchor">
                <ProductsSection labels={props.labels} productEntries={props.productEntries} effectiveProducts={props.effectiveBillingProducts} savingKey={props.savingKey} onAdd={props.onAddProduct} onChange={props.onChangeProduct} onDelete={props.onDeleteProduct} onDismissDraft={props.onDismissProductDraft} onSave={props.onSaveProduct} onToggleActive={props.onToggleProductActive} />
                <AdminPurchaseModeLabelsSection />
              </div>
              <div id={getTabPanelId('orders')} role="tabpanel" aria-labelledby={getTabButtonId('orders')} hidden={activeTab !== 'orders'} className="admin-section-anchor">
                <OrdersSection
                  labels={props.labels}
                  orders={props.adminOrders}
                  stats={props.adminOrdersStats}
                  summary={props.adminOrdersSummary}
                  total={props.adminOrdersTotal}
                  limit={props.adminOrdersLimit}
                  offset={props.adminOrdersOffset}
                  query={props.adminOrdersQuery}
                  statusFilter={props.adminOrdersStatus}
                  providerFilter={props.adminOrdersProvider}
                  loading={props.adminOrdersLoading}
                  error={props.adminOrdersError}
                  onQueryChange={props.onChangeAdminOrdersQuery}
                  onStatusChange={props.onChangeAdminOrdersStatus}
                  onProviderChange={props.onChangeAdminOrdersProvider}
                  onPage={(offset) => void props.onLoadAdminOrders(offset, props.adminOrdersQuery, props.adminOrdersStatus, props.adminOrdersProvider, props.adminOrdersLimit, true)}
                  onPageSizeChange={props.onChangeAdminOrdersPageSize}
                />
              </div>
              <div id={getTabPanelId('workers')} role="tabpanel" aria-labelledby={getTabButtonId('workers')} hidden={activeTab !== 'workers'} className="admin-section-anchor">
                {props.workersError ? <div className="mb-4 rounded-surface border border-red-200 bg-red-50/95 px-4 py-3 text-sm font-semibold text-red-700">{props.workersError}</div> : null}
                <WorkersSection labels={props.labels} workers={props.workers} stats={props.workerStats} loading={props.workersLoading} savingWorkerID={props.savingWorkerID} onToggleEnabled={props.onToggleWorkerEnabled} onUpdateConcurrency={props.onUpdateWorkerConcurrency} />
              </div>
              <div id={getTabPanelId('tasks')} role="tabpanel" aria-labelledby={getTabButtonId('tasks')} hidden={activeTab !== 'tasks'} className="admin-section-anchor">
                {props.adminTasksError ? <div className="mb-4 rounded-surface border border-red-200 bg-red-50/95 px-4 py-3 text-sm font-semibold text-red-700">{props.adminTasksError}</div> : null}
                <TasksSection
                  active={activeTab === 'tasks'}
                  labels={props.labels}
                  tasks={props.adminTasks}
                  stats={props.adminTasksStats}
                  summary={props.adminTasksSummary}
                  total={props.adminTasksTotal}
                  limit={props.adminTasksLimit}
                  offset={props.adminTasksOffset}
                  query={props.adminTasksQuery}
                  statusFilter={props.adminTasksStatus}
                  typeFilter={props.adminTasksType}
                  workerIDFilter={props.adminTasksWorkerID}
                  errorCategoryFilter={props.adminTasksErrorCategory}
                  timeRangeFilter={props.adminTasksTimeRange}
                  runningStateFilter={props.adminTasksRunningState}
                  providerFilter={props.adminTasksProvider}
                  providerModelFilter={props.adminTasksProviderModel}
                  modelFilter={props.adminTasksModel}
                  batchIDFilter={props.adminTasksBatchID}
                  upstreamStateFilter={props.adminTasksUpstreamState}
                  retryableFilter={props.adminTasksRetryable}
                  loading={props.adminTasksLoading}
                  workers={props.workers}
                  onQueryChange={props.onChangeAdminTasksQuery}
                  onStatusChange={props.onChangeAdminTasksStatus}
                  onTypeChange={props.onChangeAdminTasksType}
                  onWorkerIDChange={props.onChangeAdminTasksWorkerID}
                  onErrorCategoryChange={props.onChangeAdminTasksErrorCategory}
                  onTimeRangeChange={props.onChangeAdminTasksTimeRange}
                  onRunningStateChange={props.onChangeAdminTasksRunningState}
                  onAdvancedFiltersChange={props.onChangeAdminTasksAdvancedFilters}
                  onPage={(offset) => void props.onLoadAdminTasks(offset, props.adminTasksQuery, props.adminTasksStatus, props.adminTasksType, props.adminTasksLimit, true, props.adminTasksWorkerID, props.adminTasksErrorCategory, props.adminTasksTimeRange, props.adminTasksRunningState, props.adminTasksProvider, props.adminTasksProviderModel, props.adminTasksModel, props.adminTasksBatchID, props.adminTasksUpstreamState, props.adminTasksRetryable)}
                  onRefresh={() => void props.onLoadAdminTasks(props.adminTasksOffset, props.adminTasksQuery, props.adminTasksStatus, props.adminTasksType, props.adminTasksLimit, false, props.adminTasksWorkerID, props.adminTasksErrorCategory, props.adminTasksTimeRange, props.adminTasksRunningState, props.adminTasksProvider, props.adminTasksProviderModel, props.adminTasksModel, props.adminTasksBatchID, props.adminTasksUpstreamState, props.adminTasksRetryable)}
                  onPageSizeChange={props.onChangeAdminTasksPageSize}
                  onTaskUpdated={props.onPatchAdminTask}
                  onTaskDeleted={props.onRemoveAdminTask}
                />
              </div>
              <div id={getTabPanelId('users')} role="tabpanel" aria-labelledby={getTabButtonId('users')} hidden={activeTab !== 'users'} className="admin-section-anchor">
                {props.usersError ? <div className="mb-4 rounded-surface border border-red-200 bg-red-50/95 px-4 py-3 text-sm font-semibold text-red-700">{props.usersError}</div> : null}
                <UsersSection
                  labels={props.labels}
                  users={props.users}
                  counts={props.usersCounts}
                  total={props.usersTotal}
                  limit={props.usersLimit}
                  offset={props.usersOffset}
                  query={props.usersQuery}
                  statusFilter={props.usersStatus}
                  sortField={props.usersSort}
                  sortOrder={props.usersOrder}
                  loading={props.usersLoading}
                  refreshing={props.usersRefreshing}
                  savingKey={props.savingUserID ? `user:${props.savingUserID}` : undefined}
                  currentUserID={props.currentUserID}
                  promotions={props.userRechargePromotions}
                  promotionsLoading={props.userRechargePromotionsLoading}
                  promotionSavingID={props.savingUserRechargePromotionID}
                  productEntries={props.productEntries}
                  onLoadPromotions={props.onLoadUserRechargePromotions}
                  onSavePromotion={props.onSaveUserRechargePromotion}
                  onDeletePromotion={props.onDeleteUserRechargePromotion}
                  onQueryChange={props.onChangeUsersQuery}
                  onStatusChange={props.onChangeUsersStatus}
                  onSortChange={props.onChangeUsersSort}
                  onPage={(offset) => void props.onLoadUsers(offset, props.usersQuery, props.usersStatus, props.usersLimit, true, props.usersSort, props.usersOrder)}
                  onPageSizeChange={props.onChangeUsersPageSize}
                  onUpdateUser={props.onSaveUserAdmin}
                  onResetPassword={props.onResetUserPassword}
                />
              </div>
              <div id={getTabPanelId('announcements')} role="tabpanel" aria-labelledby={getTabButtonId('announcements')} hidden={activeTab !== 'announcements'} className="admin-section-anchor">
                <AdminAnnouncementsSection />
              </div>
              <div id={getTabPanelId('redeem')} role="tabpanel" aria-labelledby={getTabButtonId('redeem')} hidden={activeTab !== 'redeem'} className="admin-section-anchor">
                <AdminRedeemPageView embedded />
              </div>
              <div id={getTabPanelId('ai_logs')} role="tabpanel" aria-labelledby={getTabButtonId('ai_logs')} hidden={activeTab !== 'ai_logs'} className="admin-section-anchor">
                <div className="p-6 text-slate-400">AI调用日志功能开发中...</div>
              </div>
              <div id={getTabPanelId('credit_logs')} role="tabpanel" aria-labelledby={getTabButtonId('credit_logs')} hidden={activeTab !== 'credit_logs'} className="admin-section-anchor">
                <div className="p-6 text-slate-400">积分日志功能开发中...</div>
              </div>
              <div id={getTabPanelId('agent_skills')} role="tabpanel" aria-labelledby={getTabButtonId('agent_skills')} hidden={activeTab !== 'agent_skills'} className="admin-section-anchor">
                <div className="p-6 text-slate-400">Agent技能管理功能开发中...</div>
              </div>
              <div id={getTabPanelId('assets')} role="tabpanel" aria-labelledby={getTabButtonId('assets')} hidden={activeTab !== 'assets'} className="admin-section-anchor">
                <div className="p-6 text-slate-400">素材库管理功能开发中...</div>
              </div>
              <div id={getTabPanelId('prompts')} role="tabpanel" aria-labelledby={getTabButtonId('prompts')} hidden={activeTab !== 'prompts'} className="admin-section-anchor">
                <div className="p-6 text-slate-400">提示词库管理功能开发中...</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}



function formatAdminRefreshTime(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' }).format(value);
}

function focusModelField(formKey: string, field: string): void {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    const element = document.getElementById(modelFieldDOMID(formKey, field));
    if (element instanceof HTMLElement) {
      element.focus();
    }
  });
}

function buildProviderOptions(providerEntries: readonly ProviderEntry[]): readonly string[] {
  const seen = new Set<string>();
  return providerEntries
    .map(([, form]) => ({ id: form.id.trim(), enabled: form.enabled }))
    .filter((item) => item.id && item.enabled)
    .sort((left, right) => left.id.localeCompare(right.id))
    .filter((item) => {
      const key = item.id.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((item) => item.id);
}
