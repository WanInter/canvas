---
title: 发布流水线
description: 当前项目的自动检查、镜像发布和生产部署流程
---

# 发布流水线

当前采用单环境生产发布，不设置长期 staging。现有线上 Canvas 保持在 `tencent-175` 的 `/srv/infinite-canvas`，生产域名为 `canvas.waninter.com`。新版先在同一服务器的 `/srv/canvas` 并行运行，通过独立端口验证后再切换域名。

## 流程

### Pull Request

GitHub Actions 并行执行：

- Go 测试
- Next.js 前端构建
- Docker 镜像构建验证

PR 检查通过后才合并到 `main`。

### 合并 main

镜像 workflow 自动构建 amd64 和 arm64，并推送到：

```text
ghcr.io/waninter/canvas
```

每次构建会生成 commit 标签，例如：

```text
ghcr.io/waninter/canvas:sha-<commit-sha>
```

生产部署使用镜像的 `sha256` digest，不使用 `latest` 作为发布依据。

### 生产部署

在 GitHub Actions 手动运行 `Deploy production`，输入已验证的镜像 digest。该 workflow 默认开启 `dry_run`，只检查 SSH、部署目录、Compose 配置及 Compose 实际解析出的镜像，不会拉取或重启服务。确认无误后关闭 `dry_run` 再执行真实部署。workflow 使用 GitHub `production` environment，配置审批规则后，审批通过才会 SSH 到生产服务器。

部署过程会：

1. 校验镜像必须来自 `ghcr.io/waninter/canvas` 且使用 digest。
2. 校验服务器 Compose 实际使用的镜像与指定 digest 一致。
3. 拉取指定镜像。
4. 使用 `IMAGE_REF` 重建 Compose 服务。
5. 轮询 `/api/health`。
6. 成功后记录 `.last-image-ref`。
7. 健康检查失败时恢复上一个镜像引用。

当前图片和音频任务仍由应用进程执行，正式部署前应避免在任务高峰期发布。视频任务已持久化，服务重启后会继续轮询。

## 服务器准备

生产服务器的 `/srv/canvas` 使用 `deploy/docker-compose.production.yml` 对应的 Compose 配置和正式 `.env`。`.env` 只保存在服务器，不提交到 Git，也不通过 workflow 输出。验证阶段使用独立容器名、`127.0.0.1:3001` 和独立数据目录，不修改旧服务使用的 `/srv/infinite-canvas`、`127.0.0.1:3000` 或 `canvas.waninter.com`。

Compose 使用：

```yaml
image: ${IMAGE_REF:-ghcr.io/waninter/canvas:latest}
```

验证阶段通过 SSH 隧道访问：

```bash
ssh -L 3001:127.0.0.1:3001 tencent-175
```

随后在本机打开 `http://127.0.0.1:3001`。功能确认前不修改 Caddy 或生产域名。

如 GHCR 镜像为私有仓库，应提前在服务器执行一次 `docker login ghcr.io`，或为部署 workflow 增加专用的只读镜像凭证。

生产 Compose 同时运行独立的 `postgresql-canvas`，仅通过 `canvas-network` 向应用提供 PostgreSQL，不发布宿主机端口。数据库数据保存在 `postgresql-canvas-data` Docker volume，与 `AI-Creative-Studio` 的 PostgreSQL、网络、账号和数据边界完全分离；Canvas 数据库需要配置自己的备份与恢复流程。

## GitHub 配置

在 `production` environment 中配置审批规则，并添加以下 secrets：

| Secret | 用途 |
| --- | --- |
| `PRODUCTION_HOST` | 生产服务器地址或 SSH 别名对应的地址 |
| `PRODUCTION_USER` | SSH 用户 |
| `PRODUCTION_SSH_KEY` | 专用部署私钥 |
| `PRODUCTION_SSH_KEY_PASSPHRASE` | 私钥口令；未设置口令时留空 |
| `PRODUCTION_KNOWN_HOSTS` | 预先确认的 SSH 主机指纹 |

不要把 PostgreSQL、COS、AI 渠道或 JWT 密钥放进 GitHub Actions；这些配置继续保存在生产服务器 `.env` 或独立密钥管理服务中。

## 回滚

回滚时重新运行 `Deploy production`，输入上一次成功记录的 digest。部署 workflow 也会在新版本健康检查失败时自动恢复 `.last-image-ref`。
