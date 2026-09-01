---
title: 待测试
description: 当前版本已实现但仍需人工验证的变更项
---

# 待测试

- 验证 PR workflow 能并行完成 Go 测试、前端构建和 Docker 构建。
- 验证合并 `main` 后能构建并推送 `ghcr.io/waninter/canvas` 的多架构镜像。
- 在不影响现有 `canvas.waninter.com` 的前提下，配置 GitHub `production` environment 并验证指定 digest 部署、健康检查和失败回滚。
