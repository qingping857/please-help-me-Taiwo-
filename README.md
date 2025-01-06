# 语音转文字应用

这是一个使用 Next.js + React + Tailwind CSS + AssemblyAI API 构建的语音转文字应用。

## 项目结构

```
src/
├── app/                    # Next.js 应用主目录
│   ├── page.tsx           # 主页面组件
│   └── layout.tsx         # 应用布局组件
├── components/            # React 组件
│   ├── chat/             # 聊天相关组件
│   └── ui/               # UI 组件 (shadcn/ui)
├── lib/                   # 工具库
│   ├── assemblyai.ts     # AssemblyAI API 配置
│   ├── speech-recognition.ts # 语音识别功能
│   ├── history.ts        # 历史记录管理
│   ├── config.ts         # 应用配置
│   └── utils.ts          # 通用工具函数
├── hooks/                # React hooks
└── types.ts              # TypeScript 类型定义

```

## 功能说明

### 已完成功能
- 音频文件上传转文字
- 录音转文字
- 历史记录管理
- 多语言支持（中文、英文、阿拉伯语）
- 使用 AssemblyAI Nano 模型进行语音识别

### 进行中的功能
- UI/UX 优化
- 性能优化

### 待开发功能
- 导出转写结果
- 批量处理音频文件
- 更多语言支持

## 技术栈
- Next.js 14
- React 19
- Tailwind CSS
- shadcn/ui 组件库
- AssemblyAI API
