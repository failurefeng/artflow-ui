# Notice

## 本项目与衍生声明

**Storyboard-Copilot-Mobile** 是基于 [henjicc/Storyboard-Copilot](https://github.com/henjicc/Storyboard-Copilot) 项目衍生的 Android 移动客户端。

### 原始项目信息
- **原始项目**: [henjicc/Storyboard-Copilot](https://github.com/henjicc/Storyboard-Copilot)
- **描述**: 基于节点画布的 AI 分镜工作台
- **许可证**: 本项目采用 MIT License 开源

### 主要变更
- 从 Tauri 桌面端迁移至 Capacitor 移动端（Android）
- 添加移动端适配的响应式布局
- 实现 Web API 网关以支持移动端 AI 生图功能
- 添加本地存储持久化（IndexedDB）

### 致谢
感谢原始项目 [henjicc/Storyboard-Copilot](https://github.com/henjicc/Storyboard-Copilot) 的开源贡献。

### 第三方开源组件
本项目使用了以下开源组件，遵循其各自的许可证：

| 组件 | 许可证 | 用途 |
|------|--------|------|
| React | MIT | UI 框架 |
| TypeScript | Apache 2.0 | 类型系统 |
| TailwindCSS | MIT | 样式框架 |
| @xyflow/react | MIT | 画布组件 |
| Zustand | MIT | 状态管理 |
| Capacitor | Apache 2.0 | 移动端打包 |
| Tauri | Apache 2.0 | 原项目桌面框架（参考）|

---

本项目继承原始项目的开源精神，以 MIT 许可证开源，欢迎社区贡献。
