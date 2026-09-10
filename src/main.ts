import "ba-memorial-lobby-wallpaper-runtime/style.css";
import { App, createWallpaperShell, loadSpineRuntime } from "ba-memorial-lobby-wallpaper-runtime";
import { findDialogueLine, PROJECT, WALLPAPER_DEFINITION } from "./config";
import { wallpaperLogger } from "./logging/WallpaperLogger";
import { mountResourceStagingPanel } from "./trial/ResourceStagingPanel";

wallpaperLogger.start();

const root = document.getElementById("app");
if (!(root instanceof HTMLElement)) throw new Error("Missing #app root element.");

createWallpaperShell(root, {
  title: PROJECT.title,
  canvasLabel: `${PROJECT.title} animated wallpaper`,
  editionLabel: PROJECT.editionLabel,
});

async function hasPreparedRuntimeAssets(): Promise<boolean> {
  const paths = ["./vendor/spine-webgl-4.2.js", WALLPAPER_DEFINITION.model.binary];
  const results = await Promise.all(paths.map(async (path) => {
    try { return (await fetch(path, { method: "HEAD", cache: "no-store" })).ok; }
    catch { return false; }
  }));
  return results.every(Boolean);
}

if (await hasPreparedRuntimeAssets()) {
  const app = new App(root, {
    definition: WALLPAPER_DEFINITION,
    findDialogueLine,
    logger: wallpaperLogger,
  });
  void loadSpineRuntime(WALLPAPER_DEFINITION.model.spineVersion).then(() => app.start());
} else {
  await mountResourceStagingPanel(root);
}
