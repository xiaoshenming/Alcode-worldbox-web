// World Event Definitions - types, helpers, and event data
// Separated from WorldEventSystem.ts for maintainability

import { EntityManager, PositionComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { CivManager } from '../civilization/CivManager'
import { Civilization, BuildingType, BuildingComponent } from '../civilization/Civilization'
import { ParticleSystem } from './ParticleSystem'
import { TimelineSystem } from './TimelineSystem'
import { EventLog } from './EventLog'
// --- Types ---

export interface EventContext {
  em: EntityManager
  world: World
  civManager: CivManager
  particles: ParticleSystem
  timeline: TimelineSystem
  tick: number
}

export interface WorldEventDef {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic'
  duration: number
  cooldown: number
  effect: (ctx: EventContext) => void
  onEnd?: (ctx: EventContext) => void
}

export interface ActiveEvent {
  def: WorldEventDef
  startTick: number
  remainingTicks: number
  data: Record<string, unknown>  // per-instance state
}

export interface EventBanner {
  text: string
  icon: string
  rarity: 'common' | 'rare' | 'epic'
  startTime: number  // performance.now()
  duration: number   // ms to display
}

// --- Rarity weights ---
export const RARITY_WEIGHTS: Record<string, number> = {
  common: 50,
  rare: 30,
  epic: 20,
}

export const RARITY_COLORS: Record<string, string> = {
  common: '#88ccff',
  rare: '#ffaa00',
  epic: '#ff44ff',
}

// --- Helper: pick random civ ---
export function randomCiv(civManager: CivManager): Civilization | null {
  const civs = Array.from(civManager.civilizations.values())
  if (civs.length === 0) return null
  return civs[Math.floor(Math.random() * civs.length)]
}

export function weakestCiv(civManager: CivManager): Civilization | null {
  const civs = Array.from(civManager.civilizations.values())
  if (civs.length === 0) return null
  let weakest = civs[0]
  for (const c of civs) {
    const score = c.population + c.techLevel * 10 + c.resources.gold
    const wScore = weakest.population + weakest.techLevel * 10 + weakest.resources.gold
    if (score < wScore) weakest = c
  }
  return weakest
}


// --- Event Definitions ---

export const EVENT_DEFINITIONS: WorldEventDef[] = [
  // 1. Golden Age (rare)
  {
    id: 'golden_age',
    name: 'Golden Age',
    description: 'A civilization enters a golden age of prosperity',
    icon: '\u2728',
    rarity: 'rare',
    duration: 3000,
    cooldown: 8000,
    effect: (ctx) => {
      const civ = randomCiv(ctx.civManager)
      if (!civ) return
      // Store target civ id for ongoing effect
      ;(ctx as unknown as { _eventData: Record<string, unknown> })._eventData = { civId: civ.id }
      // Immediate happiness boost
      civ.happiness = Math.min(100, civ.happiness + 20)
      // Immediate resource bonus
      civ.resources.food *= 1.5
      civ.resources.wood *= 1.5
      civ.resources.stone *= 1.5
      civ.resources.gold *= 1.5
      EventLog.log('world_event', `${civ.name} enters a Golden Age! Prosperity flows!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'achievement', `${civ.name} entered a Golden Age`)
    },
    onEnd: (ctx) => {
      // Golden age fades naturally - no cleanup needed
    }
  },

  // 2. Meteor Shower (epic)
  {
    id: 'meteor_shower',
    name: 'Meteor Shower',
    description: 'Fiery meteors rain from the sky, scorching the land',
    icon: '\u2604\uFE0F',
    rarity: 'epic',
    duration: 500,
    cooldown: 12000,
    effect: (ctx) => {
      const meteorCount = 8 + Math.floor(Math.random() * 8)
      for (let i = 0; i < meteorCount; i++) {
        const mx = Math.floor(Math.random() * WORLD_WIDTH)
        const my = Math.floor(Math.random() * WORLD_HEIGHT)
        const tile = ctx.world.getTile(mx, my)
        if (tile !== null && tile !== TileType.DEEP_WATER) {
          // Convert to lava
          ctx.world.setTile(mx, my, TileType.LAVA)
          // Damage nearby in 2-tile radius
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              if (dx * dx + dy * dy <= 4) {
                const nx = mx + dx, ny = my + dy
                if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
                  const t = ctx.world.getTile(nx, ny)
                  if (t !== null && t !== TileType.DEEP_WATER && t !== TileType.SHALLOW_WATER && Math.random() < 0.4) {
                    ctx.world.setTile(nx, ny, TileType.LAVA)
                  }
                }
              }
            }
          }
          // Fire particles
          ctx.particles.spawnExplosion(mx, my)
          ctx.particles.spawn(mx, my, 10, '#ff4400', 3)
        }
        // Damage creatures nearby
        const creatures = ctx.em.getEntitiesWithComponents('position', 'needs')
        for (const eid of creatures) {
          const pos = ctx.em.getComponent<PositionComponent>(eid, 'position')
          const needs = ctx.em.getComponent<NeedsComponent>(eid, 'needs')
          if (!pos || !needs) continue
          const dist = Math.abs(pos.x - mx) + Math.abs(pos.y - my)
          if (dist < 4) {
            needs.health -= 30 + Math.random() * 20
          }
        }
      }
      ctx.world.markFullDirty()
      EventLog.log('world_event', `Meteor Shower! ${meteorCount} meteors strike the world!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'disaster', `A devastating meteor shower struck the world`)
    }
  },

  // 3. Great Flood (rare)
  {
    id: 'great_flood',
    name: 'Great Flood',
    description: 'Rising waters swallow the coastlines',
    icon: '\u{1F30A}',
    rarity: 'rare',
    duration: 1000,
    cooldown: 10000,
    effect: (ctx) => {
      let tilesFlooded = 0
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
          const tile = ctx.world.getTile(x, y)
          if (tile !== TileType.SAND && tile !== TileType.GRASS) continue
          // Check if adjacent to water
          let nearWater = false
          const dirs = [[0,1],[0,-1],[1,0],[-1,0]]
          for (const [dx, dy] of dirs) {
            const t = ctx.world.getTile(x + dx, y + dy)
            if (t === TileType.SHALLOW_WATER || t === TileType.DEEP_WATER) {
              nearWater = true
              break
            }
          }
          if (nearWater && Math.random() < 0.3) {
            ctx.world.setTile(x, y, TileType.SHALLOW_WATER)
            tilesFlooded++
            if (Math.random() < 0.1) {
              ctx.particles.spawn(x, y, 3, '#4488ff', 1)
            }
          }
        }
      }
      ctx.world.markFullDirty()
      EventLog.log('world_event', `Great Flood! ${tilesFlooded} tiles swallowed by rising waters!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'disaster', `A great flood consumed ${tilesFlooded} tiles of coastline`)
    }
  },

  // 4. Blood Moon (common)
  {
    id: 'blood_moon',
    name: 'Blood Moon',
    description: 'Hostile creatures grow frenzied under the crimson sky',
    icon: '\u{1F311}',
    rarity: 'common',
    duration: 2000,
    cooldown: 5000,
    effect: (ctx) => {
      // Buff all hostile creatures
      const creatures = ctx.em.getEntitiesWithComponents('creature')
      const buffed: number[] = []
      for (const eid of creatures) {
        const c = ctx.em.getComponent<CreatureComponent>(eid, 'creature')
        if (!c) continue
        if (c.isHostile) {
          // Store original values for restoration
          buffed.push(eid)
        }
      }
      ;(ctx as unknown as { _eventData: Record<string, unknown> })._eventData = { buffedIds: buffed }
      EventLog.log('world_event', `Blood Moon rises! Hostile creatures grow frenzied!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'disaster', `A Blood Moon turned hostile creatures into a frenzy`)
    },
    onEnd: (ctx) => {
      EventLog.log('world_event', `The Blood Moon fades... creatures calm down.`, ctx.tick)
    }
  },

  // 5. Wandering Merchant (common)
  {
    id: 'wandering_merchant',
    name: 'Wandering Merchant',
    description: 'A mysterious trader brings gifts to civilizations',
    icon: '\u{1F9D9}',
    rarity: 'common',
    duration: 2000,
    cooldown: 4000,
    effect: (ctx) => {
      // Give resources to all civs
      let count = 0
      for (const [, civ] of ctx.civManager.civilizations) {
        const goldGift = 10 + Math.floor(Math.random() * 20)
        const foodGift = 15 + Math.floor(Math.random() * 15)
        civ.resources.gold += goldGift
        civ.resources.food += foodGift
        civ.happiness = Math.min(100, civ.happiness + 5)
        count++
      }
      EventLog.log('world_event', `A Wandering Merchant visits ${count} civilizations, bearing gifts!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'achievement', `A mysterious merchant visited ${count} civilizations`)
    }
  },

  // 6. Eclipse (rare)
  {
    id: 'eclipse',
    name: 'Eclipse',
    description: 'Darkness falls as the sun is blotted out',
    icon: '\u{1F311}',
    rarity: 'rare',
    duration: 1500,
    cooldown: 9000,
    effect: (ctx) => {
      // Boost faith for all civs
      for (const [, civ] of ctx.civManager.civilizations) {
        civ.religion.faith = Math.min(100, civ.religion.faith + 15)
      }
      EventLog.log('world_event', `An Eclipse darkens the sky! Faith surges across the world!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'disaster', `A total eclipse plunged the world into darkness`)
    },
    onEnd: (ctx) => {
      EventLog.log('world_event', `The Eclipse ends. Light returns to the world.`, ctx.tick)
    }
  },

  // 7. Bountiful Harvest (common)
  {
    id: 'bountiful_harvest',
    name: 'Bountiful Harvest',
    description: 'The land overflows with abundance',
    icon: '\u{1F33E}',
    rarity: 'common',
    duration: 100,
    cooldown: 4000,
    effect: (ctx) => {
      for (const [, civ] of ctx.civManager.civilizations) {
        // Count farms
        let farmCount = 0
        for (const bid of civ.buildings) {
          const b = ctx.em.getComponent<BuildingComponent>(bid, 'building')
          if (b && b.buildingType === BuildingType.FARM) farmCount++
        }
        const bonus = 20 + farmCount * 10
        civ.resources.food += bonus
        civ.happiness = Math.min(100, civ.happiness + 10)
      }
      EventLog.log('world_event', `Bountiful Harvest! All civilizations receive bonus food!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'achievement', `A bountiful harvest blessed all civilizations`)
    }
  },

  // 8. Earthquake (rare)
  {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'The ground shakes violently, reshaping the terrain',
    icon: '\u{1F30B}',
    rarity: 'rare',
    duration: 200,
    cooldown: 8000,
    effect: (ctx) => {
      // Pick a random epicenter
      const cx = 20 + Math.floor(Math.random() * (WORLD_WIDTH - 40))
      const cy = 20 + Math.floor(Math.random() * (WORLD_HEIGHT - 40))
      const radius = 10 + Math.floor(Math.random() * 10)
      let tilesChanged = 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue
          const x = cx + dx, y = cy + dy
          if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) continue
          const tile = ctx.world.getTile(x, y)
          if (tile === null) continue

          // Mountains may collapse to grass
          if (tile === TileType.MOUNTAIN && Math.random() < 0.3) {
            ctx.world.setTile(x, y, TileType.GRASS)
            tilesChanged++
          }
          // Some tiles get shuffled
          else if (Math.random() < 0.1 && tile !== TileType.DEEP_WATER) {
            const options = [TileType.GRASS, TileType.SAND, TileType.MOUNTAIN]
            ctx.world.setTile(x, y, options[Math.floor(Math.random() * options.length)])
            tilesChanged++
          }

          // Particles at epicenter area
          if (Math.random() < 0.05) {
            ctx.particles.spawn(x, y, 3, '#8B7355', 2)
          }
        }
      }

      // Damage buildings in the area
      const buildings = ctx.em.getEntitiesWithComponents('position', 'building')
      for (const bid of buildings) {
        const pos = ctx.em.getComponent<PositionComponent>(bid, 'position')
        const b = ctx.em.getComponent<BuildingComponent>(bid, 'building')
        if (!pos || !b) continue
        const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2)
        if (dist < radius) {
          const dmg = Math.floor(30 + Math.random() * 40)
          b.health = Math.max(0, b.health - dmg)
        }
      }

      ctx.world.markFullDirty()
      EventLog.log('world_event', `Earthquake at (${cx},${cy})! ${tilesChanged} tiles reshaped!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'disaster', `A massive earthquake struck near (${cx},${cy}), reshaping ${tilesChanged} tiles`)
    }
  },

  // 9. Prophecy of Doom (epic)
  {
    id: 'prophecy_of_doom',
    name: 'Prophecy of Doom',
    description: 'A dark prophecy foretells destruction for the unprepared',
    icon: '\u{1F480}',
    rarity: 'epic',
    duration: 3000,
    cooldown: 15000,
    effect: (ctx) => {
      EventLog.log('world_event', `PROPHECY OF DOOM: Civilizations must reach tech level 3 in 3000 ticks or face devastation!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'disaster', `A dark prophecy warned of doom for the technologically weak`)
    },
    onEnd: (ctx) => {
      // Punish civs that didn't reach tech level 3
      for (const [, civ] of ctx.civManager.civilizations) {
        if (civ.techLevel < 3) {
          const lost = Math.floor(civ.population * 0.5)
          // Remove half the population by removing civMember components
          const members = ctx.em.getEntitiesWithComponent('civMember')
          let removed = 0
          for (const eid of members) {
            if (removed >= lost) break
            const m = ctx.em.getComponent(eid, 'civMember') as { civId: number } | undefined
            if (m && m.civId === civ.id) {
              ctx.em.removeComponent(eid, 'civMember')
              civ.population = Math.max(0, civ.population - 1)
              removed++
            }
          }
          civ.happiness = Math.max(0, civ.happiness - 30)
          EventLog.log('world_event', `The Prophecy strikes ${civ.name}! ${removed} souls lost!`, ctx.tick)
          ctx.timeline.recordEvent(ctx.tick, 'collapse', `${civ.name} suffered the Prophecy of Doom, losing ${removed} citizens`)
        } else {
          EventLog.log('world_event', `${civ.name} survived the Prophecy through technological advancement!`, ctx.tick)
        }
      }
    }
  },

  // 10. Divine Intervention (epic)
  {
    id: 'divine_intervention',
    name: 'Divine Intervention',
    description: 'The gods favor the weakest civilization with a miraculous blessing',
    icon: '\u{1F31F}',
    rarity: 'epic',
    duration: 100,
    cooldown: 12000,
    effect: (ctx) => {
      const civ = weakestCiv(ctx.civManager)
      if (!civ) return

      // Full resources
      civ.resources.food = Math.max(civ.resources.food, 200)
      civ.resources.wood = Math.max(civ.resources.wood, 150)
      civ.resources.stone = Math.max(civ.resources.stone, 100)
      civ.resources.gold = Math.max(civ.resources.gold, 80)

      // Happiness boost
      civ.happiness = Math.min(100, civ.happiness + 30)

      // Tech level boost
      if (civ.techLevel < 5) civ.techLevel++

      // Place a free castle if they don't have one
      const hasCastle = civ.buildings.some(bid => {
        const b = ctx.em.getComponent<BuildingComponent>(bid, 'building')
        return b && b.buildingType === BuildingType.CASTLE
      })
      if (!hasCastle) {
        const terr = Array.from(civ.territory)
        if (terr.length > 0) {
          const key = terr[Math.floor(Math.random() * terr.length)]
          const [bx, by] = key.split(',').map(Number)
          const tile = ctx.world.getTile(bx, by)
          if (tile !== null && tile !== TileType.DEEP_WATER && tile !== TileType.SHALLOW_WATER && tile !== TileType.LAVA) {
            ctx.civManager.placeBuilding(civ.id, BuildingType.CASTLE, bx, by)
          }
        }
      }

      // Spawn golden particles at a territory center
      const terr = Array.from(civ.territory)
      if (terr.length > 0) {
        const mid = terr[Math.floor(terr.length / 2)]
        const [px, py] = mid.split(',').map(Number)
        ctx.particles.spawn(px, py, 20, '#ffd700', 3)
        ctx.particles.spawn(px, py, 15, '#ffffff', 2)
      }

      EventLog.log('world_event', `Divine Intervention! The gods bless ${civ.name} with miraculous aid!`, ctx.tick)
      ctx.timeline.recordEvent(ctx.tick, 'achievement', `Divine Intervention blessed ${civ.name} with resources, technology, and a castle`)
    }
  },
]
