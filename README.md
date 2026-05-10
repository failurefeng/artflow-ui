# ArtFlow UI

📱 基于节点画布的 AI 分镜工作台 - 移动端版本

## 功能特点

- 🎨 **节点画布编辑** - 拖拽式操作，支持多种节点类型
- 🤖 **AI 图片生成** - 支持 KIE、PPIO、FAL、GRSai 等多种模型提供商
- ✂️ **分镜切割工具** - 一键将大图切割为分镜格
- 📐 **图片裁剪与标注** - 内置多种图片处理工具
- 💾 **本地存储** - 使用 IndexedDB 存储项目数据
- 📱 **移动端优化** - 支持横竖屏切换，响应式布局

## 衍生项目声明

本项目是 [ArtFlow UI](https://github.com/failurefeng/artflow-ui) 的 Android 移动端版本。

**原始项目**: [henjicc/Storyboard-Copilot](https://github.com/henjicc/Storyboard-Copilot)
> 基于节点画布的 AI 分镜工作台，一站式完成图片生成、编辑与分镜流程

感谢 [ArtFlow UI](https://github.com/failurefeng/artflow-ui) 项目团队的开源贡献，本项目继承其开源精神以 MIT 许可证发布。

## 快速开始

### 下载 APK

直接从 GitHub Release 下载预构建的 APK：
- 访问 [Releases](https://github.com/failurefeng/artflow-ui/releases) 页面
- 下载最新的 `artflow-ui-*.apk`
- 安装到 Android 设备（可能需要允许安装未知来源应用）

### 本地构建

```bash
# 克隆项目
git clone https://github.com/failurefeng/artflow-ui.git
cd artflow-ui

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

本项目配置了 GitHub Actions，每次创建 tag 或 push 到 main 分支会自动构建 APK 和 Release。

```bash
# 创建版本并发布
git tag v0.1.0 -m "版本说明"
git push origin v0.1.0
```

## 致谢

感谢以下开源项目：

- [ArtFlow UI](https://github.com/failurefeng/artflow-ui) - ArtFlow UI 项目
- [Tauri](https://github.com/tauri-apps/tauri) - 桌面端框架（参考）
- [Capacitor](https://github.com/ionic-team/capacitor) - 移动端打包框架
- [React](https://github.com/facebook/react) - UI 框架
- [@xyflow/react](https://github.com/xyflow/xyflow) - 画布组件库

## License

MIT License - 详见 [LICENSE](LICENSE) 文件

---

本项目以 MIT 许可证开源，欢迎社区贡献和改进。
