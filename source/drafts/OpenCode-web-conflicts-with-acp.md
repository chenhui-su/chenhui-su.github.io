---
title: OpenCode Web 与 ACP 冲突问题排查与分析
date: 2026-05-06 15:10:41
categories:
  - 技术
tags:
  - OpenCode
  - ACP
  - 故障排查
---

# OpenCode Web 与 ACP 冲突问题排查与分析

该问题长期存在，截至 1.14.37 版本仍未修复。存在相关的 Issue 和 PR，但均未被维护者处理，超时关闭。已整理部分信息留言到该 Issue。截至草稿撰写日期，本人 GitHub 被标记，相关留言对其他人不可见。

- Issue：[#14500](https://github.com/anomalyco/opencode/issues/14500)
- PR：[#14498](https://github.com/anomalyco/opencode/pull/14498)
- Comment：[#14500#issuecomment-4384782149](https://github.com/anomalyco/opencode/issues/14500#issuecomment-4384782149)

## 问题复现

| | |
|---|---|
| **OpenCode 版本** | 1.14.37 |
| **Web 默认端口** | `127.0.0.1:4096` |
| **编辑器 ACP 配置** | `--port 4097`（与 Web 端口不同） |

**复现步骤：**
1. 先启动 opencode web（默认端口 4096）
2. 配置 ACP 编辑器（Zed 或 Obsidian Agent Client）使用 `opencode acp --port 4097`
3. 启动编辑器，ACP 进程自动拉起
4. 观察编辑器行为

**实际表现：**
- Zed 显示：`Internal error: server shut down unexpectedly`
- Obsidian Agent Client 陷入无限连接循环

ACP 进程本身保持存活（编辑器成功拉起进程，未立即退出）。

**临时绕过：** 关闭 opencode web 后，ACP 立即恢复正常工作。

## 排查过程

### 初始表象：端口冲突

运行 `opencode web`（默认 4096 端口）后执行 `opencode acp` 失败，终端报错 `Failed to start server on port 4096`。初步判断为两个服务争夺同一个默认本地端口。

### 排查协议层：Stdio 文档与实际行为的割裂

官方文档指出 ACP 作为子进程拉起，通过 stdio 上的 JSON-RPC 与编辑器通信，理论上完全不需要占用网络端口。但实际测试发现：

1. `opencode acp` 拒绝 `--stdio` 参数输入
2. ACP 进程启动时仍强制执行网络端口绑定

OpenCode 的 ACP 实现并非纯粹的进程间隔离。它在尝试建立 stdio 通信的同时，强制监听本地端口。当默认端口被占时，ACP 进程直接崩溃，管道随之断裂。

### 核心验证：Obsidian 插件双环境控制变量测试

**测试 A（仅启动 ACP，避开默认端口）：** 未启动 Web 时，向 Obsidian 插件传入 `--port 4097`。插件成功拉起 ACP 并正常连接工作。排除了插件寻址缺陷、硬编码缺陷或网络路由问题。

**测试 B（Web 与 ACP 尝试共存）：** 已启动 Web（占用 4096）时，再次通过插件以 `--port 4097` 拉起 ACP。插件连接失败。即使避开所有网络端口冲突，两个服务依然无法共存。

### 推测：底层单例锁机制

OpenCode 底层架构（状态缓存、SQLite 数据库等）可能设计为严格的单实例独占模式。端口冲突只是表象。Web 进程运行时锁死了底层核心读写资源。此时拉起的 ACP 进程无论端口如何配置，都会因无法获取底层数据库的排他锁而发生内部死锁或静默崩溃。

## 结论

当前版本的 OpenCode 在架构上禁止 Web 界面与外部编辑器 ACP 插件并发运行。当前没有技术绕过手段，只能执行分时策略：使用 Web 时关闭编辑器插件，使用编辑器插件时关闭 Web。
