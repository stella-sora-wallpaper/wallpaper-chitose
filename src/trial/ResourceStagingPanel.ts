import { installWallpaperEngineBridge } from "ba-memorial-lobby-wallpaper-runtime/wallpaper-engine";
import "./trial.css";

export async function mountResourceStagingPanel(root: HTMLElement): Promise<void> {
  const canvas = root.querySelector<HTMLCanvasElement>("#wallpaper");
  if (!canvas) throw new Error("Missing runtime canvas for trial panel.");
  const state = { focusX: 0.5, focusY: 0.42, clicks: 0, paused: false };
  const panel = document.createElement("section");
  panel.className = "stella-trial-panel";
  panel.setAttribute("aria-label", "Stella Sora Chitose resource staging");
  panel.innerHTML = `
    <p class="stella-trial-kicker">STELLA SORA · WEB WALLPAPER TRIAL</p>
    <h1>千都世 <span>Chitose</span></h1>
    <p class="stella-trial-copy">运行时框架已就位，角色 Live2D/Unity 资源等待人工补齐。</p>
    <p class="stella-trial-hint">移动鼠标观察星光，点击画布记录一次交互。</p>
    <dl>
      <div><dt>资源状态</dt><dd data-trial-status>pending</dd></div>
      <div><dt>交互次数</dt><dd data-trial-clicks>0</dd></div>
      <div><dt>WE 宿主</dt><dd data-trial-host>none</dd></div>
    </dl>`;
  root.append(panel);
  root.classList.add("stella-trial");
  root.querySelector<HTMLElement>("#loading")?.setAttribute("hidden", "");
  const shellState = root.querySelector<HTMLElement>("#status-state");
  if (shellState) shellState.textContent = "资源待补齐";
  canvas.dataset.trialState = "ready";
  const status = panel.querySelector<HTMLElement>("[data-trial-status]");
  const clicks = panel.querySelector<HTMLElement>("[data-trial-clicks]");
  const host = panel.querySelector<HTMLElement>("[data-trial-host]");
  if (!status || !clicks || !host) throw new Error("Missing trial status nodes.");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable for trial panel.");

  const render = (time: number) => {
    if (!state.paused) {
      const width = Math.max(canvas.clientWidth * window.devicePixelRatio, 1);
      const height = Math.max(canvas.clientHeight * window.devicePixelRatio, 1);
      canvas.width = width; canvas.height = height;
      context.setTransform(width / 1280, 0, 0, height / 800, 0, 0);
      const gradient = context.createLinearGradient(0, 0, 1280, 800);
      gradient.addColorStop(0, "#08162d"); gradient.addColorStop(.52, "#142d55"); gradient.addColorStop(1, "#2f1e52");
      context.fillStyle = gradient; context.fillRect(0, 0, 1280, 800);
      context.globalAlpha = .55;
      for (let i = 0; i < 36; i += 1) {
        const x = (i * 197 + 73) % 1280, y = (i * 89 + 39) % 620;
        const pulse = 1 + Math.sin(time / 900 + i) * .45;
        context.fillStyle = i % 3 === 0 ? "#a9e8ff" : "#f4d8ff";
        context.beginPath(); context.arc(x, y, pulse * (i % 4 === 0 ? 2.2 : 1.1), 0, Math.PI * 2); context.fill();
      }
      context.globalAlpha = 1;
      const towerX = 790;
      context.fillStyle = "rgba(8, 17, 42, .72)"; context.beginPath();
      context.moveTo(towerX - 160, 720); context.lineTo(towerX - 82, 170); context.lineTo(towerX + 82, 170); context.lineTo(towerX + 160, 720); context.closePath(); context.fill();
      context.strokeStyle = "rgba(142, 215, 255, .55)"; context.lineWidth = 3; context.stroke();
      context.fillStyle = "rgba(128, 209, 255, .45)";
      for (let row = 0; row < 5; row += 1) for (let column = 0; column < 3; column += 1) context.fillRect(towerX - 53 + column * 50, 245 + row * 79, 18, 28);
      const cx = 400 + state.focusX * 90, cy = 420 + state.focusY * 25;
      const glow = context.createRadialGradient(cx, cy, 12, cx, cy, 210);
      glow.addColorStop(0, "rgba(255, 231, 249, .88)"); glow.addColorStop(.38, "rgba(164, 221, 255, .34)"); glow.addColorStop(1, "rgba(164, 221, 255, 0)");
      context.fillStyle = glow; context.beginPath(); context.arc(cx, cy, 210, 0, Math.PI * 2); context.fill();
      context.fillStyle = "rgba(248, 232, 255, .88)"; context.beginPath(); context.ellipse(cx, cy, 112, 156, -.12, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#d1e7ff"; context.beginPath(); context.arc(cx, cy - 122, 88, 0, Math.PI * 2); context.fill();
      context.fillStyle = "rgba(73, 118, 179, .48)"; context.fillRect(cx - 116, cy - 88, 232, 24);
      context.fillStyle = "#152d58"; context.beginPath(); context.arc(cx - 31 + state.focusX * 9, cy - 128, 7, 0, Math.PI * 2); context.arc(cx + 31 + state.focusX * 9, cy - 128, 7, 0, Math.PI * 2); context.fill();
      context.font = "600 18px system-ui, sans-serif"; context.fillStyle = "rgba(255,255,255,.74)"; context.fillText("trial preview · no game assets bundled", 44, 748);
    }
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
  const setHostEvent = (value: string) => { host.textContent = value; canvas.dataset.lastHostEvent = value; };
  installWallpaperEngineBridge(window, {
    applyUserProperties(properties) { const keys = Object.keys(properties); setHostEvent(keys.length ? `user:${keys.join(",")}` : "user:empty"); },
    applyGeneralProperties(properties) { setHostEvent(`general:${properties.fps ?? "default"}`); },
    setPaused(paused) { state.paused = paused; status.textContent = paused ? "paused" : "ready"; setHostEvent(paused ? "pause" : "resume"); },
  });
  canvas.addEventListener("pointermove", (event) => { const rect = canvas.getBoundingClientRect(); state.focusX = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1); state.focusY = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1); canvas.dataset.pointerIntent = "look"; });
  canvas.addEventListener("pointerleave", () => { delete canvas.dataset.pointerIntent; });
  canvas.addEventListener("click", () => { state.clicks += 1; clicks.textContent = String(state.clicks); canvas.dataset.lastInteraction = "click"; });
  status.textContent = "ready"; canvas.dataset.trialHostBridge = "installed";
}
