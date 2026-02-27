/** BuildingVarietySystem - multiple building types per era with visual variety */
import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'

export type Era = 'primitive' | 'bronze' | 'iron' | 'medieval' | 'renaissance'

export interface BuildingType {
  name: string
  era: Era
  symbol: string
  color: string
  width: number
  height: number
  maxHealth: number
  provides: string[]  // e.g. ['housing', 'defense', 'food']
}

export interface BuildingComponent {
  type: 'building'
  buildingType: string
  era: Era
  health: number
  maxHealth: number
  civId: number
  builtTick: number
  variant: number  // visual variant index
}

const BUILDING_CATALOG: Record<Era, BuildingType[]> = {
  primitive: [
    { name: 'Hut', era: 'primitive', symbol: '⌂', color: '#8B7355', width: 1, height: 1, maxHealth: 30, provides: ['housing'] },
    { name: 'Campfire', era: 'primitive', symbol: '🔥', color: '#FF6600', width: 1, height: 1, maxHealth: 10, provides: ['warmth'] },
    { name: 'Storage Pit', era: 'primitive', symbol: '○', color: '#666', width: 1, height: 1, maxHealth: 20, provides: ['storage'] },
  ],
  bronze: [
    { name: 'House', era: 'bronze', symbol: '⌂', color: '#B8860B', width: 1, height: 1, maxHealth: 60, provides: ['housing'] },
    { name: 'Granary', era: 'bronze', symbol: '▣', color: '#DAA520', width: 1, height: 1, maxHealth: 50, provides: ['food', 'storage'] },
    { name: 'Barracks', era: 'bronze', symbol: '⚔', color: '#8B0000', width: 2, height: 1, maxHealth: 80, provides: ['military'] },
    { name: 'Well', era: 'bronze', symbol: '◎', color: '#4682B4', width: 1, height: 1, maxHealth: 40, provides: ['water'] },
  ],
  iron: [
    { name: 'Villa', era: 'iron', symbol: '⌂', color: '#CD853F', width: 2, height: 1, maxHealth: 100, provides: ['housing'] },
    { name: 'Forge', era: 'iron', symbol: '⚒', color: '#B22222', width: 1, height: 1, maxHealth: 90, provides: ['production'] },
    { name: 'Market', era: 'iron', symbol: '⚖', color: '#FFD700', width: 2, height: 1, maxHealth: 70, provides: ['trade'] },
    { name: 'Watchtower', era: 'iron', symbol: '⚐', color: '#696969', width: 1, height: 2, maxHealth: 120, provides: ['defense'] },
    { name: 'Temple', era: 'iron', symbol: '△', color: '#9370DB', width: 2, height: 2, maxHealth: 100, provides: ['faith'] },
  ],
  medieval: [
    { name: 'Manor', era: 'medieval', symbol: '⌂', color: '#A0522D', width: 2, height: 2, maxHealth: 150, provides: ['housing'] },
    { name: 'Castle', era: 'medieval', symbol: '♜', color: '#708090', width: 3, height: 3, maxHealth: 300, provides: ['defense', 'military'] },
    { name: 'Cathedral', era: 'medieval', symbol: '✝', color: '#DAA520', width: 2, height: 3, maxHealth: 200, provides: ['faith'] },
    { name: 'Mill', era: 'medieval', symbol: '⚙', color: '#8B7355', width: 1, height: 2, maxHealth: 80, provides: ['food', 'production'] },
    { name: 'Library', era: 'medieval', symbol: '📖', color: '#4B0082', width: 1, height: 1, maxHealth: 60, provides: ['knowledge'] },
  ],
  renaissance: [
    { name: 'Palace', era: 'renaissance', symbol: '♛', color: '#FFD700', width: 3, height: 3, maxHealth: 400, provides: ['housing', 'governance'] },
    { name: 'University', era: 'renaissance', symbol: '🎓', color: '#191970', width: 2, height: 2, maxHealth: 150, provides: ['knowledge'] },
    { name: 'Harbor', era: 'renaissance', symbol: '⚓', color: '#4682B4', width: 2, height: 2, maxHealth: 180, provides: ['trade', 'naval'] },
    { name: 'Fortress', era: 'renaissance', symbol: '🏰', color: '#696969', width: 3, height: 3, maxHealth: 500, provides: ['defense', 'military'] },
    { name: 'Theater', era: 'renaissance', symbol: '🎭', color: '#DC143C', width: 2, height: 1, maxHealth: 80, provides: ['culture'] },
  ],
}

const ERA_ORDER: Era[] = ['primitive', 'bronze', 'iron', 'medieval', 'renaissance']

export class BuildingVarietySystem {
  private buildings: Map<EntityId, BuildingComponent> = new Map()
  private _lastZoom = -1
  private _symbolFont = ''
  private _nameFont = ''

  /** Get available building types for an era */
  getBuildingTypes(era: Era): BuildingType[] {
    return BUILDING_CATALOG[era] ?? []
  }

  /** Get all building types up to and including the given era */
  getAvailableBuildings(era: Era): BuildingType[] {
    const idx = ERA_ORDER.indexOf(era)
    const result: BuildingType[] = []
    for (let i = 0; i <= idx; i++) {
      result.push(...BUILDING_CATALOG[ERA_ORDER[i]])
    }
    return result
  }

  /** Register a building entity */
  registerBuilding(entityId: EntityId, building: BuildingComponent): void {
    this.buildings.set(entityId, building)
  }

  removeBuilding(entityId: EntityId): void {
    this.buildings.delete(entityId)
  }

  /** Update building health decay and era upgrades */
  update(tick: number, em: EntityManager): void {
    if (tick % 60 !== 0) return

    for (const [eid, building] of this.buildings) {
      // Slow decay for unrepaired buildings
      if (building.health < building.maxHealth * 0.3) {
        building.health = Math.max(0, building.health - 0.5)
      }
      // Remove destroyed buildings
      if (building.health <= 0) {
        this.buildings.delete(eid)
        em.removeEntity(eid)
      }
    }
  }

  /** Render buildings with era-appropriate visuals */
  render(
    ctx: CanvasRenderingContext2D,
    camX: number, camY: number, zoom: number,
    em: EntityManager
  ): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._symbolFont = `${Math.max(10, zoom * 0.6)}px serif`
      this._nameFont = `${Math.max(8, zoom * 0.25)}px monospace`
    }
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const [eid, building] of this.buildings) {
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      if (!pos) continue

      const catalog = BUILDING_CATALOG[building.era]
      const bType = catalog?.find(b => b.name === building.buildingType)
      if (!bType) continue

      const sx = (pos.x - camX) * zoom
      const sy = (pos.y - camY) * zoom
      const w = bType.width * zoom
      const h = bType.height * zoom

      // Building base
      ctx.fillStyle = bType.color
      ctx.globalAlpha = 0.7
      ctx.fillRect(sx - w / 2, sy - h / 2, w, h)

      // Health-based tint
      const hpPct = building.health / building.maxHealth
      if (hpPct < 0.5) {
        ctx.fillStyle = `rgba(255,0,0,${0.3 * (1 - hpPct)})`
        ctx.fillRect(sx - w / 2, sy - h / 2, w, h)
      }

      // Symbol
      ctx.globalAlpha = 1
      ctx.font = this._symbolFont
      ctx.fillStyle = '#fff'
      ctx.fillText(bType.symbol, sx, sy)

      // Building name at high zoom
      if (zoom > 16) {
        ctx.font = this._nameFont
        ctx.fillStyle = '#ccc'
        ctx.fillText(bType.name, sx, sy + h / 2 + 8)
      }
    }

    ctx.restore()
  }

  /** Get building count by era */
  getCountByEra(): Map<Era, number> {
    const counts = new Map<Era, number>()
    for (const b of this.buildings.values()) {
      counts.set(b.era, (counts.get(b.era) ?? 0) + 1)
    }
    return counts
  }

  getBuildingCount(): number {
    return this.buildings.size
  }

  /** Determine era based on civ tech level */
  static eraFromTechLevel(techLevel: number): Era {
    if (techLevel >= 80) return 'renaissance'
    if (techLevel >= 60) return 'medieval'
    if (techLevel >= 40) return 'iron'
    if (techLevel >= 20) return 'bronze'
    return 'primitive'
  }
}
