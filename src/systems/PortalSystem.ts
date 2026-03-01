import { EntityManager, PositionComponent } from '../ecs/Entity';
import { TILE_SIZE } from '../utils/Constants';
const _EMPTY_DASH: number[] = []

export interface Portal {
  id: number;
  x: number;
  y: number;
  pairedId: number;
  color: string;
  active: boolean;
  cooldown: number;
}

interface PortalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TeleportFlash {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

const MAX_PORTAL_PAIRS = 10;
const TELEPORT_RADIUS = 1.5;
const COOLDOWN_TICKS = 60;
const ENERGY_LINE_MAX_DIST = 40;
const FLASH_DURATION = 20;

const PORTAL_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const MAX_PARTICLES = 256;

export class PortalSystem {
  private portals: Map<number, Portal> = new Map();
  private nextId = 1;
  private pairCount = 0;
  private entityCooldowns: Map<number, number> = new Map();
  /** Fixed-size particle pool — life=0 means inactive slot */
  private readonly particles: PortalParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '', size: 1,
  }));
  private flashes: TeleportFlash[] = [];
  private animTick = 0;
  private _drawnSet: Set<number> = new Set();
  private _portalsBuf: Portal[] = [];
  private readonly _portalDashBuf: number[] = [0, 0];

  createPortalPair(x1: number, y1: number, x2: number, y2: number): [number, number] | null {
    if (this.pairCount >= MAX_PORTAL_PAIRS) return null;

    const color = PORTAL_COLORS[this.pairCount % PORTAL_COLORS.length];
    const idA = this.nextId++;
    const idB = this.nextId++;

    this.portals.set(idA, {
      id: idA, x: x1, y: y1, pairedId: idB,
      color, active: true, cooldown: 0,
    });
    this.portals.set(idB, {
      id: idB, x: x2, y: y2, pairedId: idA,
      color, active: true, cooldown: 0,
    });
    this.pairCount++;
    return [idA, idB];
  }

  removePortal(id: number): void {
    const portal = this.portals.get(id);
    if (!portal) return;
    const paired = this.portals.get(portal.pairedId);
    this.portals.delete(id);
    if (paired) this.portals.delete(paired.id);
    this.pairCount = Math.max(0, this.pairCount - 1);
  }

  update(em: EntityManager, tick: number): void {
    this.animTick = tick;

    // Decrease portal cooldowns
    for (const portal of this.portals.values()) {
      if (portal.cooldown > 0) portal.cooldown--;
    }

    // Spawn ambient suction particles around active portals
    if (tick % 3 === 0) {
      for (const portal of this.portals.values()) {
        if (!portal.active) continue;
        this.spawnSuctionParticle(portal);
      }
    }

    // Detect entities entering portals and teleport them
    const entityIds = em.getEntitiesWithComponents('position');
    for (const eid of entityIds) {
      const cooldownExpiry = this.entityCooldowns.get(eid);
      if (cooldownExpiry !== undefined && tick < cooldownExpiry) continue;

      const pos = em.getComponent<PositionComponent>(eid, 'position');
      if (!pos) continue;

      for (const portal of this.portals.values()) {
        if (!portal.active || portal.cooldown > 0) continue;

        const dx = pos.x - portal.x;
        const dy = pos.y - portal.y;
        if (dx * dx + dy * dy > TELEPORT_RADIUS * TELEPORT_RADIUS) continue;

        const paired = this.portals.get(portal.pairedId);
        if (!paired || !paired.active) continue;

        // Spawn flash at departure
        this.flashes.push({
          x: portal.x, y: portal.y,
          life: FLASH_DURATION, maxLife: FLASH_DURATION,
          color: portal.color,
        });

        // Teleport: directly modify entity position
        pos.x = paired.x;
        pos.y = paired.y;

        // Spawn flash at arrival
        this.flashes.push({
          x: paired.x, y: paired.y,
          life: FLASH_DURATION, maxLife: FLASH_DURATION,
          color: paired.color,
        });

        // Spawn burst particles at arrival
        this.spawnBurstParticles(paired);

        // Set cooldowns
        this.entityCooldowns.set(eid, tick + COOLDOWN_TICKS);
        portal.cooldown = 10;
        paired.cooldown = 10;
        break;
      }
    }

    // Update particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    }

    // Update flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].life--;
      if (this.flashes[i].life <= 0) {
        this.flashes.splice(i, 1);
      }
    }

    // Prune expired entity cooldowns periodically
    if (tick % 120 === 0) {
      for (const [eid, expiry] of this.entityCooldowns) {
        if (tick >= expiry) this.entityCooldowns.delete(eid);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, zoom: number): void {
    const time = this.animTick * 0.05;
    const tileZoom = TILE_SIZE * zoom;

    // Draw energy lines between paired portals that are close enough
    this.renderEnergyLines(ctx, cameraX, cameraY, zoom, time);

    // Draw each portal
    for (const portal of this.portals.values()) {
      if (!portal.active) continue;

      const sx = (portal.x - cameraX) * tileZoom + tileZoom * 0.5;
      const sy = (portal.y - cameraY) * tileZoom + tileZoom * 0.5;
      const baseRadius = Math.max(4, 12 * zoom);

      ctx.save();

      // Outer glow
      ctx.globalAlpha = 0.2 + 0.1 * Math.sin(time * 2);
      ctx.beginPath();
      ctx.arc(sx, sy, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = portal.color;
      ctx.fill();

      // Rotating ring arcs
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = Math.max(1, 2.5 * zoom);
      ctx.strokeStyle = portal.color;
      for (let i = 0; i < 4; i++) {
        const angle = time * (1.2 + i * 0.25) + (i * Math.PI * 2) / 4;
        const r = baseRadius * (0.55 + 0.3 * Math.sin(time * 1.5 + i));
        ctx.beginPath();
        ctx.arc(sx, sy, r, angle, angle + Math.PI * 0.6);
        ctx.stroke();
      }

      // Inner bright core — two circles replace createRadialGradient to avoid per-portal gradient allocation
      const coreR = baseRadius * 0.4;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = portal.color;
      ctx.beginPath();
      ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, coreR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Draw particles — batch by color to minimize state changes, avoid per-particle save/restore
    let lastColor = '';
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      const px = (p.x - cameraX) * tileZoom + tileZoom * 0.5;
      const py = (p.y - cameraY) * tileZoom + tileZoom * 0.5;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha * 0.8;
      if (p.color !== lastColor) { ctx.fillStyle = p.color; lastColor = p.color; }
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, p.size * zoom), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw teleport flashes — two layered circles replace createRadialGradient (low-frequency, rare event)
    for (const f of this.flashes) {
      const fx = (f.x - cameraX) * tileZoom + tileZoom * 0.5;
      const fy = (f.y - cameraY) * tileZoom + tileZoom * 0.5;
      const progress = 1 - f.life / f.maxLife;
      const flashRadius = (10 + 20 * progress) * zoom;
      const alpha = (1 - progress) * 0.6;

      // Outer colored ring
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(fx, fy, flashRadius, 0, Math.PI * 2);
      ctx.fill();
      // Inner bright white core
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, flashRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  getPortals(): Portal[] {
    const buf = this._portalsBuf; buf.length = 0
    for (const p of this.portals.values()) buf.push(p)
    return buf
  }

  getPortalCount(): number {
    return this.portals.size;
  }

  getPortalAt(x: number, y: number): Portal | null {
    for (const portal of this.portals.values()) {
      const dx = portal.x - x;
      const dy = portal.y - y;
      if (dx * dx + dy * dy <= TELEPORT_RADIUS * TELEPORT_RADIUS) return portal;
    }
    return null;
  }

  setActive(id: number, active: boolean): void {
    const portal = this.portals.get(id);
    if (portal) portal.active = active;
  }

  clear(): void {
    this.portals.clear();
    this.entityCooldowns.clear();
    for (let i = 0; i < this.particles.length; i++) this.particles[i].life = 0;
    this.flashes = [];
    this.pairCount = 0;
  }

  // --- Private helpers ---

  private spawnSuctionParticle(portal: Portal): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * 3;
    const startX = portal.x + Math.cos(angle) * dist;
    const startY = portal.y + Math.sin(angle) * dist;
    const life = 20 + Math.floor(Math.random() * 15);
    const speed = dist / life;
    // Find inactive slot in pool
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.life > 0) continue;
      p.x = startX; p.y = startY;
      p.vx = (portal.x - startX) * speed * 0.8;
      p.vy = (portal.y - startY) * speed * 0.8;
      p.life = life; p.maxLife = life;
      p.color = portal.color;
      p.size = 1 + Math.random() * 1.5;
      return;
    }
  }

  private spawnBurstParticles(portal: Portal): void {
    const count = 8 + Math.floor(Math.random() * 5);
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.life > 0) continue;
      const ang = Math.random() * Math.PI * 2;
      const speed = 0.1 + Math.random() * 0.25;
      const life = 15 + Math.floor(Math.random() * 10);
      p.x = portal.x; p.y = portal.y;
      p.vx = Math.cos(ang) * speed;
      p.vy = Math.sin(ang) * speed;
      p.life = life; p.maxLife = life;
      p.color = Math.random() > 0.3 ? portal.color : '#ffffff';
      p.size = 1.5 + Math.random() * 2;
      spawned++;
    }
  }

  private renderEnergyLines(
    ctx: CanvasRenderingContext2D,
    cameraX: number, cameraY: number,
    zoom: number, time: number,
  ): void {
    const tileZoom = TILE_SIZE * zoom;
    const drawn = this._drawnSet;
    drawn.clear();

    for (const portal of this.portals.values()) {
      if (!portal.active || drawn.has(portal.id)) continue;
      const paired = this.portals.get(portal.pairedId);
      if (!paired || !paired.active) continue;

      drawn.add(portal.id);
      drawn.add(paired.id);

      const dx = paired.x - portal.x;
      const dy = paired.y - portal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > ENERGY_LINE_MAX_DIST) continue;

      const ax = (portal.x - cameraX) * tileZoom + tileZoom * 0.5;
      const ay = (portal.y - cameraY) * tileZoom + tileZoom * 0.5;
      const bx = (paired.x - cameraX) * tileZoom + tileZoom * 0.5;
      const by = (paired.y - cameraY) * tileZoom + tileZoom * 0.5;

      const alpha = Math.max(0, 0.4 * (1 - dist / ENERGY_LINE_MAX_DIST));

      ctx.save();
      ctx.globalAlpha = alpha + 0.1 * Math.sin(time * 3);
      ctx.strokeStyle = portal.color;
      ctx.lineWidth = Math.max(1, 1.5 * zoom);
      this._portalDashBuf[0] = 4 * zoom; this._portalDashBuf[1] = 4 * zoom;
      ctx.setLineDash(this._portalDashBuf);
      ctx.lineDashOffset = -time * 20;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      // Slight curve for visual interest
      const midX = (ax + bx) / 2 + Math.sin(time * 2) * 5 * zoom;
      const midY = (ay + by) / 2 + Math.cos(time * 2) * 5 * zoom;
      ctx.quadraticCurveTo(midX, midY, bx, by);
      ctx.stroke();
      ctx.setLineDash(_EMPTY_DASH);
      ctx.restore();
    }
  }
}
