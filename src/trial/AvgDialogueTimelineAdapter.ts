/**
 * Converts the AnimationEvents embedded in Stella Sora CG Live2D motions into
 * the page progression used by the AVG dialogue controller.
 */
export type AvgDialogueEventName = "start" | "next" | "end" | "done";

export interface AvgDialogueEvent {
  readonly atMs: number;
  readonly name: AvgDialogueEventName;
}

export interface AvgDialogueTimeline {
  readonly id: string;
  readonly pages: readonly string[];
  readonly events: readonly AvgDialogueEvent[];
}

export interface AvgDialogueTimelineCallbacks {
  readonly onPage: (page: string, pageIndex: number, event: AvgDialogueEvent) => void;
  readonly onEnd: (event: AvgDialogueEvent) => void;
  readonly onDone: (event: AvgDialogueEvent) => void;
}

export function splitAvgDialoguePages(commands: readonly string[]): readonly string[] {
  return commands.flatMap((command) => command.split("==W==").map((page) => page.trim()).filter(Boolean));
}

export class AvgDialogueTimelineAdapter {
  private activeId: string | undefined;
  private timeline: AvgDialogueTimeline | undefined;
  private callbacks: AvgDialogueTimelineCallbacks | undefined;
  private timer: number | undefined;
  private nextEventIndex = 0;
  private nextPageIndex = 0;
  private elapsedMs = 0;
  private resumedAt = 0;
  private paused = false;

  public get active(): string | undefined { return this.activeId; }

  public play(timeline: AvgDialogueTimeline, callbacks: AvgDialogueTimelineCallbacks): void {
    this.stop();
    this.activeId = timeline.id;
    this.timeline = timeline;
    this.callbacks = callbacks;
    this.resumedAt = performance.now();
    if (!this.paused) this.scheduleNext();
  }

  public setPaused(paused: boolean): void {
    if (paused === this.paused || !this.timeline) return;
    this.paused = paused;
    if (paused) {
      this.elapsedMs += performance.now() - this.resumedAt;
      if (this.timer !== undefined) window.clearTimeout(this.timer);
      this.timer = undefined;
    } else {
      this.resumedAt = performance.now();
      this.scheduleNext();
    }
  }

  public stop(): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
    this.activeId = undefined;
    this.timeline = undefined;
    this.callbacks = undefined;
    this.nextEventIndex = 0;
    this.nextPageIndex = 0;
    this.elapsedMs = 0;
  }

  private scheduleNext(): void {
    const event = this.timeline?.events[this.nextEventIndex];
    if (!event || !this.timeline || !this.callbacks || this.paused) return;
    const delay = Math.max(0, event.atMs - this.elapsedMs);
    this.timer = window.setTimeout(() => {
      const currentTimeline = this.timeline;
      const currentCallbacks = this.callbacks;
      if (!currentTimeline || !currentCallbacks || this.paused) return;
      this.elapsedMs = event.atMs;
      this.nextEventIndex += 1;
      if (event.name === "start" || event.name === "next") {
        const page = currentTimeline.pages[this.nextPageIndex];
        if (page !== undefined) currentCallbacks.onPage(page, this.nextPageIndex++, event);
      } else if (event.name === "end") currentCallbacks.onEnd(event);
      else {
        currentCallbacks.onDone(event);
        this.activeId = undefined;
        this.timeline = undefined;
        this.callbacks = undefined;
        this.timer = undefined;
        return;
      }
      this.resumedAt = performance.now();
      this.scheduleNext();
    }, delay);
  }
}
