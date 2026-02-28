/**
 * AmbientSoundMixer - 环境音效混合器系统
 *
 * 根据游戏状态（时间、天气、季节、战争、文明密度等）动态计算多层环境音效的音量。
 * 纯状态管理，不涉及任何实际音频播放，供外部音频系统消费 getMixState()。
 */

export type SoundLayer = 'nature' | 'weather' | 'season' | 'war' | 'civilization';

/** Pre-computed layer list — avoids per-constructor literal array creation */
const _DEFAULT_LAYERS: readonly SoundLayer[] = ['nature', 'weather', 'season', 'war', 'civilization']
export type SoundEvent = 'battle_start' | 'building_complete' | 'disaster' | 'achievement' | 'era_change';

export interface LayerState {
  layer: SoundLayer;
  volume: number;
  targetVolume: number;
  muted: boolean;
  activeSound: string;
}

export interface SoundMixState {
  masterVolume: number;
  muted: boolean;
  layers: LayerState[];
  pendingEvents: Array<{ event: SoundEvent; volume: number; tick: number }>;
}

interface PendingEvent {
  event: SoundEvent;
  volume: number;
  tick: number;
}

/** Default number of ticks for a full fade transition. */
const DEFAULT_FADE_TICKS = 60;

/** Minimum ticks between identical events. */
const EVENT_COOLDOWN: Record<SoundEvent, number> = {
  battle_start: 120,
  building_complete: 60,
  disaster: 180,
  achievement: 200,
  era_change: 300,
};

/** Distance (in tiles) at which a source has zero influence. */
const MAX_INFLUENCE_DIST = 200;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * clamp01(t);
}

/** Convert a distance to a 0-1 proximity factor (closer = higher). */
function proximityFactor(dist: number): number {
  if (dist <= 0) return 1;
  if (dist >= MAX_INFLUENCE_DIST) return 0;
  return 1 - dist / MAX_INFLUENCE_DIST;
}

function natureSoundForContext(isNight: boolean): string {
  return isNight ? 'crickets' : 'birdsong';
}

function weatherSound(weather: string): string {
  switch (weather) {
    case 'rain': return 'rain';
    case 'storm': return 'thunder_storm';
    case 'snow': return 'wind_snow';
    default: return 'wind_light';
  }
}

function seasonSound(season: string): string {
  switch (season) {
    case 'spring': return 'spring_birds';
    case 'summer': return 'summer_cicadas';
    case 'autumn': return 'autumn_wind';
    case 'winter': return 'winter_howl';
    default: return 'wind_light';
  }
}

function civilizationSound(dist: number): string {
  if (dist < 30) return 'market_bustle';
  if (dist < 80) return 'hammering';
  return 'distant_bells';
}

export class AmbientSoundMixer {
  private _masterVolume = 1;
  private _muted = false;
  private _fadeTicks = DEFAULT_FADE_TICKS;

  private _layers: Map<SoundLayer, LayerState>;
  private _pendingEvents: PendingEvent[] = [];
  private _lastEventTick: Map<SoundEvent, number> = new Map();

  constructor(fadeTicks: number = DEFAULT_FADE_TICKS) {
    this._fadeTicks = fadeTicks;

    const defaultLayers = _DEFAULT_LAYERS;
    this._layers = new Map();
    for (const l of defaultLayers) {
      this._layers.set(l, {
        layer: l,
        volume: 0,
        targetVolume: 0,
        muted: false,
        activeSound: '',
      });
    }
  }

  update(
    tick: number,
    context: {
      isNight: boolean;
      season: string;
      weather: string;
      nearestBattleDist: number;
      nearestCityDist: number;
      cameraZoom: number;
    },
  ): void {
    this._computeTargets(context);
    this._interpolateVolumes();
    this._expireEvents(tick);
  }

  setMasterVolume(volume: number): void {
    this._masterVolume = clamp01(volume);
  }

  getMasterVolume(): number {
    return this._masterVolume;
  }

  toggleMute(): void {
    this._muted = !this._muted;
  }

  isMuted(): boolean {
    return this._muted;
  }

  setLayerVolume(layer: SoundLayer, volume: number): void {
    const ls = this._layers.get(layer);
    if (ls) {
      ls.targetVolume = clamp01(volume);
    }
  }

  toggleLayerMute(layer: SoundLayer): void {
    const ls = this._layers.get(layer);
    if (ls) {
      ls.muted = !ls.muted;
    }
  }

  getLayerVolume(layer: SoundLayer): number {
    const ls = this._layers.get(layer);
    if (!ls) return 0;
    if (this._muted || ls.muted) return 0;
    return ls.volume * this._masterVolume;
  }

  triggerEvent(event: SoundEvent, volume: number = 1): void {
    const lastTick = this._lastEventTick.get(event) ?? -Infinity;
    const cooldown = EVENT_COOLDOWN[event] ?? 60;
    const now = this._pendingEvents.length > 0
      ? this._pendingEvents[this._pendingEvents.length - 1].tick
      : 0;

    if (now - lastTick < cooldown) return;

    this._pendingEvents.push({ event, volume: clamp01(volume), tick: now });
    this._lastEventTick.set(event, now);
  }

  getMixState(): SoundMixState {
    const layers: LayerState[] = [];
    for (const ls of this._layers.values()) {
      layers.push({ ...ls });
    }
    return {
      masterVolume: this._masterVolume,
      muted: this._muted,
      layers,
      pendingEvents: this._pendingEvents.map((e) => ({ ...e })),
    };
  }

  renderVolumeIndicator(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const barW = 100;
    const barH = 8;
    const gap = 12;
    let offsetY = 0;

    ctx.save();
    ctx.font = '10px monospace';
    ctx.textBaseline = 'top';

    // Master
    this._drawBar(ctx, x, y + offsetY, barW, barH, this._masterVolume, '#fff', 'Master');
    offsetY += gap;

    // Per-layer
    const colors: Record<SoundLayer, string> = {
      nature: '#4caf50',
      weather: '#2196f3',
      season: '#ff9800',
      war: '#f44336',
      civilization: '#9c27b0',
    };

    for (const [layer, ls] of this._layers) {
      const effective = this._muted || ls.muted ? 0 : ls.volume * this._masterVolume;
      this._drawBar(ctx, x, y + offsetY, barW, barH, effective, colors[layer], layer);
      offsetY += gap;
    }

    ctx.restore();
  }

  private _computeTargets(context: {
    isNight: boolean;
    season: string;
    weather: string;
    nearestBattleDist: number;
    nearestCityDist: number;
    cameraZoom: number;
  }): void {
    const { isNight, season, weather, nearestBattleDist, nearestCityDist, cameraZoom } = context;

    // Zoom factor: zoomed-out dampens nearby layers
    const zoomDampen = clamp01(1 / Math.max(cameraZoom, 0.1));

    // --- Nature ---
    const nature = this._layers.get('nature');
    if (nature) {
      nature.activeSound = natureSoundForContext(isNight);
      nature.targetVolume = isNight ? 0.6 : 0.8;
    }

    // --- Weather ---
    const wl = this._layers.get('weather');
    if (wl) {
      wl.activeSound = weatherSound(weather);
      if (weather === 'rain') {
        wl.targetVolume = 0.7;
      } else if (weather === 'storm') {
        wl.targetVolume = 0.9;
      } else if (weather === 'snow') {
        wl.targetVolume = 0.4;
      } else {
        wl.targetVolume = 0.1;
      }
    }

    // --- Season ---
    const sl = this._layers.get('season');
    if (sl) {
      sl.activeSound = seasonSound(season);
      const seasonBase: Record<string, number> = {
        spring: 0.5,
        summer: 0.6,
        autumn: 0.4,
        winter: 0.3,
      };
      sl.targetVolume = seasonBase[season] ?? 0.3;
    }

    // --- War ---
    const war = this._layers.get('war');
    if (war) {
      const battleProx = proximityFactor(nearestBattleDist) * zoomDampen;
      war.targetVolume = battleProx * 0.9;
      war.activeSound = battleProx > 0.5 ? 'war_drums_close' : battleProx > 0 ? 'distant_battle' : '';
    }

    // --- Civilization ---
    const civ = this._layers.get('civilization');
    if (civ) {
      const cityProx = proximityFactor(nearestCityDist) * zoomDampen;
      civ.targetVolume = cityProx * 0.6;
      civ.activeSound = civilizationSound(nearestCityDist);
    }
  }

  private _interpolateVolumes(): void {
    const t = 1 / Math.max(this._fadeTicks, 1);
    for (const ls of this._layers.values()) {
      ls.volume = lerp(ls.volume, ls.targetVolume, t);
      // Snap to target when very close to avoid endless tiny changes
      if (Math.abs(ls.volume - ls.targetVolume) < 0.001) {
        ls.volume = ls.targetVolume;
      }
    }
  }

  /** Remove events older than 1 tick (consumed by external audio system). */
  private _expireEvents(tick: number): void {
    for (let i = this._pendingEvents.length - 1; i >= 0; i--) {
      if (this._pendingEvents[i].tick < tick - 1) this._pendingEvents.splice(i, 1)
    }
  }

  private _drawBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    value: number,
    color: string,
    label: string,
  ): void {
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);
    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp01(value), h);
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(x, y, w, h);
    // Label
    ctx.fillStyle = '#ccc';
    ctx.fillText(label, x + w + 4, y - 1);
  }
}
