/**
 * WorldBorderSystem — 世界边界视觉效果渲染系统
 * 在世界地图边缘渲染可配置的视觉效果（虚空、海洋、迷雾、火焰），
 * 并对靠近边界的生物施加排斥力。
 */

import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../utils/Constants'

/** 边界视觉风格 */
export type BorderStyle = 'VOID' | 'OCEAN' | 'MIST' | 'FIRE'

interface BorderParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  phase: number
}

/** 每种风格的颜色配置 */
const STYLE_COLORS: Record<BorderStyle, { r: number; g: number; b: number }> = {
  VOID:  { r: 5,   g: 2,   b: 15  },
  OCEAN: { r: 8,   g: 30,  b: 60  },
  MIST:  { r: 200, g: 210, b: 220 },
  FIRE:  { r: 180, g: 40,  b: 10  },
}

const BORDER_WIDTH = 8

// Pre-computed base color tables: 91 steps alpha 0.00..0.90
// Indexed by Math.round(alpha * 100), alpha max 0.9
const STYLE_COLOR_TABLES: Record<BorderStyle, string[]> = {} as Record<BorderStyle, string[]>
;(['VOID', 'OCEAN', 'MIST', 'FIRE'] as BorderStyle[]).forEach(style => {
  const c = STYLE_COLORS[style]
  const tbl: string[] = []
  for (let i = 0; i <= 90; i++) {
    tbl.push(`rgba(${c.r},${c.g},${c.b},${(i / 100).toFixed(2)})`)
  }
  STYLE_COLOR_TABLES[style] = tbl
})
const MAX_PARTICLES = 40
const REPULSION_STRENGTH = 0.6

// Pre-computed particle glow colors per style: 51 steps for alpha 0.00..0.50
// stop0 colors (alpha=alpha), stop1 always 'rgba(r,g,b,0)'
const PARTICLE_GLOW_TABLE: Record<BorderStyle, { stop0: string[]; stop1: string }> = {} as Record<BorderStyle, { stop0: string[]; stop1: string }>
;(['VOID', 'OCEAN', 'MIST', 'FIRE'] as BorderStyle[]).forEach(style => {
  const c = STYLE_COLORS[style]
  const bright = style === 'FIRE' ? 2.0 : style === 'MIST' ? 1.3 : 0.8
  const r = Math.min(255, Math.round(c.r * bright + 80))
  const g = Math.min(255, Math.round(c.g * bright + 60))
  const b = Math.min(255, Math.round(c.b * bright + 80))
  const stop0: string[] = []
  for (let i = 0; i <= 50; i++) stop0.push(`rgba(${r},${g},${b},${(i / 100).toFixed(2)})`)
  PARTICLE_GLOW_TABLE[style] = { stop0, stop1: `rgba(${r},${g},${b},0)` }
})

export class WorldBorderSystem {
  private style: BorderStyle = 'VOID'
  private animTime = 0
  private particles: BorderParticle[] = []

  /** 更新边界动画状态，每帧调用 */
  update(tick: number): void {
    this.animTime += 0.016

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.016
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }

    // 生成新粒子
    if (this.particles.length < MAX_PARTICLES && Math.random() < 0.15) {
      this.spawnParticle()
    }
  }

  /**
   * 渲染边界覆盖层
   * @param ctx - Canvas 2D 上下文
   * @param cameraX - 摄像机 X 偏移（像素）
   * @param cameraY - 摄像机 Y 偏移（像素）
   * @param zoom - 缩放倍率
   * @param viewStartX - 可见区域起始 tile X
   * @param viewStartY - 可见区域起始 tile Y
   * @param viewEndX - 可见区域结束 tile X
   * @param viewEndY - 可见区域结束 tile Y
   */
  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom: number,
    viewStartX: number,
    viewStartY: number,
    viewEndX: number,
    viewEndY: number
  ): void {
    const tileScreen = TILE_SIZE * zoom
    const colorTable = STYLE_COLOR_TABLES[this.style]

    for (let ty = viewStartY; ty <= viewEndY; ty++) {
      for (let tx = viewStartX; tx <= viewEndX; tx++) {
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

        const depth = this.getBorderDepth(tx, ty)
        if (depth <= 0) continue

        const sx = (tx * TILE_SIZE - cameraX) * zoom
        const sy = (ty * TILE_SIZE - cameraY) * zoom

        // 基础渐变 alpha: 0 (内边缘) → 0.9 (世界边缘)
        let alpha = depth * 0.9

        // 风格特有动画调制
        alpha = this.modulateAlpha(alpha, tx, ty, depth)

        const alphaIdx = Math.min(90, Math.max(0, Math.round(alpha * 100)))
        ctx.fillStyle = colorTable[alphaIdx]
        ctx.fillRect(sx, sy, tileScreen + 1, tileScreen + 1)

        // 火焰风格叠加亮色高光
        if (this.style === 'FIRE' && depth > 0.3) {
          const flicker = Math.sin(this.animTime * 6 + tx * 1.3 + ty * 0.9) * 0.5 + 0.5
          const highlightAlpha = depth * 0.25 * flicker
          if (highlightAlpha > 0) {
            ctx.globalAlpha = highlightAlpha
            ctx.fillStyle = '#ffc832'
            ctx.fillRect(sx, sy, tileScreen + 1, tileScreen + 1)
            ctx.globalAlpha = 1
          }
        }

        // 迷雾风格叠加白色漩涡
        if (this.style === 'MIST' && depth > 0.2) {
          const swirl = Math.sin(this.animTime * 1.5 + tx * 0.4 + ty * 0.6)
            * Math.cos(this.animTime * 0.8 + ty * 0.5)
          const swirlAlpha = depth * 0.15 * (swirl * 0.5 + 0.5)
          if (swirlAlpha > 0) {
            ctx.globalAlpha = swirlAlpha
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(sx, sy, tileScreen + 1, tileScreen + 1)
            ctx.globalAlpha = 1
          }
        }
      }
    }

    this.renderParticles(ctx, cameraX, cameraY, zoom)
  }

  /** 设置边界视觉风格 */
  setBorderStyle(style: BorderStyle): void {
    this.style = style
    this.particles.length = 0
  }

  /** 获取当前边界风格 */
  getBorderStyle(): BorderStyle {
    return this.style
  }

  /**
   * 计算指定 tile 坐标受到的边界排斥力
   * @returns 力向量 { fx, fy }，指向远离边界的方向
   */
  getRepulsionForce(x: number, y: number): { fx: number; fy: number } {
    let fx = 0
    let fy = 0

    const distLeft = x
    const distRight = WORLD_WIDTH - 1 - x
    const distTop = y
    const distBottom = WORLD_HEIGHT - 1 - y

    if (distLeft < BORDER_WIDTH) {
      fx += REPULSION_STRENGTH * (1 - distLeft / BORDER_WIDTH)
    }
    if (distRight < BORDER_WIDTH) {
      fx -= REPULSION_STRENGTH * (1 - distRight / BORDER_WIDTH)
    }
    if (distTop < BORDER_WIDTH) {
      fy += REPULSION_STRENGTH * (1 - distTop / BORDER_WIDTH)
    }
    if (distBottom < BORDER_WIDTH) {
      fy -= REPULSION_STRENGTH * (1 - distBottom / BORDER_WIDTH)
    }

    return { fx, fy }
  }

  /**
   * 判断指定 tile 坐标是否靠近世界边界
   * @param threshold - 判定距离（tile 数），默认为 BORDER_WIDTH
   */
  isNearBorder(x: number, y: number, threshold: number = BORDER_WIDTH): boolean {
    return x < threshold || x >= WORLD_WIDTH - threshold
      || y < threshold || y >= WORLD_HEIGHT - threshold
  }

  /** 计算 tile 在边界带中的归一化深度 (0=不在边界, 1=世界最边缘) */
  private getBorderDepth(tx: number, ty: number): number {
    const distLeft = tx
    const distRight = WORLD_WIDTH - 1 - tx
    const distTop = ty
    const distBottom = WORLD_HEIGHT - 1 - ty
    const minDist = Math.min(distLeft, distRight, distTop, distBottom)

    if (minDist >= BORDER_WIDTH) return 0
    return 1 - minDist / BORDER_WIDTH
  }

  /** 根据风格对 alpha 进行动画调制 */
  private modulateAlpha(base: number, tx: number, ty: number, depth: number): number {
    switch (this.style) {
      case 'VOID': {
        // 脉动暗涌
        const pulse = Math.sin(this.animTime * 0.8 + tx * 0.3 + ty * 0.2) * 0.08
        return base + pulse * depth
      }
      case 'OCEAN': {
        // 波浪起伏
        const wave = Math.sin(this.animTime * 1.2 + tx * 0.5) * Math.cos(this.animTime * 0.7 + ty * 0.4)
        return base + wave * 0.1 * depth
      }
      case 'MIST': {
        // 缓慢飘动
        const drift = Math.sin(this.animTime * 0.5 + tx * 0.2 + ty * 0.3) * 0.12
        return base * (0.7 + 0.3 * depth) + drift * depth
      }
      case 'FIRE': {
        // 剧烈闪烁
        const flicker = Math.sin(this.animTime * 5 + tx * 1.1) * Math.sin(this.animTime * 3.7 + ty * 1.3)
        return base + flicker * 0.15 * depth
      }
    }
  }

  /** 在边界带随机生成粒子 */
  private spawnParticle(): void {
    const edge = Math.floor(Math.random() * 4)
    let x: number, y: number, vx: number, vy: number
    switch (edge) {
      case 0: // 上
        x = Math.random() * WORLD_WIDTH; y = Math.random() * BORDER_WIDTH
        vx = (Math.random() - 0.5) * 0.3; vy = 0.1 + Math.random() * 0.1; break
      case 1: // 下
        x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT - Math.random() * BORDER_WIDTH
        vx = (Math.random() - 0.5) * 0.3; vy = -(0.1 + Math.random() * 0.1); break
      case 2: // 左
        x = Math.random() * BORDER_WIDTH; y = Math.random() * WORLD_HEIGHT
        vx = 0.1 + Math.random() * 0.1; vy = (Math.random() - 0.5) * 0.3; break
      default: // 右
        x = WORLD_WIDTH - Math.random() * BORDER_WIDTH; y = Math.random() * WORLD_HEIGHT
        vx = -(0.1 + Math.random() * 0.1); vy = (Math.random() - 0.5) * 0.3; break
    }
    const life = 1.5 + Math.random() * 2
    this.particles.push({ x, y, vx, vy, life, maxLife: life, phase: Math.random() * Math.PI * 2 })
  }

  /** 渲染边界粒子 */
  private renderParticles(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom: number
  ): void {
    if (this.particles.length === 0) return

    const prev = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = this.style === 'FIRE' ? 'lighter' : 'source-over'

    for (const p of this.particles) {
      const screenX = (p.x * TILE_SIZE - cameraX) * zoom
      const screenY = (p.y * TILE_SIZE - cameraY) * zoom

      const lifeRatio = p.life / p.maxLife
      const fadeAlpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : lifeRatio > 0.7 ? (1 - lifeRatio) / 0.3 : 1
      const alpha = fadeAlpha * 0.5

      if (alpha <= 0) continue

      const radius = (1 + Math.sin(this.animTime * 2 + p.phase) * 0.4) * zoom

      // Use pre-computed particle glow colors for this style
      const glowTbl = PARTICLE_GLOW_TABLE[this.style]
      const alphaIdx = Math.min(50, Math.round(alpha * 100))
      const grad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius)
      grad.addColorStop(0, glowTbl.stop0[alphaIdx])
      grad.addColorStop(1, glowTbl.stop1)

      ctx.fillStyle = grad
      ctx.fillRect(screenX - radius, screenY - radius, radius * 2, radius * 2)
    }

    ctx.globalCompositeOperation = prev
  }
}
