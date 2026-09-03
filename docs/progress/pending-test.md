---
title: 待测试
description: 当前版本已实现但仍需人工验证的变更项
---

# 待测试

- 合并 `main` 后 `Docker image` workflow 会发布镜像并自动部署到 `/srv/canvas`，健康检查失败时自动回滚；待合并后验证首个自动部署。
- 新增 `Rollback production` workflow：不填参数回滚到上一个镜像，填 `sha-<commit>` 回滚到指定 commit 镜像；待人工演练一次默认回滚和指定 commit 回滚。
- 服务器部署逻辑抽到 `deploy/deploy.sh`，自动部署和手动回滚共用；待确认 workflow 通过 stdin 执行脚本无误。
- 首页轮播移除 metaso 跳转链接，轮播图片不再可点击跳转；待确认页面无其他跳转行为异常。
- 移除右上角 GitHub 图标与链接，并删除 `github-link.tsx` 组件；待确认各页面右上角布局正常。
- 已验证 PR workflow 能并行完成 Go 测试、前端构建和 Docker 构建。
- 已验证合并 `main` 后能构建并推送 `ghcr.io/waninter/canvas` 的多架构镜像。
- 已在不影响现有 `canvas.waninter.com` 的前提下，通过 GitHub `production` environment 在 `/srv/canvas` 并行部署指定 digest 并通过健康检查；待人工功能测试和失败回滚演练。
- 已验证生产 Compose 使用独立 `postgresql-canvas` 后的初始化、数据持久化和容器重启恢复。
- 已验证腾讯 COS virtual-host 寻址和云服务器内网解析场景下的上传、完整读取、Range、删除和容量统计。
- Waninter 模型渠道新增专用协议，视频创建应使用 `/v1/videos` JSON 参数并继续通过现有任务接口轮询；火山方舟路径仅由 `/api/plan/v3` 渠道触发，待使用 `Dream-seedance-2-0` 和参考图验证。
- 视频任务将未知上游状态归一为处理中并由服务端继续轮询；旧 `unknown` 任务会恢复查询，超过 30 分钟的正常处理中任务标记超时失败，待使用已完成的 Waninter 任务验证自动回填。
