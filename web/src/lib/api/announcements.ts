import { apiFormRequest, apiRequest } from './client';

export type Announcement = Readonly<{
  id: string;
  title: string;
  body: string;
  is_enabled: boolean;
  starts_at?: string;
  ends_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}>;

export type AnnouncementInput = Readonly<{
  id: string;
  title: string;
  body: string;
  is_enabled: boolean;
  starts_at?: string;
  ends_at?: string;
  republish?: boolean;
  expected_updated_at?: string;
}>;

export async function listAnnouncements(): Promise<readonly Announcement[]> {
  return apiRequest<readonly Announcement[]>('/v1/announcements');
}

export async function listAdminAnnouncements(): Promise<readonly Announcement[]> {
  return apiRequest<readonly Announcement[]>('/v1/admin/announcements');
}

export async function upsertAdminAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  return apiRequest<Announcement>(`/v1/admin/announcements/${encodeURIComponent(input.id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteAdminAnnouncement(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/v1/admin/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function uploadAnnouncementImage(file: File): Promise<Readonly<{ url: string; content_type: string; size: number }>> {
  const body = new FormData();
  body.set('file', file);
  return apiFormRequest('/v1/admin/announcement-images', body);
}
