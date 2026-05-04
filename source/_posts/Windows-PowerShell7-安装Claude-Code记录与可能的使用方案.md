---
title: Windows 上 pwsh 安装 Claude Code 的记录及未来可能的使用方案
date: 2026-05-04 10:00:00
categories:
  - 存档
tags:
  - Windows
  - PowerShell
  - WSL
  - Claude
---

> Anthropic 官方提供了多平台的安装方式（参见 [官方文档](https://code.claude.com/docs/en/overview#get-started)）：
> - macOS / Linux / WSL：`curl -fsSL https://claude.ai/install.sh | bash`
> - PowerShell：`irm https://claude.ai/install.ps1 | iex`
> - Windows CMD：`curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd`
> - Windows WinGet：`winget install Anthropic.ClaudeCode`

> 本文源于一次探索性尝试：在 Windows 的 PowerShell 7 环境下，直接执行了本应仅适用于 Mac、Linux 和 WSL 的 `curl -fsSL https://claude.ai/install.sh | bash` 命令，想验证 PowerShell 是否同样能够处理该安装脚本。

> **重要声明：本文第 3 节中提供的"跨系统穿透调用方案"由 AI 生成提供，当前尚未经过实际运行验证，仅作为未来可能的使用方案参考。**

## 一、终端日志全记录

以下是标准 Windows 宿主机下，尝试通过 PowerShell 7 执行官方安装指令并尝试调用的完整终端输入输出日志。该日志暴露了跨系统调用的典型错误链。

```powershell
PS D:\> curl -fsSL https://claude.ai/install.sh | bash
Setting up Claude Code...

✔ Claude Code successfully installed!

  Version: 2.1.126

  Location: ~/.local/bin/claude

  Next: Run claude --help to get started

✅ Installation complete!

PS D:\> Get-Command claude
Get-Command: The term 'claude' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
PS D:\> claude --help
claude: The term 'claude' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
PS D:\> wsl ls ~/.local/bin
ls: cannot access 'C:Userssu196/.local/bin': No such file or directory
PS D:\> wsl
wsl@LAPTOP-02:/mnt/d$ cd ~
wsl@LAPTOP-02:~$ claude

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Accessing workspace:

 /home/wsl

 Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source
 project, or work from your team). If not, take a moment to review what's in this folder first.

 Claude Code'll be able to read, edit, and execute files here.

 Security guide

   1. Yes, I trust this folder
 ❯  2. No, exit

 Enter to confirm · Esc to cancel
wsl@LAPTOP-02:~$ exit
logout
PS D:\> wls claude
wls: The term 'wls' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.

[General Feedback]
  The most similar commands are:
   ➤ ls, cls, sls

PS D:\> wsl claude
/bin/bash: line 1: claude: command not found
```

## 二、核心现象与逻辑剖析

根据上述日志，可以将安装与调用过程中的问题拆解为三个层面的机制冲突。

### 2.1 物理落点隔离与"伪成功"陷阱

日志第一阶段显示安装成功，但在宿主机查询 `Get-Command claude` 失败。

**原因**：PowerShell 7 的管道符 `|` 将原生字节流传递给了 Windows 环境变量中的 `bash.exe`（由 WSL 提供）。安装脚本实际在 Linux 子系统中执行，文件被写入 WSL 的虚拟文件系统（`/home/wsl/.local/bin/claude`）。Windows 物理硬盘中并不存在该执行文件，导致宿主机的系统终端无法识别命令。

### 2.2 符号解析冲突（预处理错位）

执行单行探测指令 `wsl ls ~/.local/bin` 时，返回错误提示 `cannot access 'C:Userssu196/.local/bin'`。

**原因**：跨环境传递指令时，PowerShell 具有更高的解析优先级。PowerShell 抢先将波浪号 `~` 解析为 Windows 的当前用户目录（`C:\Users\su196`），随后将这个 Windows 绝对路径作为字符串传递给 WSL 的 `ls` 命令，导致 Linux 环境无法识别该格式路径。

### 2.3 非交互式 Shell 的环境变量缺失

在交互式环境下（先输入 `wsl` 进入系统，再执行 `claude`）程序运行正常。但退出后尝试执行单行穿透指令 `wsl claude` 却报错 `command not found`。

**原因**：`wsl <command>` 触发的是 Linux 的非交互式 Shell（Non-interactive shell）。在此模式下，系统不会预先加载 `.bashrc` 或 `.profile` 文件。由于 `~/.local/bin` 并非系统级全局 `$PATH`，非交互模式下的 WSL 无法定位该可执行文件，从而导致调用失败。

## 三、未来可能的使用方案（未经验证）

由于 Claude Code 的运行依赖 Unix 环境，而实际工程代码通常存储在 Windows 宿主机磁盘中。以下提供一种由 AI 构建的跨系统穿透调用机制。

**注意：此方案尚未在当前环境中进行充分的实际运行验证。**

### 3.1 构建 PowerShell 代理函数

通过修改 PowerShell 配置文件，利用 `bash -c` 强制包裹执行命令，避免宿主机符号解析污染，同时使用绝对或相对路径直达目标程序。

执行以下命令编辑配置文件：
```powershell
notepad $PROFILE
```

将以下代理函数写入配置并保存：
```powershell
function claude {
    # 规避非交互式 Shell 的 PATH 缺失，直接指定 WSL 内部相对于当前用户的执行路径
    $wsl_cmd = "~/.local/bin/claude"

    # 捕获宿主机传递的参数并拼接
    if ($args.Count -gt 0) {
        $wsl_cmd += " " + ($args -join " ")
    }

    # 强制交由 bash 解析执行，防止 PowerShell 拦截处理 Unix 符号
    wsl bash -c $wsl_cmd
}
```

重新加载配置文件使之生效：
```powershell
. $PROFILE
```

### 3.2 预期工作流

若上述代理配置有效，预期的项目交互流如下：

1. **目录定位**：在 PowerShell（或 VS Code 内置终端）中，直接导航至 Windows 物理磁盘上的项目根目录。
2. **直接唤起**：输入 `claude`。
3. **底层执行**：PowerShell 函数拦截指令，将其转换为 `wsl bash -c "~/.local/bin/claude"` 并下发。WSL 自动将当前 Windows 目录映射为挂载点，在子系统中启动 Claude Code 进程，并直接对宿主机的代码文件进行读写操作。