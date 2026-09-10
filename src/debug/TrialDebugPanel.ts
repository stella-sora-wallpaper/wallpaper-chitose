import {
  DebugPanelPointerController,
  type WallpaperLogger,
} from "ba-memorial-lobby-wallpaper-runtime";

export interface TrialDebugPanel {
  setPhase(value: string): void;
  setAnimation(value: string): void;
  setInteraction(value: string): void;
  setLastAction(value: string): void;
  setEvent(value: string): void;
  dispose(): void;
}

export interface TrialDebugPanelCallbacks {
  onReplayOpening(): void;
  onSkipToIdle(): void;
}

function required<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing runtime debug element: ${selector}`);
  return element;
}

function renderLogSnapshot(logger: WallpaperLogger): string {
  const snapshot = logger.getSessionSnapshot();
  return snapshot.sessions
    .flatMap((session) => [`# ${session.fileName} · ${session.status}`, ...session.lines])
    .join("\n");
}

export function mountTrialDebugPanel(
  root: HTMLElement,
  logger: WallpaperLogger,
  callbacks: TrialDebugPanelCallbacks,
): TrialDebugPanel {
  const panel = required<HTMLElement>(root, "#status-panel");
  const toggle = required<HTMLButtonElement>(root, "#debug-panel-toggle");
  const logViewer = required<HTMLElement>(root, "#wallpaper-log-viewer");
  const logViewport = required<HTMLPreElement>(root, "#wallpaper-log-viewer-content");
  const pointerController = new DebugPanelPointerController({
    panel,
    panelScrollbar: required<HTMLElement>(root, "#debug-panel-scrollbar"),
    panelScrollbarThumb: required<HTMLElement>(root, "#debug-panel-scrollbar-thumb"),
    logViewer,
    logViewport,
    logScrollbar: required<HTMLElement>(root, "#wallpaper-log-scrollbar"),
    logScrollbarThumb: required<HTMLElement>(root, "#wallpaper-log-scrollbar-thumb"),
    logHorizontalScrollbar: required<HTMLElement>(root, "#wallpaper-log-scrollbar-horizontal"),
    logHorizontalScrollbarThumb: required<HTMLElement>(root, "#wallpaper-log-scrollbar-horizontal-thumb"),
  });

  let expanded = !new URLSearchParams(window.location.search).has("hideDebug");
  const syncVisibility = () => {
    toggle.hidden = false;
    toggle.disabled = false;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "隐藏调试面板" : "显示调试面板";
    toggle.setAttribute("aria-label", toggle.textContent);
    panel.classList.toggle("status-panel--visible", expanded);
    panel.setAttribute("aria-hidden", String(!expanded));
    pointerController.refresh();
  };
  toggle.addEventListener("click", () => {
    expanded = !expanded;
    syncVisibility();
  });

  const groupButtons = [...panel.querySelectorAll<HTMLButtonElement>(
    ".status-panel__property-group-toggle, .status-panel__subgroup-toggle",
  )];
  const toggleGroup = (button: HTMLButtonElement) => {
    const group = button.closest<HTMLElement>(
      ".status-panel__property-group, .status-panel__nested-controls",
    );
    if (!group) return;
    const isExpanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(isExpanded));
    group.classList.toggle(
      group.classList.contains("status-panel__nested-controls")
        ? "status-panel__nested-controls--collapsed"
        : "status-panel__property-group--collapsed",
      !isExpanded,
    );
    pointerController.requestRefresh();
  };
  for (const button of groupButtons) button.addEventListener("click", () => toggleGroup(button));

  required<HTMLButtonElement>(root, "#debug-replay-intro").addEventListener(
    "click",
    () => callbacks.onReplayOpening(),
  );
  required<HTMLButtonElement>(root, "#debug-skip-idle").addEventListener(
    "click",
    () => callbacks.onSkipToIdle(),
  );

  const panelScale = required<HTMLInputElement>(root, "#debug-panel-scale");
  const panelScaleOutput = required<HTMLOutputElement>(root, "#debug-panel-scale-output");
  const panelX = required<HTMLInputElement>(root, "#debug-panel-x");
  const panelXOutput = required<HTMLOutputElement>(root, "#debug-panel-x-output");
  const panelY = required<HTMLInputElement>(root, "#debug-panel-y");
  const panelYOutput = required<HTMLOutputElement>(root, "#debug-panel-y-output");
  const syncPanelLayout = () => {
    panel.style.setProperty("--debug-panel-scale", panelScale.value);
    panel.style.setProperty("--debug-panel-x", `${panelX.value}px`);
    panel.style.setProperty("--debug-panel-y", `${panelY.value}px`);
    panelScaleOutput.value = Number(panelScale.value).toFixed(2);
    panelXOutput.value = panelX.value;
    panelYOutput.value = panelY.value;
    pointerController.requestRefresh();
  };
  for (const input of [panelScale, panelX, panelY]) input.addEventListener("input", syncPanelLayout);

  const openLogs = required<HTMLButtonElement>(root, "#debug-open-logs");
  const closeLogs = required<HTMLButtonElement>(root, "#wallpaper-log-viewer-close");
  openLogs.addEventListener("click", () => {
    logViewport.textContent = renderLogSnapshot(logger);
    logViewer.hidden = false;
    pointerController.requestRefresh();
  });
  closeLogs.addEventListener("click", () => {
    logViewer.hidden = true;
    pointerController.requestRefresh();
  });

  const setText = (selector: string, value: string) => {
    required<HTMLElement>(root, selector).textContent = value;
  };
  syncVisibility();
  syncPanelLayout();
  setText("#status-runtime", "Live2D / Cubism");

  return {
    setPhase: (value) => setText("#status-phase", value),
    setAnimation: (value) => setText("#status-animation", value),
    setInteraction: (value) => setText("#status-interaction", value),
    setLastAction: (value) => setText("#status-last-action", value),
    setEvent: (value) => setText("#status-event", value),
    dispose: () => {
      pointerController.dispose();
    },
  };
}
