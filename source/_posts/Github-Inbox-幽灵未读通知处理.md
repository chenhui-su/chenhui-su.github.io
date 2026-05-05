---
title: Github Inbox 幽灵未读通知处理
date: 2025-09-25 10:26:11
categories:
  - 存档
tags:
  - Github
---

# Github Inbox“幽灵未读”清理

## 问题现象
1. 网页版 / 手机端 Inbox 右上角持续显示 **N 条未读**（N>0）。  
2. 打开 Inbox 后 **列表为空**，或怎么也翻不到对应条目。  
3. 这些通知曾通过邮件推送；从邮件点进去直接 404，说明目标仓库/议题/PR 已被删除或对用户不可见。  
4. 常规“标已读 / Done / Unsubscribe”无法生效——**根本找不到可操作的卡片**。

## 根本原因
- GitHub 在通知数据库里仍把对应线程记作 `unread=true`；  
- 由于资源 404，前端在渲染 Inbox 列表时把这条过滤掉，造成“有红点却没条目”的幽灵现象；  
- 只能通过 **API 层** 直接改那条记录的状态，或 **强制重置未读计数缓存** 才能消除。

## 解决方案

[Bug: ghost notifications · community · Discussion #6874](https://github.com/orgs/community/discussions/6874)

- [debug4ever](https://github.com/debug4ever) give an extension [emmanuel-ferdman/gh-gonest: :octocat: GitHub CLI extension that automatically detects and removes ghost notifications from banned/deleted repos](https://github.com/emmanuel-ferdman/gh-gonest)
  - 发现在 GitHub CLI 的网页登录认证卡住（SSH+browser），在开启系统代理前后均失败 `failed to authenticate via web browser: Post "https://github.com/login/device/code": dial tcp 20.205.243.166:443: connectex: A connection attempt failed because the connected party did not properly respond after a period of time, or established connection failed because connected host has failed to respond.`
- [benjamincburns (Ben Burns)](https://github.com/benjamincburns) offer a convenient script [Bug: ghost notifications · community · Discussion #6874](https://github.com/orgs/community/discussions/6874?sort=new#discussioncomment-14481926)
  - 发现同样需要先登录 GitHub CLI，改用 HTTPS+browser 成功

```text
PS D:\> node remove_ghost_notifications_github.cjs 2025-09-01T00:00:00Z
Marking notification with thread URL https://api.github.com/notifications/threads/19168566554 read from repo funds-paradigm/paradigm
Marking notification with thread URL https://api.github.com/notifications/threads/19168566554 done from repo funds-paradigm/paradigm
Unsubscribing from notification with thread URL https://api.github.com/notifications/threads/19168566554 from repo funds-paradigm/paradigm
Marking notification with thread URL https://api.github.com/notifications/threads/19118128047 read from repo gitcoinod/org
Marking notification with thread URL https://api.github.com/notifications/threads/19118128047 done from repo gitcoinod/org
Unsubscribing from notification with thread URL https://api.github.com/notifications/threads/19118128047 from repo gitcoinod/org
Marking notification with thread URL https://api.github.com/notifications/threads/19107159520 read from repo gitcoinnotifypromo/gitcoincodao
Marking notification with thread URL https://api.github.com/notifications/threads/19107159520 done from repo gitcoinnotifypromo/gitcoincodao
Unsubscribing from notification with thread URL https://api.github.com/notifications/threads/19107159520 from repo gitcoinnotifypromo/gitcoincodao
Done
```



## Kimi提供的解决方案（未验证）

### 解决方案（做法 1 – REST API 精准单条清理）
1. 从邮件链接里提取 `notification_id` 【其实不现实，邮件中只有通知指向地址，不包含通知ID】 
   例：  
   `https://github.com/notifications?query=id%3A123456789`  
   → `123456789` 即为 ID。

2. 获取 Token  
   - 浏览器 Cookie：复制 `user_session` 值；  
   - 或创建 Personal Access Token，勾选 `notifications` 作用域。

3. 调用 PATCH 接口把该线程标为已读  
   ```bash
   curl -X PATCH https://api.github.com/notifications/threads/123456789 \
        -H "Authorization: token <TOKEN>" \
        -H "Accept: application/vnd.github.v3+json" \
        -d '{"read":true}'
   ```
   返回 205 即成功；Inbox 红点立即减 1。  
   若邮件里有多条幽灵通知，循环更换 ID 执行即可。

4. 验证  
   刷新 `https://github.com/notifications` → 右上角未读数归零；  
   手机端重新下拉同步，角标消失。

### 备用方案（做法 2 – 一键重置未读计数）
当无法逐个提取 ID 时，可把账号级未读计数直接清零：  
在已登录 GitHub 的浏览器 Tab 控制台执行：

```javascript
(await (await fetch('/notifications/mark_as_read',
      {method:'PUT', headers:{'X-Requested-With':'XMLHttpRequest'}})).text();
 location.reload();
```
> 效果：等同于“全部标已读”，但只会影响数据库标记，不会删除任何通知；正常未读如仍需处理可后续再行操作。

