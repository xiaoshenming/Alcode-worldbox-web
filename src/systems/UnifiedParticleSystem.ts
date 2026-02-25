/**
 * UnifiedParticleSystem - 统一粒子池系统
 * 高性能粒子效果管理，使用 struct-of-arrays + free list，零 GC。
 */

export type ParticleType = 'fire' | 'smoke' | 'magic' | 'blood' | 'spark' | 'bubble' | 'dust' | 'holy';

/** 粒子类型预设配置 */
interface ParticlePreset {
  /** 生命帧数 */
  life: number;
  /** 初始大小 */
  size: number;
  /** 基础速度 X */
  vx: number;
  /** 基础速度 Y（负=向上） */
  vy: number;
  /** 速度随机范围 */
  vRand: number;
  /** 重力加速度 */
  gravity: number;
  /** RGB 起始色 */
  r: number;
  g: number;
  b: number;
  /** 起始透明度 */
  alpha: number;
  /** 大小随生命变化：1=缩小, -1=扩大, 0=不变 */
  sizeDecay: number;
  /** 是否使用 additive blending */
  additive: boolean;
}

const PRESETS: Record<ParticleType, ParticlePreset> = {
  fire: {
    life: 40, size: 4, vx: 0, vy: -1.2, vRand: 0.5,
    gravity: -0.02, r: 255, g: 160, b: 20, alpha: 0.9,
    sizeDecay: 1, additive: true,
  },
  smoke: {
    life: 70, size: 3, vx: 0, vy: -0.5, vRand: 0.3,
    gravity: -0.005, r: 140, g: 140, b: 140, alpha: 0.5,
    sizeDecay: -1, additive: false,
  },
  magic: {
    life: 55, size: 3, vx: 0, vy: -0.3, vRand: 0.8,
    gravity: 0, r: 160, g: 80, b: 255, alpha: 0.85,
    sizeDecay: 1, additive: true,
  },
  blood: {
    life: 25, size: 3, vx: 0, vy: -2, vRand: 1.5,
    gravity: 0.15, r: 200, g: 20, b: 20, alpha: 0.9,
    sizeDecay: 1, additive: false,
  },
  spark: {
    life: 18, size: 2, vx: 0, vy: 0, vRand: 3,
    gravity: 0.05, r: 255, g: 240, b: 180, alpha: 1,
    sizeDecay: 1, additive: true,
  },
  bubble: {
    life: 60, size: 3, vx: 0, vy: -0.6, vRand: 0.2,
    gravity: -0.01, r: 100, g: 180, b: 255, alpha: 0.45,
    sizeDecay: 0, additive: false,
  },
  dust: {
    life: 50, size: 2.5, vx: 0.8, vy: -0.1, vRand: 0.6,
    gravity: 0.01, r: 160, g: 130, b: 90, alpha: 0.6,
    sizeDecay: 0, additive: false,
  },
  holy: {
    life: 65, size: 3.5, vx: 0, vy: -0.9, vRand: 0.3,
    gravity: -0.01, r: 255, g: 220, b: 100, alpha: 0.9,
    sizeDecay: 1, additive: true,
  },
};

/** 粒子类型到数字 ID 的映射（用于 SoA 存储） */
const TYPE_IDS: Record<ParticleType, number> = {
  fire: 0, smoke: 1, magic: 2, blood: 3,
  spark: 4, bubble: 5, dust: 6, holy: 7,
};

const PARTICLE_TYPES: ParticleType[] = [
  'fire', 'smoke', 'magic', 'blood', 'spark', 'bubble', 'dust', 'holy',
];

/** 流式发射器 */
interface StreamEmitter {
  type: ParticleType;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rate: number;
  accumulator: number;
  active: boolean;
}

const MAX_PARTICLES = 2000;
const MAX_STREAMS = 64;

export class UnifiedParticleSystem {
  // --- Struct-of-Arrays 粒子数据 ---
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pvx: Float32Array;
  private readonly pvy: Float32Array;
  private readonly plife: Float32Array;
  private readonly pmaxLife: Float32Array;
  private readonly psize: Float32Array;
  private readonly pr: Float32Array;
  private readonly pg: Float32Array;
  private readonly pb: Float32Array;
  private readonly pa: Float32Array;
  /** 粒子类型 ID */
  private readonly ptype: Uint8Array;
  /** 粒子是否存活 */
  private readonly palive: Uint8Array;

  // --- Free list ---
  private readonly freeList: Int32Array;
  private freeCount: number;

  // --- 活跃粒子计数 ---
  private activeCount: number;

  // --- 流式发射器 ---
  private readonly streams: StreamEmitter[];
  private nextStreamId: number;

  // --- 预分配的渲染排序缓冲 ---
  private readonly sortBuf: Int32Array;

  constructor() {
    this.px = new Float32Array(MAX_PARTICLES);
    this.py = new Float32Array(MAX_PARTICLES);
    this.pvx = new Float32Array(MAX_PARTICLES);
    this.pvy = new Float32Array(MAX_PARTICLES);
    this.plife = new Float32Array(MAX_PARTICLES);
    this.pmaxLife = new Float32Array(MAX_PARTICLES);
    this.psize = new Float32Array(MAX_PARTICLES);
    this.pr = new Float32Array(MAX_PARTICLES);
    this.pg = new Float32Array(MAX_PARTICLES);
    this.pb = new Float32Array(MAX_PARTICLES);
    this.pa = new Float32Array(MAX_PARTICLES);
    this.ptype = new Uint8Array(MAX_PARTICLES);
    this.palive = new Uint8Array(MAX_PARTICLES);

    this.freeList = new Int32Array(MAX_PARTICLES);
    this.freeCount = MAX_PARTICLES;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.freeList[i] = MAX_PARTICLES - 1 - i; // 栈顶是 0
    }
    this.activeCount = 0;

    this.streams = [];
    for (let i = 0; i < MAX_STREAMS; i++) {
      this.streams.push({
        type: 'fire', x: 0, y: 0, dx: 0, dy: 0,
        rate: 0, accumulator: 0, active: false,
      });
    }
    this.nextStreamId = 0;

    this.sortBuf = new Int32Array(MAX_PARTICLES);
  }

  // ===================== 分配 / 回收 =====================

  private alloc(): number {
    if (this.freeCount === 0) return -1;
    this.freeCount--;
    const idx = this.freeList[this.freeCount];
    this.palive[idx] = 1;
    this.activeCount++;
    return idx;
  }

  private free(idx: number): void {
    this.palive[idx] = 0;
    this.freeList[this.freeCount] = idx;
    this.freeCount++;
    this.activeCount--;
  }

  // ===================== 初始化单个粒子 =====================

  private initParticle(idx: number, type: ParticleType, x: number, y: number): void {
    const p = PRESETS[type];
    const rand = p.vRand;
    this.px[idx] = x;
    this.py[idx] = y;
    this.pvx[idx] = p.vx + (Math.random() - 0.5) * rand * 2;
    this.pvy[idx] = p.vy + (Math.random() - 0.5) * rand * 2;
    this.plife[idx] = p.life + (Math.random() - 0.5) * p.life * 0.3;
    this.pmaxLife[idx] = this.plife[idx];
    this.psize[idx] = p.size + (Math.random() - 0.5) * p.size * 0.4;
    this.pr[idx] = p.r;
    this.pg[idx] = p.g;
    this.pb[idx] = p.b;
    this.pa[idx] = p.alpha;
    this.ptype[idx] = TYPE_IDS[type];
  }

  // ===================== 发射 API =====================

  /** 在指定位置发射 count 个粒子 */
  emit(type: ParticleType, x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = this.alloc();
      if (idx === -1) return;
      this.initParticle(idx, type, x, y);
    }
  }

  /** 爆发式发射：粒子在 radius 范围内随机分布 */
  emitBurst(type: ParticleType, x: number, y: number, count: number, radius: number): void {
    for (let i = 0; i < count; i++) {
      const idx = this.alloc();
      if (idx === -1) return;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      this.initParticle(idx, type, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
      // 爆发方向：从中心向外
      this.pvx[idx] += Math.cos(angle) * 1.5;
      this.pvy[idx] += Math.sin(angle) * 1.5;
    }
  }

  /** 持续流式发射，返回 streamId */
  emitStream(type: ParticleType, x: number, y: number, dx: number, dy: number, rate: number): number {
    // 找一个空闲 slot
    let slot = -1;
    for (let i = 0; i < MAX_STREAMS; i++) {
      const id = (this.nextStreamId + i) % MAX_STREAMS;
      if (!this.streams[id].active) {
        slot = id;
        break;
      }
    }
    if (slot === -1) return -1;

    const s = this.streams[slot];
    s.type = type;
    s.x = x;
    s.y = y;
    s.dx = dx;
    s.dy = dy;
    s.rate = rate;
    s.accumulator = 0;
    s.active = true;
    this.nextStreamId = (slot + 1) % MAX_STREAMS;
    return slot;
  }

  /** 停止流式发射 */
  stopStream(streamId: number): void {
    if (streamId >= 0 && streamId < MAX_STREAMS) {
      this.streams[streamId].active = false;
    }
  }

  // ===================== 更新 =====================

  /** 每帧更新所有活跃粒子和流式发射器 */
  update(_tick: number): void {
    // 更新流式发射器
    for (let i = 0; i < MAX_STREAMS; i++) {
      const s = this.streams[i];
      if (!s.active) continue;
      s.x += s.dx;
      s.y += s.dy;
      s.accumulator += s.rate;
      while (s.accumulator >= 1) {
        s.accumulator -= 1;
        const idx = this.alloc();
        if (idx === -1) break;
        this.initParticle(idx, s.type, s.x, s.y);
      }
    }

    // 更新所有活跃粒子
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.palive[i]) continue;

      // 生命递减
      this.plife[i] -= 1;
      if (this.plife[i] <= 0) {
        this.free(i);
        continue;
      }

      const typeId = this.ptype[i];
      const typeName = PARTICLE_TYPES[typeId];
      const preset = PRESETS[typeName];

      // 物理更新
      this.pvy[i] += preset.gravity;
      this.px[i] += this.pvx[i];
      this.py[i] += this.pvy[i];

      // 生命比例
      const lifeRatio = this.plife[i] / this.pmaxLife[i];

      // 透明度随生命衰减
      this.pa[i] = preset.alpha * lifeRatio;

      // 大小变化
      if (preset.sizeDecay === 1) {
        // 缩小消失
        this.psize[i] = (preset.size + (Math.random() - 0.5) * 0.2) * lifeRatio;
      } else if (preset.sizeDecay === -1) {
        // 扩大淡出
        this.psize[i] = preset.size * (2 - lifeRatio);
      }

      // 特殊行为
      if (typeId === TYPE_IDS.magic) {
        // 螺旋运动
        const t = (1 - lifeRatio) * Math.PI * 6;
        this.pvx[i] += Math.cos(t) * 0.1;
        this.pvy[i] += Math.sin(t) * 0.05;
        // 闪烁
        this.pa[i] *= 0.6 + Math.sin(t * 3) * 0.4;
      } else if (typeId === TYPE_IDS.bubble) {
        // 摇摆
        const t = (1 - lifeRatio) * Math.PI * 8;
        this.pvx[i] += Math.sin(t) * 0.05;
      } else if (typeId === TYPE_IDS.fire) {
        // 颜色渐变：红橙黄
        const colorT = 1 - lifeRatio;
        this.pr[i] = 255;
        this.pg[i] = 60 + colorT * 180;
        this.pb[i] = colorT * 60;
      }
    }
  }

  // ===================== 渲染 =====================

  /** 批量渲染所有活跃粒子 */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (this.activeCount === 0) return;

    // 收集活跃粒子索引，按类型分组
    const counts = [0, 0, 0, 0, 0, 0, 0, 0]; // 每种类型的计数
    let total = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.palive[i]) {
        this.sortBuf[total++] = i;
        counts[this.ptype[i]]++;
      }
    }

    // 简单按类型排序（计数排序，不分配新数组）
    // 计算偏移
    const offsets = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let t = 1; t < 8; t++) {
      offsets[t] = offsets[t - 1] + counts[t - 1];
    }

    // 使用 sortBuf 后半段作为临时空间
    const tmpStart = MAX_PARTICLES >> 1;
    const cursor = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < total; i++) {
      const idx = this.sortBuf[i];
      const t = this.ptype[idx];
      this.sortBuf[tmpStart + offsets[t] + cursor[t]] = idx;
      cursor[t]++;
    }
    // 拷贝回前半段
    for (let i = 0; i < total; i++) {
      this.sortBuf[i] = this.sortBuf[tmpStart + i];
    }

    ctx.save();

    let currentAdditive = false;
    let groupStart = 0;

    while (groupStart < total) {
      const groupType = this.ptype[this.sortBuf[groupStart]];
      const typeName = PARTICLE_TYPES[groupType];
      const preset = PRESETS[typeName];

      // 设置混合模式
      if (preset.additive !== currentAdditive) {
        currentAdditive = preset.additive;
        ctx.globalCompositeOperation = currentAdditive ? 'lighter' : 'source-over';
      }

      // 渲染该类型的所有粒子
      let j = groupStart;
      while (j < total && this.ptype[this.sortBuf[j]] === groupType) {
        const idx = this.sortBuf[j];
        const sx = (this.px[idx] - camX) * zoom;
        const sy = (this.py[idx] - camY) * zoom;
        const sz = this.psize[idx] * zoom;

        if (sz > 0.1) {
          const r = this.pr[idx] | 0;
          const g = this.pg[idx] | 0;
          const b = this.pb[idx] | 0;
          const a = this.pa[idx];

          ctx.globalAlpha = a > 0 ? (a < 1 ? a : 1) : 0;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(sx - sz * 0.5, sy - sz * 0.5, sz, sz);
        }
        j++;
      }
      groupStart = j;
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ===================== 查询 =====================

  /** 当前活跃粒子数 */
  getActiveCount(): number {
    return this.activeCount;
  }

  /** 粒子池使用率 0-1 */
  getPoolUsage(): number {
    return this.activeCount / MAX_PARTICLES;
  }

  /** 清除所有粒子和流式发射器 */
  clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.palive[i] = 0;
    }
    this.freeCount = MAX_PARTICLES;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.freeList[i] = MAX_PARTICLES - 1 - i;
    }
    this.activeCount = 0;
    for (let i = 0; i < MAX_STREAMS; i++) {
      this.streams[i].active = false;
    }
  }
}
