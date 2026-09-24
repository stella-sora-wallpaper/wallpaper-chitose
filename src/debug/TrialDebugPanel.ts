import { DebugPanelPointerController, PANEL_TEXT, resolvePropertyGroupVisibility, type PanelLocale, type WallpaperEngineAdapter, type WallpaperLogger, type WallpaperSettings } from "ba-memorial-lobby-wallpaper-runtime";

export interface TrialDebugPanel {
  setPhase(value: string): void; setAnimation(value: string): void; setInteraction(value: string): void;
  setLastAction(value: string): void; setEvent(value: string): void;
  sync(settings: Readonly<WallpaperSettings>): void; dispose(): void;
}
export interface TrialDebugPanelCallbacks { onReplayOpening(): void; onSkipToIdle(): void; onNextDialogue(): void }

// The opening Unity stage is a later architecture experiment. Keep its
// callbacks and DOM bindings for that experiment, but do not expose controls
// for an unsupported feature in the first release UX.
const OPENING_UX_ENABLED = false;

function required<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector); if (!element) throw new Error(`Missing runtime debug element: ${selector}`); return element;
}

const LANGUAGE_SELECT_ALLOWED_VALUES: Readonly<Record<string, ReadonlySet<string>>> = {
  "#debug-dialogue-language-preset": new Set(["zh-cn", "ja", "custom"]),
  "#debug-voice-language": new Set(["zh-cn", "ja"]),
  "#debug-primary-subtitle-language": new Set(["zh-cn", "ja", "en"]),
  "#debug-secondary-subtitle-language": new Set(["zh-cn", "ja", "en"]),
};

function restrictLanguageOptions(root: HTMLElement): void {
  for (const [selector, allowed] of Object.entries(LANGUAGE_SELECT_ALLOWED_VALUES)) {
    const select = required<HTMLSelectElement>(root, selector);
    for (let index = select.options.length - 1; index >= 0; index -= 1) {
      if (!allowed.has(select.options[index]!.value)) select.remove(index);
    }
  }
}

function resolveDialoguePreset(value: string): "zh-cn" | "ja" | "custom" {
  return value === "zh-cn" || value === "ja" || value === "custom" ? value : "custom";
}

function resolveVoiceLocale(value: string): "zh-cn" | "ja" {
  return value === "zh-cn" ? "zh-cn" : "ja";
}

function resolveSubtitleLocale(value: string): "zh-cn" | "ja" | "en" {
  return value === "zh-cn" || value === "ja" || value === "en" ? value : "en";
}

export function mountTrialDebugPanel(root: HTMLElement, logger: WallpaperLogger, adapter: WallpaperEngineAdapter, callbacks: TrialDebugPanelCallbacks): TrialDebugPanel {
  restrictLanguageOptions(root);
  const panel = required<HTMLElement>(root, "#status-panel");
  const toggle = required<HTMLButtonElement>(root, "#debug-panel-toggle");
  const logViewer = required<HTMLElement>(root, "#wallpaper-log-viewer");
  const logViewport = required<HTMLPreElement>(root, "#wallpaper-log-viewer-content");
  const pointer = new DebugPanelPointerController({ panel, panelScrollbar: required(root, "#debug-panel-scrollbar"), panelScrollbarThumb: required(root, "#debug-panel-scrollbar-thumb"), logViewer, logViewport, logScrollbar: required(root, "#wallpaper-log-scrollbar"), logScrollbarThumb: required(root, "#wallpaper-log-scrollbar-thumb"), logHorizontalScrollbar: required(root, "#wallpaper-log-scrollbar-horizontal"), logHorizontalScrollbarThumb: required(root, "#wallpaper-log-scrollbar-horizontal-thumb") });
  const forceDebugPanel = new URLSearchParams(location.search).has("debug");
  let expanded = !new URLSearchParams(location.search).has("hideDebug");
  let debugEnabled = true;
  let panelLocale: PanelLocale = "zh-cn";
  const refresh = () => pointer.requestRefresh();
  const syncPanelText = () => {
    const text = PANEL_TEXT[panelLocale];
    document.documentElement.lang = panelLocale === "en" ? "en" : "zh-CN";
    for (const element of root.querySelectorAll<HTMLElement>("[data-panel-text]")) {
      const key = element.dataset.panelText as keyof typeof text | undefined;
      const value = key ? text[key] : undefined;
      if (typeof value === "string") element.textContent = value;
    }
    for (const element of root.querySelectorAll<HTMLElement>("[data-panel-aria]")) {
      const key = element.dataset.panelAria as keyof typeof text | undefined;
      const value = key ? text[key] : undefined;
      if (typeof value === "string") element.setAttribute("aria-label", value);
    }
  };
  // This Live2D scene is authored as one composed game snapshot. Keep the
  // BA-derived property ids for compatibility, but make the UX explicit that
  // the controls transform the character and its background together.
  const syncCompositionLabels = () => {
    const labels = panelLocale === "en"
      ? { modelScale: "Scene scale", modelX: "Scene X", modelY: "Scene Y", modelRotation: "Scene rotation" }
      : { modelScale: "整体缩放", modelX: "整体 X", modelY: "整体 Y", modelRotation: "整体旋转" };
    for (const [key, label] of Object.entries(labels)) {
      const element = root.querySelector<HTMLElement>(`[data-panel-text="${key}"]`);
      if (element) element.textContent = label;
    }
  };
  const syncPanelVisibility = () => { toggle.hidden = false; toggle.disabled = false; toggle.setAttribute("aria-expanded", String(expanded)); toggle.textContent = expanded ? PANEL_TEXT[panelLocale].hideDebugPanel : PANEL_TEXT[panelLocale].showDebugPanel; panel.classList.toggle("status-panel--visible", expanded); panel.setAttribute("aria-hidden", String(!expanded)); refresh(); };
  toggle.addEventListener("click", () => { expanded = !expanded; syncPanelVisibility(); });
  for (const button of panel.querySelectorAll<HTMLButtonElement>(".status-panel__property-group-toggle, .status-panel__subgroup-toggle")) button.addEventListener("click", () => { const group = button.closest<HTMLElement>(".status-panel__property-group, .status-panel__nested-controls"); if (!group) return; const open = button.getAttribute("aria-expanded") !== "true"; button.setAttribute("aria-expanded", String(open)); group.classList.toggle(group.classList.contains("status-panel__nested-controls") ? "status-panel__nested-controls--collapsed" : "status-panel__property-group--collapsed", !open); refresh(); });
  const replayIntro = required<HTMLButtonElement>(root, "#debug-replay-intro");
  replayIntro.hidden = !OPENING_UX_ENABLED;
  replayIntro.disabled = !OPENING_UX_ENABLED;
  replayIntro.title = "The opening sequence is reserved for the Unity WebGL stage experiment.";
  const skipIntro = required<HTMLButtonElement>(root, "#debug-skip-idle");
  skipIntro.hidden = !OPENING_UX_ENABLED;
  skipIntro.disabled = !OPENING_UX_ENABLED;
  skipIntro.title = replayIntro.title;
  const introAnimation = required<HTMLInputElement>(root, "#debug-intro-animation");
  const introAnimationControl = introAnimation.closest<HTMLElement>("label");
  const syncOpeningControlVisibility = () => {
    const hidden = !OPENING_UX_ENABLED;
    introAnimation.hidden = hidden;
    introAnimation.toggleAttribute("hidden", hidden);
    introAnimation.setAttribute("aria-hidden", String(hidden));
    if (introAnimationControl) {
      introAnimationControl.hidden = hidden;
      introAnimationControl.toggleAttribute("hidden", hidden);
      introAnimationControl.setAttribute("aria-hidden", String(hidden));
      introAnimationControl.style.display = hidden ? "none" : "";
    }
  };
  syncOpeningControlVisibility();
  introAnimation.disabled = !OPENING_UX_ENABLED;
  introAnimation.title = replayIntro.title;
  required<HTMLButtonElement>(root, "#debug-dialogue").addEventListener("click", callbacks.onNextDialogue);
  required<HTMLButtonElement>(root, "#debug-restore-host-settings").addEventListener("click", () => adapter.clearSessionOverrides());
  required<HTMLButtonElement>(root, "#debug-hitboxes").disabled = true;
  const bindings: Array<[string, string, "change" | "input", "b" | "n" | "s"]> = [
    ["quality-preset","qualitypreset","change","s"],["render-resolution","renderresolution","change","s"],["model-resolution","modelresolution","change","s"],["fps","fpslimit","input","n"],
    ["position-preset","positionpreset","change","s"],["model-scale","modelscale","input","n"],["model-x","modelx","input","n"],["model-y","modely","input","n"],["model-rotation","modelrotation","input","n"],
    ["panel-position-preset","panelpositionpreset","change","s"],["panel-scale","panelscale","input","n"],["panel-x","panelx","input","n"],["panel-y","panely","input","n"],["panel-language","panellanguage","change","s"],
    ["interaction-preset","interactionpreset","change","s"],["intro-animation","introanimation","change","b"],["interactions-enabled","interactions","change","b"],["mouse-tracking","mousetracking","change","b"],["head-patting","headpatting","change","b"],["voice-enabled","voicelines","change","b"],
    ["muted","muted","change","b"],["bgm-volume","bgmvolume","input","n"],["voice-volume","voicevolume","input","n"],["dialogue-autoplay","dialogueautoplay","change","b"],["dialogue-language-preset","dialoguelanguagepreset","change","s"],["voice-language","voicelanguage","change","s"],
    ["show-subtitles","showsubtitles","change","b"],["primary-subtitle-language","subtitlelanguage","change","s"],["show-secondary-subtitles","showsecondarysubtitles","change","b"],["secondary-subtitle-language","secondarysubtitlelanguage","change","s"],["subtitle-alignment","subtitlealignment","change","s"],["subtitle-position","subtitleposition","change","s"],["subtitle-x","subtitlex","input","n"],["subtitle-y","subtitley","input","n"]
  ];
  for (const [suffix, property, eventName, kind] of bindings) { const input = required<HTMLInputElement | HTMLSelectElement>(root, `#debug-${suffix}`); input.addEventListener(eventName, () => adapter.setUserPropertiesForDebug({ [property]: kind === "b" && input instanceof HTMLInputElement ? input.checked : kind === "n" ? Number(input.value) : input.value })); }
  const headPat = required<HTMLInputElement>(root, "#debug-head-patting"); headPat.disabled = false; headPat.closest("label")?.removeAttribute("title");
  required<HTMLButtonElement>(root, "#debug-open-logs").addEventListener("click", () => { logViewport.textContent = logger.getSessionSnapshot().sessions.flatMap((session) => [`# ${session.fileName} · ${session.status}`, ...session.lines]).join("\n"); logViewer.hidden = false; refresh(); });
  required<HTMLButtonElement>(root, "#wallpaper-log-viewer-close").addEventListener("click", () => { logViewer.hidden = true; refresh(); });
  const value = (id: string, next: string | number | boolean) => { const input = required<HTMLInputElement | HTMLSelectElement>(root, `#debug-${id}`); if (typeof next === "boolean" && input instanceof HTMLInputElement) input.checked = next; else input.value = String(next); };
  const output = (id: string, next: string) => { required<HTMLOutputElement>(root, `#debug-${id}-output`).value = next; };
  const hide = (id: string, hidden: boolean) => { required<HTMLElement>(root, `#debug-${id}`).hidden = hidden; };
  let languageMigrationApplied = false;
  const sync = (s: Readonly<WallpaperSettings>) => {
    if (!languageMigrationApplied) {
      const migration: Record<string, boolean | number | string> = {};
      if (s.dialogueLanguagePreset === "ko" || s.dialogueLanguagePreset === "en") {
        migration.dialoguelanguagepreset = "custom";
        migration.voicelanguage = resolveVoiceLocale(s.voiceLocale);
        migration.subtitlelanguage = s.dialogueLanguagePreset === "en" ? "en" : "ja";
      }
      if (s.voiceLocale !== "zh-cn" && s.voiceLocale !== "ja") migration.voicelanguage = "ja";
      if (s.primarySubtitleLocale === "ko") migration.subtitlelanguage = "en";
      if (s.secondarySubtitleLocale === "ko") migration.secondarysubtitlelanguage = "en";
      if (Object.keys(migration).length > 0) {
        languageMigrationApplied = true;
        adapter.setUserPropertiesForDebug(migration);
      }
    }
    debugEnabled = forceDebugPanel || s.debugPanelEnabled;
    panelLocale = s.panelLocale;
    syncPanelText();
    syncCompositionLabels();
    toggle.textContent = expanded ? PANEL_TEXT[panelLocale].hideDebugPanel : PANEL_TEXT[panelLocale].showDebugPanel;
    const debugVisible = expanded && debugEnabled;
    toggle.hidden = !debugEnabled;
    toggle.disabled = !debugEnabled;
    toggle.setAttribute("aria-expanded", String(debugVisible));
    panel.classList.toggle("status-panel--visible", debugVisible);
    panel.setAttribute("aria-hidden", String(!debugVisible));
    headPat.disabled = false;
    syncOpeningControlVisibility();
    introAnimation.disabled = !OPENING_UX_ENABLED;
    const v = resolvePropertyGroupVisibility(s);
    value("quality-preset",s.qualityPreset); hide("quality-custom",!v.qualityCustom); value("render-resolution",s.renderResolution); value("model-resolution",s.modelResolution); value("fps",s.fpsLimit); output("fps",`${s.fpsLimit} FPS`);
    value("position-preset",s.positionPreset); hide("position-custom",!v.positionCustom); value("model-scale",s.modelScale); output("model-scale",s.modelScale.toFixed(2)); value("model-x",s.modelX); output("model-x",String(s.modelX)); value("model-y",s.modelY); output("model-y",String(s.modelY)); value("model-rotation",s.modelRotation); output("model-rotation",`${s.modelRotation}°`);
    value("panel-position-preset",s.panelPositionPreset); hide("panel-position-custom",!v.panelPositionCustom); value("panel-scale",s.panelScale); output("panel-scale",s.panelScale.toFixed(2)); value("panel-x",s.panelX); output("panel-x",String(s.panelX)); value("panel-y",s.panelY); output("panel-y",String(s.panelY)); panel.style.setProperty("--debug-panel-scale",String(s.panelScale)); panel.style.setProperty("--debug-panel-x",`${s.panelX}px`); panel.style.setProperty("--debug-panel-y",`${s.panelY}px`);
    value("interaction-preset",s.interactionPreset); hide("interaction-custom",!v.interactionCustom); hide("interaction-dependent",!v.interactionChildren); value("intro-animation",false); value("interactions-enabled",s.interactionsEnabled); value("mouse-tracking",s.mouseTracking); value("head-patting",s.headPatting); value("voice-enabled",s.voiceEnabled);
    value("muted",s.muted); hide("bgm-volume-control",!v.bgmVolume); hide("voice-volume-control",!v.voiceVolume); value("bgm-volume",Math.round(s.bgmVolume*100)); output("bgm-volume",`${Math.round(s.bgmVolume*100)}%`); value("voice-volume",Math.round(s.voiceVolume*100)); output("voice-volume",`${Math.round(s.voiceVolume*100)}%`);
    hide("dialogue-playback-group",!v.dialogueControls); value("dialogue-autoplay",s.dialogueAutoPlay); value("dialogue-language-preset",resolveDialoguePreset(s.dialogueLanguagePreset)); hide("dialogue-custom",!v.dialogueCustom); value("voice-language",resolveVoiceLocale(s.voiceLocale)); value("show-subtitles",s.subtitlesEnabled); hide("primary-subtitle-language-control",!v.primarySubtitleLanguage); value("primary-subtitle-language",resolveSubtitleLocale(s.primarySubtitleLocale)); hide("show-secondary-subtitles-control",!v.secondarySubtitles); value("show-secondary-subtitles",s.secondarySubtitlesEnabled); hide("secondary-subtitle-language-control",!v.secondarySubtitleLanguage); value("secondary-subtitle-language",resolveSubtitleLocale(s.secondarySubtitleLocale)); value("subtitle-alignment",s.subtitleAlignment); value("subtitle-position",s.subtitlePosition); hide("subtitle-custom-position",!v.subtitleCustomPosition); value("subtitle-x",s.subtitleX); output("subtitle-x",String(s.subtitleX)); value("subtitle-y",s.subtitleY); output("subtitle-y",String(s.subtitleY)); value("panel-language",s.panelLocale);
    required<HTMLButtonElement>(root,"#debug-restore-host-settings").disabled = !adapter.hasSessionOverrides; refresh();
  };
  const setText = (selector: string, next: string) => { required<HTMLElement>(root,selector).textContent = next; };
  sync(adapter.current); setText("#status-runtime","Live2D / Cubism");
  return { setPhase: (x)=>setText("#status-phase",x), setAnimation:(x)=>setText("#status-animation",x), setInteraction:(x)=>setText("#status-interaction",x), setLastAction:(x)=>setText("#status-last-action",x), setEvent:(x)=>setText("#status-event",x), sync, dispose:()=>pointer.dispose() };
}
