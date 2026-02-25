/** LODRenderSystem - zoom-dependent detail levels for entities and terrain */
import { EntityManager, EntityId, PositionComponent, RenderComponent, CreatureComponent } from '../ecs/Entity'
import { Camera } from '../game/Camera'

export type LODLevel = 'full' | 'medium' | 'low' | 'icon'

interface LODThresholds {
  full: number    // zoom >= this shows full detail
  medium: number  // zoom >= this shows medium
  low: number     // zoom >= this shows low
  // below low threshold = icon only
}

const DEFAULT_THRESHOLDS: LODThresholds = {
  full: 20,
  medium: 10,
  low: 4,
}

export class LODRenderSystem {
  private thresholds: LODThresholds = { ...DEFAULT_THRESHOLDS }
  private currentLOD: LODLevel = 'full'
  private entityCounts = { rendered: 0, culled: 0 }

  /** Determine current LOD level based on zoom */
  update(camera: Camera): void {
    const z = camera.zoom
    if (z >= this.thresholds.full) this.currentLOD = 'full'
    else if (z >= this.thresholds.medium) this.currentLOD = 'medium'
    else if (z >= this.thresholds.low) this.currentLOD = 'low'
    else this.currentLOD = 'icon'
  }

  getLOD(): LODLevel {
    return this.currentLOD
  }

  /** Render creatures with appropriate detail level */
  renderCreatures(
    ctx: CanvasRenderingContext2D,
    entities: EntityId[],
    em: EntityManager,
    camX: number, camY: number, zoom: number,
    viewW: number, viewH: number
  ): void {
    this.entityCounts.rendered = 0
    this.entityCounts.culled = 0

    for (const id of entities) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      const sx = (pos.x - camX) * zoom
      const sy = (pos.y - camY) * zoom

      // Frustum cull
      if (sx < -zoom || sx > viewW + zoom || sy < -zoom || sy > viewH + zoom) {
        this.entityCounts.culled++
        continue
      }

      this.entityCounts.rendered++
      const render = em.getComponent<RenderComponent>(id, 'render')
      const creature = em.getComponent<CreatureComponent>(id, 'creature')

      switch (this.currentLOD) {
        case 'full':
          this.renderFull(ctx, sx, sy, zoom, render, creature)
          break
        case 'medium':
          this.renderMedium(ctx, sx, sy, zoom, render, creature)
          break
        case 'low':
          this.renderLow(ctx, sx, sy, zoom, render)
          break
        case 'icon':
          this.renderIcon(ctx, sx, sy, zoom, render)
          break
      }
    }
  }

  /** Full detail: body + name + health bar */
  private renderFull(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, zoom: number,
    render: RenderComponent | undefined,
    creature: CreatureComponent | undefined
  ): void {
    const size = (render?.size ?? 1) * zoom * 0.4
    const color = render?.color ?? '#888'

    // Body
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(sx, sy, size, 0, Math.PI * 2)
    ctx.fill()

    // Name label
    if (creature) {
      ctx.fillStyle = '#fff'
      ctx.font = `${Math.max(8, zoom * 0.35)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(creature.name, sx, sy - size - 4)
    }
  }

  /** Medium detail: body + species initial */
  private renderMedium(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, zoom: number,
    render: RenderComponent | undefined,
    creature: CreatureComponent | undefined
  ): void {
    const size = (render?.size ?? 1) * zoom * 0.35
    const color = render?.color ?? '#888'

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(sx, sy, size, 0, Math.PI * 2)
    ctx.fill()

    // Species initial
    if (creature && zoom > 12) {
      ctx.fillStyle = '#fff'
      ctx.font = `${Math.max(7, zoom * 0.3)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(creature.species[0], sx, sy + 3)
    }
  }

  /** Low detail: colored dot */
  private renderLow(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, zoom: number,
    render: RenderComponent | undefined
  ): void {
    const size = Math.max(2, (render?.size ?? 1) * zoom * 0.25)
    ctx.fillStyle = render?.color ?? '#888'
    ctx.fillRect(sx - size / 2, sy - size / 2, size, size)
  }

  /** Icon level: single pixel dot */
  private renderIcon(
    ctx: CanvasRenderingContext2D,
    sx: number, sy: number, _zoom: number,
    render: RenderComponent | undefined
  ): void {
    ctx.fillStyle = render?.color ?? '#888'
    ctx.fillRect(sx - 1, sy - 1, 2, 2)
  }

  /** Get render stats for debug display */
  getStats(): { rendered: number; culled: number; lod: LODLevel } {
    return { ...this.entityCounts, lod: this.currentLOD }
  }

  setThresholds(t: Partial<LODThresholds>): void {
    Object.assign(this.thresholds, t)
  }
}
