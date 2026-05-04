---
toc_depth: 2
title: 个人开发 Git 规范
date: 2025-06-04 10:33:02
categories:
  - 规范
tags:
  - Git
  - 规范
  - VC
  - 开发
---


# 个人开发 Git 规范

对于代码新手来说，尽早建立良好的 Git 使用规范非常重要，即使是个人项目，规范的操作也能让你在回顾代码、排查问题时事半功倍。

本规范参考了网络上一些主流的团队开发规范（如 Conventional Commits, Angular Commit Message Guidelines），并针对个人开发的特点进行了简化和调整。

## 一、核心原则 🎯

1.  **原子性提交 (Atomic Commits)**：每次提交应该只包含一个逻辑单元的更改。例如，修复一个 bug、实现一个小功能、或者优化一小段代码。避免一次提交包含多个不相关的改动。
2.  **提交前测试 (Test Before Commit)**：在提交代码前，确保你的代码至少可以正常运行，如果写了单元测试，确保测试通过。
3.  **清晰的提交信息 (Clear Commit Messages)**：这是规范的核心，下面会详细说明。
4.  **及时提交 (Commit Frequently)**：不要等到写完一大堆代码再提交，分解成小步骤，完成一个小功能或修复一个小问题就提交一次。
5.  **分支策略简化 (Simplified Branching)**：个人开发时，可以简化分支模型。

## 二、分支管理 🌿

对于个人开发，可以采用以下简单的分支策略：

* **`main` (或 `master`) 分支**：这是你的主分支，存放稳定、可随时部署或发布的版本。**不要直接在 `main` 分支上进行日常开发。**
* **`develop` (或 `dev`) 分支**：这是你的主要开发分支，所有新功能的开发和 bug 修复都应该在这个分支上进行。
* **特性分支 (Feature Branches)**：当你需要开发一个新功能或者进行较大的改动时，从 `develop` 分支创建一个新的特性分支。分支名可以这样命名：
    * `feat/xxx` (例如: `feat/user-login`, `feat/add-shopping-cart`)
    * `fix/xxx` (例如: `fix/login-bug`, `fix/payment-issue`)
    * `refactor/xxx` (例如: `refactor/user-module`)
    * `docs/xxx` (例如: `docs/update-readme`)

**开发流程示例：**

1.  确保 `develop` 分支是最新代码：
    ```bash
    git checkout develop
    git pull origin develop
    ```
2.  创建一个新的特性分支开始工作：
    ```bash
    git checkout -b feat/new-cool-feature develop
    ```
3.  在 `feat/new-cool-feature` 分支上进行编码和提交。
4.  当功能开发完成并通过测试后，切换回 `develop` 分支：
    ```bash
    git checkout develop
    ```
5.  将特性分支合并到 `develop` 分支：
    ```bash
    git merge --no-ff feat/new-cool-feature
    ```
    *(`--no-ff` 的意思是 "no fast-forward"，这样可以保留特性分支的提交历史，使得分支图更清晰。)*
6.  删除特性分支（可选，但推荐）：
    ```bash
    git branch -d feat/new-cool-feature
    ```
7.  当 `develop` 分支上的功能积累到一定程度，并且测试稳定后，可以将其合并到 `main` 分支，并打上版本标签。
    ```bash
    git checkout main
    git pull origin main
    git merge develop
    git push origin main
    git tag -a v0.1.0 -m "Version 0.1.0 Release" # 创建一个带附注的标签
    git push origin v0.1.0 # 推送标签
    ```

## 三、Commit Message 规范 ✍️

这是帮助你追溯代码的关键！一个好的 Commit Message 应该清晰地说明 **做了什么** 以及 **为什么这么做**。我们推荐类似 [Conventional Commits](https://www.conventionalcommits.org/) 的规范，但可以简化。

**Commit Message 结构:**
```

&lt;type>(&lt;scope>): &lt;subject>

&lt;BLANK LINE>

&lt;body>

&lt;BLANK LINE>

&lt;footer>

```
  * **`<type>` (必需)**：说明提交的类别。常用的有：
      * `feat`: 新功能 (feature)
      * `fix`: 修补 bug
      * `docs`: 文档 (documentation)
      * `style`: 格式 (不影响代码运行的变动，例如空格、格式化、缺少分号等)
      * `refactor`: 重构 (既不是新增功能，也不是修改 bug 的代码变动)
      * `test`: 增加测试或者修改现有测试
      * `chore`: 构建过程或辅助工具的变动 (例如修改 `.gitignore`, `package.json` 等)
      * `perf`: 提升性能的代码更改
      * `ci`: 对 CI 配置文件和脚本的更改 (例如 Github Actions, Travis 等)
      * `revert`: 撤销之前的提交
  * **`<scope>` (可选)**：说明 commit 影响的范围，例如数据层、控制层、视图层、或者某个具体模块。对于个人项目，如果觉得麻烦可以省略。
      * 例如: `feat(user): add login endpoint`
      * 例如: `fix(payment): correct calculation error`
  * **`<subject>` (必需)**：commit 的简短描述，不超过 50 个字符。
      * 使用动词开头，第一人称现在时，例如 `add`, `fix`, `update`, `remove`，而不是 `added`, `fixed`。
      * 首字母小写（除非是专有名词）。
      * 结尾不加句号。
  * **`<BLANK LINE>`**：主体内容前必须有一个空行。
  * **`<body>` (可选)**：对本次 commit 的详细描述。可以分成多行。解释为什么进行这次修改，以及它如何影响代码。
  * **`<footer>` (可选)**：
      * **BREAKING CHANGE**: 如果当前代码与上一个版本不兼容，则 Footer 部分以 `BREAKING CHANGE:` 开头，后面是对变动的描述、以及变动理由和迁移方法。
      * **关联 Issue**: 如果你的提交与某个 Issue 相关联（例如你在 GitHub 上管理任务），可以在这里关闭 Issue。例如 `Closes #123`, `Fixes #456`。

**Commit Message 示例：**

一个简单的 commit:
```

feat: add user registration functionality

```
包含 scope:
```

feat(auth): implement JWT-based authentication

```
包含 body:
```

fix: correct incorrect tax calculation

The previous calculation was not rounding correctly for amounts

under $10, leading to minor discrepancies in final totals.

This commit updates the rounding logic to ensure accuracy.

```
包含 breaking change 和关闭 issue:
```

feat: update user API to v2

BREAKING CHANGE: The user API endpoint /api/user has been

renamed to /api/v2/user to accommodate new features and

improve consistency. All client applications need to update

their API calls.

Closes #42

```
**为什么要这样写？**

  * **可读性强**：一眼就能看出每次提交的目的。
  * **易于追溯**：方便查找特定功能的修改历史或 bug 的修复过程。
  * **自动化工具友好**：很多工具可以根据这种格式的 commit message 自动生成 CHANGELOG，或者进行版本管理。

## 四、其他建议 ✨

  * **使用 `.gitignore` 文件**：忽略不需要版本控制的文件，如编译产物、日志文件、IDE 配置文件等。GitHub 提供了一些常用语言和框架的 `.gitignore` 模板。
  * **经常 `git pull`**：如果你在多个地方开发同一个项目（例如公司电脑和家里电脑），或者未来可能与他人协作，养成在开始工作前 `git pull` 的习惯，以获取最新代码，避免冲突。
  * **谨慎使用 `git push --force`**：这个命令会覆盖远程仓库的历史，除非你非常清楚自己在做什么，否则尽量避免使用。尤其是在与他人协作时，这通常是被禁止的。
  * **学习使用 `git rebase -i` (交互式变基)**：当你本地有一系列零散的提交时，可以使用交互式变基来清理提交历史，例如合并多个小的提交，修改 commit message 等。这能让你的提交历史更整洁。但在推送到共享分支后，不建议对已推送的提交进行变基。
  * **配置 Git 用户名和邮箱**：
    ```bash
    git config --global user.name "Your Name"
    git config --global user.email "your.email@example.com"
    ```
  * **善用 `git status`, `git diff`, `git log`**：这三个命令是你了解仓库状态、查看修改内容、回顾提交历史的好帮手。



