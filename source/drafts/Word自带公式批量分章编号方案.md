---
title: Word 自带公式批量分章编号方案
date: 2026-05-15 17:55:43
categories:
  - 工具
tags:
  - Word
  - VBA
  - 公式
  - OMML
---

# Word 自带公式批量分章编号方案

## 1. 始末与技术演进简述

在Word中为大量未经编号的自带公式（OMML）添加"章节-序号"格式的编号时，常规查找替换无法触发公式对象的自动排版机制。最初尝试利用VBA调用系统剪贴板并模拟光标移动（MoveLeft），但遇到两个阻碍：一是系统剪贴板高频调用易失效导致粘贴空白或仅插入"#";二是由于OMML的二维结构特性（如括号对象、上下标），基于光标导航的操作极易穿透结构边界，将光标错误置于公式内部复合节点中，导致公式被截断。
为解决光标越界与内存栈冲突（运行时错误 5937），方案经历了从"系统剪贴板"到"内存级 FormattedText 传递"，再到最终的"自动图文集（AutoText）+ 降维解构（Linearize）"的迭代。最终方案彻底放弃二维层面的光标微调，将公式强制降维为一维线性文本，消除所有复合结构边界，再进行绝对定位与内容注入，最后重新升维（BuildUp）触发Word原生右对齐排版，实现精准定位。

## 2. 最终有效解决方案

该方案利用 AutoText 规避剪贴板和内存限制，利用 Linearize 彻底解决光标陷入公式内部结构的问题。

### 执行前准备

1. 在Word正文任意空白处，通过【引用】-【插入题注】生成包含章节号的编号（勾选"从题注中排除标签"），并在其两侧手动输入括号，形成如 (1-1) 的样式。
2. 用鼠标高亮选中该 (1-1)（确保灰色底纹被完全选中）。
3. 保持选中状态，切勿按复制快捷键，直接按 Alt+F8 运行以下宏代码。

### VBA 宏代码

```vb
Sub UltimateNumberEquations_Fixed()
    Dim atEntry As AutoTextEntry
    Dim eq As OMath
    Dim i As Long
    Dim pRange As Range
    Dim targetRng As Range
    Dim lastChar As String

    ' 1. 拦截效验：确认母版已选中
    If Selection.Type = wdSelectionIP Then
        MsgBox "错误：运行前必须高亮选中包含章节号的域代码母版（如带有灰色底纹的 (1-1) ）。"
        Exit Sub
    End If

    Application.ScreenUpdating = False

    ' 2. 将域代码存入临时自动图文集
    On Error Resume Next
    NormalTemplate.AutoTextEntries("TempMathNum").Delete
    On Error GoTo 0
    Set atEntry = NormalTemplate.AutoTextEntries.Add(Name:="TempMathNum", Range:=Selection.Range)

    ' 3. 倒序遍历处理
    For i = ActiveDocument.OMaths.Count To 1 Step -1
        Set eq = ActiveDocument.OMaths(i)

        ' 诊断：独占一段的行内公式强制转化为行间公式
        If eq.Type = wdOMathInline Then
            Set pRange = eq.Range.Paragraphs(1).Range
            If pRange.Characters.Count <= eq.Range.Characters.Count + 3 Then
                eq.Type = wdOMathDisplay
            End If
        End If

        If eq.Type = wdOMathDisplay Then
            ' 降维解构：转换为一维线性纯文本
            eq.Linearize

            ' 获取公式范围的精确克隆
            Set targetRng = eq.Range.Duplicate

            ' 循环剔除尾部的段落标记(回车)或多余空格
            Do While targetRng.Characters.Count > 0
                lastChar = targetRng.Characters.Last.Text
                If lastChar = vbCr Or lastChar = Chr(13) Or lastChar = Chr(10) Or lastChar = " " Then
                    targetRng.End = targetRng.End - 1
                Else
                    Exit Do
                End If
            Loop

            ' 绝对定位：将光标折叠至该范围的最末尾
            targetRng.Collapse Direction:=wdCollapseEnd
            targetRng.Select

            ' 注入对齐标识符与域代码
            Selection.TypeText Text:="#"
            atEntry.Insert Where:=Selection.Range, RichText:=True

            ' 结构升维：触发原生引擎排版
            eq.BuildUp
        End If
    Next i

    ' 4. 清理与全局更新
    On Error Resume Next
    NormalTemplate.AutoTextEntries("TempMathNum").Delete
    On Error GoTo 0

    ActiveDocument.Fields.Update
    Application.ScreenUpdating = True

    MsgBox "执行完毕。冗余的游标回退已移除，编号现已精准附着于公式绝对末尾。"
End Sub
```

## 3. 副作用与后续处理影响

- **首行缩进继承：** 代码在触发公式排版重构时，极易继承公式所在段落原有的格式（如正文首行缩进）。这将导致重新渲染的公式中心点整体右移，无法在页面绝对居中。需要手动清除相关公式段落的"首行缩进"设定，或在样式表中统一修正。
- **行内公式的强制转换：** 为避免遗漏视觉独立但底层仍属 wdOMathInline 的对象，引入了短段落自动升级为行间公式的诊断逻辑。该机制会将极短行内的零散公式强制扩充为独立段落并编号，若出现误伤，需后期人工审阅并复原。
