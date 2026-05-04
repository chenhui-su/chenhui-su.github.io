---
toc_depth: 2
title: Check My Key
date: 2025-02-15 23:39:26
tags:
  - 博客
  - test
  - Git
---

今天在手机上创建了个 SSH Key，整理以前的记录发现还有个 My Key 用于博客，但是在 Github 网站上并未发现这个 SSH Key，所以写这个博客测试一下能否继续使用，看是否 Github 的显示问题，还是被我不小心删除了。

结果确实，应该是我某次删除了 My Key。（也可能和我改了邮箱有关联）

```
Please make sure you have the correct access rights
and the repository exists.
FATAL Something's wrong. Maybe you can find the solution here: https://hexo.io/docs/troubleshooting.html
Error: Spawn failed
    at ChildProcess.<anonymous> (D:\LENOVO\ApplicationsForEnglish\Hexo-Blog\node_modules\hexo-util\lib\spawn.js:51:21)
    at ChildProcess.emit (node:events:513:28)
    at ChildProcess.cp.emit (D:\LENOVO\ApplicationsForEnglish\Hexo-Blog\node_modules\cross-spawn\lib\enoent.js:34:29)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:291:12)
```

那就再生成一个 blog 吧！按照转载到本博客的那篇文章来……

一路按缺省设置：

```
Enter file in which to save the key (/c/Users/LENOVO/.ssh/id_rsa):
/c/Users/LENOVO/.ssh/id_rsa already exists.
Overwrite (y/n)? y
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /c/Users/LENOVO/.ssh/id_rsa
Your public key has been saved in /c/Users/LENOVO/.ssh/id_rsa.pub
```

出现了和文章中不一样的事情：

```
$ ssh -T git@github.com
Hi GanMocai! You've successfully authenticated, but GitHub does not provide shell access.
```

应该成功替代了。
