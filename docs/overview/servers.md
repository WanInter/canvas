---
title: 服务器与项目部署
description: 记录 WanInter 各项目的代码位置、部署服务器和运行方式
---

# 服务器与项目部署

本文档记录 WanInter 各项目的本地代码位置、部署服务器和运行概况，供开发和 AI 协作者快速定位。

## 本地代码

所有项目代码位于本机 `~/MyCodes/WanInterProject/` 下，主要包括：

- `canvas`：本项目（无限画布新版）
- `infinite-canvas`：无限画布旧版
- `AICreativeStudio`：AI Creative Studio
- `new-api`：New API（AI 网关，ghcr.io/waninter/new-api 自行维护的分支）
- `face-preprocess`、`glbgpt-openai-proxy` 等配套服务

## 服务器

### tencent-175

- SSH 别名：`ssh tencent-175`，地址 `175.178.155.3`，用户 `root`
- 系统：Debian，主机名 `VM-0-2-debian`
- 公网入口：系统 Caddy（80/443）

运行的项目：

| 项目 | 部署目录 | 镜像 | 监听 | 说明 |
| --- | --- | --- | --- | --- |
| 无限画布（新版，本项目） | `/srv/canvas` | `ghcr.io/waninter/canvas` | `127.0.0.1:3001` | 容器 `canvas` + 独立 `postgresql-canvas`，通过 GitHub `production` environment 流水线部署，详见 [发布流水线](deployment-pipeline.md) |
| 无限画布（旧版） | `/srv/infinite-canvas` | `ghcr.io/waninter/infinite-canvas` | `127.0.0.1:3000` | 容器 `infinite-canvas`，当前承载生产域名 `canvas.waninter.com` |
| AI Creative Studio | `/srv/AI-Creative-Studio` | `ghcr.io/waninter/ai-creative-studio(-frontend)` | 前端 `13000`、API `18080` | Compose 项目 `aicreativestudio`（frontend、api、remote-worker、postgres、redis），域名 `www.waninter.com` / `api-creative-studio.waninter.com`；详细运维手册见该仓库 `SERVER_INFO.md` |
| face-preprocess | `/srv/face-preprocess` | `ghcr.io/waninter/face-preprocess` | `127.0.0.1:8000` | AI Creative Studio 的 `/face-process` 依赖服务 |

其他：`canvas-auth-hook`、`canvas-sftpgo` 等辅助容器；备份目录 `/srv/backups`。

### waninter-gz

- SSH 别名：`ssh waninter-gz`，地址 `159.75.98.129`，用户 `root`

运行的项目：

| 项目 | 部署目录 | 镜像 | 监听 | 说明 |
| --- | --- | --- | --- | --- |
| New API | `/srv/new-api` | `ghcr.io/waninter/new-api`（当前 `v1.1.29`） | `127.0.0.1:23001` | 容器 `new-api-gz`，配套 `postgres`（`127.0.0.1:15432`）和 `redis`；本地代码在 `~/MyCodes/WanInterProject/new-api` |
| glbgpt-openai-proxy | `/srv/glbgpt-proxy` | `yzg963/glbgpt-openai-proxy` | `127.0.0.1:23002` | 容器 `glbgpt-proxy-proxy-1` |

## 注意事项

- 各服务器的 `.env` 只保存在服务器上，不提交到 Git，查看时注意脱敏。
- 部署新版本应使用不可变镜像 digest，不要使用 `latest`。
