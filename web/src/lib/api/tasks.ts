import type { CreateGenerationTaskBatchInput, CreateGenerationTaskInput, EstimateGenerationCreditsInput, GenerationCreditEstimate, GenerationTask, GenerationTaskBatch, GenerationTaskStatus, GenerationTaskType } from '@/lib/types';
import { ApiClientError, apiRequest, getApiBaseUrl, getStoredToken, notifyAuthExpired } from './client';

type TaskDto = Readonly<{
  id: string;
  user_id: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  model: string;
  model_name?: string;
  prompt: string;
  negative_prompt?: string;
  params: Record<string, unknown>;
  credits_used: number;
  result_urls: string[];
  error_message?: string;
  error_category?: string;
  error_code?: string;
  retryable?: boolean;
  provider_trace_id?: string;
  created_at: string;
  completed_at?: string;
  batch_id?: string;
  batch_index?: number;
}>;


type TaskBatchDto = Readonly<{
  id: string;
  user_id: string;
  type: GenerationTaskType;
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed';
  model: string;
  model_name?: string;
  negative_prompt?: string;
  params: Record<string, unknown>;
  total: number;
  queued: number;
  processing: number;
  succeeded: number;
  failed: number;
  credits_used: number;
  tasks?: readonly TaskDto[];
  created_at: string;
  updated_at: string;
}>;

type TaskPageDto = Readonly<{
  items: readonly TaskDto[];
  has_more?: boolean;
}>;

const pendingTaskKeys = new Map<string, string>();
const pendingBatchKeys = new Map<string, string>();
const MAX_PENDING_IDEMPOTENCY_KEYS = 100;

export type ListGenerationTasksInput = Readonly<{
  type?: GenerationTaskType;
  status?: GenerationTaskStatus;
  limit?: number;
  page?: number;
}>;

export type GenerationTaskPage = Readonly<{
  items: readonly GenerationTask[];
  hasMore: boolean;
}>;

export type GenerationTaskStreamHandlers = Readonly<{
  onTask: (task: GenerationTask) => void;
  onError: (error: unknown) => void;
}>;

export type GenerationTaskBatchStreamHandlers = Readonly<{
  onBatch: (batch: GenerationTaskBatch) => void;
  onError: (error: unknown) => void;
}>;

export async function createGenerationTask(input: CreateGenerationTaskInput): Promise<GenerationTask> {
  const body = JSON.stringify({
    type: input.type,
    model: input.model,
    prompt: input.prompt,
    negative_prompt: input.negativePrompt,
    params: input.params,
  });
  const idempotencyKey = pendingIdempotencyKey(pendingTaskKeys, body);
  const task = await apiRequest<TaskDto>('/v1/generation-tasks', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body,
  });
  pendingTaskKeys.delete(body);
  return mapTask(task);
}


export async function createGenerationTaskBatch(input: CreateGenerationTaskBatchInput): Promise<GenerationTaskBatch> {
  const body = JSON.stringify({
    type: input.type,
    model: input.model,
    prompts: input.prompts,
    negative_prompt: input.negativePrompt,
    params: input.params,
  });
  const idempotencyKey = pendingIdempotencyKey(pendingBatchKeys, body);
  const batch = await apiRequest<TaskBatchDto>('/v1/generation-task-batches', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body,
  });
  pendingBatchKeys.delete(body);
  return mapTaskBatch(batch);
}

function pendingIdempotencyKey(keys: Map<string, string>, fingerprint: string): string {
  const existing = keys.get(fingerprint);
  if (existing) return existing;
  while (keys.size >= MAX_PENDING_IDEMPOTENCY_KEYS) {
    const oldest = keys.keys().next().value as string | undefined;
    if (!oldest) break;
    keys.delete(oldest);
  }
  const key = globalThis.crypto?.randomUUID?.() ?? `request_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  keys.set(fingerprint, key);
  return key;
}

export async function estimateGenerationCredits(input: EstimateGenerationCreditsInput): Promise<GenerationCreditEstimate> {
  return apiRequest<GenerationCreditEstimate>('/v1/generation-tasks/estimate', {
    method: 'POST',
    body: JSON.stringify({
      type: input.type,
      model: input.model,
      params: input.params,
    }),
  });
}

export async function getGenerationTask(taskId: string): Promise<GenerationTask> {
  return mapTask(await apiRequest<TaskDto>(`/v1/generation-tasks/${taskId}`));
}

export function subscribeGenerationTask(taskId: string, handlers: GenerationTaskStreamHandlers): () => void {
  return subscribeWithReconnect((signal, reconnectHandlers, onConnected) => streamGenerationTask(taskId, reconnectHandlers, signal, onConnected), handlers);
}

export function subscribeGenerationTaskBatch(batchId: string, handlers: GenerationTaskBatchStreamHandlers): () => void {
  return subscribeWithReconnect((signal, reconnectHandlers, onConnected) => streamGenerationTaskBatch(batchId, reconnectHandlers, signal, onConnected), handlers);
}

function subscribeWithReconnect<THandlers extends Readonly<{ onError: (error: unknown) => void }>>(
  connect: (signal: AbortSignal, handlers: THandlers, onConnected: () => void) => Promise<void>,
  handlers: THandlers,
): () => void {
  let stopped = false;
  let controller: AbortController | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;

  const scheduleReconnect = () => {
    if (stopped || retryTimer) return;
    failures += 1;
    const delay = Math.min(30_000, 1_000 * 2 ** Math.min(failures - 1, 5));
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      start();
    }, delay);
  };

  const start = () => {
    if (stopped) return;
    controller = new AbortController();
    void connect(controller.signal, handlers, () => { failures = 0; })
      .then(() => {
        if (!controller?.signal.aborted) scheduleReconnect();
      })
      .catch((error: unknown) => {
        if (controller?.signal.aborted || stopped) return;
        handlers.onError(error);
        scheduleReconnect();
      });
  };

  start();
  return () => {
    stopped = true;
    controller?.abort();
    if (retryTimer) clearTimeout(retryTimer);
  };
}

export async function deleteGenerationTask(taskId: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/generation-tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
}

export async function listGenerationTasksPage(input: ListGenerationTasksInput = {}): Promise<GenerationTaskPage> {
  const payload = await apiRequest<readonly TaskDto[] | TaskPageDto>(`/v1/generation-tasks${queryString(input)}`);
  if (Array.isArray(payload)) return { items: payload.map(mapTask), hasMore: false };
  const page = payload as TaskPageDto;
  return { items: page.items.map(mapTask), hasMore: Boolean(page.has_more) };
}

function mapTask(task: TaskDto): GenerationTask {
  return {
    id: task.id,
    userId: task.user_id,
    type: task.type,
    status: task.status,
    model: task.model,
    modelName: task.model_name,
    prompt: task.prompt,
    negativePrompt: task.negative_prompt,
    params: task.params,
    creditsUsed: task.credits_used,
    resultUrls: task.result_urls,
    errorMessage: task.error_message,
    errorCategory: task.error_category,
    errorCode: task.error_code,
    retryable: task.retryable,
    providerTraceId: task.provider_trace_id,
    createdAt: task.created_at,
    completedAt: task.completed_at,
    batchId: task.batch_id,
    batchIndex: task.batch_index,
  };
}

function mapTaskBatch(batch: TaskBatchDto): GenerationTaskBatch {
  return {
    id: batch.id,
    userId: batch.user_id,
    type: batch.type,
    status: batch.status,
    model: batch.model,
    modelName: batch.model_name,
    negativePrompt: batch.negative_prompt,
    params: batch.params,
    total: batch.total,
    queued: batch.queued,
    processing: batch.processing,
    succeeded: batch.succeeded,
    failed: batch.failed,
    creditsUsed: batch.credits_used,
    tasks: batch.tasks?.map(mapTask),
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
  };
}

async function streamGenerationTask(taskId: string, handlers: GenerationTaskStreamHandlers, signal: AbortSignal, onConnected: () => void): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/v1/generation-tasks/${encodeURIComponent(taskId)}`, {
    headers: generationTaskStreamHeaders(),
    signal,
  });
  if (!response.ok) {
    await throwStreamResponseError(response);
  }
  if (!response.body) {
    throw new ApiClientError('SSE_STREAM_ERROR', 'SSE response body is empty', 'unknown');
  }
  onConnected();
  await readGenerationTaskStream(response.body, signal, handlers.onTask);
}


async function streamGenerationTaskBatch(batchId: string, handlers: GenerationTaskBatchStreamHandlers, signal: AbortSignal, onConnected: () => void): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/v1/generation-task-batches/${encodeURIComponent(batchId)}`, {
    headers: generationTaskStreamHeaders(),
    signal,
  });
  if (!response.ok) {
    await throwStreamResponseError(response);
  }
  if (!response.body) {
    throw new ApiClientError('SSE_STREAM_ERROR', 'SSE response body is empty', 'unknown');
  }
  onConnected();
  await readGenerationTaskBatchStream(response.body, signal, handlers.onBatch);
}

function generationTaskStreamHeaders(): Headers {
  const headers = new Headers();
  headers.set('Accept', 'text/event-stream');
  const token = getStoredToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function throwStreamResponseError(response: Response): Promise<never> {
  if (response.status === 401) notifyAuthExpired();
  const payload = await response.text();
  throw new ApiClientError('SSE_STREAM_ERROR', payload || response.statusText, 'unknown');
}

async function readGenerationTaskStream(body: ReadableStream<Uint8Array>, signal: AbortSignal, onTask: (task: GenerationTask) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = consumeSSEBuffer(buffer, onTask);
    buffer = parsed.remaining;
  }
  if (buffer.trim()) consumeSSEBuffer(`${buffer}\n\n`, onTask);
}


async function readGenerationTaskBatchStream(body: ReadableStream<Uint8Array>, signal: AbortSignal, onBatch: (batch: GenerationTaskBatch) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = consumeSSEBuffer(buffer, onBatch, mapBatchFromSSEPayload);
    buffer = parsed.remaining;
  }
  if (buffer.trim()) consumeSSEBuffer(`${buffer}\n\n`, onBatch, mapBatchFromSSEPayload);
}

function consumeSSEBuffer<T>(buffer: string, onItem: (item: T) => void, mapPayload: (payload: unknown) => T = mapTaskFromSSEPayload as (payload: unknown) => T): { remaining: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const events = normalized.split('\n\n');
  const remaining = events.pop() ?? '';
  for (const event of events) {
    const data = sseEventData(event);
    if (!data || data === '[DONE]') continue;
    onItem(mapPayload(JSON.parse(data) as unknown));
  }
  return { remaining };
}

function sseEventData(event: string): string {
  return event
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n')
    .trim();
}

function mapTaskFromSSEPayload(payload: unknown): GenerationTask {
  return mapTask(taskDtoFromSSEPayload(payload));
}

function mapBatchFromSSEPayload(payload: unknown): GenerationTaskBatch {
  if (isTaskBatchDto(payload)) return mapTaskBatch(payload);
  if (isRecord(payload) && isTaskBatchDto(payload.data)) return mapTaskBatch(payload.data);
  if (isRecord(payload) && isTaskBatchDto(payload.batch)) return mapTaskBatch(payload.batch);
  throw new Error('SSE batch event did not include a generation task batch payload');
}

function taskDtoFromSSEPayload(payload: unknown): TaskDto {
  if (isTaskDto(payload)) return payload;
  if (isRecord(payload) && isTaskDto(payload.data)) return payload.data;
  if (isRecord(payload) && isTaskDto(payload.task)) return payload.task;
  throw new Error('SSE task event did not include a generation task payload');
}


function isTaskBatchDto(value: unknown): value is TaskBatchDto {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.user_id === 'string'
    && typeof value.type === 'string'
    && typeof value.status === 'string'
    && typeof value.model === 'string'
    && isRecord(value.params)
    && typeof value.total === 'number'
    && typeof value.queued === 'number'
    && typeof value.processing === 'number'
    && typeof value.succeeded === 'number'
    && typeof value.failed === 'number'
    && typeof value.credits_used === 'number'
    && typeof value.created_at === 'string'
    && typeof value.updated_at === 'string';
}

function isTaskDto(value: unknown): value is TaskDto {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.user_id === 'string'
    && typeof value.type === 'string'
    && typeof value.status === 'string'
    && typeof value.model === 'string'
    && typeof value.prompt === 'string'
    && isRecord(value.params)
    && typeof value.credits_used === 'number'
    && Array.isArray(value.result_urls)
    && typeof value.created_at === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function queryString(input: ListGenerationTasksInput): string {
  const params = new URLSearchParams();
  if (input.type) params.set('type', input.type);
  if (input.status) params.set('status', input.status);
  if (input.limit) params.set('limit', String(input.limit));
  if (input.page) params.set('page', String(input.page));
  const value = params.toString();
  return value ? `?${value}` : '';
}
