'use client';

import { AlertTriangle, Bell, CirclePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { type ClipboardEvent, useEffect, useState } from 'react';
import { AnnouncementBody } from '@/components/announcements/AnnouncementBody';
import {
  ANNOUNCEMENT_DISPLAY_DURATION_MS,
  ANNOUNCEMENT_MAX_BODY_BYTES,
  ANNOUNCEMENT_MAX_IMAGE_BYTES,
  ANNOUNCEMENT_MAX_TITLE_LENGTH,
  beijingDateTimeToISOString,
  beijingDateTimeToTimestamp,
  findEmbeddedDataImages,
  parseAnnouncementBody,
  replaceEmbeddedDataImages,
  toBeijingDateTimeValue,
  utf8ByteLength,
} from '@/lib/announcementUtils';
import { deleteAdminAnnouncement, listAdminAnnouncements, uploadAnnouncementImage, upsertAdminAnnouncement, type Announcement } from '@/lib/api/announcements';
import { FOCUS_RING } from './adminUtils';
import { ConfirmDialog, type ConfirmDialogState, EmptyList, Field, FilterPill, InlineBadge, PrimaryButton, SecondaryButton, SectionHeader, StatusBadge } from './AdminSectionPrimitives';

type AnnouncementStateFilter = 'all' | 'active' | 'draft' | 'scheduled' | 'expired' | 'disabled';

type AnnouncementForm = {
  id: string;
  title: string;
  body: string;
  isEnabled: boolean;
  startsAt: string;
  endsAt: string;
  publishedAt: string;
  updatedAt: string;
  isDraft: boolean;
};

export function AdminAnnouncementsSection() {
  const [forms, setForms] = useState<Record<string, AnnouncementForm>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string>();
  const [uploadingKey, setUploadingKey] = useState<string>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stateFilter, setStateFilter] = useState<AnnouncementStateFilter>(() => initialAnnouncementFilter());
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>();

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const items = await listAdminAnnouncements();
      setForms(Object.fromEntries(items.map((item) => [item.id, announcementForm(item)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载公告失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const allEntries = Object.entries(forms).sort(([, a], [, b]) => b.id.localeCompare(a.id));
  const entries = allEntries.filter(([, form]) => matchesAnnouncementFilter(form, stateFilter));
  const addDraft = () => {
    const id = `ann_${Date.now()}`;
    setForms((current) => ({ [id]: { id, title: '', body: '', isEnabled: true, startsAt: '', endsAt: '', publishedAt: '', updatedAt: '', isDraft: true }, ...current }));
  };
  const patch = (key: string, next: Partial<AnnouncementForm>) => setForms((current) => current[key] ? { ...current, [key]: { ...current[key], ...next } } : current);
  const removeDraft = (key: string) => setForms((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== key)));

  const pasteBodyImages = async (key: string, event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (imageFiles.length === 0) return;
    event.preventDefault();
    setError('');
    const target = event.currentTarget;
    const originalBody = target.value;
    const selectionStart = target.selectionStart;
    const selectionEnd = target.selectionEnd;
    setUploadingKey(key);
    try {
      imageFiles.forEach(validateAnnouncementImage);
      if (imageFiles.length > 5) throw new Error('每次最多粘贴 5 张图片');
      const imageMarkdown = (await Promise.all(imageFiles.map(uploadImageAsMarkdown))).join('\n');
      setForms((current) => {
        const form = current[key];
        if (!form) return current;
        const unchanged = form.body === originalBody;
        const start = unchanged ? selectionStart : form.body.length;
        const end = unchanged ? selectionEnd : form.body.length;
        const before = form.body.slice(0, start);
        const after = form.body.slice(end);
        const prefix = before && !before.endsWith('\n') ? '\n' : '';
        const suffix = after && !after.startsWith('\n') ? '\n' : '';
        return { ...current, [key]: { ...form, body: `${before}${prefix}${imageMarkdown}${suffix}${after}` } };
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '图片粘贴失败，请确认剪贴板中的图片格式正确');
    } finally {
      setUploadingKey(undefined);
    }
  };

  const save = async (key: string, republish = false) => {
    const form = forms[key];
    if (!form) return;
    const validationError = announcementValidationError(form);
    if (validationError) { setError(validationError); return; }
    setSavingKey(`${republish ? 'republish' : 'save'}:${key}`);
    setError('');
    setNotice('');
    try {
      const body = await externalizeEmbeddedImages(form.body.trim());
      if (body !== form.body.trim()) patch(key, { body });
      if (utf8ByteLength(body) > ANNOUNCEMENT_MAX_BODY_BYTES) throw new Error(`公告正文不能超过 ${ANNOUNCEMENT_MAX_BODY_BYTES / 1024}KB`);
      const startsAt = form.startsAt ? beijingDateTimeToISOString(form.startsAt) : undefined;
      const endsAt = form.endsAt ? beijingDateTimeToISOString(form.endsAt) : undefined;
      if (form.startsAt && !startsAt) throw new Error('开始时间格式无效');
      if (form.endsAt && !endsAt) throw new Error('结束时间格式无效');
      const saved = await upsertAdminAnnouncement({
        id: form.id.trim(),
        title: form.title.trim(),
        body,
        is_enabled: form.isEnabled,
        starts_at: startsAt,
        ends_at: endsAt,
        republish,
        expected_updated_at: form.updatedAt || undefined,
      });
      setForms((current) => {
        const next = { ...current };
        delete next[key];
        next[saved.id] = announcementForm(saved);
        return next;
      });
      setNotice(republish ? '公告已重新发布，24 小时展示期已重新开始' : '公告已保存');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存公告失败');
    } finally {
      setSavingKey(undefined);
    }
  };

  const requestRepublish = (key: string) => {
    const form = forms[key];
    if (!form) return;
    setConfirmDialog({
      title: '确认重新发布公告？',
      description: `公告“${form.title || form.id}”会重新进入前台队列，并从现在起开始新的 24 小时展示期。`,
      confirmLabel: '重新发布',
      tone: 'warning',
      onConfirm: () => void save(key, true),
    });
  };

  const deleteItem = async (key: string) => {
    const form = forms[key];
    if (!form) return;
    if (form.isDraft) { removeDraft(key); return; }
    setConfirmDialog({
      title: '确认删除公告？',
      description: `公告“${form.title || form.id}”删除后不可恢复。`,
      confirmLabel: '删除公告',
      tone: 'danger',
      onConfirm: () => void performDeleteItem(key),
    });
  };

  const performDeleteItem = async (key: string) => {
    setSavingKey(`delete:${key}`);
    setError('');
    setNotice('');
    try {
      await deleteAdminAnnouncement(key);
      removeDraft(key);
      setNotice('公告已删除');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除公告失败');
    } finally {
      setSavingKey(undefined);
    }
  };

  const stateCounts = announcementStateCounts(allEntries.map(([, form]) => form));
  const invalidTimeCount = allEntries.filter(([, form]) => hasInvalidAnnouncementTime(form)).length;

  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('tab') !== 'announcements') return;
    const url = new URL(window.location.href);
    if (stateFilter === 'all') url.searchParams.delete('announcement_status'); else url.searchParams.set('announcement_status', stateFilter);
    window.history.replaceState({ ...window.history.state, announcementStatus: stateFilter }, '', url);
  }, [stateFilter]);

  return (
    <section className="admin-config-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader icon={<Bell size={16} />} eyebrow="公告" title="前台弹窗公告" subtitle="公告按本轮发布时间倒序展示 24 小时；定时公告从计划开始时间起计算，用户可选择今日不再提示单条公告。" />
        <SecondaryButton onClick={addDraft} disabled={Boolean(savingKey || uploadingKey)} icon={<CirclePlus size={16} />}>新增公告</SecondaryButton>
      </div>
      <div className="admin-toolbar mt-4 flex flex-wrap gap-2 rounded-surface p-3">
        <FilterPill active={stateFilter === 'all'} onClick={() => setStateFilter('all')} count={allEntries.length}>全部</FilterPill>
        <FilterPill active={stateFilter === 'active'} onClick={() => setStateFilter('active')} count={stateCounts.active}>生效中</FilterPill>
        <FilterPill active={stateFilter === 'draft'} onClick={() => setStateFilter('draft')} count={stateCounts.draft}>草稿</FilterPill>
        <FilterPill active={stateFilter === 'scheduled'} onClick={() => setStateFilter('scheduled')} count={stateCounts.scheduled}>未开始</FilterPill>
        <FilterPill active={stateFilter === 'expired'} onClick={() => setStateFilter('expired')} count={stateCounts.expired}>已过期</FilterPill>
        <FilterPill active={stateFilter === 'disabled'} onClick={() => setStateFilter('disabled')} count={stateCounts.disabled}>已停用</FilterPill>
        {stateFilter !== 'all' ? <button type="button" onClick={() => setStateFilter('all')} className={`min-h-8 rounded-control border border-line bg-surface px-2.5 text-xs font-black text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink ${FOCUS_RING}`}>重置筛选</button> : null}
      </div>
      {invalidTimeCount > 0 ? <div className="mt-3 rounded-surface border border-warning bg-warning-soft px-3 py-2 text-xs font-bold text-warning"><AlertTriangle size={14} className="mr-1 inline" />有 {invalidTimeCount} 条公告结束时间早于或等于开始时间。</div> : null}
      {loading ? <div className="mt-4 flex items-center gap-2 text-sm font-bold text-secondary"><Loader2 size={16} className="animate-spin" />加载中…</div> : null}
      {error ? <div className="mt-4 rounded-surface border border-danger bg-danger-soft px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-surface border border-success bg-success-soft px-4 py-3 text-sm font-bold text-success" aria-live="polite">{notice}</div> : null}
      {!loading && entries.length === 0 ? <div className="mt-4"><EmptyList title="暂无公告" /></div> : null}
      <div className="mt-4 space-y-3">
        {entries.map(([key, form]) => <AnnouncementEditor key={key} itemKey={key} form={form} savingKey={savingKey} uploadingKey={uploadingKey} onPatch={patch} onPaste={pasteBodyImages} onSave={save} onRepublish={requestRepublish} onDelete={deleteItem} />)}
      </div>
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(undefined)} />
    </section>
  );
}

function AnnouncementEditor({ itemKey, form, savingKey, uploadingKey, onPatch, onPaste, onSave, onRepublish, onDelete }: Readonly<{
  itemKey: string;
  form: AnnouncementForm;
  savingKey?: string;
  uploadingKey?: string;
  onPatch: (key: string, next: Partial<AnnouncementForm>) => void;
  onPaste: (key: string, event: ClipboardEvent<HTMLTextAreaElement>) => Promise<void>;
  onSave: (key: string, republish?: boolean) => Promise<void>;
  onRepublish: (key: string) => void;
  onDelete: (key: string) => Promise<void>;
}>) {
  const busy = Boolean(savingKey || uploadingKey);
  const validationError = announcementValidationError(form);
  const embeddedImageCount = findEmbeddedDataImages(form.body).length;
  const bodyTooLarge = utf8ByteLength(form.body.trim()) > ANNOUNCEMENT_MAX_BODY_BYTES && embeddedImageCount === 0;
  return (
    <details className="admin-card rounded-surface p-3.5" open={form.isDraft ? true : undefined}>
      <summary className={`cursor-pointer list-none rounded-control ${FOCUS_RING}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black text-ink">{form.title || '新公告草稿'}</h3><InlineBadge tone="slate">{form.id}</InlineBadge>{form.isDraft ? <InlineBadge tone="amber">草稿</InlineBadge> : null}<AnnouncementStateBadge form={form} /></div>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-secondary">{announcementPreview(form.body) || '填写公告正文后保存'}</p>
          </div>
          <StatusBadge active={form.isEnabled} activeLabel="启用" inactiveLabel="停用" />
        </div>
      </summary>
      <AnnouncementTimeWarning form={form} />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="公告 ID" error={!form.id.trim() ? '公告 ID 不能为空' : undefined} htmlFor={`ann-${itemKey}-id`}><input id={`ann-${itemKey}-id`} name={`ann-${itemKey}-id`} autoComplete="off" spellCheck={false} value={form.id} disabled={!form.isDraft || busy} onChange={(event) => onPatch(itemKey, { id: event.target.value })} maxLength={120} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} /></Field>
        <Field label="标题" error={!form.title.trim() ? '标题不能为空' : form.title.trim().length > ANNOUNCEMENT_MAX_TITLE_LENGTH ? `标题不能超过 ${ANNOUNCEMENT_MAX_TITLE_LENGTH} 个字符` : undefined} htmlFor={`ann-${itemKey}-title`}><input id={`ann-${itemKey}-title`} name={`ann-${itemKey}-title`} autoComplete="off" value={form.title} disabled={busy} maxLength={ANNOUNCEMENT_MAX_TITLE_LENGTH} onChange={(event) => onPatch(itemKey, { title: event.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} /></Field>
        <Field label="开始时间（北京时间，可选）" htmlFor={`ann-${itemKey}-start`}><input id={`ann-${itemKey}-start`} name={`ann-${itemKey}-start`} type="datetime-local" value={form.startsAt} disabled={busy} onChange={(event) => onPatch(itemKey, { startsAt: event.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} /></Field>
        <Field label="结束时间（北京时间，可选）" error={hasInvalidAnnouncementTime(form) ? '结束时间必须晚于开始时间' : undefined} htmlFor={`ann-${itemKey}-end`}><input id={`ann-${itemKey}-end`} name={`ann-${itemKey}-end`} type="datetime-local" value={form.endsAt} disabled={busy} onChange={(event) => onPatch(itemKey, { endsAt: event.target.value })} className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} /></Field>
        <div><Field label="正文（粘贴图片会自动上传）" error={!form.body.trim() ? '正文不能为空' : bodyTooLarge ? `正文不能超过 ${ANNOUNCEMENT_MAX_BODY_BYTES / 1024}KB` : undefined} htmlFor={`ann-${itemKey}-body`}><textarea id={`ann-${itemKey}-body`} name={`ann-${itemKey}-body`} autoComplete="off" value={form.body} disabled={busy} onPaste={(event) => void onPaste(itemKey, event)} onChange={(event) => onPatch(itemKey, { body: event.target.value })} rows={10} placeholder="输入公告文字；粘贴 JPG、PNG 或 WEBP 图片后会自动上传并插入…" className={`aics-control w-full rounded-control px-3 py-2 text-sm ${FOCUS_RING}`} /></Field><p className="mt-1 flex justify-between gap-2 text-xs font-semibold text-muted" aria-live="polite"><span>{uploadingKey === itemKey ? '图片上传中…' : embeddedImageCount > 0 ? `保存时迁移 ${embeddedImageCount} 张旧内嵌图片` : '图片最大 5MB'}</span><span>{formatBytes(utf8ByteLength(form.body))} / 64KB</span></p></div>
        <div><AnnouncementPreviewCard form={form} /></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 rounded-control border border-line bg-subtle px-3 py-2.5 text-sm font-bold text-secondary"><input type="checkbox" name={`ann-${itemKey}-enabled`} checked={form.isEnabled} disabled={busy} onChange={(event) => onPatch(itemKey, { isEnabled: event.target.checked })} className="h-4 w-4 accent-[var(--ui-accent)]" />启用公告</label>
        <div className="flex flex-wrap gap-2"><PrimaryButton onClick={() => void onSave(itemKey)} loading={savingKey === `save:${itemKey}`} disabled={busy || Boolean(validationError)}>保存</PrimaryButton>{!form.isDraft && form.isEnabled ? <SecondaryButton onClick={() => onRepublish(itemKey)} loading={savingKey === `republish:${itemKey}`} disabled={busy || Boolean(validationError)} icon={<RefreshCw size={16} />}>重新发布</SecondaryButton> : null}<SecondaryButton onClick={() => void onDelete(itemKey)} loading={savingKey === `delete:${itemKey}`} disabled={busy} icon={<Trash2 size={16} />}>删除</SecondaryButton></div>
      </div>
    </details>
  );
}

function initialAnnouncementFilter(): AnnouncementStateFilter {
  if (typeof window === 'undefined') return 'all';
  const value = new URLSearchParams(window.location.search).get('announcement_status');
  return ['all', 'active', 'draft', 'scheduled', 'expired', 'disabled'].includes(value ?? '') ? value as AnnouncementStateFilter : 'all';
}

function matchesAnnouncementFilter(form: AnnouncementForm, filter: AnnouncementStateFilter): boolean {
  if (filter === 'all') return true;
  const state = announcementState(form);
  if (filter === 'active') return state === '生效中';
  if (filter === 'draft') return state === '草稿';
  if (filter === 'scheduled') return state === '未开始';
  if (filter === 'expired') return state === '已过期';
  return state === '已停用';
}

function announcementStateCounts(forms: readonly AnnouncementForm[]) {
  return forms.reduce((acc, form) => {
    const state = announcementState(form);
    if (state === '生效中') acc.active += 1;
    else if (state === '草稿') acc.draft += 1;
    else if (state === '未开始') acc.scheduled += 1;
    else if (state === '已过期') acc.expired += 1;
    else if (state === '已停用') acc.disabled += 1;
    return acc;
  }, { active: 0, draft: 0, scheduled: 0, expired: 0, disabled: 0 });
}

function AnnouncementStateBadge({ form }: Readonly<{ form: AnnouncementForm }>) {
  const state = announcementState(form);
  const tone = state === '生效中' ? 'emerald' : state === '草稿' || state === '未开始' ? 'amber' : 'slate';
  return <InlineBadge tone={tone}>{state}</InlineBadge>;
}

function hasInvalidAnnouncementTime(form: AnnouncementForm): boolean {
  if (!form.startsAt || !form.endsAt) return false;
  return beijingDateTimeToTimestamp(form.endsAt) <= beijingDateTimeToTimestamp(form.startsAt);
}

function AnnouncementTimeWarning({ form }: Readonly<{ form: AnnouncementForm }>) {
  if (!hasInvalidAnnouncementTime(form)) return null;
  return <div className="mt-3 rounded-surface border border-warning bg-warning-soft px-3 py-2 text-xs font-bold text-warning"><AlertTriangle size={14} className="mr-1 inline" aria-hidden="true" />结束时间必须晚于开始时间，修正后才能保存。</div>;
}

function AnnouncementPreviewCard({ form }: Readonly<{ form: AnnouncementForm }>) {
  return (
    <div className="border-y border-line bg-subtle py-4">
      <div className="mb-2 text-xs font-black text-secondary">前台预览</div>
      <div className="bg-surface p-4">
        <div className="text-base font-black text-ink">{form.title || '公告标题'}</div>
        <div className="mt-2">{form.body.trim() ? <AnnouncementBody body={form.body} compact /> : <p className="text-sm font-semibold text-secondary">公告正文预览</p>}</div>
        {!form.isDraft && form.publishedAt ? <p className="mt-3 text-xs font-semibold text-muted">本轮发布：{formatBeijingDateTime(form.publishedAt)}；展示至 {formatBeijingDateTime(announcementDisplayEnd(form))}</p> : null}
      </div>
    </div>
  );
}

function announcementState(form: AnnouncementForm): string {
  if (form.isDraft) return '草稿';
  if (!form.isEnabled) return '已停用';
  const now = Date.now();
  const start = form.startsAt ? beijingDateTimeToTimestamp(form.startsAt) : 0;
  const end = form.endsAt ? beijingDateTimeToTimestamp(form.endsAt) : Number.POSITIVE_INFINITY;
  if (Number.isFinite(start) && now < start) return '未开始';
  const publishedAt = form.publishedAt ? new Date(form.publishedAt).getTime() : Number.NaN;
  if (!Number.isFinite(publishedAt)) return '已过期';
  if (publishedAt > now) return '未开始';
  if ((Number.isFinite(end) && now >= end) || now - publishedAt > ANNOUNCEMENT_DISPLAY_DURATION_MS) return '已过期';
  return '生效中';
}

function announcementForm(item: Announcement): AnnouncementForm {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    isEnabled: item.is_enabled,
    startsAt: toBeijingDateTimeValue(item.starts_at),
    endsAt: toBeijingDateTimeValue(item.ends_at),
    publishedAt: item.published_at ?? '',
    updatedAt: item.updated_at,
    isDraft: false,
  };
}

async function uploadImageAsMarkdown(file: File): Promise<string> {
  const image = await uploadAnnouncementImage(file);
  return `![公告图片](${image.url})`;
}

function announcementPreview(body: string): string {
  return parseAnnouncementBody(body).map((part) => part.kind === 'image' ? '[图片]' : part.text).join('').trim();
}

function announcementValidationError(form: AnnouncementForm): string | undefined {
  if (!form.id.trim()) return '公告 ID 不能为空';
  if (!form.title.trim()) return '标题不能为空';
  if (form.title.trim().length > ANNOUNCEMENT_MAX_TITLE_LENGTH) return `标题不能超过 ${ANNOUNCEMENT_MAX_TITLE_LENGTH} 个字符`;
  if (!form.body.trim()) return '正文不能为空';
  if (utf8ByteLength(form.body.trim()) > ANNOUNCEMENT_MAX_BODY_BYTES && findEmbeddedDataImages(form.body).length === 0) return `正文不能超过 ${ANNOUNCEMENT_MAX_BODY_BYTES / 1024}KB`;
  if (hasInvalidAnnouncementTime(form)) return '结束时间必须晚于开始时间';
  return undefined;
}

function validateAnnouncementImage(file: File): void {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('公告图片仅支持 JPG、PNG 或 WEBP');
  if (file.size > ANNOUNCEMENT_MAX_IMAGE_BYTES) throw new Error('单张公告图片不能超过 5MB');
}

async function externalizeEmbeddedImages(body: string): Promise<string> {
  const images = findEmbeddedDataImages(body);
  if (images.length === 0) return body;
  if (images.length > 10) throw new Error('单条公告最多迁移 10 张内嵌图片');
  const urls = await Promise.all(images.map(async (image, index) => {
    const file = dataImageToFile(image.source, index);
    validateAnnouncementImage(file);
    return (await uploadAnnouncementImage(file)).url;
  }));
  return replaceEmbeddedDataImages(body, images, urls);
}

function dataImageToFile(source: string, index: number): File {
  const match = source.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('公告内嵌图片格式无效');
  const contentType = match[1].toLowerCase();
  const binary = window.atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let offset = 0; offset < binary.length; offset += 1) bytes[offset] = binary.charCodeAt(offset);
  const extension = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'bin';
  return new File([bytes], `announcement-${index + 1}.${extension}`, { type: contentType });
}

function announcementDisplayEnd(form: AnnouncementForm): string {
  const publishedAt = new Date(form.publishedAt).getTime();
  if (!Number.isFinite(publishedAt)) return '';
  const durationEnd = publishedAt + ANNOUNCEMENT_DISPLAY_DURATION_MS;
  const configuredEnd = form.endsAt ? beijingDateTimeToTimestamp(form.endsAt) : Number.POSITIVE_INFINITY;
  return new Date(Math.min(durationEnd, Number.isFinite(configuredEnd) ? configuredEnd : durationEnd)).toISOString();
}

function formatBeijingDateTime(value: string): string {
  if (!value) return '未设置';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '无效时间';
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value}B`;
  return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)}KB`;
}
