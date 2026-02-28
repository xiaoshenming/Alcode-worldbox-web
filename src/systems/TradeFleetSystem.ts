/**
 * TradeFleetSystem - 贸易船队可视化系统
 * 在水面上渲染贸易路线虚线、货船精灵和货物到达指示
 */

/** 单条贸易路线 */
interface TradeRoute {
  routeId: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  civIdA: number;
  civIdB: number;
  colorA: string;
  colorB: string;
}

/** 货船状态 */
interface TradeShip {
  routeId: number;
  /** 0→1 表示 A→B，1→0 表示 B→A */
  progress: number;
  /** +1 = A→B, -1 = B→A */
  direction: 1 | -1;
  /** 所属文明颜色 */
  color: string;
}

/** 货物到达指示 */
interface CargoIndicator {
  x: number;
  y: number;
  /** 剩余显示 tick */
  ttl: number;
  /** 图标类型 */
  icon: 0 | 1;
}

/** 波纹粒子 */
interface Ripple {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

const SHIP_SPEED = 0.3;
const TILE_SIZE = 16;
const CARGO_TTL = 60;
const MAX_RIPPLES_PER_ROUTE = 4;
const RIPPLE_MAX_AGE = 40;

// Pre-computed ripple stroke colors: 101 steps for alpha 0.00..0.30 (t 0..1)
// alpha = 0.3 * (1 - t)
const RIPPLE_STROKE_COLORS: string[] = (() => {
  const cols: string[] = []
  for (let i = 0; i <= 100; i++) {
    const alpha = (0.3 * (1 - i / 100)).toFixed(3)
    cols.push(`rgba(200,230,255,${alpha})`)
  }
  return cols
})()

export class TradeFleetSystem {
  private routes: Map<number, TradeRoute> = new Map();
  private ships: TradeShip[] = [];
  private indicators: CargoIndicator[] = [];
  private ripples: Ripple[] = [];
  private tradeVolume = 0;
  private dashOffset = 0;
  private _lastZoom = -1;
  private _indFont = '';
  /** 用于交替货物图标 */
  private iconFlip = 0;
  private readonly _dashBuf: number[] = [0, 0];
  private readonly _emptyDash: number[] = [];

  /**
   * 注册一条贸易路线，自动生成来回两艘货船
   * @param routeId 路线唯一 ID
   * @param fromX 起点 tile X
   * @param fromY 起点 tile Y
   * @param toX 终点 tile X
   * @param toY 终点 tile Y
   * @param civIdA 文明 A ID
   * @param civIdB 文明 B ID
   * @param colorA 文明 A 颜色
   * @param colorB 文明 B 颜色
   */
  registerRoute(
    routeId: number,
    fromX: number, fromY: number,
    toX: number, toY: number,
    civIdA: number, civIdB: number,
    colorA: string, colorB: string
  ): void {
    if (this.routes.has(routeId)) return;
    this.routes.set(routeId, { routeId, fromX, fromY, toX, toY, civIdA, civIdB, colorA, colorB });
    // A→B 船
    this.ships.push({ routeId, progress: 0, direction: 1, color: colorA });
    // B→A 船，从终点出发
    this.ships.push({ routeId, progress: 1, direction: -1, color: colorB });
  }

  /** 移除路线及其关联的船只 */
  removeRoute(routeId: number): void {
    this.routes.delete(routeId);
    for (let _i = this.ships.length - 1; _i >= 0; _i--) { if (this.ships[_i].routeId === routeId) this.ships.splice(_i, 1) }
  }

  /** 每 tick 更新船只位置、货物指示和波纹 */
  update(_tick: number): void {
    this.dashOffset = (this.dashOffset + 0.5) % 12;

    // 更新船只
    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i];
      const route = this.routes.get(ship.routeId);
      if (!route) continue;

      const dx = route.toX - route.fromX;
      const dy = route.toY - route.fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.001) continue;

      const step = SHIP_SPEED / dist;
      ship.progress += step * ship.direction;

      // 到达目的地
      if (ship.progress >= 1) {
        ship.progress = 1;
        ship.direction = -1;
        ship.color = route.colorB;
        this.onArrival(route.toX, route.toY);
      } else if (ship.progress <= 0) {
        ship.progress = 0;
        ship.direction = 1;
        ship.color = route.colorA;
        this.onArrival(route.fromX, route.fromY);
      }
    }

    // 更新货物指示
    for (let i = this.indicators.length - 1; i >= 0; i--) {
      this.indicators[i].ttl--;
      if (this.indicators[i].ttl <= 0) {
        this.indicators.splice(i, 1);
      }
    }

    // 更新波纹
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].age++;
      if (this.ripples[i].age >= this.ripples[i].maxAge) {
        this.ripples.splice(i, 1);
      }
    }

    // 沿路线生成波纹（轻量：每 8 tick 每条路线一个）
    if (_tick % 8 === 0) {
      this.routes.forEach(route => {
        const threshold = Math.abs(route.toX - route.fromX) + Math.abs(route.toY - route.fromY) + 2
        let count = 0
        for (let i = 0; i < this.ripples.length; i++) {
          const r = this.ripples[i]
          if (Math.abs(r.x - route.fromX) + Math.abs(r.y - route.fromY) < threshold) count++
        }
        if (count < MAX_RIPPLES_PER_ROUTE) {
          const t = Math.random();
          this.ripples.push({
            x: route.fromX + (route.toX - route.fromX) * t,
            y: route.fromY + (route.toY - route.fromY) * t,
            age: 0,
            maxAge: RIPPLE_MAX_AGE,
          });
        }
      });
    }
  }

  /** 渲染路线、船只、波纹和货物指示 */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    ctx.save();
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._indFont = `${Math.max(6, 10 * zoom)}px sans-serif`
    }

    // 渲染路线虚线
    this.routes.forEach(route => {
      this.renderRoute(ctx, route, camX, camY, zoom);
    });

    // 渲染波纹
    for (let i = 0; i < this.ripples.length; i++) {
      this.renderRipple(ctx, this.ripples[i], camX, camY, zoom);
    }

    // 渲染船只
    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i];
      const route = this.routes.get(ship.routeId);
      if (!route) continue;
      this.renderShip(ctx, ship, route, camX, camY, zoom);
    }

    // 渲染货物指示
    for (let i = 0; i < this.indicators.length; i++) {
      this.renderIndicator(ctx, this.indicators[i], camX, camY, zoom);
    }

    ctx.restore();
  }

  /** 当前活跃路线数 */
  getActiveRoutes(): number {
    return this.routes.size;
  }

  /** 当前船只总数 */
  getShipCount(): number {
    return this.ships.length;
  }

  /** 累计完成的贸易次数 */
  getTradeVolume(): number {
    return this.tradeVolume;
  }

  // ── 私有方法 ──

  private onArrival(x: number, y: number): void {
    this.tradeVolume++;
    this.iconFlip = (this.iconFlip + 1) % 2;
    this.indicators.push({
      x,
      y,
      ttl: CARGO_TTL,
      icon: this.iconFlip as 0 | 1,
    });
  }

  private renderRoute(
    ctx: CanvasRenderingContext2D,
    route: TradeRoute,
    camX: number, camY: number, zoom: number
  ): void {
    const x1 = (route.fromX * TILE_SIZE - camX) * zoom;
    const y1 = (route.fromY * TILE_SIZE - camY) * zoom;
    const x2 = (route.toX * TILE_SIZE - camX) * zoom;
    const y2 = (route.toY * TILE_SIZE - camY) * zoom;

    ctx.beginPath();
    this._dashBuf[0] = 6 * zoom; this._dashBuf[1] = 4 * zoom;
    ctx.setLineDash(this._dashBuf);
    ctx.lineDashOffset = -this.dashOffset * zoom;
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.4)';
    ctx.lineWidth = Math.max(1, 1.5 * zoom);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash(this._emptyDash);

    // 港口标记（小圆点）
    ctx.fillStyle = route.colorA;
    ctx.beginPath();
    ctx.arc(x1, y1, 3 * zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = route.colorB;
    ctx.beginPath();
    ctx.arc(x2, y2, 3 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderShip(
    ctx: CanvasRenderingContext2D,
    ship: TradeShip,
    route: TradeRoute,
    camX: number, camY: number, zoom: number
  ): void {
    const wx = route.fromX + (route.toX - route.fromX) * ship.progress;
    const wy = route.fromY + (route.toY - route.fromY) * ship.progress;
    const sx = (wx * TILE_SIZE - camX) * zoom;
    const sy = (wy * TILE_SIZE - camY) * zoom;

    // 船行进角度
    const angle = Math.atan2(
      (route.toY - route.fromY) * ship.direction,
      (route.toX - route.fromX) * ship.direction
    );

    const size = Math.max(3, 5 * zoom);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // 船体（三角形）
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.5);
    ctx.lineTo(-size * 0.7, size * 0.5);
    ctx.closePath();
    ctx.fillStyle = ship.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(0.5, 0.8 * zoom);
    ctx.stroke();

    // 帆（竖线 + 小三角）
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size * 0.9);
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = Math.max(0.5, 0.7 * zoom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.9);
    ctx.lineTo(size * 0.5, -size * 0.3);
    ctx.lineTo(0, -size * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private renderRipple(
    ctx: CanvasRenderingContext2D,
    ripple: Ripple,
    camX: number, camY: number, zoom: number
  ): void {
    const sx = (ripple.x * TILE_SIZE - camX) * zoom;
    const sy = (ripple.y * TILE_SIZE - camY) * zoom;
    const t = ripple.age / ripple.maxAge;
    const radius = (2 + t * 6) * zoom;

    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = RIPPLE_STROKE_COLORS[Math.round(t * 100)];
    ctx.lineWidth = Math.max(0.5, 0.7 * zoom);
    ctx.stroke();
  }

  private renderIndicator(
    ctx: CanvasRenderingContext2D,
    ind: CargoIndicator,
    camX: number, camY: number, zoom: number
  ): void {
    const sx = (ind.x * TILE_SIZE - camX) * zoom;
    const sy = (ind.y * TILE_SIZE - camY) * zoom;
    const floatY = -((CARGO_TTL - ind.ttl) * 0.3) * zoom;
    const alpha = Math.min(1, ind.ttl / 20);
    const size = Math.max(6, 10 * zoom);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = this._indFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ind.icon === 0 ? '\uD83D\uDCB0' : '\uD83D\uDCE6', sx, sy + floatY);
    ctx.restore();
  }
}
