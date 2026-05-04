---
title: 一份批量导出powerpoint备注为word的VBA代码
date: 2025-05-22 10:45:58
tags:
  - PowerPoint
  - VBA
---

# PowerPoint 备注导出 的 VBA 脚本

## 概述

此 VBA 脚本（`ExportNotesToWord.vba`）用于从 Microsoft PowerPoint 演示文稿中批量提取幻灯片备注，并将其整理为格式化的 Microsoft Word 文档。每个备注前会标注对应的幻灯片编号，排版清晰，适合需要汇总和整理 PPT 备注的场景。

## 功能

- 提取所有幻灯片的备注内容。
- 在 Word 文档中以“幻灯片 X:”为标题标注备注来源。
- 自动将输出保存为 Word 文档（`PPT_Notes.docx`），位于 PPT 文件同一目录。
- 不会修改原始 PPT 文件，仅执行只读操作。

## 代码

```visual basic
Sub ExportNotesToWord()
    Dim pptApp As PowerPoint.Application
    Dim pres As PowerPoint.Presentation
    Dim sld As PowerPoint.Slide
    Dim wdApp As Object
    Dim wdDoc As Object
    Dim i As Integer
    
    ' 打开当前演示文稿
    Set pptApp = Application
    Set pres = pptApp.ActivePresentation
    
    ' 创建 Word 应用程序
    On Error Resume Next
    Set wdApp = GetObject(, "Word.Application")
    If wdApp Is Nothing Then
        Set wdApp = CreateObject("Word.Application")
    End If
    wdApp.Visible = True
    Set wdDoc = wdApp.Documents.Add
    
    ' 设置 Word 文档标题
    wdDoc.Paragraphs.Add
    wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Font.Size = 16
    wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Font.Bold = True
    wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Text = "PowerPoint 备注导出" & vbCrLf
    
    ' 遍历每页幻灯片
    For Each sld In pres.Slides
        i = sld.SlideIndex
        If Len(sld.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text) > 0 Then
            ' 添加幻灯片编号
            wdDoc.Paragraphs.Add
            wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Font.Size = 12
            wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Font.Bold = True
            wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Text = "幻灯片 " & i & ":" & vbCrLf
            
            ' 添加备注内容
            wdDoc.Paragraphs.Add
            wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Font.Size = 10
            wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Font.Bold = False
            wdDoc.Paragraphs(wdDoc.Paragraphs.Count).Range.Text = sld.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text & vbCrLf
            
        End If
    Next sld
    
    ' 保存 Word 文档
    wdDoc.SaveAs (pres.Path & "\PPT_Notes.docx")
    wdDoc.Close
    wdApp.Quit
    
    ' 清理对象
    Set wdDoc = Nothing
    Set wdApp = Nothing
    Set pres = Nothing
    Set pptApp = Nothing
    
    MsgBox "备注已成功导出到 " & pres.Path & "\PPT_Notes.docx"
End Sub
```



## 使用步骤

1. 打开 PowerPoint

    ：

    - 确保目标 PPT 文件已打开。
    - 文件必须已保存到本地磁盘（未保存的新文件会导致路径错误）。

2. 启用 VBA 宏

    ：

    - 按 `Alt + F11` 打开 VBA 编辑器。
    - 在 PowerPoint 中启用宏（“文件” > “信息” > “启用内容”）。

3. 插入脚本

    ：

    - 在 VBA 编辑器中，点击“插入” > “模块”。
    - 复制并粘贴提供的 VBA 代码（见原始脚本）。

4. 运行脚本

    ：

    - 在 VBA 编辑器中按 `F5` 运行脚本，或在 PowerPoint 中添加按钮运行。
    - 脚本将生成 `PPT_Notes.docx` 文件，位于 PPT 文件所在目录。

5. 检查输出

    ：

    - 打开生成的 Word 文档，确认备注内容和排版是否正确。

## 注意事项

- **备份文件**：运行脚本前，建议备份 PPT 文件，以防意外情况（如 PowerPoint 崩溃）。
- **依赖 Microsoft Word**：脚本需要系统中安装 Microsoft Word。如果未安装 Word，可修改脚本输出为文本文件（需要额外调整代码）。
- **文件路径**：确保 PPT 文件已保存，且所在文件夹有写入权限，否则可能无法生成 Word 文档。
- **备注为空**：如果某页幻灯片没有备注，脚本会自动跳过该页。
- **路径编码**：避免 PPT 文件路径包含特殊字符（特别是非英文字符），可能导致路径解析错误。
- **宏安全性**：仅运行来自可信来源的脚本，避免潜在安全风险。
- **测试环境**：建议先用小型 PPT 文件测试脚本，确保输出符合预期。

## 伪代码

以下是脚本的核心逻辑，精简为伪代码形式：

```
初始化 PowerPoint 应用程序和当前演示文稿
创建新的 Word 文档
在 Word 文档中添加标题 "PowerPoint 备注导出"

对于每页幻灯片：
    获取幻灯片编号
    如果幻灯片有备注：
        在 Word 文档中添加标题 "幻灯片 X:"
        设置标题和内容的字体样式（大小、加粗等）
        添加备注内容

将 Word 文档保存为 "PPT_Notes.docx"（位于 PPT 文件目录）
关闭 Word 文档和应用程序
显示完成提示
清理对象
```

## 输出格式

- **文件**：`PPT_Notes.docx`

- 结构

    ：

    - 标题：`PowerPoint 备注导出`（16 号字体，加粗）
    - 每页备注：
        - 标题：`幻灯片 X:`（12 号字体，加粗）
        - 内容：备注文本（10 号字体，常规）

- **位置**：与 PPT 文件同一目录
