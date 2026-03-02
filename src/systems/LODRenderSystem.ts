/** LODRenderSystem - zoom-dependent detail levels for entities and terrain */
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

  setThresholds(t: Partial<LODThresholds>): void {
    Object.assign(this.thresholds, t)
  }
}
