# AICreativeStudio → Canvas 迁移方案

## 一、架构现状

### 服务器部署情况

#### tencent-175 机器
```
├── canvas (infinite-canvas)
│   ├── 技术栈: Go (Gin) + Next.js 16
│   ├── 数据库: postgresql-canvas (PostgreSQL 16)
│   ├── 端口: 127.0.0.1:3000
│
├── aicreativestudio (AICreativeStudio)
│   ├── 技术栈: Go + Frontend
│   ├── 数据库: aicreativestudio-postgres-1 (PostgreSQL 16)
│   ├── API 端口: 0.0.0.0:18080
│   ├── 前端端口: 0.0.0.0:13000
│   └── Redis: aicreativestudio-redis-1
│
└── 其他服务
    ├── canvas-auth-hook
    ├── canvas-sftpgo
    └── face-preprocess
```

#### waninter-gz 机器
```
├── new-api (API 网关/代理)
│   ├── 端口: 127.0.0.1:23001
│   ├── 数据库: postgres (127.0.0.1:15432)
│
├── glbgpt-proxy
└── redis
```

---

## 二、数据库对比分析

### 2.1 用户系统对比

| 字段 | AICreativeStudio | Canvas | 说明 |
|------|-----------------|---------|------|
| **主键** | `id` (text) | `id` (text) | ✅ 兼容 |
| **邮箱** | `email` (text, unique) | `email` (text) | ⚠️ Canvas 缺少 unique 约束 |
| **密码** | `password_hash` (text) | `password` (text) | ⚠️ 字段名不同 |
| **用户名** | `name` (text) | `username` (text) + `display_name` (text) | ⚠️ 结构不同 |
| **管理员** | `is_admin` (boolean) | `role` (text) | ⚠️ 类型不同 |
| **积分** | 独立表 `user_credit_balances` | `credits` (bigint) | ⚠️ 架构不同 |
| **邀请码** | `invite_code` (text, unique) | `aff_code` (text, unique) | ⚠️ 字段名不同 |
| **OAuth** | 无 | `github_id`, `linux_do_id`, `wechat_id` | ℹ️ Canvas 更全 |
| **创建时间** | `created_at` (timestamptz) | `created_at` (text) | ⚠️ 类型不同 |
| **最后登录** | `last_login_at` (timestamptz) | `last_login_at` (text) | ⚠️ 类型不同 |
| **状态** | `disabled_at`, `deleted_at` (timestamptz) | `status` (text) | ⚠️ 架构不同 |
| **邮箱验证** | `email_verified_at` (timestamptz) | 无 | ❌ Canvas 缺失 |
| **其他** | `stripe_customer_id`, `last_seen_at`, `referral_rewards_disabled_at` | `aff_count`, `inviter_id`, `extra` | ℹ️ 各有特色 |

### 2.2 核心业务表对比

#### AICreativeStudio 独有（需要迁移）

| 表名 | 用途 | 是否迁移 |
|------|------|---------|
| **model_catalog_configs** | 模型目录配置（params_schema） | ✅ **必须** |
| **generation_provider_settings** | 生成服务商配置 | ✅ **必须** |
| **generation_tasks** | 生成任务记录 | ✅ **必须** |
| **generation_task_batches** | 批量任务 | ✅ **必须** |
| **user_credit_balances** | 用户积分余额 | ✅ **必须** |
| **credit_transactions** | 积分交易记录 | ✅ **必须** |
| **payment_orders** | 支付订单 | ✅ **必须** |
| **payment_channels** | 支付渠道配置 | ✅ **必须** |
| **payment_webhook_events** | 支付回调事件 | ✅ **必须** |
| **user_memberships** | 用户会员信息 | ✅ **必须** |
| **membership_credit_installments** | 会员积分分期 | ✅ **必须** |
| **api_keys** | API 密钥 | ✅ **必须** |
| **api_key_usage_events** | API 使用记录 | ✅ **必须** |
| **assets** | 资源文件管理 | ⚠️ Canvas 也有，需要合并 |
| **asset_folders** | 资源文件夹 | ✅ **必须** |
| **admin_audit_logs** | 管理员审计日志 | ✅ **必须** |
| **announcements** | 公告 | ✅ **必须** |
| **redeem_codes** / **redeem_code_batches** / **redeem_code_usages** | 兑换码系统 | ✅ **必须** |
| **user_referrals** | 推荐关系 | ✅ **必须** |
| **user_recharge_promotions** | 充值促销 | ✅ **必须** |
| **user_daily_entitlements** | 每日权益 | ✅ **必须** |
| **generation_model_routing_rules** | 模型路由规则 | ✅ **必须** |
| **generation_workers** | 生成任务 Worker | ✅ **必须** |
| **models** (旧) | 旧模型表 | ⚠️ 可能已废弃 |
| **billing_products** | 计费产品 | ✅ **必须** |
| **storage_provider_settings** | 存储提供商配置 | ✅ **必须** |
| **email_verification_codes** / **email_verification_tokens** | 邮箱验证 | ✅ **必须** |
| **password_reset_tokens** | 密码重置 | ✅ **必须** |
| **purchase_mode_labels** | 购买模式标签 | ✅ **必须** |

#### Canvas 独有（保留）

| 表名 | 用途 | 说明 |
|------|------|------|
| **canvas_projects** | Canvas 画板项目 | ℹ️ Canvas 特有功能 |
| **canvas_image_tasks** | Canvas 图片任务 | ℹ️ Canvas 特有功能 |
| **canvas_audio_tasks** | Canvas 音频任务 | ℹ️ Canvas 特有功能 |
| **video_tasks** | 视频任务 | ℹ️ Canvas 特有功能 |
| **creative_workflows** | 创意工作流 | ℹ️ Canvas 特有功能 |
| **agent_skills** / **agent_skill_files** | Agent 技能 | ℹ️ Canvas 特有功能 |
| **prompts** | 提示词库 | ℹ️ Canvas 特有功能 |
| **storage_objects** | 存储对象 | ℹ️ Canvas 特有功能 |
| **user_configs** | 用户配置 | ℹ️ Canvas 特有功能 |
| **settings** | 系统设置 | ℹ️ Canvas 特有功能 |
| **ai_call_logs** | AI 调用日志 | ℹ️ Canvas 特有功能 |
| **image_generation_logs** | 图片生成日志 | ℹ️ Canvas 特有功能 |
| **video_generation_logs** | 视频生成日志 | ℹ️ Canvas 特有功能 |
| **credit_logs** | 积分日志 | ⚠️ 与 AICreativeStudio 的 credit_transactions 功能重叠 |

---

## 三、迁移策略

### 3.1 迁移原则

1. **数据完整性优先**
   - 用户数据：100% 无损迁移
   - 历史任务：完整保留
   - 积分余额：精确迁移
   - 订单记录：完整保留

2. **业务连续性保障**
   - Creative 先不动，Canvas 实现完成后再切换
   - 提供数据验证工具
   - 支持回滚机制

3. **架构统一**
   - 统一用户系统
   - 统一积分系统
   - 统一任务系统
   - 统一支付系统

### 3.2 迁移阶段

#### 阶段 1: 数据库 Schema 设计（1-2 天）

**目标**: 设计统一的数据库 Schema

**任务**:
1. 分析两边表结构差异
2. 设计统一的 users 表结构
3. 设计统一的积分系统
4. 设计统一的任务系统
5. 编写数据库迁移脚本（migration files）

**产出**:
- Canvas 数据库迁移脚本（Go migrate 格式）
- 字段映射文档
- 数据迁移 SQL 脚本

#### 阶段 2: Canvas 后端功能实现（3-5 天）

**目标**: Canvas 后端实现 AICreativeStudio 的核心功能

**2.1 用户系统扩展**
- ✅ 扩展 users 表字段
- ✅ 实现邮箱验证功能
- ✅ 实现密码重置功能
- ✅ 迁移邀请码系统

**2.2 积分系统重构**
- ✅ 将 credits 字段改为独立表
- ✅ 实现积分交易记录
- ✅ 实现会员系统
- ✅ 实现每日权益

**2.3 模型管理系统**
- ✅ 迁移 model_catalog_configs 表
- ✅ 实现 GET /api/models 接口（返回 params_schema）
- ✅ 实现模型配置管理 API
- ✅ 前端动态渲染参数面板

**2.4 生成服务商管理**
- ✅ 迁移 generation_provider_settings 表
- ✅ 实现服务商配置 API
- ✅ 实现服务商路由规则

**2.5 任务系统扩展**
- ✅ 迁移 generation_tasks 表结构
- ✅ 实现批量任务功能
- ✅ 实现任务队列系统
- ✅ 实现 Worker 管理

**2.6 支付系统**
- ✅ 迁移 payment_orders 表
- ✅ 实现支付宝回调
- ✅ 实现支付渠道管理
- ✅ 实现订单查询 API

**2.7 资源管理**
- ✅ 合并两边的 assets 表
- ✅ 实现资源文件夹功能
- ✅ 统一存储接口

**2.8 管理后台功能**
- ✅ 管理员审计日志
- ✅ 用户管理（禁用/删除）
- ✅ 兑换码管理
- ✅ 公告管理
- ✅ 系统配置管理

**产出**:
- Canvas Go 后端代码
- API 接口文档
- 单元测试

#### 阶段 3: Canvas 前端功能实现（2-3 天）

**目标**: Canvas 前端实现后台管理界面

**3.1 用户管理界面**
- 用户列表（搜索、筛选、分页）
- 用户详情（积分、会员、任务历史）
- 用户操作（禁用、删除、调整积分）

**3.2 模型管理界面**
- 模型列表
- 模型配置编辑（params_schema 可视化编辑器）
- 模型启用/禁用
- 定价配置

**3.3 生成服务商管理界面**
- 服务商列表
- 服务商配置（base_url, api_key）
- 路由规则配置

**3.4 任务管理界面**
- 任务列表（实时状态）
- 任务详情
- 任务统计图表

**3.5 财务管理界面**
- 订单列表
- 积分交易记录
- 充值促销配置
- 财务报表

**3.6 系统管理界面**
- 兑换码生成/管理
- 公告发布
- 审计日志查看
- 系统配置

**产出**:
- Canvas 管理后台页面
- 前端组件库

#### 阶段 4: 数据迁移工具开发（1-2 天）

**目标**: 开发自动化数据迁移工具

**4.1 迁移脚本**
```go
// 数据迁移工具
package main

func migrateUsers() error {
    // 1. 从 AICreativeStudio 读取 users
    // 2. 字段映射和转换
    // 3. 写入 Canvas 数据库
    // 4. 验证数据一致性
}

func migrateCreditBalances() error { }
func migrateTasks() error { }
func migrateOrders() error { }
// ... 其他表
```

**4.2 数据验证工具**
```go
func validateMigration() error {
    // 1. 统计两边的记录数
    // 2. 抽样验证数据准确性
    // 3. 验证外键关系
    // 4. 生成验证报告
}
```

**产出**:
- 数据迁移工具（Go CLI）
- 数据验证报告
- 回滚脚本

#### 阶段 5: 测试与验证（2-3 天）

**5.1 功能测试**
- 用户注册/登录
- 积分充值/消费
- 任务创建/查询
- 支付回调
- 管理后台操作

**5.2 性能测试**
- 接口响应时间
- 并发任务处理
- 数据库查询优化

**5.3 数据一致性测试**
- 用户数据对比
- 积分余额对比
- 任务记录对比
- 订单数据对比

**5.4 灰度测试**
- 选择部分用户在 Canvas 测试
- 收集反馈
- 修复 bug

**产出**:
- 测试报告
- bug 修复记录
- 性能优化建议

#### 阶段 6: 正式迁移与切换（1 天）

**6.1 迁移前准备**
- [ ] 通知用户（提前 3 天）
- [ ] 备份 AICreativeStudio 数据库
- [ ] 备份 Canvas 数据库
- [ ] 准备回滚方案

**6.2 迁移操作（建议夜间执行）**
```bash
# 1. 停止 AICreativeStudio 服务（禁止新写入）
docker stop aicreativestudio-api-1

# 2. 执行数据迁移
./migrate-tool --from=aicreativestudio --to=canvas

# 3. 验证数据
./validate-tool --report=migration-report.json

# 4. 启动 Canvas 服务
docker restart canvas

# 5. 更新 Nginx 配置（切换流量）
# 将 creative.domain.com 指向 Canvas

# 6. 监控
# 监控日志、错误率、响应时间
```

**6.3 迁移后验证**
- [ ] 用户登录正常
- [ ] 积分余额正确
- [ ] 历史任务可查询
- [ ] 新任务创建正常
- [ ] 支付功能正常
- [ ] 管理后台可用

**6.4 回滚方案**
```bash
# 如果出现严重问题
# 1. 恢复 Nginx 配置（流量回到 AICreativeStudio）
# 2. 启动 AICreativeStudio 服务
# 3. 回滚 Canvas 数据库（从备份恢复）
# 4. 排查问题
```

---

## 四、关键技术细节

### 4.1 用户表统一设计

```sql
-- Canvas 新的 users 表设计
CREATE TABLE users (
    -- 基础信息
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- 显示信息
    display_name TEXT,
    avatar_url TEXT,
    
    -- 权限
    role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
    
    -- OAuth
    github_id TEXT,
    linux_do_id TEXT,
    wechat_id TEXT,
    
    -- 邀请系统
    invite_code TEXT UNIQUE,
    inviter_id TEXT REFERENCES users(id),
    referral_count INTEGER NOT NULL DEFAULT 0,
    referral_rewards_disabled_at TIMESTAMPTZ,
    
    -- 状态
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'disabled' | 'deleted'
    email_verified_at TIMESTAMPTZ,
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    -- 其他
    stripe_customer_id TEXT,
    extra JSONB
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_invite_code ON users(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX idx_users_linux_do_id ON users(linux_do_id);
CREATE INDEX idx_users_last_seen_at ON users(last_seen_at DESC);
```

### 4.2 积分系统重构

```sql
-- 独立的积分余额表
CREATE TABLE user_credit_balances (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    available INTEGER NOT NULL DEFAULT 0,
    plan TEXT NOT NULL DEFAULT 'Free',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 积分交易记录
CREATE TABLE credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'recharge' | 'consume' | 'refund' | 'gift' | 'membership'
    reason TEXT NOT NULL,
    task_id TEXT REFERENCES generation_tasks(id),
    order_id TEXT REFERENCES payment_orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.3 数据迁移脚本示例

```go
package main

import (
    "database/sql"
    "fmt"
)

// 用户数据迁移
func migrateUsers(srcDB, dstDB *sql.DB) error {
    // 1. 读取 AICreativeStudio 用户
    rows, err := srcDB.Query(`
        SELECT 
            id, email, name, password_hash, is_admin,
            created_at, last_login_at, invite_code,
            email_verified_at, last_seen_at, disabled_at,
            deleted_at, stripe_customer_id
        FROM users
        WHERE deleted_at IS NULL
    `)
    if err != nil {
        return err
    }
    defer rows.Close()
    
    // 2. 迁移到 Canvas
    stmt, err := dstDB.Prepare(`
        INSERT INTO users (
            id, email, username, display_name, password_hash, role,
            created_at, last_login_at, invite_code, email_verified_at,
            last_seen_at, disabled_at, status, stripe_customer_id
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW()
    `)
    if err != nil {
        return err
    }
    defer stmt.Close()
    
    count := 0
    for rows.Next() {
        var u User
        // ... scan fields
        
        // 字段映射
        role := "user"
        if u.IsAdmin {
            role = "admin"
        }
        
        status := "active"
        if u.DisabledAt.Valid {
            status = "disabled"
        }
        
        _, err = stmt.Exec(
            u.ID, u.Email, u.Name, u.Name, u.PasswordHash, role,
            u.CreatedAt, u.LastLoginAt, u.InviteCode, u.EmailVerifiedAt,
            u.LastSeenAt, u.DisabledAt, status, u.StripeCustomerID,
        )
        if err != nil {
            return fmt.Errorf("migrate user %s failed: %w", u.ID, err)
        }
        
        count++
    }
    
    fmt.Printf("✅ Migrated %d users\n", count)
    return nil
}
```

---

## 五、风险评估与应对

### 5.1 技术风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| **数据迁移失败** | 高 | 中 | 1. 充分测试 2. 准备回滚脚本 3. 分批迁移 |
| **数据丢失** | 高 | 低 | 1. 多重备份 2. 数据验证工具 3. 事务保护 |
| **性能问题** | 中 | 中 | 1. 提前压测 2. 数据库索引优化 3. 缓存策略 |
| **接口不兼容** | 中 | 低 | 1. API 版本兼容 2. 渐进式迁移 |

### 5.2 业务风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| **用户服务中断** | 高 | 低 | 1. 夜间迁移 2. 快速回滚 3. 提前通知 |
| **积分计算错误** | 高 | 低 | 1. 多次验证 2. 审计日志 3. 补偿机制 |
| **支付问题** | 高 | 低 | 1. 保留 Creative 支付回调 2. 双写订单 |

---

## 六、时间规划

| 阶段 | 工作日 | 日历日 | 负责人 |
|------|--------|--------|--------|
| Schema 设计 | 2 天 | 2 天 | 后端 |
| Canvas 后端开发 | 5 天 | 7 天 | 后端 |
| Canvas 前端开发 | 3 天 | 4 天 | 前端 |
| 迁移工具开发 | 2 天 | 2 天 | 后端 |
| 测试与验证 | 3 天 | 4 天 | 全员 |
| 正式迁移 | 1 天 | 1 天 | 全员 |
| **总计** | **16 天** | **20 天** | |

预计完成时间：**3-4 周**

---

## 七、成功标准

### 7.1 数据完整性
- [ ] 用户数量：100% 迁移
- [ ] 积分余额：误差 < 0.01%
- [ ] 历史任务：100% 保留
- [ ] 订单记录：100% 保留
- [ ] 资源文件：100% 可访问

### 7.2 功能完整性
- [ ] 用户注册/登录正常
- [ ] 积分充值/消费正常
- [ ] 任务创建/查询正常
- [ ] 支付回调处理正常
- [ ] 管理后台所有功能可用
- [ ] API 密钥功能正常

### 7.3 性能指标
- [ ] 接口响应时间 < 500ms (P95)
- [ ] 任务处理成功率 > 99%
- [ ] 数据库查询优化（无慢查询）

### 7.4 用户体验
- [ ] 用户无感知迁移（数据、登录状态保持）
- [ ] 所有历史数据可访问
- [ ] 界面功能正常

---

## 八、后续优化建议

### 8.1 架构优化
1. **服务拆分**
   - 任务处理服务独立
   - Worker 服务独立
   - 管理后台 API 独立

2. **缓存层**
   - Redis 缓存用户信息
   - Redis 缓存模型配置
   - 任务状态实时更新

3. **消息队列**
   - 任务队列改用 RabbitMQ/Kafka
   - 支付回调异步处理
   - 积分变动事件驱动

### 8.2 功能增强
1. **模型能力系统**
   - 前端从 `/api/models` 动态获取 `params_schema`
   - 管理后台可视化编辑模型配置
   - 支持模型 A/B 测试

2. **监控与告警**
   - 任务成功率监控
   - 支付异常告警
   - 性能指标仪表板

3. **审计与安全**
   - 完善审计日志
   - 敏感操作二次验证
   - API 访问频率限制

---

## 九、迁移检查清单

### 迁移前（D-3）
- [ ] 备份 AICreativeStudio 数据库
- [ ] 备份 Canvas 数据库
- [ ] 通知用户计划维护时间
- [ ] 准备回滚脚本
- [ ] 检查迁移工具
- [ ] 准备监控工具

### 迁移当天（D-Day）
- [ ] 23:00 停止 AICreativeStudio 写入
- [ ] 23:05 最后一次数据备份
- [ ] 23:10 开始数据迁移
- [ ] 00:00 数据验证
- [ ] 00:30 启动 Canvas 服务
- [ ] 01:00 切换流量
- [ ] 01:30 监控观察
- [ ] 02:00 发布迁移完成公告

### 迁移后（D+1）
- [ ] 监控系统稳定性
- [ ] 收集用户反馈
- [ ] 修复紧急 bug
- [ ] 数据一致性抽查
- [ ] 性能指标分析

### 迁移后（D+7）
- [ ] 下线 AICreativeStudio 服务
- [ ] 归档旧数据库
- [ ] 文档更新
- [ ] 复盘会议

---

## 十、关键联系人

| 角色 | 职责 | 紧急联系 |
|------|------|---------|
| 后端负责人 | 数据迁移、API 开发 | - |
| 前端负责人 | 管理后台开发 | - |
| DBA | 数据库优化、备份 | - |
| 运维 | 服务部署、监控 | - |
| 产品 | 需求确认、用户沟通 | - |

---

## 十一、附录

### A. 数据库连接信息

```bash
# AICreativeStudio 数据库
Host: tencent-175 (docker: aicreativestudio-postgres-1)
Database: aicreativestudio
User: aics
Port: 5432

# Canvas 数据库
Host: tencent-175 (docker: postgresql-canvas)
Database: canvas
User: canvas
Port: 5432
```

### B. 迁移工具使用示例

```bash
# 1. 连接测试
./migrate-tool test-connection

# 2. 预演（不实际写入）
./migrate-tool dry-run --report=dry-run-report.json

# 3. 执行迁移
./migrate-tool migrate --from=aicreativestudio --to=canvas

# 4. 验证数据
./migrate-tool validate --detail

# 5. 生成报告
./migrate-tool report --output=migration-report.html
```

### C. 重要 SQL 查询

```sql
-- 统计用户数
SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;

-- 统计积分总额
SELECT SUM(available) FROM user_credit_balances;

-- 统计任务数
SELECT status, COUNT(*) FROM generation_tasks GROUP BY status;

-- 统计订单总额
SELECT SUM(amount) FROM payment_orders WHERE status = 'succeeded';

-- 查找数据不一致
SELECT 
    u.id,
    u.email,
    COALESCE(cb.available, 0) as canvas_credits,
    COALESCE(ucb.available, 0) as creative_credits
FROM users u
LEFT JOIN user_credit_balances cb ON cb.user_id = u.id
LEFT JOIN (
    SELECT user_id, available 
    FROM aicreativestudio.user_credit_balances
) ucb ON ucb.user_id = u.id
WHERE COALESCE(cb.available, 0) != COALESCE(ucb.available, 0);
```

### D. 相关文档链接

- AICreativeStudio 项目地址: `/Users/jon/MyCodes/WanInterProject/AICreativeStudio`
- Canvas 项目地址: `/Users/jon/MyCodes/WanInterProject/canvas`
- new-api 项目地址: `/Users/jon/MyCodes/WanInterProject/new-api`

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-09-04 | v1.0 | 初始版本 | Claude |

---

**注意事项**：
1. 本方案是基于当前系统分析的初步方案，实施前需要与团队充分讨论
2. 迁移过程中务必保持数据备份
3. 遇到问题及时回滚，用户数据安全第一
4. 建议先在测试环境完整演练一遍