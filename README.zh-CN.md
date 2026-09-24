# 《星塔旅人》千都世 Web 壁纸试作

这是一个面向 Wallpaper Engine Web 类型的轻量试作项目，选择千都世
（Chitose）制作第一张“回忆特写”Live2D 互动壁纸。项目复用了
`ba-memorial-lobby-wallpaper-runtime` 的外壳与宿主桥接，但没有引入蔚蓝档案主线的完整资源流水线。

## 当前范围

- 加载本地 `14401_full` 千都世 Cubism 模型及动作资源。
- 使用千都世“回忆特写”的官方分层场景资源；专属 Unity 开场舞台留待后续架构实验，本版本不启用。
- 只有长按拖动才驱动模型中可用的头部与眼睛参数，未点击时不会自动跟随。
- 点击角色触发对话音声与字幕；按 Enter/Space 播放独立的特殊动作。
- 开启“摸头”后，点击当前模型头部命中区会播放官方 `special_a`/`special_b` 互动动作。
- 禁用 Live2D 模型的拖动、缩放和双击复位；拖动不会改变人物位置。
- 复用 BA 主线 runtime 的调试面板、日志查看器、面板布局和 WE 生命周期桥接。
- 接入 Wallpaper Engine 的通用属性、用户属性、暂停/恢复生命周期回调。
- 模型文件作为本地、被忽略的构建输入，不提交到仓库。

## 本地开发

```powershell
npm install
npm run typecheck
npm run build
npm run dev
```

然后在 Chrome 打开 `http://127.0.0.1:4180/`。本地 Cubism Core 仅作为构建输入，不提交到仓库。

## 资源与授权边界

仓库不包含提取出的游戏二进制资源。调研结论与资源来源记录在 GitHub
Issue：[互动内容](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/1)、
[资源池与授权](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/2)、
[千都世 Live2D 试作](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/4)。
下载链接或社区镜像本身不等于再分发许可。

## 参考

- [中文官网](https://stellasora.yostar.cn/)
- [MaaStellaSora](https://github.com/MaaStellaSora/MaaStellaSora)
- [Live2DHub 社区导出讨论](https://live2dhub.com/t/topic/5279)

## 版权声明

本项目中可能出现的《星塔旅人》角色模型、动画、立绘、背景、语音、字幕文本、音乐及其他游戏资产，版权归其各自权利方（Yostar 等《星塔旅人》相关权利方）所有。本项目及其资产仅用于信息与教育目的，不用于任何商业用途；本项目为非官方粉丝项目，与上述公司无隶属、赞助或背书关系。若权利方要求，相关资产将被移除。
