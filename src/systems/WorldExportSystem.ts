import type { World } from '../game/World'
import type { EntityManager } from '../ecs/Entity'
import type { CivManager } from '../civilization/CivManager'
import type { ResourceSystem } from '../systems/ResourceSystem'

/** Current export format version */
const EXPORT_VERSION = 1

/** All known component type keys for entity serialization */
const COMPONENT_TYPES = [
  'position', 'velocity', 'render', 'needs', 'ai',
  'creature', 'hero', 'nomad', 'artifact', 'inventory',
  'disease', 'genetics', 'ship', 'civMember', 'building'
]

export interface ExportData {
  version: number
  exportDate: string
  seed?: number
  tick: number
  worldWidth: number
  worldHeight: number
  tiles: number[][]
  tileVariants: number[][]
  entities: Array<{ components: Record<string, any> }>
  civilizations: Array<any>
  territoryMap: number[][]
  resourceNodes: Array<any>
}

export class WorldExportSystem {
  private importing = false
  private importProgress = 0
  private _importProgressStr = 'Importing... 0%'

  constructor() {}

  /** Serialize world state and trigger browser download */
  exportWorld(
    world: World,
    em: EntityManager,
    civManager: CivManager,
    resources: ResourceSystem
  ): void {
    const entities: ExportData['entities'] = []
    for (const id of em.getAllEntities()) {
      const components: Record<string, any> = {}
      for (const t of COMPONENT_TYPES) {
        const c = em.getComponent(id, t)
        if (c) components[t] = { ...c }
      }
      if (Object.keys(components).length > 0) entities.push({ components })
    }

    const civs: any[] = []
    for (const [, civ] of civManager.civilizations) {
      civs.push({
        ...civ,
        territory: [...civ.territory],
        relations: [...civ.relations.entries()]
      })
    }

    const data: ExportData = {
      version: EXPORT_VERSION,
      exportDate: new Date().toISOString(),
      tick: world.tick,
      worldWidth: world.width,
      worldHeight: world.height,
      tiles: world.tiles as number[][],
      tileVariants: world.tileVariants,
      entities,
      civilizations: civs,
      territoryMap: civManager.territoryMap,
      resourceNodes: resources.nodes.map(n => ({ ...n }))
    }

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worldbox-save-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Parse an imported file, validate format, return data or null */
  async importWorld(file: File): Promise<ExportData | null> {
    this.importing = true
    this.importProgress = 0; this._importProgressStr = 'Importing... 0%'
    try {
      this.importProgress = 0.3; this._importProgressStr = 'Importing... 30%'
      const text = await file.text()
      this.importProgress = 0.6; this._importProgressStr = 'Importing... 60%'
      const data = JSON.parse(text) as ExportData

      if (!this.validate(data)) return null
      this.importProgress = 1; this._importProgressStr = 'Importing... 100%'
      return data
    } catch {
      return null
    } finally {
      setTimeout(() => { this.importing = false }, 500)
    }
  }

  /** Export a screenshot of the canvas as PNG */
  exportScreenshot(canvas: HTMLCanvasElement, filename?: string): void {
    const name = filename ?? `worldbox-screenshot-${Date.now()}.png`
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }

  /** Render import progress overlay when active */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.importing) return

    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, screenW, screenH)

    const barW = 300, barH = 24
    const x = (screenW - barW) / 2, y = (screenH - barH) / 2

    ctx.fillStyle = '#333'
    ctx.fillRect(x, y, barW, barH)
    ctx.fillStyle = '#4a4'
    ctx.fillRect(x, y, barW * this.importProgress, barH)

    ctx.fillStyle = '#fff'
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(
      this._importProgressStr,
      screenW / 2, y + barH + 20
    )
  }

  /** Validate imported data structure and version compatibility */
  private validate(data: any): data is ExportData {
    if (!data || typeof data !== 'object') return false
    if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) return false
    if (!Array.isArray(data.tiles) || !Array.isArray(data.entities)) return false
    if (typeof data.worldWidth !== 'number' || typeof data.worldHeight !== 'number') return false
    if (typeof data.tick !== 'number') return false
    return true
  }
}
