import { installWallpaperEngineBridge } from "ba-memorial-lobby-wallpaper-runtime/wallpaper-engine";
import { Live2DCubismModel } from "live2d-renderer";
import { mountTrialDebugPanel } from "../debug/TrialDebugPanel";
import { wallpaperLogger } from "../logging/WallpaperLogger";
import "./trial.css";

const MODEL_URL = "./assets/chitose-live2d/full/14401_full.model3.json";
const CUBISM_CORE_URL = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
const MOTION_PRIORITY_IDLE = 1;
const MOTION_PRIORITY_NORMAL = 2;
const OFFICIAL_OPENING_MOTIONS = [
  { pattern: /full_3/i, durationMs: 3483 },
  { pattern: /full_2/i, durationMs: 1483 },
] as const;
const SCENE_ASSET_ROOT = "./assets/chitose-live2d/backgrounds";
const SCENE_WIDTH = 2400;
const SCENE_HEIGHT = 1700;
const SCENE_LAYERS = [
  { file: "14401_live2d_Full_BG_001_a", x: 0, y: 0, width: 2400, height: 1700 },
  { file: "14401_live2d_Full_BG_006_a", x: -8.2, y: 5.55, width: 772, height: 604 },
  { file: "14401_live2d_Full_BG_007_a", x: -4.253, y: 6.835, width: 384, height: 328 },
  { file: "14401_live2d_Full_BG_008_a", x: -6.297, y: 4.597, width: 716, height: 336 },
  { file: "14401_live2d_Full_BG_009_a", x: -10.513, y: 3.222, width: 296, height: 444 },
  { file: "14401_live2d_Full_BG_010_a", x: 8.69, y: 4.44, width: 668, height: 812 },
  { file: "14401_live2d_Full_BG_016_a", x: 9.704, y: 3.037, width: 448, height: 312 },
  { file: "14401_live2d_Full_BG_014_a", x: 7.303, y: 3.721, width: 384, height: 224 },
  { file: "14401_live2d_Full_BG_012_a", x: 6.006, y: 6.256, width: 456, height: 428 },
  { file: "14401_live2d_Full_BG_013_a", x: 3.338, y: 7.778, width: 544, height: 144 },
  { file: "14401_live2d_Full_BG_005_a", x: 0, y: 0.01, width: 2400, height: 1700 },
] as const;

type MotionEntry = { File: string };

interface ModelSetting {
  FileReferences?: { Motions?: Record<string, MotionEntry[]> };
}

function basename(path: string): string {
  return path.split("/").pop()?.replace(/\.motion3\.json$/i, "") ?? path;
}

function waitForSceneImages(scene: HTMLElement): Promise<void> {
  const images = [...scene.querySelectorAll<HTMLImageElement>("img")];
  return Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  })).then(() => undefined);
}

function resizeGameScene(scene: HTMLElement): void {
  const scale = Math.max(window.innerWidth / SCENE_WIDTH, window.innerHeight / SCENE_HEIGHT);
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  for (const [index, image] of [...scene.querySelectorAll<HTMLImageElement>("img")].entries()) {
    const layer = SCENE_LAYERS[index];
    if (!layer) continue;
    image.style.width = `${layer.width * scale}px`;
    image.style.height = `${layer.height * scale}px`;
    image.style.left = `${centerX + layer.x * 100 * scale - layer.width * scale / 2}px`;
    image.style.top = `${centerY - layer.y * 100 * scale - layer.height * scale / 2}px`;
  }
}

export async function mountResourceStagingPanel(root: HTMLElement): Promise<void> {
  const canvas = root.querySelector<HTMLCanvasElement>("#wallpaper");
  if (!canvas) throw new Error("Missing runtime canvas for Live2D trial.");

  const scene = document.createElement("div");
  scene.className = "stella-game-scene";
  scene.dataset.sceneSource = "game-memory-snapshot-14401";
  scene.setAttribute("aria-hidden", "true");
  scene.innerHTML = SCENE_LAYERS.map((layer, index) => `
    <img class="stella-game-scene-layer${index === 0 ? " stella-game-scene-base" : ""}" src="${SCENE_ASSET_ROOT}/${layer.file}.png" alt="" draggable="false">`).join("");
  root.insertBefore(scene, canvas);
  resizeGameScene(scene);
  const resizeHandler = () => resizeGameScene(scene);
  window.addEventListener("resize", resizeHandler);

  const panel = document.createElement("section");
  panel.className = "stella-trial-panel";
  panel.setAttribute("aria-label", "Stella Sora Chitose Live2D trial");
  panel.innerHTML = `
    <p class="stella-trial-kicker">STELLA SORA · LIVE2D WALLPAPER TRIAL</p>
    <h1>千都世 <span>Chitose</span></h1>
    <p class="stella-trial-copy">回忆特写 Live2D 试作已装配。移动鼠标观察视线，点击角色播放动作。</p>
    <p class="stella-trial-hint">背景使用千都世回忆特写的官方分层资源；Cubism Core 从 Live2D 官方托管地址加载。</p>
    <dl>
      <div><dt>资源状态</dt><dd data-trial-status>loading</dd></div>
      <div><dt>动作</dt><dd data-trial-motion>—</dd></div>
      <div><dt>WE 主机</dt><dd data-trial-host>none</dd></div>
    </dl>`;
  root.append(panel);
  root.classList.add("stella-trial");
  let replayOpening: () => void = () => undefined;
  let skipToIdle: () => void = () => undefined;
  const debugPanel = mountTrialDebugPanel(root, wallpaperLogger, {
    onReplayOpening: () => replayOpening(),
    onSkipToIdle: () => skipToIdle(),
  });
  root.querySelector<HTMLElement>("#loading")?.setAttribute("hidden", "");
  debugPanel.setPhase("Live2D 加载中");

  const status = panel.querySelector<HTMLElement>("[data-trial-status]");
  const motionLabel = panel.querySelector<HTMLElement>("[data-trial-motion]");
  const hostLabel = panel.querySelector<HTMLElement>("[data-trial-host]");
  if (!status || !motionLabel || !hostLabel) throw new Error("Missing Live2D trial status nodes.");

  const state = { paused: false, clicks: 0, motionIndex: 0 };
  let model: Live2DCubismModel | undefined;
  let openingTimer: number | undefined;
  let motionEntries: MotionEntry[] = [];
  let parameterNames = new Set<string>();
  canvas.tabIndex = 0;
  canvas.draggable = false;
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.addEventListener("dragstart", (event) => event.preventDefault());

  const setHostEvent = (value: string) => {
    hostLabel.textContent = value;
    debugPanel.setEvent(value);
    canvas.dataset.lastHostEvent = value;
  };

  installWallpaperEngineBridge(window, {
    applyUserProperties(properties) {
      const keys = Object.keys(properties);
      setHostEvent(keys.length ? `user:${keys.join(",")}` : "user:empty");
    },
    applyGeneralProperties(properties) {
      setHostEvent(`general:${properties.fps ?? "default"}`);
    },
    setPaused(paused) {
      state.paused = paused;
      if (model) model.paused = paused;
      status.textContent = paused ? "paused" : model?.loaded ? "ready" : "loading";
      debugPanel.setPhase(status.textContent);
      setHostEvent(paused ? "pause" : "resume");
      canvas.dataset.trialPaused = String(paused);
    },
  });
  canvas.dataset.trialHostBridge = "installed";
  canvas.dataset.trialState = "loading";

  canvas.addEventListener("pointermove", (event) => {
    if (!model?.loaded) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    if (parameterNames.has("ParamAngleX")) model.setParameter("ParamAngleX", (x - 0.5) * 30);
    if (parameterNames.has("ParamAngleY")) model.setParameter("ParamAngleY", (0.5 - y) * 20);
    if (parameterNames.has("ParamEyeBallX")) model.setParameter("ParamEyeBallX", (x - 0.5) * 1.5);
    if (parameterNames.has("ParamEyeBallY")) model.setParameter("ParamEyeBallY", (0.5 - y) * 1.2);
    canvas.dataset.pointerIntent = "look";
    debugPanel.setInteraction("视线");
  });
  canvas.addEventListener("pointerleave", () => delete canvas.dataset.pointerIntent);
  const playInteractiveMotion = (source: "click" | "keyboard") => {
    if (!model?.loaded || !motionEntries.length) return;
    const preferred = motionEntries.findIndex((entry) => /special_[ab]/i.test(entry.File));
    const fallback = motionEntries.findIndex((entry) => /full_idle|idle/i.test(entry.File));
    const candidates = [preferred, fallback].filter((index) => index >= 0);
    const index = candidates[state.motionIndex % candidates.length] ?? 0;
    state.motionIndex += 1;
    state.clicks += 1;
    void model.startMotion("Full", index, MOTION_PRIORITY_NORMAL);
    motionLabel.textContent = `${basename(motionEntries[index]?.File ?? "Full")} · #${state.clicks}`;
    debugPanel.setAnimation(motionLabel.textContent);
    debugPanel.setLastAction(source === "click" ? "点击" : "键盘");
    debugPanel.setInteraction("动作");
    canvas.dataset.lastInteraction = source;
  };
  canvas.addEventListener("click", () => playInteractiveMotion("click"));
  const handleKeyboardMotion = (event: KeyboardEvent) => {
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      playInteractiveMotion("keyboard");
    }
  };
  canvas.addEventListener("click", () => canvas.focus(), { capture: true });
  canvas.addEventListener("keydown", handleKeyboardMotion);
  window.addEventListener("keydown", handleKeyboardMotion);

  try {
    const sceneReady = waitForSceneImages(scene);
    const settingResponse = await fetch(MODEL_URL, { cache: "no-store" });
    if (!settingResponse.ok) throw new Error(`model3.json HTTP ${settingResponse.status}`);
    const setting = (await settingResponse.json()) as ModelSetting;
    motionEntries = setting.FileReferences?.Motions?.Full ?? [];

    model = new Live2DCubismModel(canvas, {
      autoAnimate: true,
      autoInteraction: false,
      tapInteraction: false,
      randomMotion: false,
      keepAspect: false,
      enablePan: false,
      zoomEnabled: false,
      doubleClickReset: false,
      cubismCorePath: CUBISM_CORE_URL,
      enablePhysics: true,
      enableEyeblink: true,
      enableBreath: true,
      enableMotion: true,
      enableExpression: true,
      enableMovement: false,
      enablePose: true,
    });
    await model.load(MODEL_URL);
    await sceneReady;
    parameterNames = new Set(model.parameters.ids);
    model.paused = state.paused;
    const idleIndex = motionEntries.findIndex((entry) => /full_idle|idle/i.test(entry.File));
    const openingMotion = OFFICIAL_OPENING_MOTIONS.map(({ pattern, durationMs }) => ({
      index: motionEntries.findIndex((entry) => pattern.test(entry.File)),
      durationMs,
    })).find(({ index }) => index >= 0);
    skipToIdle = () => {
      if (!model?.loaded || idleIndex < 0) return;
      if (openingTimer !== undefined) window.clearTimeout(openingTimer);
      void model.startMotion("Full", idleIndex, MOTION_PRIORITY_IDLE);
      motionLabel.textContent = basename(motionEntries[idleIndex]?.File ?? "idle");
      debugPanel.setAnimation(motionLabel.textContent);
      debugPanel.setInteraction("待机");
    };
    replayOpening = () => {
      if (!model?.loaded || !openingMotion) return;
      if (openingTimer !== undefined) window.clearTimeout(openingTimer);
      void model.startMotion("Full", openingMotion.index, MOTION_PRIORITY_NORMAL);
      motionLabel.textContent = `${basename(motionEntries[openingMotion.index]?.File ?? "full")} · official opening`;
      debugPanel.setAnimation(motionLabel.textContent);
      debugPanel.setInteraction("入场");
      openingTimer = window.setTimeout(() => skipToIdle(), openingMotion.durationMs);
    };
    if (openingMotion) replayOpening();
    else skipToIdle();
    status.textContent = state.paused ? "paused" : "ready";
    debugPanel.setPhase(status.textContent);
    canvas.dataset.trialState = "ready";
    canvas.dataset.trialModel = "14401_full";
    scene.dataset.sceneState = "ready";
  } catch (error) {
    if (openingTimer !== undefined) window.clearTimeout(openingTimer);
    if (model?.loaded) model.destroy();
    model = undefined;
    status.textContent = "error";
    canvas.dataset.trialState = "error";
    scene.dataset.sceneState = "error";
    debugPanel.setPhase("Live2D 加载失败");
    console.error("[stella-sora] Live2D model failed to load", error);
  }
}
