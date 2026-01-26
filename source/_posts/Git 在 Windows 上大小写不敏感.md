---
title: Git 在 Windows 上大小写不敏感
date: 2025-07-13 11:57:03
tags:
  - 博客
  - Git
  - Windows
---

之前重新整理过博客文章，包括对一些文件名或者标签的更改，如首字母改为大写。当时就发现某些文章无法访问，但是在本地部署时可以正常访问。

今天想起来解决，重新生成部署无效。查看了 GitHub 仓库中的文件后发现无法正常显示的网页的上级目录首字母依旧是小写的，基本确定无法正常访问的原因是大小写不对。

于是找到解决方法：[解决由于大小写敏感导致的Hexo页面404问题 | 且听风吟](https://www.windsings.com/post/e36fe130/)

> 在Windows下，文件名和文件夹名字是大小写不敏感的，而在Linux下是大小写敏感的。
>
> 1. 在`YourBlogDir/.deploy_git/.git/config`下，设置Git不要忽略大小写。
>
>    ```
>    [core]
>    	....
>    	ignorecase = false
>    ```
>
> 2. 清空部署端，以Git为例：
>
>    ```
>    cd .deploy_git
>    git rm -rf *
>    git commit -m 'clean all file'
>    git push
>    ```
>
> 3. 重新渲染并上传
>
>    ```
>    hexo clean
>    hexo g -d
>    ```