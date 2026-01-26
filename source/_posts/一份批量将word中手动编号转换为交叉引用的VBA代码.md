---
title: 一份批量将word中手动编号转换为交叉引用的VBA代码
date: 2025-03-01 15:43:20
tags:
  - Word
  - 排版
  - VBA
---

# 添加图表交叉引用的 VBA 脚本

## 功能概述

此VBA宏用于将Word文档中的纯文本图表编号转换为Word自动题注和交叉引用系统，实现以下功能：

1. 将格式为"图x-x 描述"的纯文本图题转换为Word自动题注
2. 将格式为"图x-x所示"的文本引用转换为交叉引用链接
3. 保持章节-序号的编号格式
4. 在生成的题注后添加原有的描述文本

## 使用前提

- 文档中的图题必须遵循"图x-x 描述"的格式（如"图2-1 系统架构图"）
- 文本引用必须遵循"图x-x所示"的格式（如"如图2-1所示"）
- 必须在Word中启用宏

## 代码

```vb
Sub 创建图表交叉引用系统()
    Dim doc As Document
    Dim rng As Range, searchRng As Range
    Dim figPattern As String, refPattern As String
    Dim figCount As Integer, refCount As Integer
    Dim captionLabels As Object
    
    ' 设置文档对象
    Set doc = ActiveDocument
    
    ' 创建字典对象用于存储图表编号与新编号的映射
    Set captionLabels = CreateObject("Scripting.Dictionary")
    
    ' 初始化计数器
    figCount = 0
    refCount = 0
    
    ' 添加"图"标签，如果尚未存在
    On Error Resume Next
    ActiveDocument.captionLabels.Add "图"
    On Error GoTo 0
    
    ' =============== 第一部分：查找图题并创建题注 ===============
    ' 设置图题查找模式 - 查找"图x-x 描述"格式
    figPattern = "图[0-9]-[0-9] *"
    
    ' 创建一个范围包含整个文档
    Set rng = doc.Range
    
    ' 开始查找图题并创建题注
    With rng.Find
        .ClearFormatting
        .Text = figPattern
        .Replacement.ClearFormatting
        .Replacement.Text = ""
        .Forward = True
        .Wrap = wdFindStop
        .Format = False
        .MatchCase = False
        .MatchWholeWord = False
        .MatchWildcards = True
        
        ' 查找图题
        Do While .Execute
            figCount = figCount + 1
            
            ' 提取当前图表编号 (图x-x)
            Dim figText As String, figNum As String
            figText = rng.Text
            
            ' 确保提取正确的图号部分（如"图2-1"）
            Dim spacePos As Integer
            spacePos = InStr(figText, " ")
            If spacePos > 0 Then
                figNum = Left(figText, spacePos - 1)
            Else
                figNum = figText
            End If
            
            ' 保存原始图号与序号的映射
            If Not captionLabels.Exists(figNum) Then
                captionLabels.Add figNum, figCount
            End If
            
            ' 保存当前位置、原始文本和格式
            Dim origStart As Long, origEnd As Long, origText As String
            Dim origFontName As String, origFontSize As Single, origFontBold As Boolean, origFontItalic As Boolean
            Dim origParaAlignment As Long, origParaSpaceBefore As Single, origParaSpaceAfter As Single
            
            origStart = rng.Start
            origEnd = rng.End
            origText = rng.Text
            
            ' 保存原始字体格式
            origFontName = rng.Font.Name
            origFontSize = rng.Font.Size
            origFontBold = rng.Font.Bold
            origFontItalic = rng.Font.Italic
            
            ' 保存原始段落格式
            origParaAlignment = rng.Paragraphs(1).Alignment
            origParaSpaceBefore = rng.Paragraphs(1).SpaceBefore
            origParaSpaceAfter = rng.Paragraphs(1).SpaceAfter
            
            ' 提取描述部分
            Dim descText As String
            If spacePos > 0 And spacePos < Len(origText) Then
                descText = Mid(origText, spacePos + 1)
            Else
                descText = ""
            End If
            
            ' 替换为题注并手动控制空格
            rng.Text = ""
            
            ' 插入题注，不使用自动空格
            rng.InsertCaption Label:="图", Position:=wdCaptionPositionBelow, ExcludeLabel:=0
            
            ' 应用原始格式到新插入的内容
            Dim newRng As Range
            Set newRng = doc.Range(origStart, rng.End)
            
            ' 应用字体格式
            newRng.Font.Name = origFontName
            newRng.Font.Size = origFontSize
            newRng.Font.Bold = origFontBold
            newRng.Font.Italic = origFontItalic
            
            ' 应用段落格式
            newRng.Paragraphs(1).Alignment = origParaAlignment
            newRng.Paragraphs(1).SpaceBefore = origParaSpaceBefore
            newRng.Paragraphs(1).SpaceAfter = origParaSpaceAfter
            
            ' 直接查找插入的题注并定位到其末尾
            ' 题注会在当前位置生成一个字段
            ' 我们需要找到这个位置的最后一个字段
            Dim fldRng As Range
            Set fldRng = doc.Range(rng.Start, rng.Start + 100) ' 创建一个合理范围查找
            
            ' 在这个范围内搜索插入的题注字段
            If fldRng.Fields.Count > 0 Then
                ' 找到最后插入的字段
                Dim fld As Field
                Set fld = fldRng.Fields(fldRng.Fields.Count)
                
                ' 将光标定位到域的结尾
                rng.Start = fld.Result.End
                rng.End = fld.Result.End
            Else
                ' 如果找不到字段，使用替代方法
                ' 直接尝试找到插入的标题文本的结束位置
                ' 标题通常包含"图"和数字
                Dim captionText As String
                captionText = rng.Text
                
                ' 重新定位到当前文本末尾
                rng.Start = rng.Start + Len(captionText)
                rng.End = rng.Start
            End If
            
            ' 在域结束后添加空格和描述
            rng.InsertAfter " " & descText
            
            ' 设置新的查找范围
            rng.Start = origStart + Len(rng.Text)
            rng.End = doc.Content.End
        Loop
    End With
    
    ' 更新文档中的域
    doc.Fields.Update
    
    ' =============== 第二部分：查找文本引用并替换为交叉引用 ===============
    If figCount > 0 Then
        ' 设置引用查找模式 - 扩大匹配范围，查找"图x-x所示"格式
        refPattern = "图[0-9]-[0-9]所示"
        
        ' 重置查找范围为整个文档
        Set searchRng = doc.Range
        
        ' 开始查找引用并替换为交叉引用
        With searchRng.Find
            .ClearFormatting
            .Text = refPattern
            .Replacement.ClearFormatting
            .Replacement.Text = ""
            .Forward = True
            .Wrap = wdFindStop
            .Format = False
            .MatchCase = False
            .MatchWholeWord = False
            .MatchWildcards = True
            
            ' 查找引用
            Do While .Execute
                ' 提取引用的图表编号
                Dim refText As String, refFigNum As String
                refText = searchRng.Text
                ' 提取数字部分 "x-x"
                refFigNum = Mid(refText, 2, InStr(refText, "所示") - 2)
                
                ' 添加"图"前缀以匹配字典键值
                refFigNum = "图" & refFigNum
                
                ' 检查这个图表编号是否有对应的题注编号
                If captionLabels.Exists(refFigNum) Then
                    refCount = refCount + 1
                    
                    ' 获取对应的题注编号
                    Dim captionNum As Integer
                    captionNum = captionLabels(refFigNum)
                    
                    ' 保存原始位置
                    Dim refOrigStart As Long, refOrigEnd As Long
                    refOrigStart = searchRng.Start
                    refOrigEnd = searchRng.End
                    
                    ' 替换文本
                    searchRng.Text = "所示"
                    
                    ' 定位到插入点
                    searchRng.Start = refOrigStart
                    searchRng.End = searchRng.Start
                    
                    ' 插入交叉引用
                    searchRng.InsertCrossReference ReferenceType:="图", ReferenceKind:=wdOnlyLabelAndNumber, _
                        ReferenceItem:=captionNum, InsertAsHyperlink:=True
                End If
                
                ' 设置新的查找范围
                searchRng.Start = searchRng.End
                searchRng.End = doc.Content.End
            Loop
        End With
        
        ' 更新文档中的所有域
        doc.Fields.Update
    End If
    
    ' 提示完成
    MsgBox "处理完成！" & vbCrLf & _
           "找到 " & figCount & " 个图表标题并创建了题注。" & vbCrLf & _
           "替换了 " & refCount & " 个文本引用为交叉引用。", vbInformation
End Sub
```

## 伪代码

```
BEGIN 创建图表交叉引用系统

    // 初始化阶段
    SET 文档对象 = 当前活动文档
    CREATE 映射字典 用于存储图表编号与新编号对应关系
    SET 图表计数器 = 0, 引用计数器 = 0
    TRY 添加"图"标签到文档题注标签列表 CATCH 忽略重复错误

    // 第一阶段：查找图题并创建题注
    SET 图题查找模式 = "图[数字]-[数字] [任意文本]"
    SET 查找范围 = 整个文档
    配置查找参数(启用通配符, 向前查找, 忽略大小写)
    
    WHILE 找到匹配的图题 DO
        INCREMENT 图表计数器
        EXTRACT 图题文本
        SPLIT 图题 INTO 图号部分, 描述部分
        
        IF 图号 NOT IN 映射字典 THEN
            ADD 图号 -> 图表计数器 TO 映射字典
        END IF
        
        SAVE 原始格式信息(位置, 文本, 字体格式, 段落格式)
        CLEAR 当前位置文本
        INSERT Word标准题注(使用"图"标签)
        RESTORE 原始格式到新题注
        LOCATE 题注字段末尾位置
        APPEND 空格 + 描述文本
        UPDATE 查找范围到下一位置
    END WHILE
    
    UPDATE 文档中所有字段

    // 第二阶段：查找文本引用并替换为交叉引用
    IF 图表计数器 > 0 THEN
        SET 引用查找模式 = "图[数字]-[数字]所示"
        RESET 查找范围 = 整个文档
        配置查找参数(启用通配符, 向前查找, 忽略大小写)
        
        WHILE 找到匹配的引用 DO
            EXTRACT 引用文本
            PARSE 图号 FROM 引用文本
            ADD "图"前缀构成完整图号
            
            IF 图号 EXISTS IN 映射字典 THEN
                INCREMENT 引用计数器
                GET 对应题注编号 FROM 映射字典
                SAVE 当前位置
                REPLACE 引用文本 WITH "所示"
                MOVE 光标到替换位置开始
                INSERT Word交叉引用(类型="图", 种类=仅标签和编号, 项目=题注编号, 超链接=是)
            END IF
            
            UPDATE 查找范围到下一位置
        END WHILE
        
        UPDATE 文档中所有字段
    END IF

    // 完成阶段
    DISPLAY "处理完成！找到" + 图表计数器 + "个图表标题并创建了题注。替换了" + 引用计数器 + "个文本引用为交叉引用。"

END 创建图表交叉引用系统
```



## 使用步骤

1. 打开包含需要处理的文档
2. 按Alt+F11打开VBA编辑器
3. 在VBA编辑器中插入新模块（Insert > Module）
4. 将提供的代码复制到模块中
5. 运行宏（按F5或在Word中通过"开发工具" > "宏" > "创建图表交叉引用系统" > "运行"）
6. 等待处理完成，将显示处理结果的消息框

## 注意事项

1. **执行前备份**：运行宏前强烈建议先备份文档
2. **编号映射**：脚本会保持原有的章节-序号格式，但会按照Word的题注系统重新编号
3. **样式保留**：宏不会更改图题的字体或段落样式
4. **大文档处理**：对于大型文档，处理可能需要一些时间

## 执行结果

执行宏后：

- 所有"图x-x 描述"格式的文本将被替换为Word自动题注系统
- 所有"图x-x所示"格式的文本引用将被替换为交叉引用
- 程序完成后会显示处理结果统计（找到的图表数量和替换的引用数量）

## 代码维护

如需修改代码以适应特定需求，可考虑以下几点：

- `figPattern`变量定义了图题的查找模式
- `refPattern`变量定义了引用的查找模式
- 可通过修改这些变量来适应不同的命名约定
