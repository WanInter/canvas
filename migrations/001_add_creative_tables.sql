-- ============================================================================
-- AICreativeStudio 数据迁移脚本
-- 功能：添加模型管理、积分系统、任务系统、支付系统等表
-- ============================================================================

-- 1. 扩展 users 表
-- 添加 AICreativeStudio 需要的字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS inviter_id TEXT REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_rewards_disabled_at TIMESTAMPTZ;

-- 修改现有字段类型（从 TEXT 到 TIMESTAMPTZ）
-- 注意：需要先备份数据
-- ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::TIMESTAMPTZ;
-- ALTER TABLE users ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::TIMESTAMPTZ;
-- ALTER TABLE users ALTER COLUMN last_login_at TYPE TIMESTAMPTZ USING last_login_at::TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_deleted_created ON users(deleted_at, created_at DESC, id DESC);

-- 2. 用户积分余额表（替代 users.credits 字段）
CREATE TABLE IF NOT EXISTS user_credit_balances (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    available INTEGER NOT NULL DEFAULT 0,
    plan TEXT NOT NULL DEFAULT 'Free',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 积分交易记录表（扩展现有的 credit_logs）
-- 保留现有的 credit_logs 表，添加新字段
ALTER TABLE credit_logs ADD COLUMN IF NOT EXISTS transaction_type TEXT;
ALTER TABLE credit_logs ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE credit_logs ADD COLUMN IF NOT EXISTS task_id TEXT;
ALTER TABLE credit_logs ADD COLUMN IF NOT EXISTS balance_after INTEGER;

CREATE INDEX IF NOT EXISTS idx_credit_logs_user_created ON credit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_logs_order_id ON credit_logs(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_logs_task_id ON credit_logs(task_id) WHERE task_id IS NOT NULL;

-- 4. 模型目录配置表 ⭐ 核心表
CREATE TABLE IF NOT EXISTS model_catalog_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN ('image', 'video')),
    description TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]',
    capabilities JSONB NOT NULL DEFAULT '[]',
    params_schema JSONB NOT NULL DEFAULT '[]',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    upstream_model_id TEXT NOT NULL DEFAULT '',
    pricing_config JSONB NOT NULL DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 100,
    input_limits JSONB NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_model_catalog_display_order ON model_catalog_configs(display_order, provider, name);

-- 5. 生成服务商配置表
CREATE TABLE IF NOT EXISTS generation_provider_settings (
    provider TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    mode TEXT NOT NULL DEFAULT 'real',
    base_url TEXT NOT NULL DEFAULT '',
    api_key_ciphertext TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    adapter TEXT NOT NULL DEFAULT '',
    builtin_key TEXT UNIQUE,
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- 6. 生成任务批次表
CREATE TABLE IF NOT EXISTS generation_task_batches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_count INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'canceled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generation_task_batches_user_created ON generation_task_batches(user_id, created_at DESC);

-- 7. 生成任务表（扩展现有的任务表）
CREATE TABLE IF NOT EXISTS generation_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('image', 'video')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'canceled')),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    params_json JSONB NOT NULL DEFAULT '{}',
    credits_used INTEGER NOT NULL DEFAULT 0,
    result_urls JSONB NOT NULL DEFAULT '[]',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    provider_model TEXT NOT NULL DEFAULT '',
    model_name TEXT NOT NULL DEFAULT '',
    batch_id TEXT REFERENCES generation_task_batches(id) ON DELETE SET NULL,
    batch_index INTEGER,
    worker_id TEXT,
    locked_until TIMESTAMPTZ,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_worker_heartbeat_at TIMESTAMPTZ,
    error_category TEXT NOT NULL DEFAULT '',
    error_code TEXT NOT NULL DEFAULT '',
    retryable BOOLEAN NOT NULL DEFAULT false,
    provider_trace_id TEXT NOT NULL DEFAULT '',
    lease_token TEXT,
    next_attempt_at TIMESTAMPTZ,
    processing_started_at TIMESTAMPTZ,
    status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_progress_at TIMESTAMPTZ,
    status_sync_checked_at TIMESTAMPTZ,
    idempotency_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_created ON generation_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_batch_index ON generation_tasks(batch_id, batch_index);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_idempotency ON generation_tasks(user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';
CREATE INDEX IF NOT EXISTS idx_generation_tasks_remote_ready ON generation_tasks(status, next_attempt_at, locked_until, created_at)
    WHERE status IN ('queued', 'processing');

-- 8. 支付订单表
CREATE TABLE IF NOT EXISTS payment_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
    payment_method TEXT NOT NULL,
    provider_order_id TEXT,
    provider_trace_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    extra JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created ON payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_order_id ON payment_orders(provider_order_id);

-- 9. 支付渠道配置表
CREATE TABLE IF NOT EXISTS payment_channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. 支付回调事件表
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    order_id TEXT,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_order_id ON payment_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_processed ON payment_webhook_events(processed, created_at);

-- 11. 用户会员信息表
CREATE TABLE IF NOT EXISTS user_memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    expire_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'canceled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_expire_at ON user_memberships(expire_at);

-- 12. 会员积分分期表
CREATE TABLE IF NOT EXISTS membership_credit_installments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    membership_id TEXT,
    credits INTEGER NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_credit_installments_user_id ON membership_credit_installments(user_id, issued_at DESC);

-- 13. API 密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disabled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- 14. API 使用记录表
CREATE TABLE IF NOT EXISTS api_key_usage_events (
    id TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    credits_used INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_events_user_created ON api_key_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_events_api_key_created ON api_key_usage_events(api_key_id, created_at DESC);

-- 15. 资源文件夹表
CREATE TABLE IF NOT EXISTS asset_folders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES asset_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_folders_user_id ON asset_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_folders_parent_id ON asset_folders(parent_id);

-- 16. 扩展现有的 assets 表
ALTER TABLE assets ADD COLUMN IF NOT EXISTS folder_id TEXT REFERENCES asset_folders(id) ON DELETE SET NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS task_id TEXT REFERENCES generation_tasks(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS mime_type TEXT;

CREATE INDEX IF NOT EXISTS idx_assets_folder_id ON assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_task_id ON assets(task_id);

-- 17. 管理员审计日志表
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created ON admin_audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);

-- 18. 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active, created_at DESC);

-- 19. 兑换码批次表
CREATE TABLE IF NOT EXISTS redeem_code_batches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    total_count INTEGER NOT NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    expire_at TIMESTAMPTZ,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. 兑换码表
CREATE TABLE IF NOT EXISTS redeem_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    batch_id TEXT REFERENCES redeem_code_batches(id) ON DELETE CASCADE,
    credits INTEGER NOT NULL,
    used_by TEXT REFERENCES users(id),
    used_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_batch_id ON redeem_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_used_by ON redeem_codes(used_by);

-- 21. 兑换码使用记录表
CREATE TABLE IF NOT EXISTS redeem_code_usages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    code_id TEXT NOT NULL,
    credits INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redeem_code_usages_user_id ON redeem_code_usages(user_id, created_at DESC);

-- 22. 用户推荐关系表
CREATE TABLE IF NOT EXISTS user_referrals (
    id TEXT PRIMARY KEY,
    inviter_user_id TEXT NOT NULL REFERENCES users(id),
    invitee_user_id TEXT NOT NULL REFERENCES users(id),
    reward_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_referrals_inviter ON user_referrals(inviter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_referrals_invitee ON user_referrals(invitee_user_id);

-- 23. 用户充值促销表
CREATE TABLE IF NOT EXISTS user_recharge_promotions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    promotion_id TEXT NOT NULL,
    used_at TIMESTAMPTZ NOT NULL,
    credits INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_recharge_promotions_user_id ON user_recharge_promotions(user_id, created_at DESC);

-- 24. 每日权益表
CREATE TABLE IF NOT EXISTS user_daily_entitlements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    credits INTEGER NOT NULL,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_entitlements_user_date ON user_daily_entitlements(user_id, date DESC);

-- 25. 模型路由规则表
CREATE TABLE IF NOT EXISTS generation_model_routing_rules (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_model_routing_rules_model ON generation_model_routing_rules(model, priority DESC);

-- 26. 存储提供商配置表
CREATE TABLE IF NOT EXISTS storage_provider_settings (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. 邮箱验证码表
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expire_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email ON email_verification_codes(email, created_at DESC);

-- 28. 邮箱验证令牌表
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expire_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- 29. 密码重置令牌表
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expire_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- 30. 计费产品表
CREATE TABLE IF NOT EXISTS billing_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 31. 购买模式标签表
CREATE TABLE IF NOT EXISTS purchase_mode_labels (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 32. Worker 管理表
CREATE TABLE IF NOT EXISTS generation_workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'busy')),
    last_heartbeat_at TIMESTAMPTZ NOT NULL,
    capabilities JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_workers_status ON generation_workers(status, last_heartbeat_at DESC);

-- 创建触发器：防止修改 invite_code
CREATE OR REPLACE FUNCTION prevent_invite_code_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.invite_code IS NOT NULL AND NEW.invite_code IS DISTINCT FROM OLD.invite_code THEN
        RAISE EXCEPTION 'invite_code cannot be changed once set';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_invite_code_change ON users;
CREATE TRIGGER trg_prevent_invite_code_change
    BEFORE UPDATE OF invite_code ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_invite_code_change();

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用到所有需要的表
DROP TRIGGER IF EXISTS update_model_catalog_configs_updated_at ON model_catalog_configs;
CREATE TRIGGER update_model_catalog_configs_updated_at
    BEFORE UPDATE ON model_catalog_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generation_provider_settings_updated_at ON generation_provider_settings;
CREATE TRIGGER update_generation_provider_settings_updated_at
    BEFORE UPDATE ON generation_provider_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
