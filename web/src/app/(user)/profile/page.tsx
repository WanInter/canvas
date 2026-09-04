"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/use-user-store";

interface UserProfile {
    user: {
        id: string;
        username: string;
        email: string;
        displayName: string;
        avatarUrl: string;
        role: string;
        affCode: string;
        createdAt: string;
    };
    credits: {
        available: number;
        plan: string;
    };
    membership: {
        plan: string;
        status: string;
        expireAt: string;
    } | null;
    taskStats: {
        total: number;
        succeeded: number;
        failed: number;
        processing: number;
    };
    referral: {
        count: number;
    };
}

export default function ProfilePage() {
    const router = useRouter();
    const { token, user, isReady } = useUserStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isReady) return;
        if (!user || !token) {
            router.replace("/login");
            return;
        }

        fetch("/api/user/profile", {
            headers: { Authorization: token },
        })
            .then((res) => res.json())
            .then((data) => {
                setProfile(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [isReady, user, token, router]);

    if (!isReady || loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-400" />
            </div>
        );
    }

    if (!profile) {
        return <div className="flex h-full items-center justify-center text-slate-400">Failed to load profile</div>;
    }

    return (
        <div className="h-full overflow-auto bg-[#0B0E14]">
            <div className="mx-auto max-w-6xl p-6">
                {/* Header */}
                <div className="mb-8 flex items-center gap-6 rounded-xl border border-slate-800 bg-[#111827] p-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 text-2xl font-bold text-slate-900">
                        {profile.user.displayName?.[0] || profile.user.username[0]}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-slate-50">{profile.user.displayName || profile.user.username}</h1>
                        <p className="mt-1 text-sm text-slate-400">{profile.user.email}</p>
                        <div className="mt-2 flex gap-2">
                            <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">{profile.user.role}</span>
                            <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">ID: {profile.user.id}</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                        <div className="text-sm text-slate-400">Credits</div>
                        <div className="mt-1 text-2xl font-bold text-cyan-400">{profile.credits.available.toLocaleString()}</div>
                        <div className="mt-1 text-xs text-slate-500">{profile.credits.plan} Plan</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                        <div className="text-sm text-slate-400">Total Tasks</div>
                        <div className="mt-1 text-2xl font-bold text-slate-50">{profile.taskStats.total}</div>
                        <div className="mt-1 text-xs text-green-400">✓ {profile.taskStats.succeeded} succeeded</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                        <div className="text-sm text-slate-400">Processing</div>
                        <div className="mt-1 text-2xl font-bold text-orange-400">{profile.taskStats.processing}</div>
                        <div className="mt-1 text-xs text-red-400">✗ {profile.taskStats.failed} failed</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
                        <div className="text-sm text-slate-400">Referrals</div>
                        <div className="mt-1 text-2xl font-bold text-slate-50">{profile.referral.count}</div>
                        <div className="mt-1 text-xs text-slate-500">Code: {profile.user.affCode}</div>
                    </div>
                </div>

                {/* Membership */}
                {profile.membership && (
                    <div className="mb-6 rounded-lg border border-slate-800 bg-[#111827] p-6">
                        <h2 className="mb-4 text-lg font-semibold text-slate-50">Membership</h2>
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 px-4 py-2 font-bold text-slate-900">
                                {profile.membership.plan}
                            </div>
                            <div className="text-sm text-slate-400">
                                Expires: {new Date(profile.membership.expireAt).toLocaleDateString()}
                            </div>
                            <div className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${
                                profile.membership.status === "active" ? "bg-green-400/10 text-green-400" : "bg-slate-800 text-slate-400"
                            }`}>
                                {profile.membership.status}
                            </div>
                        </div>
                    </div>
                )}

                {/* Account Info */}
                <div className="rounded-lg border border-slate-800 bg-[#111827] p-6">
                    <h2 className="mb-4 text-lg font-semibold text-slate-50">Account Information</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">User ID</span>
                            <span className="font-mono text-slate-300">{profile.user.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Username</span>
                            <span className="text-slate-300">{profile.user.username}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Email</span>
                            <span className="text-slate-300">{profile.user.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Referral Code</span>
                            <span className="font-mono text-cyan-400">{profile.user.affCode}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Member Since</span>
                            <span className="text-slate-300">{new Date(profile.user.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
