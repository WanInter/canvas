---
title: 发布流水线
description: 当前项目的自动检查、镜像发布和生产部署流程
---

# 发布流水线

当前采用单环境生产发布，不设置长期 staging。现有线上 Canvas 保持在 `tencent-175` 的 `/srv/infinite-canvas`，生产域名为 `canvas.waninter.com`。

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

在 GitHub Actions 手动运行 `Deploy production`，输入已验证的镜像 digest。该 workflow 默认开启 `dry_run`，只检查 SSH、部署目录和 Compose 配置，不会拉取或重启服务。确认无误后关闭 `dry_run` 再执行真实部署。workflow 使用 GitHub `production` environment，配置审批规则后，审批通过才会 SSH 到生产服务器。

部署过程会：

1. 校验镜像必须来自 `ghcr.io/waninter/canvas` 且使用 digest。
2. 拉取指定镜像。
3. 使用 `IMAGE_REF` 重建 Compose 服务。
4. 轮询 `/api/health`。
5. 成功后记录 `.last-image-ref`。
6. 健康检查失败时恢复上一个镜像引用。

当前图片和音频任务仍由应用进程执行，正式部署前应避免在任务高峰期发布。视频任务已持久化，服务重启后会继续轮询。

## 服务器准备

生产服务器的 Compose 目录需要包含更新后的 `docker-compose.yml` 和正式 `.env`。`.env` 只保存在服务器，不提交到 Git，也不通过 workflow 输出。

Compose 使用：

```yaml
image: ${IMAGE_REF:-ghcr.io/waninter/canvas:latest}
```

如 GHCR 镜像为私有仓库，应提前在服务器执行一次 `docker login ghcr.io`，或为部署 workflow 增加专用的只读镜像凭证。

## GitHub 配置

在 `production` environment 中配置审批规则，并添加以下 secrets：

| Secret | 用途 |
| --- | --- |
| `PRODUCTION_HOST` | 生产服务器地址或 SSH 别名对应的地址 |
| `PRODUCTION_USER` | SSH 用户 |
| `PRODUCTION_SSH_KEY` | 专用部署私钥 |
| `PRODUCTION_KNOWN_HOSTS` | 预先确认的 SSH 主机指纹 |

不要把 PostgreSQL、COS、AI 渠道或 JWT 密钥放进 GitHub Actions；这些配置继续保存在生产服务器 `.env` 或独立密钥管理服务中。

## 回滚

回滚时重新运行 `Deploy production`，输入上一次成功记录的 digest。部署 workflow 也会在新版本健康检查失败时自动恢复 `.last-image-ref`。
