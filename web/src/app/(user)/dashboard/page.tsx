import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '管理台 | AI Creative Studio',
  description: '管理 Provider、模型、支付产品、任务和用户。',
};

import { AdminPageView } from '@/components/admin/AdminPage';

export default function DashboardPage() {
  return <AdminPageView />;
}
