---
toc_depth: 2
title: MathType 公式分章编号
date: 2025-09-03 18:18:09
categories:
  - 存档
tags: 
  - Word
  - MathType
---



# MathType 批量修改 Word 行间公式编号及章节断点管理

> 适用版本：MathType 7.x + Word 2016 及以上
>
> 适用对象：已添加的 MathType Number

---

## 一、批量修改行间公式编号（含章节前缀）

| 步骤            | 操作要点                                                     | 说明                                                         |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 1. 准备         | 确保 Word 的一级标题已使用样式并自动编号。                   | 标题编号格式决定章节号。                                     |
| 2. 插入章节断点 | 1. 将光标放在**一级标题前**。<br>2. MathType → **Chapters & Sections** → **Insert Break…** → **Next Chapter**。<br>3. 出现红色文字：<br>`Equation Chapter (Next) Section 1` 表示成功。 | 每个章节前都需插一次。                                       |
| 3. 设置编号格式 | MathType → **Equation Numbers** → **Insert Number** → **Format…**。<br>格式填 `(C-E)`，其中：<br>- `C`=Chapter 章节号<br>- `E`=Equation 公式序号 | 仅需设置一次，后续沿用。                                     |
| 4. 选区修改编号 | 1. 鼠标框选要**修改**编号的公式（可多段）。<br>2. MathType → **Equation Numbers** → **Insert Number** → **Left/Right Numbered**。<br>3. 完成后编号示例：`(2-1)`、`(2-2)` … | ~~若公式已存在旧编号，先 **Equation Numbers → Remove** 清空再编号。~~ |
| 5. 全文更新编号 | 任意位置右键公式 → **Equation Number → Update**              | 章节号或增删公式后统一刷新。                                 |



## 二、删除历史 Chapter Break（Next Chapter）

| 方法                        | 步骤                                                         | 备注                             |
| --------------------------- | ------------------------------------------------------------ | -------------------------------- |
| **推荐：Modify Break 删除** | 1. **Ctrl+Shift+8** 显示隐藏标记。<br>2. 找到红色文字 `Equation Chapter (Next) Section 1` 并单击选中。<br>3. MathType → **Chapters & Sections** → **Modify Break…** → **Delete** → 关闭窗口。 | 彻底清除，不会残留域代码。       |
| 快捷删除（备选）            | 直接选中红色文字 → **Delete** / **Backspace**。              | 简单但可能留下空行，需手动检查。 |
| 更新编号                    | 删除后务必 **Equation Number → Update** 使编号重新计算。     | 否则章节号不会即时变化。         |

---

## 三、常见问题速查

| 问题         | 解决                                               |
| ------------ | -------------------------------------------------- |
| 章节号未变化 | 检查是否删除了错误的断点；确认 Word 标题编号正确。 |
| 红色文字打印 | 右键 → 字体 → 勾选「隐藏」即可。                   |
| 公式编号错位 | 断点位置插错，重新插入正确标题前即可。             |

