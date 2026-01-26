---
title: LaTeX 迁移 Word：公式
categories: 
  - 存档
tag: 
  - LaTeX
  - Word
  - MathType
---

## **Word 中批量替换 TeX 公式分隔符**

### **背景问题**

在 Microsoft Word 中，需要将所有使用 `$$...$$` 作为分隔符的行间TeX公式，批量替换为使用 `\[...\]` 的标准格式，以便 MathType 正常工作，将其转换为行间公式而非行内（内联）公式。标准的“查找与替换”功能在执行此任务时，可能会因Word自身的Bug而失败。

本文档提供一种经过验证的解决方案：一种是绕过Bug的GUI操作方法。另外提供更稳定高效但尚未经验证的 VBA 宏方法。

### **方法一：分步通配符替换法 (GUI操作)**

此方法通过将一个复杂的替换操作分解为三个简单的步骤，巧妙地规避了Word的内部Bug，无需使用宏即可完成任务。该方法经本人和多个 AI 交流，并在 Word 2019 中测试迭代得到。

#### **核心原理：规避Word Bug**

此方法的根本原因在于，Word的“查找和替换”功能在使用通配符时存在一个Bug：当“替换为”框中同时包含**反向引用代码（如 `\1`）**和**特殊字符（如 `[` 或 `]`）**时，替换引擎会发生冲突并导致操作失败。

本方法通过使用临时的、不含特殊字符的文本占位符来完成替换，然后再将占位符替换为最终的目标字符，从而绕开此Bug。

#### **操作步骤**

**第1步：使用通配符和临时标记替换公式**

1. 按下 `Ctrl + H` 打开“查找和替换”对话框。

2. 点击 **“更多 >>”** 并勾选 **“使用通配符 (Use wildcards)”**。

3. 填写以下内容：

   - **查找内容 (Find what):** `$$(\*)$$`

   - 替换为 (Replace with): TEMP_OPEN\1TEMP_CLOSE

     (注：TEMP_OPEN 和 TEMP_CLOSE 是自定义的临时标记，可替换为任何您文档中不存在的独特字符串)

4. 点击 **“全部替换 (Replace All)”**。

**第2步：替换“开始标记”**

1. **取消勾选** “使用通配符 (Use wildcards)”。
2. 填写以下内容：
   - **查找内容 (Find what):** `TEMP_OPEN`
   - **替换为 (Replace with):** `\[ `  *(注意`[`后**可以**有空格)*
3. 点击 **“全部替换 (Replace All)”**。

**第3步：替换“结束标记”**

1. 继续保持“使用通配符”为**未勾选**状态。
2. 填写以下内容：
   - **查找内容 (Find what):** `TEMP_CLOSE`
   - **替换为 (Replace with):** ` \]`  *(注意`]`前**可以**有空格)*
3. 点击 **“全部替换 (Replace All)”**。

至此，全部替换操作完成。

### **方法二：使用VBA宏一键替换**

此方法通过在 Word 中运行一段 VBA(Visual Basic for Applications) 代码，实现一键式的替换。它能完全绕过 GUI 界面的 Bug~~，甚至可以处理 GUI 方法无法解决的跨段落公式问题【Gemini 的幻觉，验证发现实际可以处理跨段落内容】~~。

#### **VBA 代码**

```visual basic
Sub ReplaceTeXDisplayMathDelimiters()
    ' 功能：将文档中所有的 $$...$$ TeX行间公式分隔符替换为 \[...\]
    ' 版本：1.0
    ' 优点：可靠，可跨段落，一键完成
    
    ' 关闭屏幕更新以提高速度
    Application.ScreenUpdating = False
    
    Dim searchRange As Range
    Set searchRange = ActiveDocument.Content
    
    ' 清理查找和替换的格式设置
    searchRange.Find.ClearFormatting
    searchRange.Find.Replacement.ClearFormatting
    
    With searchRange.Find
        .Text = "$$*$$" ' 注意：在VBA中查找模式略有不同
        .Replacement.Text = ""
        .Forward = True
        .Wrap = wdFindStop ' 在文档末尾停止
        .Format = False
        .MatchCase = False
        .MatchWholeWord = False
        .MatchWildcards = True ' 启用通配符
        .MatchSoundsLike = False
        .MatchAllWordForms = False
        
        Dim replacementText As String
        
        ' 循环执行查找
        Do While .Execute
            ' .Execute成功后，匹配到的内容就在 searchRange 对象中
            
            ' 提取公式内容（去掉前后的$$）
            Dim content As String
            content = Mid(searchRange.Text, 3, Len(searchRange.Text) - 4)
            
            ' 构建新的替换文本
            replacementText = "\[ " & content & " \]"
            
            ' 用新文本替换掉原来的匹配范围
            searchRange.Text = replacementText
            
            ' 将搜索范围折叠到替换后的末尾，以继续向后查找
            searchRange.Collapse wdCollapseEnd
        Loop
    End With
    
    ' 恢复屏幕更新
    Application.ScreenUpdating = True
    
    ' 给出完成提示
    MsgBox "全部分隔符替换完成。", vbInformation

End Sub
```

#### **使用说明**

1. 在Word中，按下键盘快捷键 `Alt + F11` 打开VBA编辑器。
2. 在左侧的工程项目浏览器中，找到您的文档名（通常是 `Project (YourDocumentName)`)。
3. 右键点击您的文档名，选择 **插入 (Insert)** -> **模块 (Module)**。
4. 将上面的VBA代码 **完整复制** 并粘贴到右侧新出现的空白代码窗口中。
5. 点击工具栏中的 **绿色三角“运行”按钮** (或按 `F5` 键) 来执行宏。
6. 脚本运行后会弹出一个提示框告知操作完成。
7. 未来若要再次运行此宏，只需打开任意Word文档，按下 `Alt + F8`，在列表中选择 `ReplaceTeXDisplayMathDelimiters` 并点击“运行”即可。

#### **重要风险与安全提示**

- **备份先行**：在运行任何宏之前，建议**首先备份原始文档**。宏操作会直接修改文档内容，且可能无法通过“撤销”(Ctrl+Z)来回退。
- **未经测试**：尽管此代码是为解决该特定问题而编写的，但仅为 AI 生成内容，尚未进行测试。