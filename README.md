# Stella Sora · Chitose wallpaper trial

This is a small Web Wallpaper Engine experiment for Chitose from *Stella
Sora*. It reuses the shell and host bridge from
`ba-memorial-lobby-wallpaper-runtime`, while using a Live2D renderer for the
first “Photo Memo” prototype.

## Current scope

- Loads the local `14401_full` Chitose Cubism model and its motion set.
- Uses the official layered Memory Snapshot scene assets. The dedicated Unity opening stage remains reserved for the later architecture experiment and is not enabled in this build.
- Long-press dragging drives available head/eye parameters; idle pointer movement does not.
- Pointer clicks trigger dialogue voice/subtitles; Enter/Space plays a separate special motion.
- Clicking the calibrated head region plays the official `special_a`/`special_b` interaction motion when Head Patting is enabled.
- Live2D pan, zoom, and double-click reset are disabled; dragging does not move the character.
- Reuses the BA mainline runtime debug panel, log viewer, panel layout, and WE lifecycle bridge.
- Wallpaper Engine general properties, user properties, and pause/resume
  callbacks are wired to the trial status panel.
- The local model files are ignored build inputs and are not committed.

## Local development

```powershell
npm install
npm run typecheck
npm run build
npm run dev
```

Open `http://127.0.0.1:4180/` in Chrome. The local Cubism Core file is a
build input and is not committed by this repository.

## Asset and rights boundary

The repository contains no extracted game binaries. Research findings and
resource provenance are tracked in the GitHub issues for
[interaction content](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/1),
[resource-pool licensing](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/2),
and [the Chitose Live2D prototype](https://github.com/stella-sora-wallpaper/wallpaper-chitose/issues/4).
Do not treat a download link or a community mirror as redistribution
permission.

## Copyright Notice

Stella Sora characters, names, models, animations, artwork, backgrounds,
voices, subtitle text, music, and related game assets belong to their
respective rights holders, including Yostar and other Stella Sora
rightsholders. This project and its assets are provided for informational and
educational purposes only, without any commercial intent. This is an
unofficial fan project and is not affiliated with, sponsored by, or endorsed
by those companies. A rights holder's request will be honored by removing the
affected assets.

## References

- [Chinese official site](https://stellasora.yostar.cn/)
- [MaaStellaSora](https://github.com/MaaStellaSora/MaaStellaSora)
- [Community Live2D extraction discussion](https://live2dhub.com/t/topic/5279)
