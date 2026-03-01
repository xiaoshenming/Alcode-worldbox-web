export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  highlightElement: string | null;
  action: string;
  condition: () => boolean;
}

export interface HighlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const STORAGE_KEY = 'worldbox_tutorial_completed';

const DEFAULT_STEPS: TutorialStep[] = [
  {
    id: 'welcome', title: 'Welcome to WorldBox!',
    description: 'You are a god. Create worlds, spawn life, and unleash disasters. Let\'s learn the basics.',
    highlightElement: null, action: 'Click Next to begin.',
    condition: () => true,
  },
  {
    id: 'camera', title: 'Camera Controls',
    description: 'Drag with middle mouse or right-click to pan the map. Use the scroll wheel to zoom in and out.',
    highlightElement: '#game-canvas', action: 'Try panning or zooming the map.',
    condition: () => true,
  },
  {
    id: 'terrain', title: 'Terrain Painting',
    description: 'Select a terrain type from the toolbar, then paint on the map to shape your world.',
    highlightElement: '[data-tab="terrain"]', action: 'Open the Terrain tab.',
    condition: () => !!document.querySelector('[data-tab="terrain"].active'),
  },
  {
    id: 'spawn', title: 'Spawning Creatures',
    description: 'Switch to the Creatures tab and place living beings on land. They will build villages and form civilizations.',
    highlightElement: '[data-tab="creatures"]', action: 'Open the Creatures tab.',
    condition: () => !!document.querySelector('[data-tab="creatures"].active'),
  },
  {
    id: 'powers', title: 'God Powers',
    description: 'Use the Nature and Destruction tabs to unleash rain, lightning, meteors, and more.',
    highlightElement: '[data-tab="nature"]', action: 'Open the Nature tab.',
    condition: () => !!document.querySelector('[data-tab="nature"].active'),
  },
  {
    id: 'speed', title: 'Speed Controls',
    description: 'Control simulation speed: pause, normal, fast, or ultra-fast. Watch civilizations grow over time.',
    highlightElement: '.speed-control', action: 'Try changing the game speed.',
    condition: () => true,
  },
  {
    id: 'info', title: 'Info Panel',
    description: 'Click on any creature or village to inspect it. The info panel shows stats and details.',
    highlightElement: '.info-panel', action: 'Click a creature on the map.',
    condition: () => true,
  },
  {
    id: 'done', title: 'You\'re Ready!',
    description: 'That covers the basics. Experiment freely — there are no wrong moves when you\'re a god.',
    highlightElement: null, action: 'Click Next to finish the tutorial.',
    condition: () => true,
  },
];

export class TutorialSystem {
  private steps: TutorialStep[];
  private currentIndex = -1;
  private active = false;
  private btnRects: { next: HighlightRect; skip: HighlightRect } = {
    next: { x: 0, y: 0, w: 0, h: 0 },
    skip: { x: 0, y: 0, w: 0, h: 0 },
  };
  /** Cached word-wrapped lines for current step description — rebuilt when step or maxW changes */
  private _wrappedLines: string[] = [];
  private _wrappedStepId = '';
  private _wrappedMaxW = 0;

  constructor(steps?: TutorialStep[]) {
    this.steps = steps ?? DEFAULT_STEPS;
  }

  start(): void { this.currentIndex = 0; this.active = true; }
  skip(): void { this.active = false; this.currentIndex = -1; this.markCompleted(); }
  isActive(): boolean { return this.active; }
  getCurrentStep(): TutorialStep | null { return this.active ? this.steps[this.currentIndex] ?? null : null; }
  shouldShow(): boolean { try { return localStorage.getItem(STORAGE_KEY) !== 'true'; } catch { return true; } }
  markCompleted(): void { try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* noop */ } }

  nextStep(): void {
    if (!this.active) return;
    this.currentIndex++;
    if (this.currentIndex >= this.steps.length) {
      this.active = false;
      this.markCompleted();
    }
  }

  update(): void {
    const step = this.getCurrentStep();
    if (step && step.condition()) {
      // condition met — don't auto-advance welcome/done or manual steps
    }
  }

  handleClick(cx: number, cy: number): boolean {
    if (!this.active) return false;
    const { next, skip } = this.btnRects;
    if (this.hitTest(cx, cy, next)) { this.nextStep(); return true; }
    if (this.hitTest(cx, cy, skip)) { this.skip(); return true; }
    return false;
  }

  render(ctx: CanvasRenderingContext2D, cw: number, ch: number): void {
    if (!this.active) return;
    const step = this.getCurrentStep();
    if (!step) return;

    // Dark overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, cw, ch);

    // Spotlight cutout
    const hl = this.getHighlightRect(step.highlightElement);
    if (hl) {
      ctx.globalCompositeOperation = 'destination-out';
      const pad = 6;
      const r = 8;
      this.roundRect(ctx, hl.x - pad, hl.y - pad, hl.w + pad * 2, hl.h + pad * 2, r);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,215,0,0.8)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, hl.x - pad, hl.y - pad, hl.w + pad * 2, hl.h + pad * 2, r);
      ctx.stroke();
    }

    // Text box
    const boxW = Math.min(420, cw - 40);
    const boxH = 150;
    const boxX = (cw - boxW) / 2;
    const boxY = ch - boxH - 30;

    ctx.fillStyle = 'rgba(20,20,30,0.92)';
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    // Step counter
    const counter = `Step ${this.currentIndex + 1}/${this.steps.length}`;
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(counter, boxX + boxW - 14, boxY + 22);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(step.title, boxX + 16, boxY + 28);

    // Description
    ctx.fillStyle = '#E0E0E0';
    ctx.font = '13px sans-serif';
    const descMaxW = boxW - 32;
    if (step.id !== this._wrappedStepId || descMaxW !== this._wrappedMaxW) {
      this._wrappedStepId = step.id;
      this._wrappedMaxW = descMaxW;
      this._wrappedLines = this.computeWrappedLines(ctx, step.description, descMaxW);
    }
    for (let li = 0; li < this._wrappedLines.length; li++) {
      ctx.fillText(this._wrappedLines[li], boxX + 16, boxY + 50 + li * 18);
    }

    // Action hint
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'italic 12px sans-serif';
    ctx.fillText(step.action, boxX + 16, boxY + boxH - 40);

    // Buttons
    const btnW = 70, btnH = 28, btnY = boxY + boxH - 34;
    const nextX = boxX + boxW - btnW - 14;
    const skipX = nextX - btnW - 10;

    this.drawButton(ctx, nextX, btnY, btnW, btnH, 'Next', '#FFD700', '#1a1a2e');
    this.drawButton(ctx, skipX, btnY, btnW, btnH, 'Skip', '#888', '#1a1a2e');

    this.btnRects.next = { x: nextX, y: btnY, w: btnW, h: btnH };
    this.btnRects.skip = { x: skipX, y: btnY, w: btnW, h: btnH };

    ctx.restore();
  }

  private getHighlightRect(selector: string | null): HighlightRect | null {
    if (!selector) return null;
    try {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    } catch { return null; }
  }

  private hitTest(x: number, y: number, r: HighlightRect): boolean {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, color: string, bg: string): void {
    ctx.fillStyle = bg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 4.5);
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): void {
    const lines = this.computeWrappedLines(ctx, text, maxW);
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
  }

  /** Compute word-wrapped lines for text within maxW pixels. Used for caching. */
  private computeWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
}
