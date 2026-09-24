import {
  BgmPlayer,
  SubtitlePresenter,
  VoicePlayer,
  WallpaperEngineAdapter,
  FrameLimiter,
  type WallpaperSettings,
} from "ba-memorial-lobby-wallpaper-runtime";
import { Live2DCubismModel } from "live2d-renderer";
import { mountTrialDebugPanel } from "../debug/TrialDebugPanel";
import { wallpaperLogger } from "../logging/WallpaperLogger";
import {
  AvgDialogueTimelineAdapter,
  splitAvgDialoguePages,
  type AvgDialogueEvent,
} from "./AvgDialogueTimelineAdapter";
import "./trial.css";

type ChitoseModelResolution = "2k" | "4k" | "8k";
const MODEL_URLS: Readonly<Record<ChitoseModelResolution, string>> = {
  "2k": "./assets/chitose-live2d/full/14401_full.model3.json",
  "4k": "./assets/chitose-live2d/full-4k/14401_full.model3.json",
  "8k": "./assets/chitose-live2d/full-8k/14401_full.model3.json",
};
const OPENING_B_MODEL_URL = "./assets/chitose-live2d/opening-b/14401_opening_b.model3.json";
const OPENING_CURVES_URL = "./assets/chitose-live2d/opening/timeline-curves.json";
const CUBISM_CORE_URL = "./assets/live2dcubismcore.min.js";
// The official 14401_F_a prefab has a zero local root transform. Keep that
// authored anchor intact; the renderer and layered background must share the
// same 2400x1700 scene projection instead of using a hand-tuned pixel lift.
const MAIN_SCENE_DEFAULT_SCALE = 1.0;
const MOTION_PRIORITY_IDLE = 1;
const MOTION_PRIORITY_NORMAL = 2;
const MOTION_PRIORITY_FORCE = 3;
// The extracted Timeline is retained for the Unity WebGL experiment in Issue
// #6, but is deliberately not a release feature. Web Cubism plus CSS/DOM
// cannot reproduce the game's Unity scene, FX and post-process pipeline.
const OPENING_EXPERIMENT_ENABLED = false;
// The extracted model does not declare Cubism HitAreas. The release adapter
// derives a stable head region from the model's rendered alpha bounds, while
// using the official special_a/special_b interaction motions.
const HEAD_PATTING_ENABLED = true;
const OFFICIAL_OPENING_TIMELINE = [
  // 14401_LFTimeline.playable, shipped in char_l2d_14401 (EN 1.13.0).
  // F_b and F_a are separate model instances in the official prefab.
  { atMs: 1917, performer: "b", motion: "full_1" },
  { atMs: 3917, performer: "a", motion: "full_2" },
  { atMs: 5400, performer: "a", motion: "full_3" },
  { atMs: 8883, performer: "a", motion: "full_idle" },
  { atMs: 8900, performer: "a", motion: "idle" },
] as const;
const OFFICIAL_OPENING_DURATION_MS = 11967;
const DIALOGUE_IDS = ["a", "b", "c", "d", "e", "f", "g"].map((suffix) => `vo_cgstory_144_${suffix}`);
const DIALOGUE_COMMANDS = [
  ["主公，==W==万分抱歉……==W==妾身非但未能领悟“人刀合一”之道，==W==至今也未曾为主公做出任何值得称道之事，==W==实在羞愧难当。", "既如此……==W==妾身只能“断刀”谢罪了！"],
  ["努力……==W==妾身的努力并未带来任何成果。==W==这样的“努力”，真的能称之为努力吗？"],
  ["妾身既无法掌控自身的魔力，==W==也无法体察主公的心意，==W==还因一时逞强，让主公因妾身的失误弄得浑身湿透……", "果然，==W==“人刀合一”==W==对现在的妾身而言，只是痴心妄想……"],
  ["可是……==W==妾身希望能够成为与主公心意相通的刀，==W==想全心全意为主公效劳。"],
  ["诚惶诚恐，==W==这声“谢谢”==W==妾身实在受之有愧。", "主公……==W==像妾身这般不成熟的刀……==W==您也愿意留在身边吗？"],
  ["啊！==W==妾身受宠若惊……！==W==没想到主公竟然如此器重妾身……", "从今往后，==W==妾身必将加倍努力，早日与主公心意相通，==W==成为一把真正配得上主公的名刀。"],
  ["只要主公还需要妾身……==W==不，==W==哪怕有一天主公不再需要妾身……", "妾身也会作为主公的刀，==W==直至最后一刻，永远守护主公。==W==妾身在此立誓！"],
] as const;
type DialogueSubtitleLocale = "zh-cn" | "ja" | "en";
const resolveDialogueVoiceLocale = (value: string): "zh-cn" | "ja" => value === "zh-cn" ? "zh-cn" : "ja";
const resolveDialogueSubtitleLocale = (value: string): DialogueSubtitleLocale => value === "zh-cn" || value === "ja" || value === "en" ? value : "en";
const DIALOGUE_COMMANDS_BY_LOCALE: Readonly<Record<DialogueSubtitleLocale, readonly (readonly string[])[]>> = {
  "zh-cn": DIALOGUE_COMMANDS,
  ja: [
    ["主公、誠に申し訳ございません……==W==妾は「人刀一体」の道を悟ることができず、==W==これまで主公のために誇れるようなことを何一つ成し遂げられず、==W==まことに面目次第もございません。", "それならば……==W==妾はこの刀を断ち、詫びねばなりません！"],
    ["努力……==W==妾の努力は何の成果も生みませんでした。==W==このような「努力」を、本当に努力と呼べるのでしょうか？"],
    ["妾は自分の魔力を操ることもできず、==W==主公のお心を察することもできず、==W==一時の無理がたたって、主公を妾の失敗でずぶ濡れにしてしまいました……", "やはり「人刀一体」は、==W==今の妾にとって、==W==叶わぬ夢にすぎないのでしょう……"],
    ["ですが……==W==主公と心を通わせる刀になりたい、==W==心から主公のお役に立ちたいのです。"],
    ["恐れ多いことです、その「ありがとう」のお言葉は==W==妾にはもったいのうございます。", "主公……==W==このように未熟な刀でも……==W==おそばに置いてくださるのですか？"],
    ["あっ！==W==身に余る光栄でございます……！==W==まさか主公がこれほど妾を認めてくださるとは……", "これからは一層精進し、==W==一日も早く主公と心を通わせ、==W==真に主公にふさわしい名刀となってみせます。"],
    ["主公が妾を必要としてくださる限り……==W==いえ、いつか主公が妾を必要とされなくなっても……", "妾は主公の刀として、==W==最後の瞬間まで、永遠にお守りいたします。==W==ここに誓います！"],
  ],
  en: [
    ["My lord, I am deeply sorry…==W==I have yet to grasp the path of becoming one with the blade,==W==and I have never accomplished anything worthy of your praise.==W==I am truly ashamed.", "Then…==W==I can only break this blade and atone for my failure!"],
    ["Effort… My efforts have brought no results.==W==Can such efforts truly be called effort at all?"],
    ["I cannot control my own magic,==W==nor can I sense what is in my lord's heart.==W==And in a moment of recklessness, my mistake even left you soaked through…", "Surely,==W==becoming one with the blade==W==is nothing but a foolish dream for me right now…"],
    ["And yet…==W==I wish to become a blade that shares my lord's heart,==W==and to serve you with all that I am."],
    ["I am humbled; I am not worthy of such thanks.==W==Your words are far too kind to me.", "My lord…==W==would you truly keep an imperfect blade like me…==W==at your side?"],
    ["Ah!==W==You honor me beyond measure…!==W==I never imagined my lord held me in such regard…", "From this day forward, I will train twice as hard,==W==quickly come to understand your heart,==W==and become a blade truly worthy of you."],
    ["So long as my lord still needs me…==W==no, even if one day you no longer do…", "I will remain your blade,==W==guarding you forever until the very end.==W==This I swear!"],
  ],
};
const DIALOGUE_EVENTS: Readonly<Record<string, Readonly<Record<"cn" | "jp", readonly AvgDialogueEvent[]>>>> = {
  vo_cgstory_144_a: { cn: [{ atMs: 0, name: "start" }, { atMs: 1083, name: "next" }, { atMs: 2883, name: "next" }, { atMs: 6267, name: "next" }, { atMs: 10617, name: "next" }, { atMs: 12517, name: "end" }, { atMs: 12983, name: "start" }, { atMs: 14883, name: "next" }, { atMs: 17167, name: "done" }], jp: [{ atMs: 17, name: "start" }, { atMs: 2667, name: "next" }, { atMs: 4733, name: "next" }, { atMs: 8550, name: "next" }, { atMs: 12017, name: "next" }, { atMs: 13700, name: "end" }, { atMs: 15033, name: "start" }, { atMs: 17000, name: "next" }, { atMs: 21467, name: "done" }] },
  vo_cgstory_144_b: { cn: [{ atMs: 0, name: "start" }, { atMs: 1583, name: "next" }, { atMs: 5150, name: "next" }, { atMs: 8900, name: "done" }], jp: [{ atMs: 17, name: "start" }, { atMs: 2350, name: "next" }, { atMs: 6883, name: "next" }, { atMs: 9483, name: "done" }] },
  vo_cgstory_144_c: { cn: [{ atMs: 0, name: "start" }, { atMs: 2917, name: "next" }, { atMs: 6000, name: "next" }, { atMs: 10967, name: "end" }, { atMs: 11917, name: "start" }, { atMs: 13483, name: "next" }, { atMs: 14933, name: "next" }, { atMs: 18950, name: "done" }], jp: [{ atMs: 17, name: "start" }, { atMs: 3350, name: "next" }, { atMs: 7850, name: "next" }, { atMs: 9800, name: "next" }, { atMs: 12983, name: "end" }, { atMs: 13983, name: "start" }, { atMs: 16217, name: "next" }, { atMs: 18733, name: "next" }, { atMs: 23050, name: "next" }, { atMs: 25583, name: "done" }] },
  vo_cgstory_144_d: { cn: [{ atMs: 0, name: "start" }, { atMs: 1400, name: "next" }, { atMs: 5333, name: "next" }, { atMs: 7583, name: "done" }], jp: [{ atMs: 17, name: "start" }, { atMs: 1650, name: "next" }, { atMs: 3750, name: "next" }, { atMs: 6117, name: "done" }] },
  vo_cgstory_144_e: { cn: [{ atMs: 0, name: "start" }, { atMs: 1983, name: "next" }, { atMs: 3667, name: "next" }, { atMs: 5600, name: "end" }, { atMs: 6333, name: "start" }, { atMs: 8333, name: "next" }, { atMs: 11300, name: "next" }, { atMs: 13267, name: "done" }], jp: [{ atMs: 33, name: "start" }, { atMs: 2017, name: "next" }, { atMs: 4600, name: "end" }, { atMs: 6000, name: "start" }, { atMs: 8717, name: "next" }, { atMs: 12883, name: "next" }, { atMs: 14700, name: "next" }, { atMs: 16867, name: "done" }] },
  vo_cgstory_144_f: { cn: [{ atMs: 0, name: "start" }, { atMs: 1133, name: "next" }, { atMs: 3617, name: "next" }, { atMs: 6483, name: "end" }, { atMs: 10550, name: "start" }, { atMs: 12133, name: "next" }, { atMs: 17000, name: "next" }, { atMs: 19767, name: "done" }], jp: [{ atMs: 67, name: "start" }, { atMs: 3783, name: "next" }, { atMs: 5700, name: "next" }, { atMs: 9000, name: "end" }, { atMs: 10317, name: "start" }, { atMs: 12633, name: "next" }, { atMs: 16417, name: "next" }, { atMs: 20000, name: "next" }, { atMs: 22267, name: "done" }] },
  vo_cgstory_144_g: { cn: [{ atMs: 67, name: "start" }, { atMs: 2483, name: "next" }, { atMs: 3717, name: "next" }, { atMs: 6267, name: "end" }, { atMs: 6883, name: "start" }, { atMs: 8967, name: "next" }, { atMs: 13417, name: "next" }, { atMs: 15083, name: "done" }], jp: [{ atMs: 17, name: "start" }, { atMs: 3783, name: "next" }, { atMs: 5450, name: "next" }, { atMs: 8283, name: "end" }, { atMs: 9400, name: "start" }, { atMs: 11150, name: "next" }, { atMs: 13717, name: "next" }, { atMs: 17217, name: "next" }, { atMs: 18133, name: "done" }] },
};
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

function logicalModelSurfaceSize(): { width: number; height: number } {
  const visualSceneWidth = Math.max(
    window.innerWidth,
    window.innerHeight * SCENE_WIDTH / SCENE_HEIGHT,
  );
  const visualSceneHeight = visualSceneWidth * SCENE_HEIGHT / SCENE_WIDTH;
  return {
    width: Math.max(Math.round(visualSceneWidth), 1),
    height: Math.max(Math.round(visualSceneHeight), 1),
  };
}

type MotionEntry = { File: string };

interface ModelSetting {
  FileReferences?: { Motions?: Record<string, MotionEntry[]> };
}

interface StreamValue { index: number; value: number; outSlope: number; coeff: number[]; }
interface StreamFrame { time: number; values: StreamValue[]; }
interface StreamBinding { startIndex: number; componentCount: number; attribute: number; typeId: number; }
interface OpeningCurveClip { bindings: StreamBinding[]; initialValues: StreamValue[]; frames: StreamFrame[]; }
interface OpeningCurveData { clips: Record<string, OpeningCurveClip>; }
interface TransformSample { x: number; y: number; z: number; rotation: number; scaleX: number; scaleY: number; }

function basename(path: string): string {
  return path.split("/").pop()?.replace(/\.motion3\.json$/i, "") ?? path;
}

function interpolatedValue(clip: OpeningCurveClip, index: number, time: number): number | undefined {
  const points = [
    ...clip.initialValues.filter((value) => value.index === index).map((value) => ({ time: -Infinity, value })),
    ...clip.frames.flatMap((frame) => frame.values.filter((value) => value.index === index).map((value) => ({ time: frame.time, value }))),
  ];
  if (!points.length) return undefined;
  const firstPoint = points[0];
  if (!firstPoint) return undefined;
  const previous = [...points].reverse().find((point) => point.time <= time) ?? firstPoint;
  const next = points.find((point) => point.time > time);
  if (!next || !Number.isFinite(previous.time)) return previous.value.value;
  const duration = next.time - previous.time;
  if (duration <= 0) return previous.value.value;
  const progress = Math.min(Math.max((time - previous.time) / duration, 0), 1);
  const [c0 = 0, c1 = 0, c2 = 0] = previous.value.coeff;
  const incomingSlope = c0 === 0 && c1 === 0 && c2 === 0
    ? 0
    : (3 * (next.value.value - previous.value.value) - 2 * previous.value.outSlope * duration - c1 / (duration * duration)) / duration;
  const p2 = progress * progress;
  const p3 = p2 * progress;
  return (2 * p3 - 3 * p2 + 1) * previous.value.value
    + (p3 - 2 * p2 + progress) * previous.value.outSlope * duration
    + (-2 * p3 + 3 * p2) * next.value.value
    + (p3 - p2) * incomingSlope * duration;
}

function sampleTransform(clip: OpeningCurveClip, time: number): TransformSample {
  const transform = { x: 0, y: 0, z: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  for (const binding of clip.bindings) {
    if (binding.typeId !== 4) continue;
    const values = Array.from({ length: binding.componentCount }, (_, offset) => interpolatedValue(clip, binding.startIndex + offset, time));
    if (values.some((value) => value === undefined)) continue;
    if (binding.attribute === 1) [transform.x, transform.y, transform.z] = values as [number, number, number];
    if (binding.attribute === 3) [transform.scaleX, transform.scaleY] = values as [number, number];
    if (binding.attribute === 4 && values.length === 4) transform.rotation = Math.atan2(values[2]!, values[3]!) * 2 * 180 / Math.PI;
  }
  return transform;
}

function requiredElement(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing wallpaper element: ${selector}`);
  return element;
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

function resizeGameScene(scene: HTMLElement, surfaceWidth: number, surfaceHeight: number): void {
  scene.style.width = `${surfaceWidth}px`;
  scene.style.height = `${surfaceHeight}px`;
  const scale = Math.max(surfaceWidth / SCENE_WIDTH, surfaceHeight / SCENE_HEIGHT);
  const centerX = surfaceWidth / 2;
  const centerY = surfaceHeight / 2;
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
  // Retained only for the disabled Unity-stage experiment. It is not inserted
  // into the release DOM, so an incomplete opening cannot run accidentally.
  const openingCanvas = document.createElement("canvas");
  openingCanvas.id = "wallpaper-opening-b";
  openingCanvas.setAttribute("aria-hidden", "true");
  openingCanvas.style.opacity = "0";
  openingCanvas.style.pointerEvents = "none";

  const scene = document.createElement("div");
  scene.className = "stella-game-scene";
  scene.dataset.sceneSource = "game-memory-snapshot-14401";
  scene.setAttribute("aria-hidden", "true");
  scene.innerHTML = SCENE_LAYERS.map((layer, index) => `
    <img class="stella-game-scene-layer${index === 0 ? " stella-game-scene-base" : ""}" src="${SCENE_ASSET_ROOT}/${layer.file}.png" alt="" draggable="false">`).join("");
  const composition = document.createElement("div");
  composition.className = "stella-scene-composition";
  composition.dataset.compositionSource = "game-memory-snapshot-14401";
  root.insertBefore(composition, canvas);
  composition.append(scene, openingCanvas, canvas);
  // Keep the complete scene atomic during startup. The background image can
  // load before Cubism finishes creating the model and textures; showing it
  // early exposes an unnatural background-only frame. Visibility is switched
  // on instantly after the main model is ready, so this is not a fade effect.
  composition.style.visibility = "hidden";
  const resizeHandler = () => {
    applyRenderSurface();
  };
  window.addEventListener("resize", resizeHandler);

  const panel = document.createElement("section");
  panel.className = "stella-trial-panel";
  panel.setAttribute("aria-label", "Stella Sora Chitose Live2D trial");
  panel.innerHTML = `
    <p class="stella-trial-kicker">STELLA SORA · LIVE2D WALLPAPER TRIAL</p>
    <h1>千都世 <span>Chitose</span></h1>
    <p class="stella-trial-copy">回忆特写 Live2D 试作已装配。按住并拖动控制视线，点击角色触发对话。</p>
    <p class="stella-trial-hint">背景使用千都世回忆特写的官方分层资源；Cubism Core 从 Live2D 官方托管地址加载。</p>
    <dl>
      <div><dt>资源状态</dt><dd data-trial-status>loading</dd></div>
      <div><dt>动作</dt><dd data-trial-motion>—</dd></div>
      <div><dt>WE 主机</dt><dd data-trial-host>none</dd></div>
    </dl>`;
  // Keep diagnostic values detached: the BA-derived debug panel is the sole
  // user-facing control surface; the early staging card is intentionally gone.
  root.classList.add("stella-chitose");
  const adapter = new WallpaperEngineAdapter();
  let replayOpening: () => void = () => undefined;
  let skipToIdle: () => void = () => undefined;
  let playNextDialogue: () => void = () => undefined;
  const debugPanel = mountTrialDebugPanel(root, wallpaperLogger, adapter, {
    onReplayOpening: () => replayOpening(),
    onSkipToIdle: () => skipToIdle(),
    onNextDialogue: () => playNextDialogue(),
  });
  root.querySelector<HTMLElement>("#loading")?.setAttribute("hidden", "");
  debugPanel.setPhase("Live2D 加载中");

  const status = panel.querySelector<HTMLElement>("[data-trial-status]");
  const motionLabel = panel.querySelector<HTMLElement>("[data-trial-motion]");
  const hostLabel = panel.querySelector<HTMLElement>("[data-trial-host]");
  const bgmLabel = requiredElement(root, "#status-bgm");
  if (!status || !motionLabel || !hostLabel) throw new Error("Missing Live2D trial status nodes.");

  const state = { paused: false, clicks: 0, motionIndex: 0, dialogueIndex: 0 };
  const dialogueTimeline = new AvgDialogueTimelineAdapter();
  let settings: Readonly<WallpaperSettings> = adapter.current;
  let activeDialogueIndex = -1;
  let openingCurves: OpeningCurveData | undefined;
  let openingAnimationFrame: number | undefined;
  let openingStartedAt = 0;
  let model: Live2DCubismModel | undefined;
  let openingModel: Live2DCubismModel | undefined;
  let openingTimers: number[] = [];
  let motionEntries: MotionEntry[] = [];
  let openingMotionEntries: MotionEntry[] = [];
  let parameterNames = new Set<string>();
  let renderFrameRequest: number | undefined;
  const frameLimiter = new FrameLimiter();
  let measuredFrameCount = 0;
  let measuredFrameWindowStartedAt = performance.now();
  let activeModelResolution: ChitoseModelResolution = settings.modelResolution;
  let reloadModelForResolution: (resolution: ChitoseModelResolution) => void = () => undefined;
  let activeVoiceStartedAt = 0;
  let activeVoiceElapsedMs = 0;
  let activeVoiceKey: string | undefined;
  const lipSyncAudioCache = new Map<string, ArrayBuffer>();
  const resolveDialoguePage = (eventId: string, pageIndex: number, locale: DialogueSubtitleLocale): string | undefined => {
    const dialogueIndex = DIALOGUE_IDS.indexOf(eventId);
    if (dialogueIndex < 0 || activeDialogueIndex < 0) return undefined;
    const voiceLocale = resolveDialogueVoiceLocale(settings.voiceLocale);
    const sourcePages = splitAvgDialoguePages(DIALOGUE_COMMANDS_BY_LOCALE[voiceLocale]![dialogueIndex] ?? []);
    const targetPages = splitAvgDialoguePages(DIALOGUE_COMMANDS_BY_LOCALE[resolveDialogueSubtitleLocale(locale)]![dialogueIndex] ?? []);
    if (!targetPages.length) return undefined;
    // CN and JP official timelines do not always expose the same number of
    // page events. Map the target text by normalized progress so a subtitle
    // language change never produces a blank or a wrong dialogue segment.
    const targetIndex = sourcePages.length <= 1
      ? 0
      : Math.min(targetPages.length - 1, Math.round(pageIndex * (targetPages.length - 1) / (sourcePages.length - 1)));
    return targetPages[targetIndex];
  };
  const subtitle = new SubtitlePresenter<string>(
    requiredElement(root, "#subtitle"),
    requiredElement(root, "#subtitle-primary"),
    requiredElement(root, "#subtitle-secondary"),
    (eventId) => {
      const match = /^(vo_cgstory_144_[a-g]):page:(\d+)$/.exec(eventId);
      if (!match) return undefined;
      const dialogueId = match[1]!;
      const pageIndex = Number(match[2]);
      if (!Number.isInteger(pageIndex)) return undefined;
      const text = Object.fromEntries(
        (Object.keys(DIALOGUE_COMMANDS_BY_LOCALE) as DialogueSubtitleLocale[]).map((locale) => [
          locale,
          resolveDialoguePage(dialogueId, pageIndex, locale) ?? "",
        ]),
      );
      return { text };
    },
    { primaryLocale: "zh-cn", secondaryLocale: "ja" },
  );
  const bgm = new BgmPlayer(
    { title: "m15", path: "./assets/chitose-live2d/audio/bgm-m15.ogg" },
    {
      onStatusChange: (next) => {
        bgmLabel.textContent = next;
        canvas.dataset.bgmStatus = next;
      },
      onError: (message) => { wallpaperLogger.warn("error", message); },
    },
  );
  const voice = new VoicePlayer((eventId, locale) => `./assets/chitose-live2d/audio/${eventId}_${locale === "zh-cn" ? "cn" : "jp"}.ogg`, {
    onEnded: (eventId) => {
      canvas.dataset.voicePlayback = "ended";
      activeVoiceKey = undefined;
      activeVoiceStartedAt = 0;
      activeVoiceElapsedMs = 0;
      if (dialogueTimeline.active !== eventId) subtitle.hide();
      if (settings.dialogueAutoPlay && !state.paused && state.dialogueIndex < DIALOGUE_IDS.length) {
        window.setTimeout(() => playNextDialogue(), 800);
      } else if (settings.dialogueAutoPlay) {
        canvas.dataset.dialogueAutoplay = "complete";
      }
    },
    onError: (message) => {
      canvas.dataset.voicePlayback = "error";
      wallpaperLogger.warn("error", message);
    },
  });
  let lipSyncRequest = 0;
  const currentVoiceElapsedMs = () => {
    if (!activeVoiceKey) return 0;
    return activeVoiceElapsedMs + (activeVoiceStartedAt > 0
      ? Math.max(performance.now() - activeVoiceStartedAt, 0)
      : 0);
  };
  const transferLipSyncState = (
    target: Live2DCubismModel,
    source: { samples: Float32Array[] | null; sampleRate: number; numChannels: number; samplesPerChannel: number; rms: number; previousRms: number },
    elapsedMs: number,
  ) => {
    if (!source.samples || source.sampleRate <= 0 || source.samplesPerChannel <= 0) return false;
    const controller = target.wavController;
    controller.samples = source.samples;
    controller.sampleRate = source.sampleRate;
    controller.numChannels = source.numChannels;
    controller.samplesPerChannel = source.samplesPerChannel;
    const durationMs = source.samplesPerChannel / source.sampleRate * 1000;
    controller.userTime = Math.min(Math.max(elapsedMs, 0), durationMs) / 1000;
    controller.sampleOffset = Math.min(
      Math.floor(controller.userTime * controller.sampleRate),
      controller.samplesPerChannel,
    );
    controller.rms = source.rms;
    controller.previousRms = source.previousRms;
    return true;
  };
  const prepareLipSync = (
    eventId: string,
    locale: "zh-cn" | "ja",
    targetModel: Live2DCubismModel | undefined = model,
    elapsedMs = currentVoiceElapsedMs(),
  ) => {
    const request = ++lipSyncRequest;
    const target = targetModel;
    const cacheKey = `${eventId}:${locale}`;
    canvas.dataset.lipSync = "loading";
    const audioBufferPromise = lipSyncAudioCache.has(cacheKey)
      ? Promise.resolve(lipSyncAudioCache.get(cacheKey)!.slice(0))
      : fetch(`./assets/chitose-live2d/audio/${eventId}_${locale === "zh-cn" ? "cn" : "jp"}.ogg`, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`lip-sync audio HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then((buffer) => {
          lipSyncAudioCache.set(cacheKey, buffer.slice(0));
          return buffer;
        });
    void audioBufferPromise
      .then((buffer) => {
        if (request !== lipSyncRequest || !target?.loaded || target !== model) return;
        return target.inputAudio(buffer.slice(0), false);
      })
      .then(() => {
        if (request !== lipSyncRequest || !target?.loaded || target !== model) return;
        const controller = target.wavController;
        const durationMs = controller.sampleRate > 0
          ? controller.samplesPerChannel / controller.sampleRate * 1000
          : 0;
        const clampedElapsedMs = Math.min(Math.max(elapsedMs, 0), durationMs);
        controller.userTime = clampedElapsedMs / 1000;
        controller.sampleOffset = Math.min(
          Math.floor(controller.userTime * controller.sampleRate),
          controller.samplesPerChannel,
        );
        controller.previousRms = 0;
        controller.rms = 0;
        canvas.dataset.lipSync = target.lipsync ? "ready" : "unsupported";
      })
      .catch((error) => {
        if (request !== lipSyncRequest) return;
        canvas.dataset.lipSync = "error";
        wallpaperLogger.warn("error", `Live2D 口型音频准备失败：${error instanceof Error ? error.message : String(error)}`);
      });
  };
  canvas.tabIndex = 0;
  canvas.draggable = false;
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.addEventListener("dragstart", (event) => event.preventDefault());

  const sceneTransformScale = () => settings.positionPreset === "default" ? MAIN_SCENE_DEFAULT_SCALE : settings.modelScale;
  const resizeLive2dViewport = (live2d: Live2DCubismModel, targetSize = logicalModelSurfaceSize()) => {
    const previousWidth = live2d.canvas.width;
    const previousHeight = live2d.canvas.height;
    const previousX = live2d.x;
    const previousY = live2d.y;
    const displayWidth = live2d.canvas.style.width;
    const displayHeight = live2d.canvas.style.height;
    // Keep the Live2D camera viewport in logical scene coordinates. The
    // selected quality changes the source texture/model package, but this
    // renderer uses the canvas buffer to derive its camera projection. A
    // 4K/8K backing buffer would therefore enlarge the model instead of
    // increasing output quality.
    live2d.canvas.style.width = `${targetSize.width}px`;
    live2d.canvas.style.height = `${targetSize.height}px`;
    live2d.resize();
    const widthRatio = previousWidth > 0 ? live2d.canvas.width / previousWidth : 1;
    const heightRatio = previousHeight > 0 ? live2d.canvas.height / previousHeight : 1;
    live2d.x = previousX * widthRatio;
    live2d.y = previousY * heightRatio;
    live2d.canvas.style.width = displayWidth;
    live2d.canvas.style.height = displayHeight;
    live2d.needsResize = false;
  };
  const applyOfficialModelAnchor = (live2d: Live2DCubismModel) => {
    // `live2d-renderer` calls centerModel() after loading. That helper is a
    // generic desktop-viewer convenience: it scans the visible alpha and
    // applies a margin-based camera lift. The official F_a prefab does not
    // do that; its root is authored at (0, 0, 0), and the Unity off-screen
    // camera supplies the complete placement. Restore that camera state here
    // so the model keeps the bundle-authored anchor.
    live2d.x = live2d.canvas.width / 2;
    live2d.y = 0;
    live2d.scale = 1;
    live2d.update();
  };
  const createLive2dModel = (surface: HTMLCanvasElement) => new Live2DCubismModel(surface, {
    autoAnimate: false,
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
    enableLipsync: true,
    enableMovement: false,
    enablePose: true,
  });
  const applyRenderSurface = () => {
    const visualSceneWidth = Math.max(
      window.innerWidth,
      window.innerHeight * SCENE_WIDTH / SCENE_HEIGHT,
    );
    const visualSceneHeight = visualSceneWidth * SCENE_HEIGHT / SCENE_WIDTH;
    // Keep the complete scene in logical display coordinates. The selected
    // render resolution must never alter composition geometry; model texture
    // resolution is handled by reloading the matching model package below.
    composition.style.width = `${visualSceneWidth}px`;
    composition.style.height = `${visualSceneHeight}px`;
    composition.style.removeProperty("--stella-quality-scale");
    scene.style.left = "0px";
    scene.style.top = "0px";
    resizeGameScene(scene, visualSceneWidth, visualSceneHeight);
    for (const surface of [canvas, openingCanvas]) {
      surface.style.width = `${visualSceneWidth}px`;
      surface.style.height = `${visualSceneHeight}px`;
    }
    root.style.backgroundColor = `rgb(${Math.round(settings.backgroundColor[0] * 255)}, ${Math.round(settings.backgroundColor[1] * 255)}, ${Math.round(settings.backgroundColor[2] * 255)})`;
    requiredElement(root, "#status-viewport").textContent = `${window.innerWidth}×${window.innerHeight}`;
    requiredElement(root, "#status-render-resolution").textContent = `${settings.renderResolution} / ${settings.modelResolution}`;
    if (model) resizeLive2dViewport(model);
    if (openingModel) resizeLive2dViewport(openingModel);
    if (model?.loaded) applyOfficialModelAnchor(model);
    if (openingModel?.loaded) applyOfficialModelAnchor(openingModel);
  };
  const settingsTransform = () => `translate(-50%, -50%) translate(${settings.modelX}px, ${settings.modelY}px) rotate(${settings.modelRotation}deg) scale(${sceneTransformScale()})`;
  // F_a's official Unity root is (0, 0, 0). The shared scene projection is
  // the only placement transform; no manual floor compensation is applied.
  const modelLocalTransform = () => "translate(-50%, -50%)";
  const openingModelTransform = () => modelLocalTransform();
  const resetOpeningTransforms = () => {
    composition.style.transform = settingsTransform();
    canvas.style.transform = modelLocalTransform();
    openingCanvas.style.transform = openingModelTransform();
  };
  const stopOpeningAnimation = () => {
    if (openingAnimationFrame !== undefined) window.cancelAnimationFrame(openingAnimationFrame);
    openingAnimationFrame = undefined;
    resetOpeningTransforms();
  };
  applyRenderSurface();
  resetOpeningTransforms();
  const renderFrame = (timestamp: number) => {
    const elapsedSeconds = Math.max((timestamp - lastRenderTimestamp) / 1000, 0);
    lastRenderTimestamp = timestamp;
    if (frameLimiter.advance(elapsedSeconds, settings.fpsLimit) !== null) {
      model?.update();
      openingModel?.update();
      if (model?.loaded && !canvas.dataset.headPatRegionReady) {
        deriveHeadRegionFromRenderedModel();
        canvas.dataset.headPatRegionReady = "true";
      }
      measuredFrameCount += 1;
      const measurementElapsed = timestamp - measuredFrameWindowStartedAt;
      if (measurementElapsed >= 500) {
        requiredElement(root, "#status-fps").textContent = `${Math.round(measuredFrameCount * 1000 / measurementElapsed)}/${settings.fpsLimit}`;
        measuredFrameCount = 0;
        measuredFrameWindowStartedAt = timestamp;
      }
    }
    renderFrameRequest = window.requestAnimationFrame(renderFrame);
  };
  let lastRenderTimestamp = performance.now();
  const startRenderLoop = () => {
    if (renderFrameRequest !== undefined) window.cancelAnimationFrame(renderFrameRequest);
    frameLimiter.reset();
    measuredFrameCount = 0;
    measuredFrameWindowStartedAt = performance.now();
    lastRenderTimestamp = performance.now();
    renderFrameRequest = window.requestAnimationFrame(renderFrame);
  };
  // The exported Unity transform curves remain staged for the renderer swap.
  // Applying them through CSS is not equivalent to the game's camera pipeline.
  const animateOpeningTransforms = () => undefined;

  const setHostEvent = (value: string) => {
    hostLabel.textContent = value;
    debugPanel.setEvent(value);
    canvas.dataset.lastHostEvent = value;
  };

  adapter.subscribePaused((paused) => {
      if (activeVoiceKey && activeVoiceStartedAt > 0) {
        activeVoiceElapsedMs += Math.max(performance.now() - activeVoiceStartedAt, 0);
        activeVoiceStartedAt = paused ? 0 : performance.now();
      }
      state.paused = paused;
      dialogueTimeline.setPaused(paused);
      if (model) model.paused = paused;
      if (openingModel) openingModel.paused = paused;
      bgm.setPaused(paused);
      voice.setPaused(paused);
      status.textContent = paused ? "paused" : model?.loaded ? "ready" : "loading";
      debugPanel.setPhase(status.textContent);
      setHostEvent(paused ? "pause" : "resume");
      canvas.dataset.trialPaused = String(paused);
  });
  canvas.dataset.trialHostBridge = "installed";
  canvas.dataset.trialState = "loading";
  adapter.subscribe((next) => {
    settings = next;
    if (next.modelResolution !== activeModelResolution && model?.loaded) {
      activeModelResolution = next.modelResolution;
      reloadModelForResolution(next.modelResolution);
    }
    debugPanel.sync(next);
    applyRenderSurface();
    if (!openingStartedAt) resetOpeningTransforms();
    canvas.style.transformOrigin = "50% 50%";
    canvas.style.pointerEvents = next.interactionsEnabled ? "auto" : "none";
    bgm.configure(!next.muted, next.bgmVolume);
    voice.configure(next.voiceEnabled && !next.muted, next.voiceVolume);
    subtitle.configure(next.subtitlesEnabled, next.primarySubtitleLocale, next.secondarySubtitlesEnabled, next.secondarySubtitleLocale, next.subtitleAlignment, next.subtitlePosition, next.subtitleX, next.subtitleY);
    canvas.dataset.interactionsEnabled = String(next.interactionsEnabled);
    canvas.dataset.mouseTracking = String(next.mouseTracking);
  });

  let lookPointer: number | null = null;
  let pointerIntent: "dialogue" | "look" | "pat" = "dialogue";
  let pointerStart = { x: 0, y: 0 };
  let pointerDragged = false;
  let playHeadPat: () => boolean = () => false;
  let headRegion = { left: 0.32, right: 0.68, top: 0.08, bottom: 0.42 };
  const publishHeadRegion = () => {
    canvas.dataset.headPatRegion = JSON.stringify(headRegion);
  };
  const deriveHeadRegionFromRenderedModel = () => {
    if (!model?.loaded || canvas.width < 1 || canvas.height < 1) return;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) return;
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    try {
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    } catch {
      return;
    }
    let left = canvas.width;
    let right = -1;
    let top = canvas.height;
    let bottom = -1;
    // WebGL's framebuffer origin is bottom-left. This one-time scan is
    // intentionally sparse; it only calibrates the pointer hit region.
    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        if (pixels[(y * canvas.width + x) * 4 + 3]! < 8) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) return;
    const visualTop = 1 - bottom / canvas.height;
    const visualWidth = (right - left) / canvas.width;
    const visualHeight = (bottom - top) / canvas.height;
    if (visualWidth < 0.02 || visualHeight < 0.05) return;
    headRegion = {
      left: Math.max(0, left / canvas.width + visualWidth * 0.2),
      right: Math.min(1, right / canvas.width - visualWidth * 0.2),
      top: Math.max(0, visualTop),
      bottom: Math.min(1, visualTop + visualHeight * 0.38),
    };
    publishHeadRegion();
  };
  publishHeadRegion();
  const isHeadRegion = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return x >= headRegion.left && x <= headRegion.right && y >= headRegion.top && y <= headRegion.bottom;
  };
  canvas.addEventListener("pointerdown", (event) => {
    if (!model?.loaded || state.paused || !settings.interactionsEnabled) return;
    void bgm.retryFromUserGesture();
    lookPointer = event.pointerId;
    pointerStart = { x: event.clientX, y: event.clientY };
    pointerDragged = false;
    pointerIntent = HEAD_PATTING_ENABLED && settings.headPatting && isHeadRegion(event) && playHeadPat() ? "pat" : "dialogue";
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.pointerIntent = pointerIntent;
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!model?.loaded || event.pointerId !== lookPointer || !settings.mouseTracking || pointerIntent === "pat") return;
    pointerDragged ||= Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    if (parameterNames.has("ParamAngleX")) model.setParameter("ParamAngleX", (x - 0.5) * 30);
    if (parameterNames.has("ParamAngleY")) model.setParameter("ParamAngleY", (0.5 - y) * 20);
    if (parameterNames.has("ParamEyeBallX")) model.setParameter("ParamEyeBallX", (x - 0.5) * 1.5);
    if (parameterNames.has("ParamEyeBallY")) model.setParameter("ParamEyeBallY", (0.5 - y) * 1.2);
    pointerIntent = "look";
    canvas.dataset.pointerIntent = pointerIntent;
    debugPanel.setInteraction("视线");
  });
  const endPointer = (event: PointerEvent) => {
    if (event.pointerId !== lookPointer) return;
    const triggerDialogue = pointerIntent === "dialogue" && !pointerDragged;
    lookPointer = null;
    pointerIntent = "dialogue";
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    delete canvas.dataset.pointerIntent;
    if (triggerDialogue) playNextDialogue();
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", (event) => { if (event.pointerId === lookPointer) { lookPointer = null; pointerIntent = "dialogue"; delete canvas.dataset.pointerIntent; } });
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
  const handleKeyboardMotion = (event: KeyboardEvent) => {
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      playInteractiveMotion("keyboard");
    }
  };
  canvas.addEventListener("pointerdown", () => canvas.focus(), { capture: true });
  canvas.addEventListener("keydown", handleKeyboardMotion);
  window.addEventListener("keydown", handleKeyboardMotion);

  try {
    const settingResponse = await fetch(MODEL_URLS[settings.modelResolution], { cache: "no-store" });
    if (!settingResponse.ok) throw new Error(`model3.json HTTP ${settingResponse.status}`);
    const setting = (await settingResponse.json()) as ModelSetting;
    motionEntries = setting.FileReferences?.Motions?.Full ?? [];
    // Do not fetch the 20 MB secondary model or Timeline curves during normal
    // startup. They belong exclusively to the disabled Unity-stage experiment.
    if (OPENING_EXPERIMENT_ENABLED) {
      const [openingSettingResponse, openingCurvesResponse] = await Promise.all([
        fetch(OPENING_B_MODEL_URL, { cache: "no-store" }),
        fetch(OPENING_CURVES_URL, { cache: "no-store" }),
      ]);
      if (!openingSettingResponse.ok) throw new Error(`opening model3.json HTTP ${openingSettingResponse.status}`);
      if (!openingCurvesResponse.ok) throw new Error(`opening timeline curves HTTP ${openingCurvesResponse.status}`);
      const openingSetting = (await openingSettingResponse.json()) as ModelSetting;
      openingCurves = (await openingCurvesResponse.json()) as OpeningCurveData;
      openingMotionEntries = openingSetting.FileReferences?.Motions?.Full ?? [];
    }

    model = createLive2dModel(canvas);
    await model.load(MODEL_URLS[settings.modelResolution]);
    resizeLive2dViewport(model);
    applyOfficialModelAnchor(model);
    if (OPENING_EXPERIMENT_ENABLED) openingModel = new Live2DCubismModel(openingCanvas, {
      autoAnimate: false,
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
      enableLipsync: true,
      enableMovement: false,
      enablePose: true,
    });
    if (openingModel) {
      await openingModel.load(OPENING_B_MODEL_URL);
      resizeLive2dViewport(openingModel);
    }
    parameterNames = new Set(model.parameters.ids);
    model.paused = state.paused;
    if (openingModel) openingModel.paused = state.paused;
    composition.style.visibility = "visible";
    startRenderLoop();
    // Keep the Cubism-native geometry visible to the acceptance harness. The
    // official Unity prefab supplies the anchor through the model/camera
    // projection; these values let the Web adapter reproduce that projection
    // without introducing a hand-tuned character offset.
    canvas.dataset.live2dNativeGeometry = JSON.stringify({
      canvasWidth: model.model.getCanvasWidth(),
      canvasHeight: model.model.getCanvasHeight(),
      pixelsPerUnit: model.model.getPixelsPerUnit(),
      modelMatrixScaleX: model.modelMatrix.getScaleX(),
      modelMatrixScaleY: model.modelMatrix.getScaleY(),
    });
    canvas.dataset.live2dBounds = JSON.stringify(model.characterPosition());
    if (openingModel) openingCanvas.dataset.live2dBounds = JSON.stringify(openingModel.characterPosition());
    const rendererTransform = (live2d: Live2DCubismModel) => JSON.stringify({
      x: live2d.x,
      y: live2d.y,
      scale: live2d.scale,
      logicalLeft: live2d.logicalLeft,
      logicalRight: live2d.logicalRight,
      logicalBottom: live2d.logicalBottom,
      logicalTop: live2d.logicalTop,
    });
    canvas.dataset.live2dRendererTransform = rendererTransform(model);
    if (openingModel) openingCanvas.dataset.live2dRendererTransform = rendererTransform(openingModel);
    const findMotionIndex = (name: string) => motionEntries.findIndex(
      (entry) => basename(entry.File).toLowerCase() === name,
    );
    const idleIndex = findMotionIndex("idle");
    const fullIdleIndex = findMotionIndex("full_idle");
    const openingMotionIndex = (name: string) => openingMotionEntries.findIndex(
      (entry) => basename(entry.File).toLowerCase() === name,
    );
    let modelReloadRequest = 0;
    const publishModelDiagnostics = (surface: HTMLCanvasElement, live2d: Live2DCubismModel) => {
      surface.dataset.live2dNativeGeometry = JSON.stringify({
        canvasWidth: live2d.model.getCanvasWidth(),
        canvasHeight: live2d.model.getCanvasHeight(),
        pixelsPerUnit: live2d.model.getPixelsPerUnit(),
        modelMatrixScaleX: live2d.modelMatrix.getScaleX(),
        modelMatrixScaleY: live2d.modelMatrix.getScaleY(),
      });
      surface.dataset.live2dBounds = JSON.stringify(live2d.characterPosition());
      surface.dataset.live2dRendererTransform = JSON.stringify({
        x: live2d.x,
        y: live2d.y,
        scale: live2d.scale,
        logicalLeft: live2d.logicalLeft,
        logicalRight: live2d.logicalRight,
        logicalBottom: live2d.logicalBottom,
        logicalTop: live2d.logicalTop,
      });
      surface.dataset.modelTextureResolution = activeModelResolution;
    };
    reloadModelForResolution = (resolution) => {
      const request = ++modelReloadRequest;
      const restoredDialogue = activeDialogueIndex >= 0
        ? {
          index: activeDialogueIndex,
          eventId: DIALOGUE_IDS[activeDialogueIndex],
          locale: resolveDialogueVoiceLocale(settings.voiceLocale),
          elapsedMs: currentVoiceElapsedMs(),
        }
        : undefined;
      const previousLipSync = restoredDialogue && model?.wavController
        ? {
          samples: model.wavController.samples,
          sampleRate: model.wavController.sampleRate,
          numChannels: model.wavController.numChannels,
          samplesPerChannel: model.wavController.samplesPerChannel,
          rms: model.wavController.rms,
          previousRms: model.wavController.previousRms,
        }
        : undefined;
      canvas.dataset.modelTextureState = "loading";
      void (async () => {
        const url = MODEL_URLS[resolution];
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`model3.json HTTP ${response.status}`);
        const nextSetting = (await response.json()) as ModelSetting;
        const nextModel = createLive2dModel(canvas);
        try {
          await nextModel.load(url);
          resizeLive2dViewport(nextModel);
          if (request !== modelReloadRequest) {
            nextModel.destroy();
            return;
          }
          applyOfficialModelAnchor(nextModel);
          nextModel.paused = state.paused;
          const previous = model;
          model = nextModel;
          motionEntries = nextSetting.FileReferences?.Motions?.Full ?? [];
          parameterNames = new Set(nextModel.parameters.ids);
          delete canvas.dataset.headPatRegionReady;
          publishModelDiagnostics(canvas, nextModel);
          const restoredMotionIndex = restoredDialogue?.eventId
            ? motionEntries.findIndex((entry) => basename(entry.File).toLowerCase() === `${restoredDialogue.eventId}_${restoredDialogue.locale === "zh-cn" ? "cn" : "jp"}`)
            : -1;
          if (restoredMotionIndex >= 0) {
            void nextModel.startMotion("Full", restoredMotionIndex, MOTION_PRIORITY_NORMAL);
            motionLabel.textContent = basename(motionEntries[restoredMotionIndex]?.File ?? restoredDialogue?.eventId ?? "dialogue");
            debugPanel.setAnimation(motionLabel.textContent);
            debugPanel.setInteraction("对话");
          } else {
            const nextIdleIndex = motionEntries.findIndex((entry) => basename(entry.File).toLowerCase() === "idle");
            if (nextIdleIndex >= 0) void nextModel.startMotion("Full", nextIdleIndex, MOTION_PRIORITY_IDLE);
          }
          if (previous?.loaded) previous.destroy();
          canvas.dataset.modelTextureState = "ready";
          canvas.dataset.trialModel = `14401_full_${resolution}`;
          if (restoredDialogue?.eventId && voice.getSnapshot().eventId === restoredDialogue.eventId) {
            if (previousLipSync && transferLipSyncState(nextModel, previousLipSync, restoredDialogue.elapsedMs)) {
              canvas.dataset.lipSync = nextModel.lipsync ? "ready" : "unsupported";
            } else {
              prepareLipSync(restoredDialogue.eventId, restoredDialogue.locale, nextModel, restoredDialogue.elapsedMs);
            }
            canvas.dataset.dialogueRestoredAfterQualityChange = restoredDialogue.eventId;
          }
        } catch (error) {
          nextModel.destroy();
          throw error;
        }
      })().catch((error) => {
        canvas.dataset.modelTextureState = "error";
        wallpaperLogger.warn("error", `Live2D ${resolution} 纹理档位切换失败：${error instanceof Error ? error.message : String(error)}`);
      });
    };
    playHeadPat = () => {
      if (!HEAD_PATTING_ENABLED || !model?.loaded || !settings.headPatting) return false;
      const candidates = motionEntries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => /^special_[ab]$/i.test(basename(entry.File)));
      const next = candidates[state.clicks % candidates.length];
      if (!next) return false;
      state.clicks += 1;
      void model.startMotion("Full", next.index, MOTION_PRIORITY_NORMAL);
      motionLabel.textContent = basename(next.entry.File);
      debugPanel.setAnimation(motionLabel.textContent);
      debugPanel.setInteraction("摸头");
      debugPanel.setLastAction("摸头");
      canvas.dataset.lastInteraction = "head-pat";
      return true;
    };
    const clearOpeningTimers = () => {
      for (const timer of openingTimers) window.clearTimeout(timer);
      openingTimers = [];
    };
    const stopCurrentMotion = () => model?.motionController.stopMotions();
    const stopOpeningMotion = () => openingModel?.motionController.stopMotions();
    skipToIdle = () => {
      if (!model?.loaded || idleIndex < 0) return;
      clearOpeningTimers();
      stopOpeningAnimation();
      openingStartedAt = 0;
      stopCurrentMotion();
      stopOpeningMotion();
      openingCanvas.style.opacity = "0";
      canvas.style.opacity = "1";
      void model.startMotion("Full", idleIndex, MOTION_PRIORITY_IDLE);
      motionLabel.textContent = basename(motionEntries[idleIndex]?.File ?? "idle");
      debugPanel.setAnimation(motionLabel.textContent);
      debugPanel.setInteraction("待机");
      canvas.dataset.openingState = "skipped";
    };
    replayOpening = () => {
      if (!model?.loaded || !openingModel?.loaded) return;
      if (!settings.introAnimation) { skipToIdle(); return; }
      clearOpeningTimers();
      stopOpeningAnimation();
      openingStartedAt = 0;
      stopCurrentMotion();
      stopOpeningMotion();
      canvas.style.opacity = "0";
      openingCanvas.style.opacity = "0";
      debugPanel.setInteraction("opening");
      canvas.dataset.openingState = "running";
      for (const entry of OFFICIAL_OPENING_TIMELINE) {
        const timer = window.setTimeout(() => {
          if (!model?.loaded || !openingModel?.loaded || state.paused) return;
          if (entry.performer === "b") {
            const index = openingMotionIndex(entry.motion);
            if (index < 0) return;
            canvas.style.opacity = "0";
            openingCanvas.style.opacity = "1";
            stopOpeningMotion();
            void openingModel.startMotion("Full", index, MOTION_PRIORITY_FORCE);
          } else {
            const index = findMotionIndex(entry.motion);
            if (index < 0) return;
            openingCanvas.style.opacity = "0";
            canvas.style.opacity = "1";
            stopCurrentMotion();
            void model.startMotion("Full", index, entry.motion === "idle" ? MOTION_PRIORITY_IDLE : MOTION_PRIORITY_FORCE);
          }
          motionLabel.textContent = `${entry.motion} · official timeline`;
          debugPanel.setAnimation(motionLabel.textContent);
          canvas.dataset.openingState = entry.motion;
        }, entry.atMs);
        openingTimers.push(timer);
      }
      openingTimers.push(window.setTimeout(() => {
        openingTimers = [];
        stopOpeningAnimation();
        openingStartedAt = 0;
        openingCanvas.style.opacity = "0";
        canvas.style.opacity = "1";
        debugPanel.setInteraction("idle");
        canvas.dataset.openingState = "complete";
      }, OFFICIAL_OPENING_DURATION_MS));
      return;
    };
    playNextDialogue = () => {
      if (!model?.loaded || state.paused || !settings.interactionsEnabled) return;
      // Manual dialogue playback is a repeatable interaction. Automatic
      // playback still stops after the final item, but the next user click
      // starts a fresh round instead of remaining permanently at the end.
      if (state.dialogueIndex >= DIALOGUE_IDS.length) {
        state.dialogueIndex = 0;
        delete canvas.dataset.dialogueAutoplay;
      }
      const dialogueIndex = state.dialogueIndex;
      const eventId = DIALOGUE_IDS[dialogueIndex]!;
      const voiceLocale = resolveDialogueVoiceLocale(settings.voiceLocale);
      const motionIndex = motionEntries.findIndex((entry) => basename(entry.File).toLowerCase() === `${eventId}_${voiceLocale === "zh-cn" ? "cn" : "jp"}`);
      state.dialogueIndex += 1;
      canvas.dataset.dialogueIndex = String(dialogueIndex);
      if (settings.dialogueAutoPlay) canvas.dataset.dialogueAutoplay = "running";
      if (motionIndex >= 0) void model.startMotion("Full", motionIndex, MOTION_PRIORITY_NORMAL);
      const timelineEvents = DIALOGUE_EVENTS[eventId]?.[voiceLocale === "zh-cn" ? "cn" : "jp"];
      if (!timelineEvents) return;
      activeDialogueIndex = dialogueIndex;
      dialogueTimeline.play({ id: eventId, pages: splitAvgDialoguePages(DIALOGUE_COMMANDS_BY_LOCALE[voiceLocale]![dialogueIndex]!), events: timelineEvents }, {
        onPage: (page, pageIndex, event) => {
          const pageId = `${eventId}:page:${pageIndex}`;
          subtitle.show(pageId);
          canvas.dataset.dialogueTimelineEvent = event.name;
          canvas.dataset.dialogueTimelinePage = String(pageIndex);
        },
        onEnd: (event) => {
          canvas.dataset.dialogueTimelineEvent = event.name;
          subtitle.hide();
        },
        onDone: (event) => {
          canvas.dataset.dialogueTimelineEvent = event.name;
          canvas.dataset.dialogueTimelineComplete = eventId;
          activeDialogueIndex = -1;
        },
      });
      if (settings.voiceEnabled && !settings.muted) {
        canvas.dataset.voicePlayback = "starting";
        canvas.dataset.voiceEvent = eventId;
        activeVoiceKey = `${eventId}:${voiceLocale}`;
        activeVoiceElapsedMs = 0;
        activeVoiceStartedAt = performance.now();
        prepareLipSync(eventId, voiceLocale);
        void voice.play(eventId, voiceLocale).then(() => {
          canvas.dataset.voicePlayback = voice.getSnapshot().playing ? "playing" : "stopped";
        });
      }
      motionLabel.textContent = basename(motionEntries[motionIndex]?.File ?? eventId);
      debugPanel.setAnimation(motionLabel.textContent);
      debugPanel.setInteraction("对话");
      debugPanel.setLastAction("点击");
      canvas.dataset.lastDialogue = eventId;
    };
    if (OPENING_EXPERIMENT_ENABLED && settings.introAnimation) {
      // Let the Cubism renderer commit its first frame before forcing the
      // sequence. This keeps the entry motion from being consumed by startup.
      window.requestAnimationFrame(() => window.requestAnimationFrame(replayOpening));
    } else skipToIdle();
    status.textContent = state.paused ? "paused" : "ready";
    debugPanel.setPhase(status.textContent);
    canvas.dataset.trialState = "ready";
    canvas.dataset.trialModel = "14401_full";
    scene.dataset.sceneState = "ready";
  } catch (error) {
    if (renderFrameRequest !== undefined) window.cancelAnimationFrame(renderFrameRequest);
    renderFrameRequest = undefined;
    stopOpeningAnimation();
    if (model?.loaded) model.destroy();
    if (openingModel?.loaded) openingModel.destroy();
    model = undefined;
    status.textContent = "error";
    canvas.dataset.trialState = "error";
    scene.dataset.sceneState = "error";
    debugPanel.setPhase("Live2D 加载失败");
    console.error("[stella-sora] Live2D model failed to load", error);
  }
}
