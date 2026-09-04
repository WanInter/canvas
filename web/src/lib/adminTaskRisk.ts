import type { AdminTask } from './api/admin';

export function isPotentiallyStuckTask(task: AdminTask): boolean {
  if (task.status !== 'processing') return false;

  const lastHeartbeat = task.worker.last_task_heartbeat_at;
  if (!lastHeartbeat) return true;

  const now = Date.now();
  const lastHeartbeatTime = new Date(lastHeartbeat).getTime();
  const elapsedMs = now - lastHeartbeatTime;

  // Consider stuck if no heartbeat for 5 minutes
  return elapsedMs > 5 * 60 * 1000;
}
