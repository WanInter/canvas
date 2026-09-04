"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/use-user-store";

interface User {
    id: string;
    username: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    credits: number;
    affCount: number;
    createdAt: string;
    lastLoginAt: string;
}

interface TaskStats {
    total: number;
    queued: number;
    processing: number;
    succeeded: number;
    failed: number;
    canceled: number;
}

interface PaymentStats {
    totalOrders: number;
    succeededOrders: number;
    totalAmount: number;
    totalCredits: number;
}

export default function AdminPage() {
    const router = useRouter();
    const { token, user, isReady } = useUserStore();
    const [activeTab, setActiveTab] = useState<"users" | "tasks" | "orders">("users");
    const [users, setUsers] = useState<User[]>([]);
    const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
    const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        if (!isReady) return;
        if (!user || !token || user.role !== "admin") {
            router.replace("/");
            return;
        }

        loadData();
    }, [isReady, user, token, router, activeTab, page]);

    const loadData = async () => {
        if (!token) return;
        setLoading(true);

        try {
            if (activeTab === "users") {
                const res = await fetch(`/api/admin/creative/users?page=${page}&pageSize=${pageSize}`, {
                    headers: { Authorization: token },
                });
                const data = await res.json();
                setUsers(data.users || []);
                setTotal(data.total || 0);
            } else if (activeTab === "tasks") {
                const res = await fetch("/api/admin/creative/tasks/stats", {
                    headers: { Authorization: token },
                });
                const data = await res.json();
                setTaskStats(data);
            } else if (activeTab === "orders") {
                const res = await fetch("/api/admin/creative/orders/stats", {
                    headers: { Authorization: token },
                });
                const data = await res.json();
                setPaymentStats(data);
            }
        } catch (error) {
            console.error("Failed to load admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isReady || loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-400" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto bg-[#0B0E14]">
            <div className="mx-auto max-w-7xl p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-50">Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-400">运营后台管理</p>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex gap-2 border-b border-slate-800">
                    <button
                        onClick={() => { setActiveTab("users"); setPage(1); }}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "users"
                                ? "border-b-2 border-cyan-400 text-cyan-400"
                                : "text-slate-400 hover:text-slate-300"
                        }`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => { setActiveTab("tasks"); setPage(1); }}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "tasks"
                                ? "border-b-2 border-cyan-400 text-cyan-400"
                                : "text-slate-400 hover:text-slate-300"
                        }`}
                    >
                        Tasks
                    </button>
                    <button
                        onClick={() => { setActiveTab("orders"); setPage(1); }}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "orders"
                                ? "border-b-2 border-cyan-400 text-cyan-400"
                                : "text-slate-400 hover:text-slate-300"
                        }`}
                    >
                        Orders
                    </button>
                </div>

                {/* Content */}
                {activeTab === "users" && (
                    <div>
                        <div className="mb-4 rounded-lg border border-slate-800 bg-[#111827] p-4">
                            <div className="text-sm text-slate-400">Total Users</div>
                            <div className="mt-1 text-2xl font-bold text-slate-50">{total.toLocaleString()}</div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-800">
                            <table className="w-full text-sm">
                                <thead className="border-b border-slate-800 bg-[#111827]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-slate-400">User</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-400">Email</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-400">Role</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-400">Status</th>
                                        <th className="px-4 py-3 text-right font-medium text-slate-400">Credits</th>
                                        <th className="px-4 py-3 text-right font-medium text-slate-400">Referrals</th>
                                        <th className="px-4 py-3 text-left font-medium text-slate-400">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-[#0F172A]">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-[#111827]">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-200">{u.displayName || u.username}</div>
                                                <div className="text-xs text-slate-500">{u.id}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">{u.email}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{u.role}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                    u.status === "active" ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                                                }`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-cyan-400">{u.credits.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-slate-300">{u.affCount}</td>
                                            <td className="px-4 py-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-slate-400">
                                Page {page} of {Math.ceil(total / pageSize)}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= Math.ceil(total / pageSize)}
                                    className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "tasks" && taskStats && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                            <div className="text-sm text-slate-400">Total</div>
                            <div className="mt-2 text-3xl font-bold text-slate-50">{taskStats.total}</div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                            <div className="text-sm text-slate-400">Queued</div>
                            <div className="mt-2 text-3xl font-bold text-slate-400">{taskStats.queued}</div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                            <div className="text-sm text-slate-400">Processing</div>
                            <div className="mt-2 text-3xl font-bold text-orange-400">{taskStats.processing}</div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                            <div className="text-sm text-slate-400">Succeeded</div>
                            <div className="mt-2 text-3xl font-bold text-green-400">{taskStats.succeeded}</div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                            <div className="text-sm text-slate-400">Failed</div>
                            <div className="mt-2 text-3xl font-bold text-red-400">{taskStats.failed}</div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                            <div className="text-sm text-slate-400">Canceled</div>
                            <div className="mt-2 text-3xl font-bold text-slate-500">{taskStats.canceled}</div>
                        </div>
                    </div>
                )}

                {activeTab === "orders" && paymentStats && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-6">
                            <div className="text-sm text-slate-400">Total Orders</div>
                            <div className="mt-2 text-3xl font-bold text-slate-50">{paymentStats.totalOrders}</div>
                            <div className="mt-1 text-xs text-green-400">✓ {paymentStats.succeededOrders} succeeded</div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-6">
                            <div className="text-sm text-slate-400">Total Amount</div>
                            <div className="mt-2 text-3xl font-bold text-cyan-400">¥{(paymentStats.totalAmount / 100).toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-6">
                            <div className="text-sm text-slate-400">Total Credits</div>
                            <div className="mt-2 text-3xl font-bold text-orange-400">{paymentStats.totalCredits.toLocaleString()}</div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-6">
                            <div className="text-sm text-slate-400">Success Rate</div>
                            <div className="mt-2 text-3xl font-bold text-green-400">
                                {paymentStats.totalOrders > 0
                                    ? ((paymentStats.succeededOrders / paymentStats.totalOrders) * 100).toFixed(1)
                                    : 0}%
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
