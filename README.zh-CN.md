# ba-memorial-lobby-wallpaper-template

[English](README.md) | 简体中文

《蔚蓝档案》记忆大厅风格 Wallpaper Engine Web 壁纸项目的 GitHub 模板仓库。它对标
`wallpaper-hare-camping` 的结构，把“角色专属内容”与“通用运行时/工具链”分离：

- **ba-memorial-lobby-wallpaper-runtime**：通用运行时框架，负责 Spine 渲染、交互、对话、
  音频、设置、日志与调试面板。
- **ba-memorial-lobby-wallpaper-toolkit**：通用构建、校验、打包工具。
- **本模板**：薄型壁纸项目骨架，只保留角色资产、内容定义、Wallpaper Engine 元数据与
  项目文档。

## 快速开始

1. 在 GitHub 上使用本仓库的 **Use this template** 创建新仓库。
2. 克隆后先阅读 [docs/CREATING-A-PROJECT.md](docs/CREATING-A-PROJECT.md)，按清单替换
   `src/config.ts`、`public/project.json` 等文件中的占位符。
3. 把原始模型、音频、BGM 放入 `local-assets/original/`，生成校验清单：

   ```powershell
   npm install
   npm run generate:checksums
   ```

4. 本地开发与构建：

   ```powershell
   npm run dev        # 准备资产并启动 Vite 开发服务器
   npm run build      # 准备资产、类型检查、构建并校验 dist/
   npm run package:offline  # 生成确定性离线 ZIP
   ```

5. 发布前必须完成真实 Chrome 行为测试与 Wallpaper Engine 窗口测试，详见
   [docs/CREATING-A-PROJECT.md](docs/CREATING-A-PROJECT.md) 的“验证门禁”。

> 模板仓库自身（未放入任何角色资产时）可以运行 `npm run check`（类型检查、回归测试、
> 结构校验），但 `npm run build` 需要先提供 `local-assets/original/` 中的真实资源。

## 必须替换的占位符

在创建角色项目时，以下位置需要替换为真实内容：

| 位置 | 内容 |
| --- | --- |
| `src/config.ts` 中的 `PROJECT` | 项目 id、slug、标题、版本标识 |
| `src/config.ts` 中的 `MODEL` | 模型路径、动画/骨骼/命中参数、设计视口 |
| `src/config.ts` 中的 `BGM` / `DIALOGUES` | BGM 文件与对话/字幕内容 |
| `public/project.json` | 标题、描述、预览图、分级与标签 |
| `public/preview.gif` | 验收阶段生成的真实 256×256 动画预览图 |
| `public/THIRD-PARTY-NOTICES.txt` | 真实资源的来源与许可记录 |
| `public/OFFLINE-README.txt` | 版本号与安装说明 |
| `research/PROVENANCE.md` | 每个二进制资源的来源与哈希记录 |

详细说明见 [docs/STRUCTURE.md](docs/STRUCTURE.md)。

## npm 命令

| 命令 | 作用 | 是否需要角色资产 |
| --- | --- | --- |
| `npm run typecheck` | TypeScript 类型检查 | 否 |
| `npm test` | 显示布局、字幕、设置契约、日志桥回归测试 | 否 |
| `npm run validate:structure` | 模板/项目结构校验 | 否 |
| `npm run check` | 以上三项的总入口 | 否 |
| `npm run generate:checksums` / `verify:checksums` | 生成/回验资产 SHA-256 清单 | 是 |
| `npm run prepare:assets` | 校验并拷贝模型/音频/BGM/Spine 运行时到 `public/` | 是 |
| `npm run dev` | 准备资产并启动开发服务器 | 是 |
| `npm run build` | 准备资产、类型检查、构建并校验 `dist/` | 是 |
| `npm run package:offline` | 生成确定性离线 ZIP 与清单校验 | 是 |
| `npm run inspect:spine` | 读取 `.skel` 导出动画/骨骼/事件报告 | 是 |
| `npm run generate:model-textures` | 用 Real-CUGAN 生成 4K/8K 纹理档位 | 是（可选） |

## 更新模型

运行时与工具链通过 npm 版本发布，模板变更只影响新建项目。升级依赖与迁移方式见
[docs/UPGRADING.md](docs/UPGRADING.md)。

## 验证门禁

任何功能改动部署到 Wallpaper Engine 项目目录之前，必须：

1. 在用户已打开的外部 Chrome 中做端到端行为测试，检查控制台错误；
2. 在真实 Wallpaper Engine 窗口中测试指针交互、属性回调与暂停/恢复；
3. 通过后才复制或同步构建产物。

浏览器侧的 `?debug=1`、`?testWeInterfaces` 等只是预检，不能替代真实 Wallpaper Engine
窗口测试。资产准备与发布流程见 [docs/ASSET-PIPELINE.md](docs/ASSET-PIPELINE.md)。

## 版权声明

基于本模板创建的壁纸会打包《蔚蓝档案》游戏资产（角色、立绘、语音、音乐、字幕文本），
这些资产归其各自权利方（NEXON Games Co., Ltd.、Yostar 等《蔚蓝档案》相关权利方）所有。
角色项目必须在自己的 README 与发行描述中保留本声明（权利方列表见上），并说明项目及其
资产仅用于信息与教育目的。粉丝项目非官方，与上述公司无隶属、赞助或背书关系。
