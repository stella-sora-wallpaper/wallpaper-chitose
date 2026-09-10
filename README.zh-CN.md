# 《星塔旅人》千都世 Web 壁纸试作

这是一个面向 Wallpaper Engine Web 类型的轻量试作项目，选择角色千都世（Chitose）。项目复用了 `ba-memorial-lobby-wallpaper-runtime` 的界面外壳与宿主桥接，但不引入蔚蓝档案主线的资源获取和发布流水线。

## 当前范围

- 已接入运行时外壳、日志入口、Wallpaper Engine 元数据和宿主桥接。
- 在模型资源到位前，使用资源待补齐预览保持项目可运行。
- 预览态支持鼠标移动、画布点击，以及宿主通用属性、用户属性、暂停/恢复回调的状态显示。
- 尚未放入游戏专属 Live2D/Unity 文件、语音、BGM 和对话文本。

原游戏角色资源按 Live2D/Unity 输入处理；当前复用的蓝档运行时消费 Spine 资源，因此真正接入千都世模型前还需要经过审查的适配/转换步骤。

## 本地开发

```powershell
npm install
npm run typecheck
npm run build
npm run dev
```

然后在 Chrome 打开 `http://127.0.0.1:4180/`。当 `src/config.ts` 中声明的运行时和模型文件准备好后，入口可以切换到共享运行时 `App`；否则保持安全的资源待补齐预览。

## 资源与权利边界

仓库不包含社区解包的游戏二进制文件。Wiki 调研、互动内容索引和资源来源记录统一放在 GitHub 的[互动内容 Issue](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/1)与[资源池许可 Issue](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/2)，不作为本地研究文档维护。加入模型、纹理、动作、语音或音乐前，必须先记录来源与允许用途。下载链接或社区镜像本身不等于获得再分发许可。

## 参考

- [《星塔旅人》中文官网](https://stellasora.yostar.cn/)
- [MaaStellaSora](https://github.com/MaaStellaSora/MaaStellaSora)
- [Live2DHub 社区导出讨论](https://live2dhub.com/t/topic/5279)
