/**
 * FogOfWarRenderer — 战争迷雾渲染增强系统
 * 为 FogOfWarSystem 提供渐变边缘、雾气动画、灰度已探索区域和神秘粒子效果。
 * 使用 OffscreenCanvas 缓存迷雾层，每 3 帧更新一次以保证性能。
 */

import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

type FogState = 0 | 1 | 2 // 0=unexplored, 1=explored(dim), 2=visible(clear)

interface MysteryParticle {
  x: number
  y: number
  alpha: number
  speed: number
  phase: number
}

const MAX_PARTICLES = 50
const CACHE_INTERVAL = 3 // 每 3 帧更新一次迷雾缓存

export class FogOfWarRenderer {
  private fogCanvas: OffscreenCanvas | null = null
  private fogCtx: OffscreenCanvasRenderingContext2D | null = null
  private cachedWidth = 0
  private cachedHeight = 0
  private animTime = 0
  private frameCount = 0
  private mysteryParticles: MysteryParticle[] = []

  constructor() {
    // OffscreenCanvas 在首次 render 时按视口尺寸创建
  }

  /** 确保 OffscreenCanvas 尺寸匹配视口 */
  private ensureCanvas(w: number, h: number): void {
    if (!this.fogCanvas || this.cachedWidth !== w || this.cachedHeight !== h) {
      this.fogCanvas = new OffscreenCanvas(w, h)
      this.fogCtx = this.fogCanvas.getContext('2d')
      this.cachedWidth = w
      this.cachedHeight = h
    }
  }

  /** 更新动画状态，每帧调用 */
  update(): void {
    this.animTime += 0.016 // ~60fps delta
    this.frameCount++

    // 更新粒子
    for (let i = this.mysteryParticles.length - 1; i >= 0; i--) {
      const p = this.mysteryParticles[i]
      // 缓慢飘动
      p.x += Math.sin(this.animTime * p.speed + p.phase) * 0.3
      p.y += Math.cos(this.animTime * p.speed * 0.7 + p.phase) * 0.2
      // 闪烁：alpha 在 0~1 之间波动后衰减
      p.alpha -= 0.005
      if (p.alpha <= 0) {
        this.mysteryParticles.splice(i, 1)
      }
    }
  }

  /** 主渲染方法 — 在主 canvas 上绘制迷雾覆盖层 */
  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    getFogState: (x: number, y: number) => FogState
  ): void {
    const canvasW = ctx.canvas.width
    const canvasH = ctx.canvas.height
    this.ensureCanvas(canvasW, canvasH)

    const needsRedraw = this.frameCount % CACHE_INTERVAL === 0

    if (needsRedraw && this.fogCtx) {
      const fc = this.fogCtx
      fc.clearRect(0, 0, canvasW, canvasH)

      const tileScreenSize = TILE_SIZE * zoom

      // 遍历可见 tile
      for (let ty = startY; ty <= endY; ty++) {
        for (let tx = startX; tx <= endX; tx++) {
          if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

          const state = getFogState(tx, ty)
          if (state === 2) continue // 完全可见，不绘制迷雾

          const sx = (tx * TILE_SIZE - cameraX) * zoom
          const sy = (ty * TILE_SIZE - cameraY) * zoom

          if (state === 0) {
            // 未探索：深色迷雾 + 飘动动画
            const wave = Math.sin(this.animTime * 0.8 + tx * 0.5 + ty * 0.3) * 0.05
            const fogAlpha = 0.85 + wave
            fc.fillStyle = `rgba(8,8,20,${Math.min(1, Math.max(0, fogAlpha))})`
            fc.fillRect(sx, sy, tileScreenSize + 1, tileScreenSize + 1)

            // 雾气纹理：叠加一层浅色波纹
            const texWave = Math.sin(this.animTime * 0.5 + tx * 0.7) * Math.cos(this.animTime * 0.3 + ty * 0.6)
            const texAlpha = 0.03 + texWave * 0.02
            if (texAlpha > 0) {
              fc.fillStyle = `rgba(100,120,160,${texAlpha})`
              fc.fillRect(sx, sy, tileScreenSize + 1, tileScreenSize + 1)
            }
          } else {
            // state === 1: 已探索但不可见 — 灰色去饱和叠加
            // 使用 saturation 混合模式模拟去饱和效果
            fc.fillStyle = 'rgba(0,0,0,0.35)'
            fc.fillRect(sx, sy, tileScreenSize + 1, tileScreenSize + 1)
            // 叠加灰蓝色调实现 desaturated 效果
            fc.fillStyle = 'rgba(60,65,80,0.15)'
            fc.fillRect(sx, sy, tileScreenSize + 1, tileScreenSize + 1)
          }
        }
      }

      // 渲染渐变边缘
      this.renderGradientEdges(fc, cameraX, cameraY, zoom, startX, startY, endX, endY, getFogState)
    }

    // 将缓存的迷雾层绘制到主 canvas
    if (this.fogCanvas) {
      ctx.drawImage(this.fogCanvas, 0, 0)
    }

    // 生成新粒子（每帧都可以尝试，粒子本身不受缓存间隔限制）
    this.spawnMysteryParticle(startX, startY, endX, endY, getFogState)

    // 渲染神秘粒子（直接绘制到主 canvas，不缓存）
    this.renderMysteryParticles(ctx, cameraX, cameraY, zoom)
  }

  /** 渲染渐变边缘 — 在迷雾状态不同的相邻 tile 边界处绘制渐变 */
  private renderGradientEdges(
    fc: OffscreenCanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    getFogState: (x: number, y: number) => FogState
  ): void {
    const tileScreenSize = TILE_SIZE * zoom
    const gradientSize = tileScreenSize * 0.6

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

        const state = getFogState(tx, ty)
        // 只在可见 tile 旁边有迷雾时绘制渐变
        if (state !== 2) continue

        const sx = (tx * TILE_SIZE - cameraX) * zoom
        const sy = (ty * TILE_SIZE - cameraY) * zoom
        const cx = sx + tileScreenSize * 0.5
        const cy = sy + tileScreenSize * 0.5

        // 检查四个方向的邻居
        const neighbors: [number, number, number, number, number, number][] = [
          // [nx, ny, gradX1, gradY1, gradX2, gradY2] — 渐变从 tile 边缘向内
          [tx, ty - 1, cx, sy, cx, sy + gradientSize],                     // 上
          [tx, ty + 1, cx, sy + tileScreenSize, cx, sy + tileScreenSize - gradientSize], // 下
          [tx - 1, ty, sx, cy, sx + gradientSize, cy],                     // 左
          [tx + 1, ty, sx + tileScreenSize, cy, sx + tileScreenSize - gradientSize, cy], // 右
        ]

        for (const [nx, ny, gx1, gy1, gx2, gy2] of neighbors) {
          if (nx < 0 || nx >= WORLD_WIDTH || ny < 0 || ny >= WORLD_HEIGHT) continue
          const neighborState = getFogState(nx, ny)
          if (neighborState >= state) continue // 邻居同样可见或更亮，不需要渐变

          // 根据邻居状态决定渐变深度
          const fogColor = neighborState === 0 ? 'rgba(8,8,20,' : 'rgba(30,32,45,'
          const maxAlpha = neighborState === 0 ? 0.7 : 0.35

          const grad = fc.createLinearGradient(gx1, gy1, gx2, gy2)
          grad.addColorStop(0, fogColor + maxAlpha + ')')
          grad.addColorStop(1, fogColor + '0)')

          fc.fillStyle = grad
          fc.fillRect(sx, sy, tileScreenSize + 1, tileScreenSize + 1)
        }
      }
    }
  }

  /** 渲染神秘粒子 — 未探索区域偶尔闪烁的光点 */
  private renderMysteryParticles(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom: number
  ): void {
    if (this.mysteryParticles.length === 0) return

    const prev = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = 'lighter'

    for (const p of this.mysteryParticles) {
      const screenX = (p.x * TILE_SIZE - cameraX) * zoom
      const screenY = (p.y * TILE_SIZE - cameraY) * zoom

      // 闪烁效果
      const flicker = Math.sin(this.animTime * 4 + p.phase) * 0.3 + 0.7
      const alpha = p.alpha * flicker

      if (alpha <= 0) continue

      const radius = (1.5 + Math.sin(this.animTime * 2 + p.phase) * 0.5) * zoom

      const grad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius)
      grad.addColorStop(0, `rgba(180,200,255,${alpha * 0.8})`)
      grad.addColorStop(0.5, `rgba(120,140,200,${alpha * 0.4})`)
      grad.addColorStop(1, 'rgba(80,100,160,0)')

      ctx.fillStyle = grad
      ctx.fillRect(screenX - radius, screenY - radius, radius * 2, radius * 2)
    }

    ctx.globalCompositeOperation = prev
  }

  /** 在未探索区域生成新的神秘粒子 */
  private spawnMysteryParticle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    getFogState: (x: number, y: number) => FogState
  ): void {
    if (this.mysteryParticles.length >= MAX_PARTICLES) return

    // 每帧约 5% 概率生成一个粒子
    if (Math.random() > 0.05) return

    // 在可见视口范围内随机选一个 tile
    const rangeX = endX - startX
    const rangeY = endY - startY
    if (rangeX <= 0 || rangeY <= 0) return

    const tx = startX + Math.floor(Math.random() * rangeX)
    const ty = startY + Math.floor(Math.random() * rangeY)

    if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) return

    // 只在未探索区域生成
    if (getFogState(tx, ty) !== 0) return

    this.mysteryParticles.push({
      x: tx + Math.random(),
      y: ty + Math.random(),
      alpha: 0.4 + Math.random() * 0.5,
      speed: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    })
  }
}
