import { apiGet, apiPost } from "@/services/api/request";

export const AUTH_TOKEN_KEY = "infinite-canvas-auth-token-v1";

export type UserRole = "guest" | "user" | "admin";

export type AuthUser = {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    role: UserRole;
    credits: number;
    waninterBound?: boolean;
    createdAt: string;
    updatedAt: string;
};

export type AuthSession = {
    token: string;
    user: AuthUser;
};

export type AuthPayload = {
    username: string;
    password: string;
};

export async function login(payload: AuthPayload) {
    return apiPost<AuthSession>("/api/auth/login", payload);
}

export async function register(payload: AuthPayload) {
    return apiPost<AuthSession>("/api/auth/register", payload);
}

export async function fetchCurrentUser(token?: string) {
    return apiGet<AuthUser>("/api/auth/me", undefined, token);
}

export type WanInterKey = {
    id: number;
    name: string;
    group?: string;
    remainQuota?: number;
    unlimitedQuota?: boolean;
};

export type WanInterKeysPayload = {
    keys: WanInterKey[];
    selectedKeyId: number;
};

export async function fetchWanInterKeys(token?: string) {
    return apiGet<WanInterKeysPayload>("/api/auth/waninter/keys", undefined, token);
}

export async function selectWanInterKey(keyId: number, token?: string) {
    return apiPost<WanInterKeysPayload>("/api/auth/waninter/select-key", { keyId }, token);
}

// 拉取 WanInter 云端渠道当前可用模型（canvas 后端代理，服务端注入选中 key，无需明文）。
export async function fetchWanInterModels(token?: string) {
    return apiGet<string[]>("/api/v1/models", undefined, token);
}
