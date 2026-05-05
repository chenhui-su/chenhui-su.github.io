---
title: Windows 终端代理配置指南
date: 2025-11-11 10:46:45
categories:
  - 存档
tags:
  - Windows
  - 终端
  - 命令行
  - PowerShell
  - CMD
---

## 一、设置代理的三种方式

### 方式 1：临时环境变量（推荐）
*仅对当前终端会话有效，关闭窗口后自动失效*

**CMD 命令：**
```bash
set http_proxy=http://127.0.0.1:7890
set https_proxy=http://127.0.0.1:7890
```

**PowerShell 命令：**
```powershell
$env:http_proxy="http://127.0.0.1:7890"
$env:https_proxy="http://127.0.0.1:7890"
```

> **提示**：如需带用户名密码，格式为 `http://用户名:密码@地址:端口`

### 方式 2：永久环境变量
*影响所有未来终端会话，无需重复设置*

```bash
# CMD 命令（需重启终端生效）
setx http_proxy "http://127.0.0.1:7890"
setx https_proxy "http://127.0.0.1:7890"
```

### 方式 3：系统级代理
*影响整个 Windows 系统*

```bash
# 设置系统代理
netsh winhttp set proxy 127.0.0.1:7890

# 取消系统代理
netsh winhttp reset proxy

# 查看当前状态
netsh winhttp show proxy
```

## 二、检查代理是否生效

### 方法 1：查看环境变量
```bash
# CMD
echo %http_proxy%

# PowerShell
echo $env:http_proxy
```

### 方法 2：网络实际测试（最可靠）
```bash
# 测试访问 Google
curl -v https://www.google.com

# 查看本机出口IP（对比设置前后变化）
curl ip.sb
```

## 三、PowerShell 一键配置（高级）

将以下函数添加到 PowerShell 配置文件，实现快速管理：

### 步骤 1：创建/打开配置文件
```powershell
# 如果文件不存在则创建
if (!(Test-Path $PROFILE)) { New-Item -Path $PROFILE -ItemType File -Force }

# 用记事本编辑
notepad $PROFILE
```

### 步骤 2：粘贴以下代码
```powershell
# 设置代理
function Set-Proxy {
    $proxy="http://127.0.0.1:7890"
    $env:http_proxy=$proxy
    $env:https_proxy=$proxy
    Write-Host "✅ 代理已设置: $proxy" -ForegroundColor Green
}

# 清除代理
function Clear-Proxy {
    $env:http_proxy=$null
    $env:https_proxy=$null
    Write-Host "❌ 代理已清除" -ForegroundColor Yellow
}

# 测试代理
function Test-Proxy {
    Write-Host "HTTP Proxy: $env:http_proxy"
    Write-Host "HTTPS Proxy: $env:https_proxy"
    Write-Host "`n当前出口IP:" -ForegroundColor Cyan
    curl -s ip.sb
}

# 设置快捷别名
Set-Alias -Name spxy -Value Set-Proxy
Set-Alias -Name cpxy -Value Clear-Proxy
Set-Alias -Name tpxy -Value Test-Proxy
```

### 步骤 3：生效配置
```powershell
. $PROFILE
```

**现在你可以使用：**
- `Set-Proxy` 或 `spxy` 设置代理
- `Clear-Proxy` 或 `cpxy` 清除代理
- `Test-Proxy` 或 `tpxy` 测试代理

---

## 四、常见问题排查

| 问题                         | 解决方案                                                     |
| ---------------------------- | ------------------------------------------------------------ |
| 脚本无法运行                 | 执行 `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| 代理设置后仍无法访问         | 检查代理地址是否正确、代理服务是否运行                       |
| 仅 CMD 有效，PowerShell 无效 | 确认是否在 PowerShell 中使用 `$env:` 语法                    |
| 环境变量不生效               | 重启终端或执行 `refreshenv` 命令                             |

## 五、使用建议

- **新手**：优先使用**临时环境变量**方式，简单直观
- **日常开发**：配置 PowerShell 函数，提高效率
- **需要全局代理**：结合 **系统级代理** 和 **永久环境变量**
- **验证关键**：始终以 `curl ip.sb` 的实际测试结果为准
