# Stella Sora · Chitose wallpaper trial

This is a small, content-first Web Wallpaper Engine experiment for Chitose
(千都世) from *Stella Sora*. It reuses the public-facing shell and host bridge
from `ba-memorial-lobby-wallpaper-runtime`, but it intentionally does not bring
in the Blue Archive resource acquisition or release pipeline.

## Current scope

- Runtime shell, logging bootstrap, metadata, and Wallpaper Engine bridge are wired.
- A resource-staging preview keeps the project usable before model assets arrive.
- Mouse movement and canvas clicks are represented in the preview; host general,
  user-property, pause, and resume callbacks update the visible status.
- Game-specific Live2D/Unity files, voice, BGM, and dialogue text are not bundled.

The source-game model path is treated as Live2D/Unity input. The reused BA
runtime currently expects Spine assets, so a real Chitose model requires a
reviewed adapter/conversion step before the `App` path is enabled.

## Local development

```powershell
npm install
npm run typecheck
npm run build
npm run dev
```

Open `http://127.0.0.1:4180/` in Chrome. When the prepared runtime and model
files are present at the paths in `src/config.ts`, the entry point can switch
to the shared runtime `App`; otherwise it stays in the safe staging preview.

## Asset and rights boundary

The repository contains no community-extracted game binaries. Research notes,
Wiki findings, and resource provenance are tracked in the GitHub issues for
[interaction content](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/1)
and [resource-pool licensing](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/2).
Before adding any model, texture, motion, voice, or music, record its origin and
permitted use there. Do not treat a download link or a community mirror as
redistribution permission.

## References

- [Chinese official site](https://stellasora.yostar.cn/)
- [MaaStellaSora](https://github.com/MaaStellaSora/MaaStellaSora)
- [Community Live2D extraction discussion](https://live2dhub.com/t/topic/5279)
