# chenhui-su's Blog

基于 [Hexo](https://hexo.io/) 构建的个人静态博客，托管于 GitHub Pages。

站点地址：[chenhui-su.github.io](https://chenhui-su.github.io/)

## 架构设计

### 分支模型

| 分支 | 用途 | 说明 |
|---|---|---|
| `main` | 源码分支 | 包含 Hexo 配置、主题设置、博客源文件（Markdown）、CI/CD 工作流 |
| `gh-pages` | 部署分支 | 由 GitHub Actions 自动生成，包含 `hexo generate` 产出的静态文件，**不要手动编辑** |

### 部署流程

```
push to main
  → GitHub Actions 触发
    → 安装依赖 (npm ci)
      → 构建静态文件 (hexo generate)
        → 推送到 gh-pages 分支
          → GitHub Pages 从 gh-pages 分支提供访问
```

CI/CD 工作流配置位于 `.github/workflows/pages.yml`。

### 目录结构

```
.
├── .github/
│   └── workflows/
│       └── pages.yml          # GitHub Actions 部署工作流
├── scaffolds/                  # 文章模板
│   ├── draft.md
│   ├── page.md
│   └── post.md
├── source/                     # 博客源文件
│   ├── _posts/                 # 博客文章 (Markdown)
│   ├── categories/             # 分类页
│   ├── img/                    # 图片资源
│   ├── index/                  # 首页
│   ├── list/                   # 文章列表页
│   └── tags/                   # 标签页
├── themes/                     # 主题目录（通过 npm 安装，本地为空）
├── _config.yml                 # Hexo 站点配置
├── _config.a4.yml              # A4 主题配置
├── package.json                # 依赖与脚本
└── .gitignore
```

## 本地开发

### 环境要求

- [Node.js](https://nodejs.org/) >= 20
- [npm](https://www.npmjs.com/)

### 安装

```bash
npm install
```

### 常用命令

```bash
# 本地预览（默认 http://localhost:4000）
npm run server

# 生成静态文件到 public/
npm run build

# 清除缓存和生成文件
npm run clean
```

### 新建文章

```bash
npx hexo new "文章标题"
```

文章将以 `source/_posts/文章标题.md` 创建，包含 `title`、`date`、`categories`、`tags` 等 front-matter。

## 主题

使用 [hexo-theme-a4](https://github.com/HiNinoJay/hexo-theme-A4) 主题，通过 npm 安装管理。

主题配置文件为 `_config.a4.yml`，主要特性：

- 深色模式
- 文章目录（左侧 TOC）
- 代码高亮 (highlight.js)
- 数学公式支持 (MathJax)
- 图片灯箱 (Lightgallery)
- 阅读量与字数统计

## 技术栈

- **框架**：Hexo 8.x
- **渲染**：EJS / Pug / Stylus / Marked
- **数学公式**：hexo-filter-mathjax (MathJax)
- **代码高亮**：highlight.js + PrismJS
- **部署**：GitHub Actions + GitHub Pages
