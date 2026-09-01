---
title: 待测试
description: 当前版本已实现但仍需人工验证的变更项
---

# 待测试

- 已验证 PR workflow 能并行完成 Go 测试、前端构建和 Docker 构建。
- 已验证合并 `main` 后能构建并推送 `ghcr.io/waninter/canvas` 的多架构镜像。
- 已在不影响现有 `canvas.waninter.com` 的前提下，通过 GitHub `production` environment 在 `/srv/canvas` 并行部署指定 digest 并通过健康检查；待人工功能测试和失败回滚演练。
- 已验证生产 Compose 使用独立 `postgresql-canvas` 后的初始化、数据持久化和容器重启恢复。
