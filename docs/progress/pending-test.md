---
title: 待测试
description: 当前版本已实现但仍需人工验证的变更项
---

# 待测试

- 验证 PR workflow 能并行完成 Go 测试、前端构建和 Docker 构建。
- 验证合并 `main` 后能构建并推送 `ghcr.io/waninter/canvas` 的多架构镜像。
- 已验证 GitHub `production` environment 的 SSH、主机指纹、部署目录和 Compose dry-run；待在 `/srv/canvas` 并行启动指定 digest，并验证健康检查和失败回滚。
