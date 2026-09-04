import type { Asset, AssetFolder, AssetType, GenerationTaskType } from '@/lib/types';
import { apiFormRequest, apiRequest } from './client';

type AssetDto = Readonly<{
  id: string;
  task_id?: string;
  type: AssetType;
  title: string;
  url: string;
  model: string;
  is_favorite: boolean;
  folder_id?: string;
  source_type?: 'generated' | 'upload';
  created_at: string;
  expires_at: string;
}>;

type AssetPageDto = Readonly<{
  items: readonly AssetDto[];
  next_cursor?: string;
}>;

export type ListAssetsInput = Readonly<{
  type?: GenerationTaskType | 'favorites' | 'uploads';
  limit?: number;
  cursor?: string;
  query?: string;
  model?: string;
  folderId?: string;
}>;

export type AssetPage = Readonly<{
  items: readonly Asset[];
  nextCursor?: string;
}>;

export async function listAssetsPage(input: ListAssetsInput = {}): Promise<AssetPage> {
  const payload = await apiRequest<readonly AssetDto[] | AssetPageDto>(`/v1/assets${queryString(input)}`);
  if (Array.isArray(payload)) return { items: payload.map(mapAsset) };
  const page = payload as AssetPageDto;
  return { items: page.items.map(mapAsset), nextCursor: page.next_cursor };
}

export async function toggleAssetFavorite(assetId: string): Promise<Asset> {
  return mapAsset(await apiRequest<AssetDto>(`/v1/assets/${assetId}/favorite`, { method: 'POST' }));
}

export async function uploadAsset(file: File, type: AssetType): Promise<Asset> {
  const body = new FormData();
  body.set('file', file);
  body.set('type', type);
  return mapAsset(await apiFormRequest<AssetDto>('/v1/assets/upload', body));
}

export async function listAssetFolders(): Promise<readonly AssetFolder[]> {
  const payload = await apiRequest<{ folders: readonly AssetFolder[] }>('/v1/asset-folders');
  return payload.folders;
}

export async function moveAssetToFolder(assetId: string, folderId: string): Promise<Asset> {
  return mapAsset(await apiRequest<AssetDto>(`/v1/assets/${encodeURIComponent(assetId)}/move`, { method: 'POST', body: JSON.stringify({ folder_id: folderId }) }));
}

function queryString(input: ListAssetsInput): string {
  const params = new URLSearchParams();
  if (input.type === 'image' || input.type === 'video') params.set('type', input.type);
  if (input.type === 'uploads') params.set('source', 'upload');
  if (input.type === 'favorites') params.set('favorite', 'true');
  if (input.limit) params.set('limit', String(input.limit));
  if (input.cursor) params.set('cursor', input.cursor);
  if (input.query?.trim()) params.set('query', input.query.trim());
  if (input.model?.trim() && input.model !== 'all') params.set('model', input.model.trim());
  if (input.folderId?.trim()) params.set('folder_id', input.folderId.trim());
  const value = params.toString();
  return value ? `?${value}` : '';
}

export async function deleteAsset(assetId: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/assets/${assetId}`, { method: 'DELETE' });
}

function mapAsset(asset: AssetDto): Asset {
  return {
    id: asset.id,
    taskId: asset.task_id,
    type: asset.type,
    title: asset.title,
    url: asset.url,
    model: asset.model,
    isFavorite: asset.is_favorite,
    folderId: asset.folder_id,
    sourceType: asset.source_type ?? 'generated',
    createdAt: asset.created_at,
    expiresAt: asset.expires_at,
  };
}
