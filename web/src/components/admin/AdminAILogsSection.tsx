'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { deleteAILogs, listAILogs, type AILog } from '@/lib/api/admin';

export function AdminAILogsSection() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadLogs = async (p: number) => {
    setLoading(true);
    try {
      const res = await listAILogs(p, pageSize);
      setLogs(res.items);
      setTotal(res.total);
      setPage(p);
    } catch (err) {
      showToast({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to load AI logs' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (before: string) => {
    if (!confirm('确定要删除此日期之前的所有日志吗？')) return;
    try {
      await deleteAILogs(before);
      showToast({ kind: 'success', message: '日志已删除' });
      loadLogs(1);
    } catch (err) {
      showToast({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to delete logs' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">AI 调用日志</h2>
        <button
          onClick={() => loadLogs(1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          加载日志
        </button>
      </div>

      {loading && <div>Loading...</div>}

      {logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-4 py-2">时间</th>
                <th className="border px-4 py-2">用户</th>
                <th className="border px-4 py-2">模型</th>
                <th className="border px-4 py-2">Tokens</th>
                <th className="border px-4 py-2">费用</th>
                <th className="border px-4 py-2">状态</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="border px-4 py-2">{log.createdAt}</td>
                  <td className="border px-4 py-2">{log.userDisplayName}</td>
                  <td className="border px-4 py-2">{log.model}</td>
                  <td className="border px-4 py-2">{log.totalTokens}</td>
                  <td className="border px-4 py-2">{log.cost}</td>
                  <td className="border px-4 py-2">{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>Total: {total}</div>
        <div className="flex gap-2">
          <button
            onClick={() => loadLogs(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => loadLogs(page + 1)}
            disabled={page * pageSize >= total}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
