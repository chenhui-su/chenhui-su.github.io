

## 前言

该问题长期存在，在 1.14.37 版本仍未修复，存在相关的 Issue 和对应的 PR，但均未被维护者处理，超时关闭，已整理部分信息留言到该 Issue。截止草稿撰写日期26-05-06，本人Github被标记，故在相关下的留言对其他人不可见，同时申诉旧渠道失效，新渠道仍在计划阶段。
- https://github.com/anomalyco/opencode/issues/14500
- https://github.com/anomalyco/opencode/pull/14498
- https://github.com/anomalyco/opencode/issues/14500#issuecomment-4384782149

```markdown
**OpenCode version:** 1.14.37  
**Web default port:** `127.0.0.1:4096`  
**Editor ACP configuration:** e.g., `--port 4097` (different from web port)

**Steps to reproduce:**
1. Start opencode web on the default port `4096` first.
2. Configure an ACP‑based editor (Zed or Obsidian Agent Client) to use `opencode acp` with a different port, e.g., `--port 4097`.
3. Launch the editor – it automatically starts the ACP process with the configured port.
4. Observe the editor's behavior.

**Actual behavior:**
- **Zed** shows: `Internal error: server shut down unexpectedly`
- **Obsidian Agent Client** gets stuck in an endless connection loop

The ACP process itself stays alive (the editor launched it successfully without immediate exit).

**Workaround:**  
Once I close the opencode web, ACP starts working normally immediately.

**Expected behavior:**  
The editor should work correctly even when the web is running, since ACP is using a port different from the web.

**Additional note – port conflict:**  
If the editor is configured to use the same port as the web (`4096`), the ACP process exits immediately on startup (expected conflict handling). The issue above only occurs when ports are **different** and **web is started before the editor**.

**Untested scenario:**  
I have not tested whether starting the web *after* the editor (which already started ACP) causes any issue. The problem described occurs only when the web is already running before the editor launches ACP.
```

## OpenCode Web 与 ACP 冲突问题排查与认识演进总结

**一、 初始表象：端口冲突**
*   **现象：** 运行 `opencode web`（默认占用 4096 端口）后，执行 `opencode acp` 失败，终端报错 `Failed to start server on port 4096`。
*   **初步认知：** 两个服务争夺同一个默认本地网络端口导致冲突。

**二、 排查协议层：Stdio 文档与实际行为的割裂**
*   **官方声明：** 官方文档指出 `acp` 作为子进程拉起，通过 `stdio` 上的 JSON-RPC 与编辑器进行通信。理论上 `stdio` 走内存管道，完全不需要占用网络端口。
*   **实际测试：** 
    1.  `opencode acp` 拒绝 `--stdio` 参数输入。
    2.  `acp` 进程在启动时，仍强制执行网络端口绑定行为。
*   **认知推翻：** OpenCode 的 `acp` 实现并非纯粹的进程间隔离。它在尝试建立 `stdio` 通信的同时，画蛇添足地强制监听本地端口。当默认端口被占时，直接导致整个 `acp` 进程崩溃，管道随之断裂。

**三、 核心转折：Obsidian 插件双环境控制变量测试**
*   **测试 A（仅启动 ACP，避开默认端口）：** 在**未启动** `web` 时，向 Obsidian 插件传入启动参数 `--port 4097`。插件成功拉起 `acp` 并正常连接工作。
    *   *结论：* 排除了插件寻址缺陷、硬编码缺陷或网络路由（mDNS）问题。插件完全有能力对接自定义端口的 ACP 服务。
*   **测试 B（Web 与 ACP 尝试共存）：** 在**已启动** `web`（占用 4096）时，再次通过插件以 `--port 4097` 拉起 `acp`。插件连接失败。
    *   *结论：* 即使完美避开了所有网络端口冲突，两个服务依然无法共存。

**四、 下一步猜测：底层单例锁机制 (Process Mutex / DB Lock)**
猜测由 Gemini 根据以上
*   **根本原因：** OpenCode 底层架构（状态缓存、SQLite 数据库等）设计为严格的**单实例独占模式**。
*   **作用机理：** 端口冲突只是表象。真正的死结在于，当 `web` 进程运行时，它全局锁死了底层的核心读写资源。此时拉起的 `acp` 进程（无论端口是多少），都会因为无法获取底层数据库的排他锁而发生内部死锁或静默崩溃。
*   **结论：** 当前版本的 OpenCode 在架构上**绝对禁止** Web 界面与外部编辑器 ACP 插件并发运行。技术上不存在绕过手段，必须执行严格的“分时单开”策略（使用 Web 时关插件，使用插件时关 Web）。