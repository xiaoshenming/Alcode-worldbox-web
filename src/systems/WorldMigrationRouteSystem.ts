// World Migration Route System (v2.50) - Established migration routes
// Animals and nomadic groups follow seasonal migration paths
// Routes affect ecosystem balance and trade opportunities

export interface MigrationRoute {
  id: number
  waypoints: { x: number; y: number }[]
  type: 'animal' | 'nomadic'
  species: string
  active: boolean
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  travelerCount: number
}

const ROUTE_INTERVAL = 3000
const UPDATE_INTERVAL = 500
const MAX_ROUTES = 12

const ANIMAL_SPECIES = ['deer', 'bison', 'elk', 'geese', 'salmon', 'caribou']
const NOMAD_GROUPS = ['wanderers', 'merchants', 'pilgrims', 'herders']
const SEASONS: MigrationRoute['season'][] = ['spring', 'summer', 'autumn', 'winter']

let nextRouteId = 1

export class WorldMigrationRouteSystem {
  private routes: MigrationRoute[] = []
  private lastRoute = 0
  private lastUpdate = 0
  private worldWidth = 200
  private worldHeight = 200

  setWorldSize(w: number, h: number): void {
    this.worldWidth = w
    this.worldHeight = h
  }

  update(dt: number, tick: number, currentSeason?: number): void {
    if (tick - this.lastRoute >= ROUTE_INTERVAL) {
      this.lastRoute = tick
      this.createRoute()
    }
    if (tick - this.lastUpdate >= UPDATE_INTERVAL) {
      this.lastUpdate = tick
      this.updateRoutes(currentSeason)
    }
  }

  private createRoute(): void {
    if (this.routes.length >= MAX_ROUTES) return
    if (Math.random() > 0.4) return
    const isAnimal = Math.random() < 0.7
    const waypointCount = 3 + Math.floor(Math.random() * 4)
    const waypoints: { x: number; y: number }[] = []
    // Generate a path across the map
    let x = Math.floor(Math.random() * this.worldWidth)
    let y = Math.floor(Math.random() * this.worldHeight)
    for (let i = 0; i < waypointCount; i++) {
      waypoints.push({ x, y })
      x = Math.max(5, Math.min(this.worldWidth - 5, x + Math.floor((Math.random() - 0.5) * 60)))
      y = Math.max(5, Math.min(this.worldHeight - 5, y + Math.floor((Math.random() - 0.5) * 60)))
    }
    this.routes.push({
      id: nextRouteId++,
      waypoints,
      type: isAnimal ? 'animal' : 'nomadic',
      species: isAnimal
        ? ANIMAL_SPECIES[Math.floor(Math.random() * ANIMAL_SPECIES.length)]
        : NOMAD_GROUPS[Math.floor(Math.random() * NOMAD_GROUPS.length)],
      active: true,
      season: SEASONS[Math.floor(Math.random() * SEASONS.length)],
      travelerCount: 5 + Math.floor(Math.random() * 20),
    })
  }

  private updateRoutes(currentSeason?: number): void {
    const seasonName = currentSeason !== undefined ? SEASONS[currentSeason % 4] : undefined
    for (const route of this.routes) {
      // Activate/deactivate based on season
      if (seasonName) {
        route.active = route.season === seasonName
      }
      // Traveler count fluctuates
      if (route.active && Math.random() < 0.2) {
        route.travelerCount = Math.max(1, route.travelerCount + Math.floor((Math.random() - 0.5) * 5))
      }
    }
  }

  getRoutes(): MigrationRoute[] {
    return this.routes
  }

  private _activeRoutesBuf: MigrationRoute[] = []
  getActiveRoutes(): MigrationRoute[] {
    this._activeRoutesBuf.length = 0
    for (const r of this.routes) { if (r.active) this._activeRoutesBuf.push(r) }
    return this._activeRoutesBuf
  }

  getRouteCount(): number {
    return this.routes.length
  }
}
