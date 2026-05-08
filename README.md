# Storyboard-Copilot Mobile

📱 基于节点画布的 AI 分镜工作台 - 移动端版本

## 功能特点

- 🎨 **节点画布编辑** - 拖拽式操作，支持多种节点类型
- 🤖 **AI 图片生成** - 支持 KIE、PPIO、FAL、GRSai 等多种模型提供商
- ✂️ **分镜切割工具** - 一键将大图切割为分镜格
- 📐 **图片裁剪与标注** - 内置多种图片处理工具
- 💾 **本地存储** - 使用 IndexedDB 存储项目数据

## 快速开始

### 构建 APK

```bash
# 克隆项目
git clone https://github.com/failurefeng/Storyboard-Copilot-Mobile.git
cd Storyboard-Copilot-Mobile

# 安装依赖
npm install

# 构建 Web 应用
npm run build

# 同步到 Android
npx cap sync android

# 构建 APK
cd android
# Windows
gradlew.bat assembleDebug
# macOS / Linux
./gradlew assembleDebug
```

APK 文件位置: `android/app/build/outputs/apk/debug/app-debug.apk`

### 使用国内镜像加速构建

如果网络较慢，可以在项目中设置镜像：

```properties
# android/gradle.properties
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.14.4-all.zip
```

在 `android/build.gradle` 中添加阿里云镜像：

```groovy
allprojects {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/public' }
        google()
        mavenCentral()
    }
}
```

## 技术栈

- **前端**: React 18 + TypeScript + Zustand + @xyflow/react + TailwindCSS
- **移动端容器**: Capacitor
- **原生功能**: @capacitor/core, status-bar, filesystem, haptics, dialog
- **Web API**: Fetch API + IndexedDB

## 项目结构

```
src/
├── webApi/                    # 移动端 Web API 适配层
│   ├── webAiGateway.ts        # AI 图片生成 API
│   ├── webImageSplitGateway.ts # 分镜切割
│   ├── webImageProcessingGateway.ts # 图片处理
│   ├── webProjectGateway.ts   # IndexedDB 持久化
│   └── platform.ts            # 平台检测
├── features/
│   └── canvas/                # 画布核心功能
├── stores/                    # Zustand 状态管理
└── ...
android/                       # Android 原生项目
```

## 配置 AI 模型

首次使用时，需要在设置中配置 AI 模型提供商的 API Key：

1. 点击右上角设置按钮
2. 选择模型提供商（KIE/PPIO/FAL/GRSai）
3. 输入对应的 API Key

## 自动构建

本项目配置了 GitHub Actions，每次 push 到 main 分支会自动构建 APK。

构建产物可以在 GitHub Actions 运行日志中下载，或在 Release 页面获取。

## License

MIT
