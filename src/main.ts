import "ba-memorial-lobby-wallpaper-runtime/style.css";
import { createWallpaperShell } from "ba-memorial-lobby-wallpaper-runtime";
import { PROJECT } from "./config";
import { wallpaperLogger } from "./logging/WallpaperLogger";
import { mountResourceStagingPanel } from "./trial/ResourceStagingPanel";

wallpaperLogger.start();

const root = document.getElementById("app");
if (!(root instanceof HTMLElement)) throw new Error("Missing #app root element.");

createWallpaperShell(root, {
  title: PROJECT.title,
  canvasLabel: `${PROJECT.title} Live2D animated wallpaper`,
  editionLabel: "EXPERIMENTAL EDITION · Live2D trial",
});

await mountResourceStagingPanel(root);
