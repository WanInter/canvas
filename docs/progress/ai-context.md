---
title: AI 上下文记忆
description: 记录当前开发上下文，供所有 AI 协作者快速了解现状与后续方向
---

# AI 上下文记忆

本文档记录当前开发上下文，帮助任何 AI（或新加入的协作者）快速知道：现在在做什么、接下来要做什么。每次重要进展后应同步更新本文档。

## 当前状态

- 项目路径：`/Users/jon/MyCodes/WanInterProject/canvas`
- Git 分支：`main`，与 `origin/main` 同步，工作区干净。
- 当前版本处于已发布后的稳定期，近期工作集中在 CI/部署流水线和生产环境验证。
- 各项目代码位置、部署服务器（`tencent-175`、`waninter-gz`）和运行概况见 [服务器与项目部署](../overview/servers.md)。

## 正在进行 / 待验证

- 本周核心开发重点：Canvas 接入 New API 统一登录与免密钥，方案见 [Canvas 接入 New API 统一登录与免密钥方案](../plans/new-api-sso-integration.md)。
- 详见 [待测试](pending-test.md)：合并后的单条 `Release` workflow、版本入口改为「更新文档」、生产回滚演练、Waninter 视频协议验证等事项仍需人工确认。
- 详见 [TODO](todo.md)：生产域名切换前需为 `postgresql-canvas` 配置定时备份、保留策略并完成恢复演练。

## 工作约定速记

- 一切行为约束以根目录 `AGENTS.md` 为准：改文件前先征得用户同意；写完代码不主动构建或检查语法，由用户自行验证。
- 待办完成流程：`todo.md` → `pending-test.md` → 用户确认后 → `docs/overview/features.md`。
- 发版本流程见 `AGENTS.md`「发版本流程」一节：整理 CHANGELOG → 提升 `VERSION` → 提交 → 打 tag。

## 更新要求

- 任何 AI 完成一轮重要任务后，应检查本文档是否仍然准确，过时内容及时更新。
