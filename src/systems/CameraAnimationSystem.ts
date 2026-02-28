/**
 * CameraAnimationSystem - Smooth tracking, screen shake, cinematic transitions.
 *
 * Standalone system with no project imports.
 * Call update() each tick to get adjusted camera position,
 * then render() to draw overlays (fade, cinematic bars).
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ── Shake entry ──────────────────────────────────────────────────────────────

interface ShakeEntry {
  intensity: number;
  remaining: number;
  total: number;
}

// ── Transition types ─────────────────────────────────────────────────────────

const enum TransitionKind {
  None,
  FadeToBlack,
  FadeFromBlack,
  PanTo,
  ZoomTo,
}

interface TransitionState {
  kind: TransitionKind;
  elapsed: number;
  duration: number;
  // pan / zoom targets
  startX: number;
  startY: number;
  startZoom: number;
  endX: number;
  endY: number;
  endZoom: number;
}

// ── System ───────────────────────────────────────────────────────────────────

export class CameraAnimationSystem {
  // ── Follow ──
  private _followX = 0;
  private _followY = 0;
  private _following = false;
  private _followSpeed = 0.05;

  // ── Shake ──
  private _shakes: ShakeEntry[] = [];
  private _shakeTick = 0;

  // ── Transition ──
  private _transition: TransitionState = {
    kind: TransitionKind.None,
    elapsed: 0,
    duration: 1,
    startX: 0,
    startY: 0,
    startZoom: 1,
    endX: 0,
    endY: 0,
    endZoom: 1,
  };

  // ── Fade overlay alpha (0 = transparent, 1 = full black) ──
  private _fadeAlpha = 0;

  // ── Cinematic bars ──
  private _barsEnabled = false;
  private _barsProgress = 0; // 0‥1
  private _barsHeight = 0.12; // fraction of screen height
  // Pre-allocated result object — callers may cache the reference
  private _result = { x: 0, y: 0, zoom: 1 };

  // ────────────────────────────────────────────────────────────────────────────
  // Follow
  // ────────────────────────────────────────────────────────────────────────────

  followTarget(x: number, y: number): void {
    this._followX = x;
    this._followY = y;
    this._following = true;
  }

  stopFollow(): void {
    this._following = false;
  }

  setFollowSpeed(speed: number): void {
    this._followSpeed = clamp01(speed);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Shake
  // ────────────────────────────────────────────────────────────────────────────

  shake(intensity: number, durationTicks: number): void {
    if (durationTicks <= 0 || intensity <= 0) return;
    this._shakes.push({ intensity, remaining: durationTicks, total: durationTicks });
  }

  // Multi-sine noise (Perlin-like approximation)
  private _shakeNoise(seed: number): number {
    return (
      Math.sin(seed * 1.0) * 0.5 +
      Math.sin(seed * 2.3 + 1.3) * 0.3 +
      Math.sin(seed * 4.7 + 2.7) * 0.2
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Transitions
  // ────────────────────────────────────────────────────────────────────────────

  fadeToBlack(durationTicks: number): void {
    this._transition = {
      kind: TransitionKind.FadeToBlack,
      elapsed: 0,
      duration: Math.max(1, durationTicks),
      startX: 0, startY: 0, startZoom: 1,
      endX: 0, endY: 0, endZoom: 1,
    };
  }

  fadeFromBlack(durationTicks: number): void {
    this._fadeAlpha = 1;
    this._transition = {
      kind: TransitionKind.FadeFromBlack,
      elapsed: 0,
      duration: Math.max(1, durationTicks),
      startX: 0, startY: 0, startZoom: 1,
      endX: 0, endY: 0, endZoom: 1,
    };
  }

  panTo(x: number, y: number, zoom: number, durationTicks: number): void {
    this._transition = {
      kind: TransitionKind.PanTo,
      elapsed: 0,
      duration: Math.max(1, durationTicks),
      startX: 0, startY: 0, startZoom: 1, // filled in first update()
      endX: x, endY: y, endZoom: zoom,
    };
  }

  zoomTo(targetZoom: number, durationTicks: number): void {
    this._transition = {
      kind: TransitionKind.ZoomTo,
      elapsed: 0,
      duration: Math.max(1, durationTicks),
      startX: 0, startY: 0, startZoom: 1,
      endX: 0, endY: 0, endZoom: targetZoom,
    };
  }

  isTransitioning(): boolean {
    return this._transition.kind !== TransitionKind.None;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Cinematic bars
  // ────────────────────────────────────────────────────────────────────────────

  setCinematicBars(enabled: boolean): void {
    this._barsEnabled = enabled;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Update (call once per tick)
  // ────────────────────────────────────────────────────────────────────────────

  update(
    _tick: number,
    camX: number,
    camY: number,
    camZoom: number,
  ): { x: number; y: number; zoom: number } {
    let x = camX;
    let y = camY;
    let zoom = camZoom;

    // ── Follow ──
    if (this._following) {
      x += (this._followX - x) * this._followSpeed;
      y += (this._followY - y) * this._followSpeed;
    }

    // ── Transition ──
    const tr = this._transition;
    if (tr.kind !== TransitionKind.None) {
      // Capture start values on first tick
      if (tr.elapsed === 0) {
        tr.startX = x;
        tr.startY = y;
        tr.startZoom = zoom;
      }

      tr.elapsed++;
      const t = clamp01(tr.elapsed / tr.duration);
      const e = easeInOutCubic(t);

      switch (tr.kind) {
        case TransitionKind.FadeToBlack:
          this._fadeAlpha = e;
          break;
        case TransitionKind.FadeFromBlack:
          this._fadeAlpha = 1 - e;
          break;
        case TransitionKind.PanTo:
          x = tr.startX + (tr.endX - tr.startX) * e;
          y = tr.startY + (tr.endY - tr.startY) * e;
          zoom = tr.startZoom + (tr.endZoom - tr.startZoom) * e;
          break;
        case TransitionKind.ZoomTo:
          zoom = tr.startZoom + (tr.endZoom - tr.startZoom) * e;
          break;
      }

      if (t >= 1) {
        tr.kind = TransitionKind.None;
      }
    }

    // ── Shake ──
    this._shakeTick++;
    let shakeOffX = 0;
    let shakeOffY = 0;

    for (let i = this._shakes.length - 1; i >= 0; i--) {
      const s = this._shakes[i];
      const decay = s.remaining / s.total; // linear decay 1→0
      const amp = s.intensity * decay;
      shakeOffX += this._shakeNoise(this._shakeTick * 0.7 + i * 100) * amp;
      shakeOffY += this._shakeNoise(this._shakeTick * 0.9 + i * 200 + 50) * amp;
      s.remaining--;
      if (s.remaining <= 0) {
        this._shakes.splice(i, 1);
      }
    }

    x += shakeOffX;
    y += shakeOffY;

    // ── Cinematic bars progress ──
    const barsTarget = this._barsEnabled ? 1 : 0;
    this._barsProgress += (barsTarget - this._barsProgress) * 0.08;
    if (Math.abs(this._barsProgress - barsTarget) < 0.001) {
      this._barsProgress = barsTarget;
    }

    this._result.x = x;
    this._result.y = y;
    this._result.zoom = zoom;
    return this._result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render overlays (call after world rendering)
  // ────────────────────────────────────────────────────────────────────────────

  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    // ── Fade overlay ──
    if (this._fadeAlpha > 0.001) {
      ctx.save();
      ctx.globalAlpha = this._fadeAlpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, screenWidth, screenHeight);
      ctx.restore();
    }

    // ── Cinematic bars ──
    if (this._barsProgress > 0.001) {
      const barH = screenHeight * this._barsHeight * this._barsProgress;
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, screenWidth, barH);
      ctx.fillRect(0, screenHeight - barH, screenWidth, barH);
      ctx.restore();
    }
  }
}
