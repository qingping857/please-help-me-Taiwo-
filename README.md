# Voice-to-Text 语音转文字平台

一个优雅、现代的语音转文字平台，支持多语言转换、实时转录和文本编辑功能。

## 项目结构

```
video-to-text/
├── src/
│   ├── app/                    # Next.js 应用主目录
│   │   ├── layout.tsx         # 全局布局组件
│   │   ├── page.tsx          # 首页组件
│   │   └── globals.css       # 全局样式
│   ├── components/            # 组件目录
│   │   ├── ui/               # shadcn UI 组件
│   │   │   ├── button.tsx    # 按钮组件
│   │   │   ├── card.tsx      # 卡片组件
│   │   │   ├── select.tsx    # 选择器组件
│   │   │   └── sheet.tsx     # 抽屉组件
│   │   └── layout/           # 布局相关组件
│   │       ├── sidebar.tsx   # 侧边栏组件
│   │       └── main-content.tsx # 主内容区组件
│   ├── lib/                   # 工具函数和配置
│   │   ├── utils.ts         # 通用工具函数
│   │   └── openai.ts        # OpenAI API 配置
│   └── hooks/                # 自定义 Hooks
│       └── use-recorder.ts   # 录音功能 Hook
├── public/                    # 静态资源目录
├── tailwind.config.ts        # Tailwind CSS 配置
└── package.json              # 项目依赖配置
```

## 技术栈

- **前端框架**: React 19 + Next.js
- **样式方案**: Tailwind CSS + shadcn/ui
- **动画效果**: Framer Motion
- **音频处理**: MediaRecorder API
- **AI 服务**: OpenAI Whisper API

## 功能特性

### 已完成功能
- [x] 项目基础架构搭建
- [x] 基础UI组件集成
- [x] 语音录制功能
- [x] 实时语音转文字
- [x] 多语言支持

### 开发中功能
- [ ] 文字编辑界面
- [ ] 历史记录管理

### 待开发功能
1. 文本编辑功能
   - 实时文本编辑
   - 格式化工具
   - 文本导出功能

2. 历史记录管理
   - 会话历史列表
   - 历史记录查看
   - 历史记录搜索

## 已实现功能说明

### 1. 语音录制
- 支持开始/暂停/继续/停止录音
- 实时显示录音时长
- 录音状态动画反馈

### 2. 语音转文字
- 支持多语言转换（中文、英语、日语、韩语、法语）
- 使用 OpenAI Whisper API 进行高精度转录
- 打字机效果的文本显示

### 3. 用户界面
- ChatGPT 风格的对话界面
- 响应式设计（支持移动端和桌面端）
- 优雅的动画效果
- 音频预览功能

## 使用说明

1. 安装依赖
```bash
npm install
```

2. 运行开发服务器
```bash
npm run dev
```

3. 使用方法
   - 选择目标语言
   - 点击"开始录音"按钮
   - 说话
   - 点击"停止录音"按钮
   - 等待文字转换完成

## 项目进度

- [x] 项目初始化
- [x] 基础依赖安装
- [x] 核心功能开发
  - [x] 语音录制
  - [x] 语音转文字
  - [x] 多语言支持
- [x] 基础 UI/UX 实现
- [ ] 文本编辑功能
- [ ] 历史记录管理
- [ ] 测试和优化
