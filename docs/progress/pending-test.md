---
title: 待测试
description: 当前版本已实现但仍需人工验证的变更项
---

# 待测试

- WanInter 账号免密钥云端渠道（方案 B，待与 new-api `waninter-2026090714+` 联调）：
  - 用 WanInter 账号登录后，配置弹窗默认选中「云端渠道」，无需填密钥；云端渠道面板显示「当前可用 N 个模型」且各默认模型下拉可选项来自该账号密钥在 new-api 的 `/v1/models`。
  - WanInter 账号下有多个密钥时，云端渠道面板出现「使用密钥」下拉，默认选中第一个，可切换；切换后模型列表随之刷新。
  - 未登录或用 canvas 本地账号登录时，配置默认展示「本地直连」，但保留「云端渠道」选项；点击「云端渠道」时提示需登录 WanInter 账号并提供「去登录」入口。
  - 生图/生视频等请求经 canvas 后端转发，服务端自动注入当前选中的 WanInter API Key（key 不下发前端），计费走 new-api。
- CI 与镜像流水线合并为单个 `Release` workflow：push `main` 只产生一条运行记录，PR 在同 workflow 中执行测试与构建验证；待下次 push/PR 验证。
- 右上角版本入口改为「更新文档」并对齐导航链接字号与间距；待确认浅色/深色主题下显示效果。
- 已验证合并 `main` 后 `Docker image` workflow 自动构建镜像并通过 `deploy/deploy.sh` 部署到 `/srv/canvas`（digest `sha256:5ca2ea24...`），健康检查通过。
- 已验证部署后首页轮播不再包含 metaso 跳转链接、右上角 GitHub 图标与链接已移除（残留 `metaso.cn/minimax` 为模型渠道 API Key 指引配置，属正常内容）。
- `Rollback production` workflow：不填参数回滚到上一个镜像，填 `sha-<commit>` 回滚到指定 commit 镜像；待人工演练一次默认回滚和指定 commit 回滚。
- 已验证 PR workflow 能并行完成 Go 测试、前端构建和 Docker 构建。
- 已验证合并 `main` 后能构建并推送 `ghcr.io/waninter/canvas` 的多架构镜像。
- 已在不影响现有 `canvas.waninter.com` 的前提下，通过 GitHub `production` environment 在 `/srv/canvas` 并行部署指定 digest 并通过健康检查；待人工功能测试和失败回滚演练。
- 已验证生产 Compose 使用独立 `postgresql-canvas` 后的初始化、数据持久化和容器重启恢复。
- 已验证腾讯 COS virtual-host 寻址和云服务器内网解析场景下的上传、完整读取、Range、删除和容量统计。
- Waninter 模型渠道新增专用协议，视频创建应使用 `/v1/videos` JSON 参数并继续通过现有任务接口轮询；火山方舟路径仅由 `/api/plan/v3` 渠道触发，待使用 `Dream-seedance-2-0` 和参考图验证。
- 视频任务将未知上游状态归一为处理中并由服务端继续轮询；旧 `unknown` 任务会恢复查询，超过 30 分钟的正常处理中任务标记超时失败，待使用已完成的 Waninter 任务验证自动回填。
