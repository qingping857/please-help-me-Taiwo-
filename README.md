# 语音转文字平台

一个基于 Next.js 和 OpenAI Whisper API 的语音转文字平台，支持文件上传和录音转换，提供类 ChatGPT 的交互界面。

## 项目结构

```
video-to-text/
├── src/
│   ├── app/                    # Next.js 应用主目录
│   │   ├── api/               # API 路由
│   │   │   └── whisper/      # Whisper API 代理
│   │   ├── layout.tsx        # 全局布局组件
│   │   └── page.tsx         # 首页组件
│   ├── components/           # 组件目录
│   │   ├── chat/            # 聊天相关组件
│   │   │   ├── chat-list.tsx    # 消息列表
│   │   │   ├── chat-input.tsx   # 输入区域
│   │   │   └── message.tsx      # 消息组件
│   │   └── ui/              # UI 组件
│   ├── lib/                  # 工具函数和配置
│   │   ├── whisper.ts       # Whisper API 客户端
│   │   └── audio-recorder.ts # 音频录制工具
│   └── hooks/               # 自定义 Hooks
│       └── use-recorder.ts  # 录音 Hook
```

## 功能特性

- 支持音频文件拖拽上传
- 支持录音功能
- 支持多种音频格式
- ChatGPT 风格的对话界面
- 流式输出转写结果
- 优雅的用户界面

## 技术栈

- **前端框架**: React 19 + Next.js
- **样式方案**: Tailwind CSS + shadcn/ui
- **语音服务**: OpenAI Whisper API (DeerAPI 代理)
- **开发语言**: TypeScript

## 环境要求

- Node.js 18+
- npm 或 yarn

## 配置说明

项目运行需要以下环境变量：

```env
DEER_API_KEY=你的DeerAPI密钥
```

## 开发进度

### 已完成功能
- [x] 项目基础架构搭建
- [x] ChatGPT 风格界面实现

### 进行中功能
- [ ] 文件拖拽上传
- [ ] 音频录制功能
- [ ] Whisper API 集成

### 待开发功能
- [ ] 历史记录管理
- [ ] 导出功能
- [ ] 批量处理
