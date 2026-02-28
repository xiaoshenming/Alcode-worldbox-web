export type SiegeWeaponType = 'battering_ram' | 'catapult' | 'siege_tower' | 'trebuchet';

export interface SiegeData {
  id: number;
  attackerCivId: number;
  defenderCivId: number;
  targetCityX: number;
  targetCityY: number;
  progress: number;
  startTick: number;
  siegeWeapons: SiegeWeaponType[];
  defenderMorale: number;
  attackerCount: number;
  resolved: boolean;
}

export type SiegeOutcome = 'captured' | 'repelled' | 'ongoing';

const WEAPON_POWER: Record<SiegeWeaponType, number> = {
  battering_ram: 1.5,
  catapult: 2.0,
  siege_tower: 1.2,
  trebuchet: 2.5,
};

const WEAPON_ICONS: Record<SiegeWeaponType, string> = {
  battering_ram: '\u{1F6E1}',
  catapult: '\u{1F4A3}',
  siege_tower: '\u{1F3F0}',
  trebuchet: '\u{1F3AF}',
};

const BASE_WALL_DEFENSE = 5;
const MORALE_DECAY_BASE = 0.3;
const MORALE_OUTNUMBER_FACTOR = 0.15;
const PROGRESS_PER_TICK_BASE = 0.2;
const MORALE_RETREAT_THRESHOLD = 15;
const DEFENDER_COUNT_ESTIMATE = 30;
// Pre-computed particle color palettes indexed by life (0-50) to avoid template literals in render loop
const PARTICLE_MAX_LIFE = 50;
const FIRE_COLORS: string[] = [];
const SMOKE_COLORS: string[] = [];
for (let life = 0; life <= PARTICLE_MAX_LIFE; life++) {
  const alpha = life / PARTICLE_MAX_LIFE;
  FIRE_COLORS.push(`rgba(255,120,0,${alpha.toFixed(3)})`);
  SMOKE_COLORS.push(`rgba(100,100,100,${(alpha * 0.6).toFixed(3)})`);
}

// Pre-computed siege ring colors: 41 steps for alpha 0.20..0.60
const SIEGE_RING_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 40; i++) {
    const a = (0.2 + i / 100).toFixed(2)
    cols.push(`rgba(200,50,50,${a})`)
  }
  return cols
})()

export class SiegeWarfareSystem {
  private sieges: Map<number, SiegeData> = new Map();
  private nextId = 1;
  private particles: { x: number; y: number; life: number; vx: number; vy: number; type: 'fire' | 'smoke' }[] = [];
  private _lastZoom = -1;
  private _iconFont = '';
  private _activeSiegesBuf: SiegeData[] = [];

  startSiege(attackerCivId: number, defenderCivId: number, cityX: number, cityY: number, attackerCount: number): SiegeData {
    const siege: SiegeData = {
      id: this.nextId++,
      attackerCivId,
      defenderCivId,
      targetCityX: cityX,
      targetCityY: cityY,
      progress: 0,
      startTick: 0,
      siegeWeapons: [],
      defenderMorale: 100,
      attackerCount: Math.max(1, attackerCount),
      resolved: false,
    };
    this.sieges.set(siege.id, siege);
    return siege;
  }

  update(tick: number, _sieges?: SiegeData[]): void {
    for (const siege of this.sieges.values()) {
      if (siege.resolved) continue;
      if (siege.startTick === 0) siege.startTick = tick;

      let weaponPower = 0; for (const w of siege.siegeWeapons) weaponPower += WEAPON_POWER[w]
      const hasTower = siege.siegeWeapons.includes('siege_tower');
      const wallEffect = hasTower ? BASE_WALL_DEFENSE * 0.3 : BASE_WALL_DEFENSE;
      const attackStrength = (siege.attackerCount * 0.05) + weaponPower;
      const progressGain = Math.max(0, (attackStrength - wallEffect) * PROGRESS_PER_TICK_BASE);
      siege.progress = Math.min(100, siege.progress + progressGain);

      const outnumberRatio = siege.attackerCount / DEFENDER_COUNT_ESTIMATE;
      const moraleLoss = MORALE_DECAY_BASE + (outnumberRatio > 1 ? (outnumberRatio - 1) * MORALE_OUTNUMBER_FACTOR : 0);
      const duration = tick - siege.startTick;
      const fatigueFactor = 1 + duration * 0.002;
      siege.defenderMorale = Math.max(0, siege.defenderMorale - moraleLoss * fatigueFactor);

      if (siege.progress >= 100 || siege.defenderMorale <= MORALE_RETREAT_THRESHOLD) {
        siege.resolved = true;
      }

      if (weaponPower > 0 && Math.random() < 0.3) {
        this.particles.push({
          x: siege.targetCityX + (Math.random() - 0.5) * 2,
          y: siege.targetCityY + (Math.random() - 0.5) * 2,
          life: 30 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 0.8,
          type: Math.random() < 0.5 ? 'fire' : 'smoke',
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life--
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  addSiegeWeapon(siegeId: number, weapon: SiegeWeaponType): boolean {
    const siege = this.sieges.get(siegeId);
    if (!siege || siege.resolved) return false;
    siege.siegeWeapons.push(weapon);
    return true;
  }

  getSiegeAt(x: number, y: number): SiegeData | undefined {
    for (const siege of this.sieges.values()) {
      if (!siege.resolved && siege.targetCityX === x && siege.targetCityY === y) return siege;
    }
    return undefined;
  }

  getActiveSieges(): SiegeData[] {
    const result = this._activeSiegesBuf; result.length = 0
    for (const s of this.sieges.values()) { if (!s.resolved) result.push(s) }
    return result
  }

  resolveSiege(siegeId: number): SiegeOutcome {
    const siege = this.sieges.get(siegeId);
    if (!siege) return 'ongoing';
    if (!siege.resolved) return 'ongoing';
    if (siege.progress >= 100) return 'captured';
    if (siege.defenderMorale <= MORALE_RETREAT_THRESHOLD) return 'captured';
    return 'repelled';
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number): void {
    const tileSize = 16 * zoom;
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._iconFont = `${Math.max(8, 10 * zoom)}px serif`
    }

    for (const siege of this.sieges.values()) {
      if (siege.resolved) continue;
      const sx = (siege.targetCityX - cameraX) * tileSize;
      const sy = (siege.targetCityY - cameraY) * tileSize;

      // Progress bar background
      const barW = tileSize * 2;
      const barH = 4 * zoom;
      const barX = sx - barW / 2;
      const barY = sy - tileSize * 0.8;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);

      // Progress bar fill
      const fillColor = siege.progress < 50 ? '#e8a820' : siege.progress < 80 ? '#e07020' : '#d02020';
      ctx.fillStyle = fillColor;
      ctx.fillRect(barX, barY, barW * (siege.progress / 100), barH);

      // Progress bar border
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      // Morale indicator
      ctx.fillStyle = siege.defenderMorale > 50 ? '#40c040' : siege.defenderMorale > 25 ? '#c0c040' : '#c04040';
      const moraleW = tileSize * 1.5;
      const moraleX = sx - moraleW / 2;
      const moraleY = barY - barH - 2;
      ctx.fillRect(moraleX, moraleY, moraleW * (siege.defenderMorale / 100), barH * 0.7);
      ctx.strokeRect(moraleX, moraleY, moraleW, barH * 0.7);

      // Weapon icons — deduplicate without allocating a Set per frame
      const seen: SiegeWeaponType[] = [];
      for (const w of siege.siegeWeapons) {
        if (!seen.includes(w)) seen.push(w);
      }
      const iconSize = Math.max(8, 10 * zoom);
      ctx.font = this._iconFont;
      ctx.textAlign = 'center';
      seen.forEach((w, i) => {
        const ix = sx - (seen.length * iconSize) / 2 + i * iconSize + iconSize / 2;
        const iy = sy + tileSize * 0.9;
        ctx.fillText(WEAPON_ICONS[w], ix, iy);
      });

      // Siege ring
      ctx.beginPath();
      ctx.arc(sx, sy, tileSize * 0.6, 0, Math.PI * 2);
      const ringAlpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.2
      ctx.strokeStyle = SIEGE_RING_COLORS[Math.min(40, Math.max(0, Math.round((ringAlpha - 0.2) * 100)))];
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();
    }

    // Fire and smoke particles
    for (const p of this.particles) {
      const px = (p.x - cameraX) * tileSize;
      const py = (p.y - cameraY) * tileSize;
      const lifeIdx = Math.max(0, Math.min(PARTICLE_MAX_LIFE, Math.round(p.life)));
      ctx.fillStyle = p.type === 'fire' ? FIRE_COLORS[lifeIdx] : SMOKE_COLORS[lifeIdx];
      const size = (p.type === 'smoke' ? 3 : 2) * zoom;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
  }

  removeSiege(siegeId: number): void {
    this.sieges.delete(siegeId);
  }
}
