# V — 剪贴板管理 + 截屏工具 设计文档

## Context

日常使用 Maccy（剪贴板管理）和 Snipaste（截屏工具）两个独立应用，希望将它们的核心功能合并为一个自研 Electron 桌面应用。技术栈与已有的 TodoList-zhe 项目保持一致，便于复用经验和开发模式。

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 构建工具 | electron-vite + Vite 6 |
| UI 框架 | React 19 + TypeScript 5.7 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 数据持久化 | electron-store |
| 包管理 | Yarn (PnP) |
| 打包分发 | electron-builder (macOS) |

## 架构

### 进程模型

**主进程 (Main Process)** 负责：
- Tray 菜单栏图标管理
- 剪贴板内容轮询监听（~500ms 间隔）
- 全局快捷键注册与管理（globalShortcut）
- 窗口生命周期管理（创建/销毁/显隐）
- 数据存储（electron-store）

**渲染进程窗口：**

| 窗口 | 类型 | 说明 |
|------|------|------|
| 剪贴板弹窗 | BrowserWindow | 菜单栏下方弹出，搜索+列表 |
| 截屏覆盖层 + 标注 | BrowserWindow (全屏透明) | desktopCapturer 冻结画面 + 区域选择 + 标注编辑（同一窗口两阶段） |
| 贴图浮窗 | BrowserWindow (无边框置顶) | 每张贴图一个独立窗口 |

### 数据流

**剪贴板流程：**
系统剪贴板变化 → 主进程轮询检测 → 存入 electron-store → IPC 通知弹窗更新 → 用户选择条目 → 写回系统剪贴板 → 模拟 Cmd+V 粘贴到前台应用

**截屏流程：**
快捷键触发 → desktopCapturer 截取全屏 → 显示全屏透明覆盖层 → 用户拖拽框选区域 → 裁剪图片 → 打开标注画布 → 标注完成 → 保存/复制/创建贴图浮窗

**贴图流程：**
标注完成点击"贴图" 或 快捷键触发 → 读取剪贴板图片数据 → 创建新的无边框置顶窗口 → 显示图片

## 功能一：剪贴板管理

### 核心行为
- 主进程每 ~500ms 轮询 `clipboard.readText()`，检测内容变化
- 新内容去重后存入 electron-store，按时间倒序排列
- 默认保留最近 200 条历史，超出自动淘汰最旧条目
- 密码管理器复制的内容不做特殊处理（第一版）

### 弹窗 UI
- **位置**：出现在菜单栏 Tray 图标正下方
- **主题**：深色主题，与 macOS 暗色模式协调
- **宽度**：340px 固定宽度
- **结构**：搜索框 + 历史列表 + 底部快捷键提示

### 每条记录显示
- 文本内容预览（单行截断，长文本显示两行）
- 相对时间（10 秒前、2 分钟前等）
- 来源应用名称（如果系统可获取）
- 前 9 条显示 ⌘+数字 快捷键标签

### 交互规格

**唤起与关闭：**
- 快捷键唤起（默认 Shift+Cmd+C，用户可配置）
- 点击菜单栏图标唤起
- 点击外部区域自动关闭（blur 事件）
- 选择条目后自动关闭
- Esc 关闭

**键盘操作：**
- 直接打字 → 实时搜索过滤历史列表
- ↑ ↓ 键选择条目
- Enter 粘贴选中条目到前台应用
- ⌘+数字（1-9）快速粘贴对应条目
- Delete/Backspace 删除选中条目
- ⌘+Backspace 清空全部历史（需确认）

## 功能二：截屏工具

### 阶段一：区域选择

**触发方式：**
- 全局快捷键（默认 F1，用户可配置）

**覆盖层行为：**
1. 主进程调用 `desktopCapturer.getSources({ types: ['screen'] })` 获取全屏截图
2. 创建全屏透明 BrowserWindow（每个显示器一个），覆盖在所有窗口之上
3. 将截图作为背景显示，叠加半透明暗色遮罩（rgba(0,0,0,0.45)）
4. 用户拖拽鼠标绘制选区，选区内显示原始清晰图像
5. 选区四角和四边中点显示 8 个调整手柄，可二次调整大小
6. 选区左上方显示尺寸指示器（像素宽×高）

**快捷操作：**
- Esc 取消截屏
- Space 选择全屏
- 拖拽完成后双击或 Enter 确认选区，进入标注模式

### 阶段二：标注编辑

> 标注在同一个全屏覆盖层窗口内进行（不另开窗口）。选区确认后，覆盖层锁定选区，工具栏出现在选区正下方。标注直接在选区的 Canvas 上绘制。

**画布：**
- 使用 Canvas 2D API 渲染
- 截图作为底层，标注元素叠加在上方
- 支持撤销/重做（操作栈）

**工具栏（底部浮动）：**
- 矩形工具：拖拽绘制矩形框
- 箭头工具：拖拽绘制带箭头的线段
- 文字工具：点击后输入文字，可拖拽定位
- 自由画笔：自由绘制线条

**工具参数：**
- 颜色选择：预设几种常用颜色 + 自定义
- 线宽调节：细/中/粗三档

**操作：**
- 撤销 (⌘+Z) / 重做 (⌘+Shift+Z)

**输出操作：**
- 保存到文件（默认 ~/Pictures/V/，可配置）
- 复制到剪贴板
- 创建贴图浮窗

### 阶段三：贴图浮窗

**窗口属性：**
- 无边框（frameless）
- 始终置顶（alwaysOnTop）
- 可拖拽移动
- 多个贴图窗口可同时存在

**交互：**
- 拖拽移动位置
- 滚轮缩放大小
- Ctrl + 滚轮调节透明度
- 鼠标悬停显示迷你工具栏（置顶切换、鼠标穿透切换、关闭）
- 双击关闭当前贴图

**贴图触发方式：**
- 标注完成后点击"贴图"按钮
- 全局快捷键（默认 F3，用户可配置）从剪贴板图片创建贴图

## 全局快捷键

| 功能 | 默认快捷键 | 说明 |
|------|-----------|------|
| 唤起剪贴板 | Shift+Cmd+C | 显示/隐藏剪贴板弹窗 |
| 截屏 | F1 | 进入区域选择模式 |
| 贴图 | F3 | 将剪贴板图片创建为浮窗 |

所有快捷键均可由用户在设置中自定义。

## 数据存储

使用 electron-store 存储：
- `clipboardHistory`: 剪贴板历史记录数组（最近 200 条）
- `settings.shortcuts`: 快捷键配置
- `settings.historyLimit`: 历史条数上限
- `settings.screenshotSavePath`: 截图保存路径（默认 ~/Pictures/V/）
- `settings.autoStart`: 是否开机自启

## 项目结构

```
V/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 入口：app 生命周期、Tray、全局快捷键
│   │   ├── clipboard-monitor.ts # 剪贴板轮询监听
│   │   ├── window-manager.ts    # 窗口创建与管理
│   │   ├── screenshot.ts        # desktopCapturer 截屏逻辑
│   │   ├── store.ts             # electron-store 初始化与操作
│   │   └── ipc-handlers.ts      # IPC 消息处理
│   ├── preload/
│   │   └── index.ts             # contextBridge 暴露安全 API
│   └── renderer/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── types.ts
│       │   ├── store.ts         # Zustand store
│       │   ├── components/
│       │   │   ├── clipboard/
│       │   │   │   ├── ClipboardPopup.tsx
│       │   │   │   ├── ClipboardItem.tsx
│       │   │   │   └── SearchBar.tsx
│       │   │   ├── screenshot/
│       │   │   │   ├── ScreenshotOverlay.tsx  # 覆盖层主组件（选区+标注两阶段）
│       │   │   │   ├── RegionSelector.tsx
│       │   │   │   ├── SizeIndicator.tsx
│       │   │   │   ├── AnnotationCanvas.tsx
│       │   │   │   ├── Toolbar.tsx
│       │   │   │   └── tools/
│       │   │   │       ├── RectTool.ts
│       │   │   │       ├── ArrowTool.ts
│       │   │   │       ├── TextTool.ts
│       │   │   │       └── PenTool.ts
│       │   │   └── pin/
│       │   │       └── PinWindow.tsx
│       │   └── styles/
│       │       └── index.css    # Tailwind 入口
│       └── index.html
├── resources/                   # 应用图标
├── electron.vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .gitignore
```

## 验证方案

### 剪贴板功能验证
1. 启动应用，确认菜单栏出现 Tray 图标
2. 在其他应用中复制文本，确认弹窗中出现新条目
3. 快捷键唤起弹窗，键盘导航选择条目，Enter 粘贴到前台应用
4. 搜索过滤功能正常
5. 删除条目、清空历史功能正常

### 截屏功能验证
1. 按 F1 触发截屏，确认全屏覆盖层正常显示
2. 拖拽选区，确认选区高亮和尺寸指示正常
3. 确认选区后进入标注模式
4. 分别测试矩形、箭头、文字、画笔四个工具
5. 测试撤销/重做
6. 保存到文件、复制到剪贴板、创建贴图三种输出

### 贴图功能验证
1. 截图标注后点击"贴图"，确认浮窗出现
2. 拖拽移动、滚轮缩放正常
3. 透明度调节正常
4. 多个贴图窗口共存
5. 双击关闭贴图
6. F3 从剪贴板图片创建贴图
