# ArtFlow UI 移动端构建指南

## 快速构建

### Windows / macOS / Linux

```bash
# 1. 进入项目目录
cd artflow-ui

# 2. 安装依赖
npm install

# 3. 构建 Web 应用
npm run build

# 4. 同步到 Android
npx cap sync android

# 5. 构建 APK
cd android
# Windows
gradlew.bat assembleDebug
# macOS / Linux
./gradlew assembleDebug
```

构建完成后，APK 文件位于：
`android/app/build/outputs/apk/debug/app-debug.apk`

## 安装 APK

```bash
# 使用 adb 安装
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 或直接将 APK 文件复制到手机，通过文件管理器安装
```

## 构建发布版本

```bash
cd android
./gradlew assembleRelease
```

发布版 APK 位于：`android/app/build/outputs/apk/release/app-release-unsigned.apk`

需要签名后才能安装：
```bash
# 创建签名密钥
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-alias

# 给 APK 签名
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.jks app-release-unsigned.apk my-alias

# 对齐 APK
zipalign -v 4 app-release-unsigned.apk app-release.apk
```

## APK 命名规范

构建的 APK 文件遵循以下命名规范：
`artflow-ui-{版本号}-{类型}-build{序列号}.apk`

例如：`artflow-ui-v0.0.1-debug-build100.apk`

## 已知问题

1. **AI 图片生成需要配置 API Key**：首次使用需要在设置中配置 KIE/PPIO/FAL/GRSai 的 API Key
2. **网络权限**：应用已配置 INTERNET 权限，请确保设备已连接网络

## 项目结构

```
artflow-ui/
├── src/
│   ├── webApi/           # 移动端 Web API 适配层
│   │   ├── webAiGateway.ts           # AI 图片生成
│   │   ├── webImageSplitGateway.ts   # 分镜切割
│   │   ├── webImageProcessingGateway.ts  # 图片处理
│   │   └── webProjectGateway.ts      # 项目持久化 (IndexedDB)
│   └── ...
├── android/              # Android 原生项目
└── capacitor.config.ts   # Capacitor 配置
```
