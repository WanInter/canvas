import { apiGet } from "@/services/api/request";

export type WanInterQuota = {
    bound: boolean;
    quota: number;
    usedQuota: number;
    displayName: string;
};

export async function fetchWanInterQuota(token?: string) {
    return apiGet<WanInterQuota>("/api/auth/waninter/quota", undefined, token);
}
