---
title: Canvas 接入 New API 统一登录与免密钥方案
description: 让 canvas 与 new-api 共用一套用户系统，登录后无需配置密钥即可使用站内 AI 功能
---

# Canvas 接入 New API 统一登录与免密钥方案

本文档是完整实施方案。核心目标是：canvas 接入 new-api 的用户系统，用户登录后无需手动配置任何密钥即可直接使用站内 AI 功能。

**当前状态：canvas 和 new-api 两侧均已完成开发，等待部署联调。**

## 目标

- 用户用 new-api 账号登录 canvas，无需注册 canvas 账号。
- 登录后 canvas 的 AI 功能（文生图、视频、对话等）开箱即用，不要求填 API Key。
- 计费落到 new-api 的用户额度（quota），canvas 本地积分退役。
- 未登录用户的浏览器本地保存能力不受影响。

## 现状

### canvas

- 用户体系：自建 `users` 表，支持用户名密码、GitHub、LinuxDo OAuth 登录，登录后签发自有 JWT 会话。
- AI 请求链路：前端 → canvas 后端代理（`handler/ai.go`、`handler/video_task.go` 等）→ 管理员配置的渠道（`ModelChannel`），渠道密钥只保存在服务端，前端不可见。
- 计费：本地 `User.Credits`，通过 `service.ConsumeUserCredits` / `RefundUserCredits` 预扣和退费，记录 `ai_logs`。

### new-api

- 用户体系：成熟的 `users` 表，支持用户名密码、邮箱、GitHub、Discord、OIDC、LinuxDo、微信等登录。
- 额度体系：`Quota` / `UsedQuota`，500000 quota = 1 美元。
- 本身是 OpenAI 兼容网关：请求带 `Authorization: Bearer sk-xxx` 时自动鉴权、按用户扣费、记录日志。用户可创建自己的 API 令牌（token）。
- 已有 `/api/user/self`（session 认证）返回当前用户信息；令牌鉴权走 `middleware/auth.go`。
- 充值、订单、支付回调完整，第 3 点的付费可直接复用。

## 核心思路

把 new-api 变成 canvas 的**身份提供方**和**计费渠道**：

1. **登录打通**：在 new-api 增加一个轻量 OAuth2 授权码流程（authorize + token + userinfo），canvas 作为 OAuth 客户端接入，登录后建立 canvas 自有会话。
2. **免密钥**：canvas 为已登录用户自动创建一个 new-api 访问令牌（sk-xxx），并内置一个指向上游 new-api 的默认渠道。用户发起 AI 请求时，canvas 后端用该用户的令牌作为渠道密钥调用 new-api，鉴权和扣费全部由 new-api 完成。
3. **余额展示**：canvas 调用 new-api 的用户信息接口实时展示剩余额度，不再维护本地 Credits。

这样 canvas 几乎不改动 AI 代理链路（仍然是「后端持有密钥调渠道」），只是密钥从「管理员统一配置」变成「按用户自动下发」，计费从本地扣积分变成 new-api 按 token 扣额度。

## 总体架构

```text
┌─────────────────┐      1. OAuth2 授权码流程       ┌─────────────────┐
│   用户浏览器     │ ◄────────────────────────────► │    new-api      │
│                 │                                │  （身份提供方）   │
│  ┌───────────┐  │      2. 建立 canvas 会话        │  /oauth/authorize│
│  │  canvas   │  │ ◄────────────────────────────► │  /oauth/token    │
│  │  前端     │  │                                │  /oauth/userinfo │
│  └─────┬─────┘  │                                └────────┬────────┘
│        │        │                                         │
│        │ 3. AI 请求（带 canvas JWT）                      │ 4. 转发（带用户 access_token）
│        ▼        │                                         ▼
│  ┌───────────┐  │                                ┌─────────────────┐
│  │  canvas   │  │ ─────────────────────────────► │    new-api      │
│  │  后端     │  │      Authorization: Bearer     │  （计费渠道）     │
│  │  代理     │  │      sk-user-access-token      │  自动鉴权/扣费    │
│  └───────────┘  │                                └─────────────────┘
└─────────────────┘
```

## 接口约定

### new-api 提供的 OAuth2 端点

实际实现路径为 `/api/oauth2/*`（避开 new-api 已有的 `/api/oauth/:provider` 通配路由）。

#### `GET /api/oauth2/authorize`

请求参数：

| 参数 | 说明 |
| --- | --- |
| `client_id` | 客户端 ID，本期固定为 `canvas` |
| `redirect_uri` | 回调地址，必须与注册时一致 |
| `response_type` | 固定 `code` |
| `state` | canvas 生成的随机字符串，用于防 CSRF |

行为：
- 用户未登录：302 跳转到 new-api 登录页，登录后回到本地址。
- 用户已登录：显示授权确认页，用户同意后生成授权码。
- 重定向：`{redirect_uri}?code=xxx&state=xxx`

#### `POST /api/oauth2/token`

请求体（`application/x-www-form-urlencoded`）：

| 参数 | 说明 |
| --- | --- |
| `grant_type` | 固定 `authorization_code` |
| `code` | authorize 返回的授权码 |
| `redirect_uri` | 与 authorize 时一致 |
| `client_id` | 客户端 ID |
| `client_secret` | 客户端密钥 |

响应：

```json
{
  "access_token": "sk-xxxxxxxx",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "user": {
    "id": 123,
    "username": "test",
    "display_name": "测试用户",
    "avatar_url": "",
    "quota": 1000000,
    "used_quota": 50000
  }
}
```

#### `GET /api/oauth2/userinfo`

请求头：`Authorization: Bearer sk-xxx`

响应：

```json
{
  "id": 123,
  "username": "test",
  "display_name": "测试用户",
  "avatar_url": "",
  "quota": 1000000,
  "used_quota": 50000
}
```

### canvas 新增的认证端点

#### `GET /api/auth/waninter/authorize`

生成 state，拼接 new-api authorize URL，302 跳转。

#### `GET /api/auth/waninter/callback`

接收 `code` 和 `state`，校验 state 后调用 new-api token 端点，创建/更新 canvas 用户，建立 JWT 会话，重定向到前端指定页面。

#### `GET /api/auth/waninter/quota`

canvas JWT 认证，从用户 Extra 中读取 access_token，调用 new-api userinfo，返回额度信息。

## Canvas 改动明细

以下是 canvas 仓库（`~/MyCodes/WanInterProject/canvas`）需要修改的内容。

### 一、配置与常量

`config/config.go` 新增：

```go
type WanInterOAuthConfig struct {
    BaseURL      string `mapstructure:"base_url"`
    ClientID     string `mapstructure:"client_id"`
    ClientSecret string `mapstructure:"client_secret"`
    RedirectURI  string `mapstructure:"redirect_uri"`
}

// 在 Config 中新增
WanInterOAuth WanInterOAuthConfig `mapstructure:"waninter_oauth"`
```

`.env.example` 新增：

```env
WANINTER_OAUTH_BASE_URL=https://api.waninter.com
WANINTER_OAUTH_CLIENT_ID=canvas
WANINTER_OAUTH_CLIENT_SECRET=your-client-secret
WANINTER_OAUTH_REDIRECT_URI=https://canvas.waninter.com/api/auth/waninter/callback
```

### 二、用户模型扩展

`model/user.go` 的 `User` 结构体 `Extra` 字段扩展：

```go
type userExtra struct {
    LinuxDo any `json:"linuxDo,omitempty"`
    WanInter *WanInterAuth `json:"waninter,omitempty"`
}

type WanInterAuth struct {
    AccessToken string `json:"accessToken"`
    ExpiresAt   int64  `json:"expiresAt"`
    UserID      int    `json:"userId"`
    Username    string `json:"username"`
    DisplayName string `json:"displayName"`
    AvatarURL   string `json:"avatarUrl"`
    Quota       int    `json:"quota"`
    UsedQuota   int    `json:"usedQuota"`
}
```

### 三、OAuth 服务层

`service/auth.go` 新增：

```go
func WanInterAuthorizeURL(r *http.Request, redirect string) (string, error)
func WanInterCallback(r *http.Request, code, state string) (*model.AuthSession, string, error)
func RefreshWanInterUserInfo(userID string) error
func GetWanInterQuota(userID string) (*WanInterQuota, error)
```

实现要点：
- `WanInterAuthorizeURL`：生成 state 存到 cookie，拼接 new-api authorize URL。
- `WanInterCallback`：校验 state，用 code 换 token，调 userinfo 获取用户信息，查找或创建 canvas 用户，保存 WanInterAuth 到 Extra，签发 canvas JWT。
- 创建用户规则：`Username` 用 `waninter_<newapi_id>`，`DisplayName` 取 new-api 的 display_name，`Email` 如果 new-api 返回则带上。

### 四、HTTP 处理器

`handler/auth.go` 新增：

```go
func WanInterAuthorize(w http.ResponseWriter, r *http.Request)
func WanInterCallback(w http.ResponseWriter, r *http.Request)
func WanInterQuota(w http.ResponseWriter, r *http.Request)
```

`router/router.go` 新增路由：

```go
api.GET("/auth/waninter/authorize", gin.WrapF(handler.WanInterAuthorize))
api.GET("/auth/waninter/callback", gin.WrapF(handler.WanInterCallback))
api.GET("/auth/waninter/quota", middleware.AuthRequired(), gin.WrapF(handler.WanInterQuota))
```

### 五、内置 new-api 渠道

`service/settings.go` 新增：

```go
const WanInterChannelID = "waninter-new-api"

func ensureWanInterChannel(settings model.Settings) model.Settings
func isWanInterChannel(channel model.ModelChannel) bool
func injectWanInterToken(channel model.ModelChannel, user model.User) (model.ModelChannel, error)
```

修改 `resolveAdminChannel` 或渠道选择逻辑：
- 如果渠道 ID 是 `waninter-new-api` 且用户已绑定 WanInter 账号，则将 `channel.APIKey` 替换为用户的 access_token。
- 如果用户未绑定，返回错误「请先使用 WanInter 账号登录」。

### 六、计费切换

`handler/ai.go`、`handler/video_task.go`、`service/workflow_agent.go` 中：

- 调用 `service.ConsumeUserCredits` 前判断：如果是 WanInter 渠道，跳过本地扣费，改为在请求完成后从 new-api 日志接口查询实际扣费记录（可选，用于对账）。
- `service.RefundUserCredits` 在 WanInter 渠道下不再调用。

`service/ai_log.go`：
- `Credits` 字段在 WanInter 渠道下记录 new-api 实际扣费（如果容易获取），否则记录 0 并备注「由 new-api 计费」。

### 七、前端改动

`web/src/services/api/` 新增：

```typescript
// auth.ts 或新增 waninter.ts
export function getWanInterAuthorizeURL(redirect?: string): string
export function getWanInterQuota(): Promise<WanInterQuota>
```

登录页：
- 在「LinuxDo 登录」按钮旁增加「WanInter 账号登录」按钮，点击跳转到 `/api/auth/waninter/authorize`。

用户信息区：
- 已绑定 WanInter 账号的用户，展示「剩余额度：xxx」。
- 未绑定的用户，展示「绑定 WanInter 账号」入口。

设置页：
- 隐藏或标记内置 WanInter 渠道为「系统内置」，不允许编辑密钥。

## New API 改动明细

以下是 new-api 仓库（`~/MyCodes/WanInterProject/new-api`）需要修改的内容。这部分由你在 new-api 项目里实施。

### 一、数据库表

新增三张表（PostgreSQL）：

```sql
CREATE TABLE oauth_clients (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(64) UNIQUE NOT NULL,
    client_secret VARCHAR(128) NOT NULL,
    name VARCHAR(64) NOT NULL,
    redirect_uris TEXT NOT NULL, -- JSON array
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE oauth_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    redirect_uri TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at BIGINT NOT NULL
);

CREATE TABLE oauth_access_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
);
```

初始数据：

```sql
INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uris, created_at, updated_at)
VALUES ('canvas', '生成一个强随机密钥', 'Canvas 无限画布', '["https://canvas.waninter.com/api/auth/waninter/callback"]', extract(epoch from now()), extract(epoch from now()));
```

### 二、模型层

`model/oauth.go` 新增：

```go
type OAuthClient struct {
    ID           int    `json:"id"`
    ClientID     string `json:"client_id" gorm:"uniqueIndex"`
    ClientSecret string `json:"-"`
    Name         string `json:"name"`
    RedirectURIs string `json:"redirect_uris" gorm:"type:text"`
    CreatedAt    int64  `json:"created_at" gorm:"autoCreateTime"`
    UpdatedAt    int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

type OAuthCode struct {
    ID          int    `json:"id"`
    Code        string `json:"code" gorm:"uniqueIndex"`
    ClientID    string `json:"client_id"`
    UserID      int    `json:"user_id"`
    RedirectURI string `json:"redirect_uri"`
    ExpiresAt   int64  `json:"expires_at"`
    Used        bool   `json:"used"`
    CreatedAt   int64  `json:"created_at" gorm:"autoCreateTime"`
}

type OAuthAccessToken struct {
    ID        int    `json:"id"`
    Token     string `json:"token" gorm:"uniqueIndex"`
    ClientID  string `json:"client_id"`
    UserID    int    `json:"user_id" gorm:"index"`
    ExpiresAt int64  `json:"expires_at"`
    CreatedAt int64  `json:"created_at" gorm:"autoCreateTime"`
}
```

### 三、控制器

`controller/oauth_provider.go` 新增：

```go
func OAuthAuthorize(c *gin.Context)      // GET /oauth/authorize
func OAuthToken(c *gin.Context)          // POST /oauth/token
func OAuthUserInfo(c *gin.Context)       // GET /oauth/userinfo
```

实现要点：
- `OAuthAuthorize`：使用 `middleware.UserAuth()` 确保用户已登录，生成授权码，302 跳转。
- `OAuthToken`：校验 client_id/client_secret/code/redirect_uri，生成 access_token，返回 JSON。
- `OAuthUserInfo`：解析 Bearer token，查 `oauth_access_tokens` 和 `users`，返回用户信息。

### 四、路由

`router/api-router.go` 新增：

```go
oauthRoute := router.Group("/oauth")
{
    oauthRoute.GET("/authorize", middleware.UserAuth(), controller.OAuthAuthorize)
    oauthRoute.POST("/token", controller.OAuthToken)
    oauthRoute.GET("/userinfo", controller.OAuthUserInfo)
}
```

### 五、中间件

`middleware/auth.go` 新增或复用：

```go
func OAuthTokenAuth() gin.HandlerFunc
```

用于 `userinfo` 端点，解析 `Authorization: Bearer sk-xxx`，校验 `oauth_access_tokens` 表。

### 六、前端授权确认页

new-api 前端新增 `/oauth/authorize` 页面：
- 显示「Canvas 请求访问您的账号」。
- 显示将获取的信息：用户名、头像、额度。
- 「同意」和「拒绝」按钮。
- 同意后提交表单到 `/oauth/authorize`（带 `confirm=true`）。

## 开发顺序

### 第一阶段：Canvas 先行（本周完成）

Canvas 侧已完成开发，包含以下改动：

1. **配置和常量**：`config/config.go` 新增 `WANINTER_OAUTH_BASE_URL`、`WANINTER_OAUTH_CLIENT_ID`、`WANINTER_OAUTH_CLIENT_SECRET`；`.env.example` 已更新。
2. **用户模型**：`model/user.go` 新增 `WanInterAuth` 和 `WanInterQuota` 结构体；`service/auth.go` 的 `userExtra` 扩展支持 `WanInter` 字段。
3. **OAuth 服务层**：`service/auth.go` 新增 `WanInterAuthorizeURL`、`LoginWithWanInter`、`GetWanInterQuota`、`WanInterAccessToken` 及配套私有函数。
4. **HTTP 处理器和路由**：`handler/auth.go` 新增 `WanInterAuthorize`、`WanInterCallback`、`WanInterQuota`；`router/router.go` 注册三个端点。
5. **前端**：`web/src/app/(user)/login/page.tsx` 增加「使用 WanInter 账号登录」按钮；`web/src/services/api/waninter.ts` 新增额度查询 API；`web/src/components/layout/user-status-actions.tsx` 在画布页展示 WanInter 剩余额度。
6. **内置渠道**：`model/setting.go` 新增 `WanInterChannelID`；`service/settings.go` 新增 `IsWanInterChannel`、`ResolveUserChannel`，实现用户级令牌注入。
7. **计费切换**：`handler/ai.go`、`handler/video_task.go`、`service/workflow_agent.go` 在 WanInter 渠道下跳过本地扣费。

**Mock 验证**：在 new-api 未就绪前，可以在本地启动一个 mock 服务，返回固定的 token 和 userinfo，验证 canvas 的完整流程。

### 第二阶段：New API 实施（已完成）

New API 侧已完成开发（`~/MyCodes/WanInterProject/new-api`），包含以下改动：

1. **模型层**：`model/oauth_provider.go` 新增 `OAuthClient`、`OAuthCode`、`OAuthAccessToken` 三张表及 CRUD；授权码 5 分钟有效、一次性，access_token 30 天有效、前缀 `sk-`。
2. **数据库迁移**：`model/main.go` 迁移列表追加三张表，启动时自动创建。
3. **控制器**：`controller/oauth_provider.go` 新增 `OAuthAuthorize`（浏览器 session 认证，未登录跳转登录页）、`OAuthToken`（校验 client_id/client_secret/code/redirect_uri，返回 token 和用户信息）、`OAuthUserInfo`（Bearer token 认证）。
4. **路由**：`router/api-router.go` 注册 `/api/oauth2/authorize`、`/api/oauth2/token`、`/api/oauth2/userinfo`；避开现有 `/api/oauth/:provider` 通配路由，不影响其他功能。
5. **初始数据**：需在数据库手动注册 canvas client：
   ```sql
   INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uris, created_at, updated_at)
   VALUES ('canvas', '生成一个强随机密钥', 'Canvas 无限画布', 'https://canvas.waninter.com/api/auth/waninter/callback', extract(epoch from now()), extract(epoch from now()));
   ```
   多个回调地址用英文逗号分隔。

### 第三阶段：联调上线

1. 部署 new-api 到测试或生产环境，注册 canvas client。
2. canvas `.env` 配置 `WANINTER_OAUTH_BASE_URL`、`WANINTER_OAUTH_CLIENT_ID`、`WANINTER_OAUTH_CLIENT_SECRET`。
3. 全流程测试：登录、授权、AI 请求、扣费、余额展示。
4. 切换到生产环境。

## 验收标准

- 新用户点击「WanInter 账号登录」→ 跳转 new-api 登录/授权 → 回到 canvas 已登录。
- 登录后直接发起 AI 生成，无需任何密钥配置。
- new-api 后台能看到对应用户的调用日志和额度扣减。
- canvas 前端正确展示剩余额度；额度不足时给出明确提示。
- 未登录用户本地保存、旧密码登录用户原有功能不受影响。

## 风险与回滚

- **风险**：new-api 的 OAuth 端点有 bug 导致 canvas 无法登录或扣费异常。
- **回滚**：canvas 保留原有用户名密码/LinuxDo 登录，管理员可临时关闭 WanInter 登录入口；内置渠道可切换回管理员统一密钥模式。

## 后续衔接

- 第 1 点（AICreativeStudio 积分迁移）：在 new-api 侧按约定汇率批量发放 quota，canvas 自动生效。
- 第 3 点（canvas 付费）：canvas 前端做套餐展示，支付跳转到 new-api 现有充值页，到账后额度立即可用。
