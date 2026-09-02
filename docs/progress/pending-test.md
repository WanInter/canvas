---
title: 待测试
description: 当前版本已实现但仍需人工验证的变更项
---

# 待测试

- 已验证 PR workflow 能并行完成 Go 测试、前端构建和 Docker 构建。
- 已验证合并 `main` 后能构建并推送 `ghcr.io/waninter/canvas` 的多架构镜像。
- 已在不影响现有 `canvas.waninter.com` 的前提下，通过 GitHub `production` environment 在 `/srv/canvas` 并行部署指定 digest 并通过健康检查；待人工功能测试和失败回滚演练。
- 已验证生产 Compose 使用独立 `postgresql-canvas` 后的初始化、数据持久化和容器重启恢复。
- 已验证腾讯 COS virtual-host 寻址和云服务器内网解析场景下的上传、完整读取、Range、删除和容量统计。
- Waninter 模型渠道新增专用协议，视频创建应使用 `/v1/videos` JSON 参数并继续通过现有任务接口轮询；火山方舟路径仅由 `/api/plan/v3` 渠道触发，待使用 `Dream-seedance-2-0` 和参考图验证。
- 视频任务将未知上游状态归一为处理中并由服务端继续轮询；旧 `unknown` 任务会恢复查询，超过 30 分钟的正常处理中任务标记超时失败，待使用已完成的 Waninter 任务验证自动回填。
