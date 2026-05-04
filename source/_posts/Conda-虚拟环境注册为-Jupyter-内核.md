---
toc_depth: 2
title: Conda 虚拟环境注册为 Jupyter 内核
date: 2025-08-10 22:51:40
tags:
  - Python
  - Conda
  - Jupyter
---

# Conda 虚拟环境注册为 Jupyter 内核



## 1. 摘要

本文档阐述了将一个已存在的 Conda 虚拟环境注册为 Jupyter Notebook 或 JupyterLab 内核的标准流程。该操作使得在 Jupyter 环境中可以方便地切换和使用不同虚拟环境的 Python 解释器及其安装的库，从而实现项目间的环境隔离。



## 2. 先决条件

在开始之前，请确保系统满足以下条件：

- **Conda 已安装**：Anaconda 或 Miniconda 发行版均可。
- **Jupyter 已安装**：系统中已安装 Jupyter Notebook 或 JupyterLab。通常建议在 `base` 环境中安装。
- **目标虚拟环境已创建**：你希望添加为内核的 Conda 虚拟环境已经通过 `conda create` 命令创建完毕。



## 3. 操作步骤

以下步骤将指导你完成环境的内核注册。



### 步骤 1：激活目标 Conda 环境

打开终端（Terminal 或 Anaconda Prompt），激活你希望作为 Jupyter 内核的 Conda 虚拟环境。

```bash
conda activate <your_env_name>
```

**说明**：将 `<your_env_name>` 替换为你的虚拟环境的实际名称。后续所有命令都应在该激活的环境下执行。



### 步骤 2：在环境中安装 `ipykernel`

Jupyter 通过 `ipykernel` 包与特定环境的 Python 解释器进行交互。因此，目标环境中必须安装此包。

```bash
conda install -c conda-forge ipykernel
```

或者，如果你的环境中主要使用 pip 管理包：

```bash
pip install ipykernel
```

**建议**：在 Conda 环境中，优先使用 `conda install` 以保证依赖关系的一致性。



### 步骤 3：将环境注册为 Jupyter 内核



执行以下命令，将当前已激活的环境注册到 Jupyter 的内核列表中。

Bash

```
python -m ipykernel install --user --name "<kernel_name>" --display-name "Python (<display_env_name>)"
```

**参数说明**：

- `--user`：为当前用户安装内核。这可以避免权限问题，并将内核配置文件安装在用户目录下，而不是系统目录。
- `--name "<kernel_name>"`：为内核指定一个内部名称。Jupyter 在后台使用此名称进行管理。**最佳实践**是将其设置为与你的 Conda 环境名称一致，即 `<your_env_name>`。
- `--display-name "Python (<display_env_name>)"`：设置在 Jupyter UI 中显示的名称。为了便于识别，建议使用一个清晰、可读的名称，例如 `Python (data-analysis-env)`。

示例：

假设你的环境名为 data_sci，推荐的命令如下：

```bash
conda activate data_sci
python -m ipykernel install --user --name "data_sci" --display-name "Python (data_sci)"
```



## 4. 验证内核



完成上述步骤后，验证内核是否已成功添加。

1. **启动 Jupyter**：在终端中启动 Jupyter Notebook 或 JupyterLab。

   ```bash
   # 启动 JupyterLab
   jupyter lab
   
   # 或者启动 Jupyter Notebook
   jupyter notebook
   ```

2. **检查内核列表**：

   - 在 JupyterLab 中，启动器（Launcher）页面应显示新的内核名称 `Python (<display_env_name>)`。
   - 在 Jupyter Notebook 中，点击右上角的 "New" 按钮，下拉菜单中应包含新的内核。
   - 对于已有的 notebook 文件，可以通过菜单栏的 "Kernel" -> "Change Kernel" 来切换到新添加的内核。



## 5. 内核管理

### 查看所有已注册的内核

可以使用以下命令列出 Jupyter 当前可用的所有内核及其配置文件所在位置。

```bash
jupyter kernelspec list
```



### 移除已注册的内核

如果需要移除一个不再使用的内核，请使用以下命令。

```bash
jupyter kernelspec uninstall <kernel_name>
```

**说明**：将 `<kernel_name>` 替换为你在步骤 3 中使用 `--name` 参数设置的内部名称。

示例：

要移除名为 data_sci 的内核：

```bash
jupyter kernelspec uninstall data_sci
```