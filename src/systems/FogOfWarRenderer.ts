/**
 * FogOfWarRenderer — 战争迷雾渲染增强系统
 * 为 FogOfWarSystem 提供渐变边缘、雾气动画、灰度已探索区域和神秘粒子效果。
 * 使用 OffscreenCanvas 缓存迷雾层，带脏标记避免不必要的重绘。
 */

import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

type FogState = 0 | 1 | 2 // 0=unexplored, 1=explored(dim), 2=visible(clear)

interface MysteryParticle {
  x: number
  y: number
  alpha: number
  speed: number
  phase: number
  active: boolean
}

const MAX_PARTICLES = 50
const CACHE_INTERVAL = 6 // 每 6 帧更新一次迷雾缓存（从 3 提升）

// 预计算 alpha 字符串表，避免热路径字符串拼接
const FOG_ALPHA_TABLE: string[] = []
const EXPLORED_STYLE = 'rgba(0,0,0,0.35)'
const EXPLORED_TINT = 'rgba(60,65,80,0.15)'
for (let i = 0; i <= 20; i++) {
  const a = (0.80 + i * 0.01).toFixed(2)
  FOG_ALPHA_TABLE.push(`rgba(8,8,20,${a})`)
}

export class FogOfWarRenderer {
  private fogCanvas: OffscreenCanvas | null = null
  private fogCtx: OffscreenCanvasRenderingContext2D | null = null
  private cachedWidth = 0
  private cachedHeight = 0
  private animTime = 0
  private frameCount = 0

  // 对象池化粒子
  private mysteryParticles: MysteryParticle[] = []
  private activeParticleCount = 0

  // 脏标记
  private lastCameraX = -1
  private lastCameraY = -1
  private lastZoom = -1
  private fogVersion = 0
  private lastFogVersion = -1
  private forceRedraw = true

  constructor() {
    // 预分配粒子池
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.mysteryParticles.push({ x: 0, y: 0, alpha: 0, speed: 0, phase: 0, active: false })
    }
  }

  /** 标记迷雾状态已变化，需要重绘 */
  markDirty(): void {
    this.fogVersion++
  }

  private ensureCanvas(w: number, h: number): void {
    if (!this.fogCanvas || this.cachedWidth !== w || this.cachedHeight !== h) {
      this.fogCanvas = new OffscreenCanvas(w, h)
      this.fogCtx = this.fogCanvas.getContext('2d')
      this.cachedWidth = w
      this.cachedHeight = h
      this.forceRedraw = true
    }
  }

  update(): void {
    this.animTime += 0.016
    this.frameCount++

    // 更新活跃粒子（用索引遍历，不 splice）
    this.activeParticleCount = 0
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.mysteryParticles[i]
      if (!p.active) continue
      p.x += Math.sin(this.animTime * p.speed + p.phase) * 0.3
      p.y += Math.cos(this.animTime * p.speed * 0.7 + p.phase) * 0.2
      p.alpha -= 0.005
      if (p.alpha <= 0) {
        p.active = false
      } else {
        this.activeParticleCount++
      }
    }
  }

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

    // 脏标记检查：相机移动、迷雾变化、或定时刷新
    const cameraChanged = cameraX !== this.lastCameraX || cameraY !== this.lastCameraY || zoom !== this.lastZoom
    const fogChanged = this.fogVersion !== this.lastFogVersion
    const timerRedraw = this.frameCount % CACHE_INTERVAL === 0

    const needsRedraw = this.forceRedraw || fogChanged || (cameraChanged && timerRedraw) || (!cameraChanged && timerRedraw)

    if (needsRedraw && this.fogCtx) {
      this.lastCameraX = cameraX
      this.lastCameraY = cameraY
      this.lastZoom = zoom
      this.lastFogVersion = this.fogVersion
      this.forceRedraw = false

      const fc = this.fogCtx
      fc.clearRect(0, 0, canvasW, canvasH)

      const tileScreenSize = TILE_SIZE * zoom

      for (let ty = startY; ty <= endY; ty++) {
        for (let tx = startX; tx <= endX; tx++) {
          if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

          const state = getFogState(tx, ty)
          if (state === 2) continue

          const sx = (tx * TILE_SIZE - cameraX) * zoom
          const sy = (ty * TILE_SIZE - cameraY) * zoom
          const size = tileScreenSize + 1

          if (state === 0) {
            // 未探索：用预计算 alpha 表
            const wave = Math.sin(this.animTime * 0.8 + tx * 0.5 + ty * 0.3) * 0.05
            const idx = Math.max(0, Math.min(20, Math.round((wave + 0.05) * 200)))
            fc.fillStyle = FOG_ALPHA_TABLE[idx]
            fc.fillRect(sx, sy, size, size)
          } else {
            // state === 1: 已探索但不可见
            fc.fillStyle = EXPLORED_STYLE
            fc.fillRect(sx, sy, size, size)
            fc.fillStyle = EXPLORED_TINT
            fc.fillRect(sx, sy, size, size)
          }
        }
      }

      // 简化渐变边缘：只用固定 alpha 的半透明矩形代替 createLinearGradient
      this.renderSimplifiedEdges(fc, cameraX, cameraY, zoom, startX, startY, endX, endY, tileScreenSize, getFogState)
    }

    if (this.fogCanvas) {
      ctx.drawImage(this.fogCanvas, 0, 0)
    }

    this.spawnMysteryParticle(startX, startY, endX, endY, getFogState)

    if (this.activeParticleCount > 0) {
      this.renderMysteryParticles(ctx, cameraX, cameraY, zoom)
    }
  }

  /** 简化的边缘渲染 - 用固定 alpha 矩形代替昂贵的 createLinearGradient */
  private renderSimplifiedEdges(
    fc: OffscreenCanvasRenderingContext2D,
    cameraX: number, cameraY: number, zoom: number,
    startX: number, startY: number, endX: number, endY: number,
    tileScreenSize: number,
    getFogState: (x: number, y: number) => FogState
  ): void {
    const halfSize = tileScreenSize * 0.3

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue

        const state = getFogState(tx, ty)
        if (state !== 2) continue

        const sx = (tx * TILE_SIZE - cameraX) * zoom
        const sy = (ty * TILE_SIZE - cameraY) * zoom

        // 检查四个方向邻居
        // 上
        if (ty > 0 && getFogState(tx, ty - 1) < 2) {
          fc.fillStyle = getFogState(tx, ty - 1) === 0 ? 'rgba(8,8,20,0.3)' : 'rgba(30,32,45,0.15)'
          fc.fillRect(sx, sy, tileScreenSize + 1, halfSize)
        }
        // 下
        if (ty < WORLD_HEIGHT - 1 && getFogState(tx, ty + 1) < 2) {
          fc.fillStyle = getFogState(tx, ty + 1) === 0 ? 'rgba(8,8,20,0.3)' : 'rgba(30,32,45,0.15)'
          fc.fillRect(sx, sy + tileScreenSize - halfSize, tileScreenSize + 1, halfSize)
        }
        // 左
        if (tx > 0 && getFogState(tx - 1, ty) < 2) {
          fc.fillStyle = getFogState(tx - 1, ty) === 0 ? 'rgba(8,8,20,0.3)' : 'rgba(30,32,45,0.15)'
          fc.fillRect(sx, sy, halfSize, tileScreenSize + 1)
        }
        // 右
        if (tx < WORLD_WIDTH - 1 && getFogState(tx + 1, ty) < 2) {
          fc.fillStyle = getFogState(tx + 1, ty) === 0 ? 'rgba(8,8,20,0.3)' : 'rgba(30,32,45,0.15)'
          fc.fillRect(sx + tileScreenSize - halfSize, sy, halfSize, tileScreenSize + 1)
        }
      }
    }
  }

  private renderMysteryParticles(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom: number
  ): void {
    const prev = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = 'lighter'

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.mysteryParticles[i]
      if (!p.active) continue

      const screenX = (p.x * TILE_SIZE - cameraX) * zoom
      const screenY = (p.y * TILE_SIZE - cameraY) * zoom

      const flicker = Math.sin(this.animTime * 4 + p.phase) * 0.3 + 0.7
      const alpha = p.alpha * flicker
      if (alpha <= 0) continue

      const radius = (1.5 + Math.sin(this.animTime * 2 + p.phase) * 0.5) * zoom

      // 用简单的 fillRect 代替 createRadialGradient
      const a1 = Math.min(1, alpha * 0.8)
      ctx.globalAlpha = a1
      ctx.fillStyle = '#b4c8ff'
      const dotSize = radius * 0.4
      ctx.fillRect(screenX - dotSize, screenY - dotSize, dotSize * 2, dotSize * 2)

      ctx.globalAlpha = Math.min(1, alpha * 0.3)
      ctx.fillRect(screenX - radius, screenY - radius, radius * 2, radius * 2)
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = prev
  }

  private spawnMysteryParticle(
    startX: number, startY: number, endX: number, endY: number,
    getFogState: (x: number, y: number) => FogState
  ): void {
    if (this.activeParticleCount >= MAX_PARTICLES) return
    if (Math.random() > 0.05) return

    const rangeX = endX - startX
    const rangeY = endY - startY
    if (rangeX <= 0 || rangeY <= 0) return

    const tx = startX + Math.floor(Math.random() * rangeX)
    const ty = startY + Math.floor(Math.random() * rangeY)

    if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) return
    if (getFogState(tx, ty) !== 0) return

    // 复用 inactive 粒子槽位
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.mysteryParticles[i]
      if (!p.active) {
        p.x = tx + Math.random()
        p.y = ty + Math.random()
        p.alpha = 0.4 + Math.random() * 0.5
        p.speed = 0.5 + Math.random() * 1.5
        p.phase = Math.random() * Math.PI * 2
        p.active = true
        this.activeParticleCount++
        return
      }
    }
  }
}
