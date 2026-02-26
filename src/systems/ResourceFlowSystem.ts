/**
 * ResourceFlowSystem - 资源流动可视化系统
 * 管理城市间资源运输路线，以流动粒子线条可视化食物、木材、矿石、金币的运输。
 * 流量越大粒子越密集，鼠标悬停可查看运输详情。自包含，不依赖项目内其他模块。
 */

const RESOURCE_COLORS: Record<string, string> = {
  food: '#4caf50', wood: '#8d6e63', ore: '#9e9e9e', gold: '#fdd835',
};
const DEFAULT_COLOR = '#ffffff';
const MAX_PARTICLES = 4096;
const PARTICLE_SPEED = 0.008;
const BASE_PARTICLES_PER_ROUTE = 3;
const PARTICLES_PER_AMOUNT = 0.5;
const HOVER_DIST_THRESHOLD = 12;

interface Particle {
  active: boolean;
  routeId: number;
  /** 路线上的进度 0~1 */
  t: number;
  speed: number;
}

interface Route {
  id: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  resourceType: string;
  amount: number;
  particleCount: number;
}

interface HoverInfo {
  visible: boolean;
  screenX: number; screenY: number;
  resourceType: string; amount: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
}

/**
 * 资源流动可视化系统
 * @example
 * ```ts
 * const flow = new ResourceFlowSystem();
 * const id = flow.addRoute(100, 100, 300, 200, 'food', 50);
 * flow.update(tick);
 * flow.render(ctx, camX, camY, zoom);
 * flow.removeRoute(id);
 * ```
 */
export class ResourceFlowSystem {
  private routes: Route[] = [];
  private particles: Particle[] = [];
  private nextRouteId = 1;
  private hover: HoverInfo = {
    visible: false, screenX: 0, screenY: 0,
    resourceType: '', amount: 0, fromX: 0, fromY: 0, toX: 0, toY: 0,
  };
  private mouseScreenX = 0;
  private mouseScreenY = 0;
  private mouseTracked = false;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ active: false, routeId: 0, t: 0, speed: 0 });
    }
  }

  /**
   * 添加一条资源运输路线
   * @param fromX 起点世界 X
   * @param fromY 起点世界 Y
   * @param toX 终点世界 X
   * @param toY 终点世界 Y
   * @param resourceType 资源类型：food / wood / ore / gold
   * @param amount 运输量，影响粒子密度
   * @returns 路线 ID，用于后续移除
   */
  addRoute(
    fromX: number, fromY: number,
    toX: number, toY: number,
    resourceType: string, amount: number,
  ): number {
    const id = this.nextRouteId++;
    const particleCount = Math.min(
      Math.floor(BASE_PARTICLES_PER_ROUTE + amount * PARTICLES_PER_AMOUNT), 60,
    );
    this.routes.push({ id, fromX, fromY, toX, toY, resourceType, amount, particleCount });
    this.allocateParticles(id, particleCount);
    return id;
  }

  /**
   * 移除指定 ID 的运输路线及其粒子
   * @param id 路线 ID
   */
  removeRoute(id: number): void {
    const idx = this.routes.findIndex(r => r.id === id);
    if (idx === -1) return;
    this.routes.splice(idx, 1);
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].routeId === id) this.particles[i].active = false;
    }
  }

  /**
   * 设置鼠标屏幕坐标，用于悬停检测
   * @param sx 屏幕 X
   * @param sy 屏幕 Y
   */
  setMousePosition(sx: number, sy: number): void {
    this.mouseScreenX = sx;
    this.mouseScreenY = sy;
    this.mouseTracked = true;
  }

  /**
   * 每 tick 更新粒子位置
   * @param _tick 当前游戏 tick（保留签名兼容性）
   */
  update(_tick: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.t += p.speed;
      if (p.t >= 1) p.t -= 1;
    }
  }

  /**
   * 渲染所有路线和粒子到 Canvas
   * @param ctx Canvas 2D 上下文
   * @param camX 摄像机世界 X 偏移
   * @param camY 摄像机世界 Y 偏移
   * @param zoom 缩放倍率
   */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    this.hover.visible = false;
    let closestDist = HOVER_DIST_THRESHOLD;

    for (let ri = 0; ri < this.routes.length; ri++) {
      const route = this.routes[ri];
      const color = RESOURCE_COLORS[route.resourceType] || DEFAULT_COLOR;
      const sx1 = (route.fromX - camX) * zoom;
      const sy1 = (route.fromY - camY) * zoom;
      const sx2 = (route.toX - camX) * zoom;
      const sy2 = (route.toY - camY) * zoom;

      // 绘制底线
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = Math.max(1, 2 * zoom);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // 悬停检测
      if (this.mouseTracked) {
        const dist = segDist(this.mouseScreenX, this.mouseScreenY, sx1, sy1, sx2, sy2);
        if (dist < closestDist) {
          closestDist = dist;
          this.hover.visible = true;
          this.hover.screenX = this.mouseScreenX;
          this.hover.screenY = this.mouseScreenY;
          this.hover.resourceType = route.resourceType;
          this.hover.amount = route.amount;
          this.hover.fromX = route.fromX;
          this.hover.fromY = route.fromY;
          this.hover.toX = route.toX;
          this.hover.toY = route.toY;
        }
      }
    }

    // 绘制粒子
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const route = this.findRoute(p.routeId);
      if (!route) { p.active = false; continue; }
      const wx = route.fromX + (route.toX - route.fromX) * p.t;
      const wy = route.fromY + (route.toY - route.fromY) * p.t;
      const sx = (wx - camX) * zoom;
      const sy = (wy - camY) * zoom;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.5, 3 * zoom), 0, Math.PI * 2);
      ctx.fillStyle = RESOURCE_COLORS[route.resourceType] || DEFAULT_COLOR;
      ctx.fill();
    }

    if (this.hover.visible) this.renderTooltip(ctx);
  }

  /** 从池中分配粒子给路线 */
  private allocateParticles(routeId: number, count: number): void {
    let allocated = 0;
    for (let i = 0; i < this.particles.length && allocated < count; i++) {
      if (!this.particles[i].active) {
        const p = this.particles[i];
        p.active = true;
        p.routeId = routeId;
        p.t = count > 0 ? allocated / count : 0;
        p.speed = PARTICLE_SPEED + Math.random() * 0.004;
        allocated++;
      }
    }
  }

  /** 按 ID 查找路线 */
  private findRoute(id: number): Route | null {
    for (let i = 0; i < this.routes.length; i++) {
      if (this.routes[i].id === id) return this.routes[i];
    }
    return null;
  }

  /** 渲染悬停提示框 */
  private renderTooltip(ctx: CanvasRenderingContext2D): void {
    const h = this.hover;
    const label = `${resLabel(h.resourceType)}: ${h.amount}`;
    const coord = `(${h.fromX},${h.fromY}) -> (${h.toX},${h.toY})`;
    ctx.font = '12px monospace';
    const boxW = Math.max(ctx.measureText(label).width, ctx.measureText(coord).width) + 16;
    const tx = h.screenX + 14;
    const ty = h.screenY - 46;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.roundRect(tx, ty, boxW, 40, 4);
    ctx.fill();
    ctx.fillStyle = RESOURCE_COLORS[h.resourceType] || DEFAULT_COLOR;
    ctx.fillText(label, tx + 8, ty + 16);
    ctx.fillStyle = '#ccc';
    ctx.fillText(coord, tx + 8, ty + 32);
  }
}

/** 资源类型中文标签 */
function resLabel(type: string): string {
  switch (type) {
    case 'food': return '食物';
    case 'wood': return '木材';
    case 'ore': return '矿石';
    case 'gold': return '金币';
    default: return type;
  }
}

/** 点到线段的最短距离 */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const cx = ax + t * dx - px, cy = ay + t * dy - py;
  return Math.sqrt(cx * cx + cy * cy);
}
