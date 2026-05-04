---
toc_depth: 2
title: Hexo 迁移更新复盘
date: 2025-07-24 17:16:06
categories: 
  - 存档
tags:
  - 博客
  - Git
  - Windows
  - Hexo
---

> 想更新 node.js，顺便在迁移了本地博客目录，更新依赖，遇到一些问题，部分是网络波动导致。感觉还是有些价值，令 Gemini 复盘形成文档。 


# 复盘一：Hexo 本地模块加载失败问题

### 1. 问题描述 (Problem Description)
在执行 `hexo s` 或 `hexo d` 等命令时，终端报错，提示本地模块加载失败。

```
ERROR Cannot find module 'hexo' from 'D:\Hexo-Blog'
ERROR Local hexo loading failed in D:\Hexo-Blog
```

### 2. 诊断过程 (Diagnosis Process)
- **初步判断**：用户确认已通过 `npm install -g hexo-cli` 安装了全局的 Hexo 命令行工具。
- **关键分析**：指出全局安装的 `hexo-cli` 只提供了可在任何路径下执行的 `hexo` 命令，但每个具体的 Hexo 项目都需要在自己的项目文件夹内拥有一个本地的 `hexo` 包作为其核心依赖。
- **验证**：检查项目文件夹下的 `node_modules` 目录，发现其不完整或不存在，导致无法找到 `hexo` 模块。

### 3. 根本原因 (Root Cause)
项目的本地依赖没有被正确安装。`package.json` 文件中虽然定义了项目需要 `hexo`，但 `node_modules` 目录中缺少这个包的实际文件。

### 4. 解决方案 (Solution)
在博客项目根目录下，运行标准的 npm 安装命令，以安装 `package.json` 中定义的所有依赖。
```bash
npm install
```

### 5. 经验总结 (Lessons Learned)

- **区分全局包与本地包**：`npm install -g` 安装的工具（如 `hexo-cli`, `vue-cli`）提供的是全局命令，而项目自身的运行依赖（如 `hexo`, `react`）必须作为本地包安装在项目内部。
- **`npm install` 的重要性**：在克隆或初始化一个 Node.js 项目后，第一步通常都是运行 `npm install` 来构建本地依赖环境。

---

# 复盘二：NPM 依赖更新与系统 PATH 环境变量冲突问题

### 1. 问题描述 (Problem Description)
在尝试更新项目过时的依赖时，推荐使用 `npm-check-updates` 包。但在终端执行其命令 `ncu` 后，输出的不是预期的依赖检查结果，而是一份关于 NVIDIA CUDA 的帮助文档。

### 2. 诊断过程 (Diagnosis Process)
- **分析输出**：`ncu` 命令的输出内容包含大量 `CUDA`, `GPU`, `NVIDIA Corporation` 等关键字，且可执行文件名为 `ncu.exe`。
- **推断原因**：这表明系统中存在另一个名为 `ncu.exe` 的程序（NVIDIA Nsight Compute），并且其所在目录在系统 `PATH` 环境变量中的优先级高于 npm 全局包的目录。
- **验证**：当用户在终端输入 `ncu` 时，操作系统根据 `PATH` 顺序，先找到了 NVIDIA 的程序并执行了它。

### 3. 根本原因 (Root Cause)
**PATH 环境变量冲突**。两个不同的程序使用了相同的命令别名 (`ncu`)，而操作系统优先执行了非预期的那一个。

### 4. 解决方案 (Solution)
- **临时解决方案 (推荐)**：使用 `npx` 来执行命令。`npx` 可以确保运行的是 npm 仓库中或本地 `node_modules` 中的包，从而绕过系统 PATH 冲突。
  ```bash
  # 检查更新
  npx ncu
  # 写入更新
  npx ncu -u
  ```

- **永久解决方案**：手动调整系统环境变量，将 npm 全局目录的路径 (`npm config get prefix` 可查看) 移动到 NVIDIA 工具目录之前。

### 5. 经验总结 (Lessons Learned)

- **`npx` 的妙用**：`npx` 是解决命令冲突和避免全局安装包污染的绝佳工具，它允许你直接运行包而无需全局安装。
- **警惕 `PATH` 冲突**：当一个常用命令表现出异常行为时，应考虑到 `PATH` 冲突的可能性，特别是当系统中安装了多种开发工具集（如 Node.js, Python, NVIDIA CUDA Toolkit 等）时。

---

# 复盘三：NPM 安全漏洞与已弃用包处理


### 1. 问题描述 (Problem Description)
在运行 `npm install` 或 `npm audit` 后，报告存在多个安全漏洞 (`vulnerabilities`) 和已弃用包 (`deprecated`) 的警告。直接运行 `npm audit fix` 无法修复所有漏洞。

### 2. 诊断过程 (Diagnosis Process)
- **分析 `npm audit` 报告**：报告指出，剩余的漏洞修复需要执行“破坏性变更 (breaking change)”，并将问题根源指向一个核心的旧包 `hexo-renderer-kramed`。
- **分析 `deprecated` 警告**：警告信息明确提示某些包（如 `hexo-renderer-jade`）已被其作者弃用，并建议使用新的替代品（如 `hexo-renderer-pug`）。
- **关联分析**：发现未修复的漏洞和已弃用的警告，大多都与几个核心的、长期未更新的 Hexo 插件有关。

### 3. 根本原因 (Root Cause)
项目依赖了一些已经过时、不再维护的 npm 包。这些旧包自身或其依赖项存在已知的安全漏洞，并且没有提供向后兼容的安全更新。

### 4. 解决方案 (Solution)
采取**“替换”策略**，而非“强制修复”。
1. 识别出问题的核心旧包（例如 `hexo-renderer-kramed`, `hexo-renderer-jade`）。
2. 寻找它们的现代化替代品（例如 `hexo-renderer-marked`, `hexo-renderer-pug`）。
3. 手动执行卸载和安装操作。
  ```bash
  # 示例：替换 kramed 渲染器
  npm uninstall hexo-renderer-kramed
  npm install hexo-renderer-marked
  ```

### 5. 经验总结 (Lessons Learned)
- **理性看待 `npm audit fix`**：它是一个很好的工具，但不是万能的。对于需要“破坏性变更”才能修复的漏洞，应谨慎操作。
- **优先替换核心依赖**：当漏洞的根源是一个不再维护的包时，最佳实践是寻找一个活跃的替代品来替换它，而不是在旧的生态上打补丁。这能从根本上提升项目的健康度和安全性。
- **关注 `deprecated` 警告**：这些警告是重要的迁移信号，及时处理可以避免未来出现更严重的问题。

---

# 复盘四：Hexo Git 部署连接与权限问题

### 1. 问题描述 (Problem Description)
在执行 `hexo d` 进行部署时，遇到一系列 Git 连接失败的错误。
1. `Connection reset by ... port 443` (HTTPS 连接被重置)
2. `Bad owner or permissions on ... .ssh/config` (SSH 配置文件权限错误)
3. `Connection reset by ... port 22` (SSH 连接被重置)

### 2. 诊断过程 (Diagnosis Process)
- **问题1 (HTTPS)**：分析 `port 443` 指出问题出在 HTTPS 协议上，这通常是网络环境或 TLS/SSL 协议层面的问题，而非简单的认证失败。
- **问题2 (SSH 权限)**：错误信息明确指向 Windows 系统下 `.ssh/config` 文件的权限过于开放 (`Everyone` 组可访问)，不符合 SSH 客户端的安全要求。
- **问题3 (SSH 连接)**：在修复权限后，`port 22` 的连接重置错误表明问题转向了网络层面，如防火墙阻止了 22 端口的通信。

### 3. 根本原因 (Root Cause)
这是一个复合型问题，包含了三个不同层面的原因：
1. **HTTPS 问题**：本地环境与 GitHub 服务器的 HTTPS 安全连接不稳定。
2. **文件权限问题**：Windows 系统下的 SSH 配置文件权限不正确，未满足 SSH 客户端的严格安全标准。
3. **网络问题**：本地网络环境（如防火墙）可能限制或中断了 SSH (port 22) 的出站连接。

### 4. 解决方案 (Solution)
- **针对问题1 (HTTPS)**：推荐将部署方式从 HTTPS 切换到 SSH，因为它在自动化推送场景下更稳定。在 `_config.yml` 中修改 `repo` URL。
  ```diff
  - repo: [https://github.com/YourName/YourRepo.git](https://github.com/YourName/YourRepo.git)
  + repo: git@github.com:YourName/YourRepo.git
  ```

- **针对问题2 (SSH 权限)**：在 Windows 上，通过文件资源管理器的“属性 > 安全 > 高级”界面，**禁用权限继承**，并移除除当前用户外的所有访问权限，确保只有当前用户拥有“完全控制”权限。
- **针对问题3 (SSH 连接)**：这是一个外部环境问题，需要检查本地防火墙、杀毒软件或网络运营商的策略。

### 5. 经验总结 (Lessons Learned)

- **SSH 优先**：对于 Git 的 `push` 操作，尤其是在 CI/CD 或脚本化部署中，SSH 协议通常是比 HTTPS 更可靠的选择。
- **SSH 客户端的跨平台一致性**：无论是 Windows 还是 Linux，SSH 客户端都对 `~/.ssh` 目录下的文件权限有严格要求，这是保障安全性的核心特性。
- **分层排查问题**：遇到连接失败时，要区分是**应用层**（认证错误）、**协议层**（权限/配置错误）还是**网络层**（端口/防火墙问题）的故障，逐一排查。

---

### 复盘五：Git 跨平台换行符（LF/CRLF）警告问题

### 1. 问题描述 (Problem Description)
在执行 `git` 相关操作（特别是 `git add`）时，终端输出大量警告信息，格式如下：
  ```
  warning: in the working copy of '...', LF will be replaced by CRLF the next time Git touches it
  ```
### 2. 诊断过程 (Diagnosis Process)
- **分析警告内容**：警告明确指出 Git 将在下次接触文件时，把 `LF` (Line Feed) 换行符替换为 `CRLF` (Carriage Return + Line Feed)。
- **关联操作系统**：这个问题通常发生在 Windows 系统上，因为 Windows 默认使用 `CRLF` 作为换行符，而 Linux/macOS 使用 `LF`。

### 3. 根本原因 (Root Cause)
Git 的 `core.autocrlf` 配置项被激活（在 Windows 上安装 Git 时通常是默认设置）。此功能旨在自动处理跨平台的换行符差异：检出（checkout）到本地时将 `LF` 转为 `CRLF`，提交（commit）到仓库时将 `CRLF` 转回 `LF`。这个转换过程触发了警告。

### 4. 解决方案 (Solution)
通过在项目根目录创建 `.gitattributes` 文件，来精确地、显式地管理项目中不同类型文件的换行符行为，从而取代 Git 的自动猜测。
1. 在项目根目录创建 `.gitattributes` 文件。
2. 填入推荐的配置，为文本文件强制指定 `LF`，并标记二进制文件。
  ```
  # 默认行为
  * text=auto

  # 强制文本文件使用 LF
  *.html text eol=lf
  *.css text eol=lf
  *.js text eol=lf
  *.json text eol=lf
  *.yml text eol=lf
  *.md text eol=lf
    
  # 标记二进制文件，防止 Git 修改它们
  *.png binary
  *.jpg binary
  ```
3. 将 `.gitattributes` 文件提交到仓库中。

### 5. 经验总结 (Lessons Learned)
- **`.gitattributes` 的重要性**：对于任何跨平台协作的项目，在项目初期就配置好 `.gitattributes` 文件是保证代码风格一致、避免换行符混乱的最佳实践。
- **显式优于隐式**：与其依赖 Git 的 `autocrlf` 自动转换功能，不如通过 `.gitattributes` 文件明确定义规则。这让项目行为更可预测，并能从根本上消除相关警告。
