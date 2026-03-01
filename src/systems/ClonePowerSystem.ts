export interface CreatureStats {
  species: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  age: number;
  traits: string[];
}

export interface CloneData extends CreatureStats {
  x: number;
  y: number;
  sourceId: number;
  generation: number;
  colorTint: number;
}

export interface DegradationEvent {
  id: number;
  type: 'health_loss' | 'stat_decay' | 'instability';
  amount: number;
}

export interface CloneEntity {
  id: number;
  isClone: boolean;
  health: number;
  maxHealth: number;
  age: number;
}

export interface ClonePosition {
  x: number;
  y: number;
  generation: number;
}

export class ClonePowerSystem {
  static readonly MAX_CLONE_GENERATION = 5;

  // 预计算各 generation 的颜色字符串（gen 0-5，hue = 180+gen*15）
  private static readonly _GEN_FILL: string[] = (() => {
    const a: string[] = []
    for (let g = 0; g <= 5; g++) a.push(`hsl(${180 + g * 15}, 80%, 70%)`)
    return a
  })()
  private static readonly _GEN_STROKE: string[] = (() => {
    const a: string[] = []
    for (let g = 0; g <= 5; g++) a.push(`hsl(${180 + g * 15 + 40}, 90%, 50%)`)
    return a
  })()

  private totalClones = 0;
  private lineage = new Map<number, { sourceId: number; generation: number }>();
  private nextCloneId = 1;
  // Pre-allocated events buffer — reused each update() call
  private _eventsBuf: DegradationEvent[] = [];

  private mutate(value: number, generation: number): number {
    const variance = 0.05 + Math.random() * 0.10; // 5-15%
    const direction = Math.random() < 0.5 ? -1 : 1;
    const degradation = 1 - generation * 0.04;
    return Math.max(1, Math.round(value * (1 + direction * variance) * degradation));
  }

  clone(sourceEntityId: number, stats: CreatureStats, targetX: number, targetY: number): CloneData {
    const generation = this.getGeneration(sourceEntityId) + 1;
    const cloneId = this.nextCloneId++;
    this.totalClones++;

    this.lineage.set(cloneId, { sourceId: sourceEntityId, generation });

    const traits: string[] = []
    for (const t of stats.traits) { if (t !== 'clone') traits.push(t) }
    traits.push('clone');
    if (generation >= ClonePowerSystem.MAX_CLONE_GENERATION) {
      traits.push('unstable');
    }

    return {
      species: stats.species,
      health: this.mutate(stats.health, generation),
      maxHealth: this.mutate(stats.maxHealth, generation),
      attack: this.mutate(stats.attack, generation),
      defense: this.mutate(stats.defense, generation),
      speed: this.mutate(stats.speed, generation),
      age: 0,
      traits,
      x: targetX,
      y: targetY,
      sourceId: sourceEntityId,
      generation: Math.min(generation, ClonePowerSystem.MAX_CLONE_GENERATION),
      colorTint: 180 + generation * 15,
    };
  }

  massClone(
    sourceId: number,
    stats: CreatureStats,
    count: number,
    centerX: number,
    centerY: number,
    radius: number
  ): CloneData[] {
    const clones: CloneData[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = Math.random() * radius;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      clones.push(this.clone(sourceId, stats, x, y));
    }
    return clones;
  }

  getCloneCount(): number {
    return this.totalClones;
  }

  getGeneration(entityId: number): number {
    return this.lineage.get(entityId)?.generation ?? 0;
  }

  update(_tick: number, entities: CloneEntity[]): DegradationEvent[] {
    const events = this._eventsBuf; let evIdx = 0;
    for (const e of entities) {
      if (!e.isClone) continue;
      const gen = this.getGeneration(e.id);
      const chance = 0.002 * gen + (e.age > 100 ? 0.005 : 0);
      if (Math.random() > chance) continue;

      let slot = events[evIdx];
      if (!slot) { slot = { id: 0, type: 'health_loss', amount: 0 }; events.push(slot); }
      slot.id = e.id;
      if (gen >= ClonePowerSystem.MAX_CLONE_GENERATION) {
        slot.type = 'instability'; slot.amount = e.maxHealth * 0.1;
      } else if (Math.random() < 0.5) {
        slot.type = 'health_loss'; slot.amount = Math.ceil(e.maxHealth * 0.05);
      } else {
        slot.type = 'stat_decay'; slot.amount = 1;
      }
      evIdx++;
    }
    events.length = evIdx;
    return events;
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom: number,
    clones: ClonePosition[]
  ): void {
    ctx.save();
    for (const c of clones) {
      const sx = (c.x - cameraX) * zoom;
      const sy = (c.y - cameraY) * zoom;
      const size = Math.max(4, 8 * zoom);
      const alpha = 0.3 + 0.1 * Math.sin(Date.now() * 0.005 + c.x * 7 + c.y * 13);

      ctx.globalAlpha = alpha;
      // hue = 180 + gen*15，用固定hsl+globalAlpha替代hsla模板字符串
      ctx.fillStyle = ClonePowerSystem._GEN_FILL[Math.min(c.generation, 5)];
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();

      if (c.generation >= 3) {
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = ClonePowerSystem._GEN_STROKE[Math.min(c.generation, 5)];
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
