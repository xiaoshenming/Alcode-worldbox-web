/** NavalCombatSystem - ship battles, boarding, and naval warfare */
import { EntityManager, EntityId, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type ShipType = 'warship' | 'galley' | 'longship' | 'flagship'
export type NavalBattleState = 'approaching' | 'broadside' | 'boarding' | 'retreating'

export interface ShipComponent {
  type: 'ship'
  shipType: ShipType
  hull: number       // 0-100
  maxHull: number
  crew: EntityId[]
  cannons: number
  speed: number
  civId: number
}

export interface NavalBattle {
  id: number
  ships: Map<number, ShipComponent[]>  // civId -> ships
  state: NavalBattleState
  centerX: number
  centerY: number
  startTick: number
  lastTick: number
}

const CANNON_DAMAGE = 8
const BOARDING_RANGE = 2
const BROADSIDE_RANGE = 6
const RETREAT_HULL_PCT = 0.2
const BATTLE_EXPIRE = 200

export class NavalCombatSystem {
  private ships: Map<EntityId, ShipComponent> = new Map()
  private battles: Map<number, NavalBattle> = new Map()
  private nextBattleId = 1
  private battleLog: string[] = []
  private _shipBuf: [EntityId, ShipComponent][] = []

  /** Register a ship entity */
  registerShip(entityId: EntityId, ship: ShipComponent): void {
    this.ships.set(entityId, ship)
  }

  /** Remove a ship (sunk or docked) */
  removeShip(entityId: EntityId): void {
    this.ships.delete(entityId)
  }

  update(tick: number, em: EntityManager, civManager: CivManager): void {
    // Expire old battles
    for (const [id, battle] of this.battles) {
      if (tick - battle.lastTick > BATTLE_EXPIRE) {
        this.battles.delete(id)
      }
    }

    if (tick % 5 !== 0) return

    // Detect naval encounters - ships from different civs near water
    const shipEntities = this._shipBuf
    shipEntities.length = 0
    for (const e of this.ships.entries()) shipEntities.push(e)
    if (shipEntities.length < 2) return

    // Group ships by proximity
    for (let i = 0; i < shipEntities.length; i++) {
      const [idA, shipA] = shipEntities[i]
      const posA = em.getComponent<PositionComponent>(idA, 'position')
      if (!posA) continue

      for (let j = i + 1; j < shipEntities.length; j++) {
        const [idB, shipB] = shipEntities[j]
        if (shipA.civId === shipB.civId) continue

        const posB = em.getComponent<PositionComponent>(idB, 'position')
        if (!posB) continue

        const dx = posA.x - posB.x
        const dy = posA.y - posB.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < BROADSIDE_RANGE) {
          this.engageBattle(tick, idA, shipA, posA, idB, shipB, posB, dist, civManager)
        }
      }
    }

    // Update active battles
    for (const battle of this.battles.values()) {
      this.updateBattle(tick, battle, em)
    }
  }

  private engageBattle(
    tick: number,
    idA: EntityId, shipA: ShipComponent, posA: PositionComponent,
    idB: EntityId, shipB: ShipComponent, posB: PositionComponent,
    dist: number, civManager: CivManager
  ): void {
    // Check if already in a battle
    for (const battle of this.battles.values()) {
      if (battle.ships.has(shipA.civId) || battle.ships.has(shipB.civId)) return
    }

    const state: NavalBattleState = dist < BOARDING_RANGE ? 'boarding' : 'broadside'

    const battle: NavalBattle = {
      id: this.nextBattleId++,
      ships: new Map([
        [shipA.civId, [shipA]],
        [shipB.civId, [shipB]],
      ]),
      state,
      centerX: (posA.x + posB.x) / 2,
      centerY: (posA.y + posB.y) / 2,
      startTick: tick,
      lastTick: tick,
    }
    this.battles.set(battle.id, battle)

    const civA = civManager.civilizations.get(shipA.civId)
    const civB = civManager.civilizations.get(shipB.civId)
    this.battleLog.push(
      `Naval battle: ${civA?.name ?? 'Unknown'} ${shipA.shipType} vs ${civB?.name ?? 'Unknown'} ${shipB.shipType}`
    )
    if (this.battleLog.length > 30) this.battleLog.shift()
  }

  private updateBattle(tick: number, battle: NavalBattle, em: EntityManager): void {
    battle.lastTick = tick
    const allShips: ShipComponent[] = []
    for (const ships of battle.ships.values()) allShips.push(...ships)

    // Broadside phase - exchange cannon fire
    if (battle.state === 'broadside') {
      for (const ships of battle.ships.values()) {
        for (const ship of ships) {
          // Fire at enemy ships
          for (const [civId, enemyShips] of battle.ships) {
            if (civId === ship.civId) continue
            for (const enemy of enemyShips) {
              const dmg = ship.cannons * CANNON_DAMAGE * (0.5 + Math.random() * 0.5)
              enemy.hull = Math.max(0, enemy.hull - dmg / 10)
            }
          }
        }
      }

      // Check if any ship is close enough for boarding
      if (tick - battle.startTick > 30) {
        battle.state = 'boarding'
      }
    }

    // Boarding phase - crew fights crew
    if (battle.state === 'boarding') {
      for (const ships of battle.ships.values()) {
        for (const ship of ships) {
          // Crew takes damage during boarding
          for (const crewId of ship.crew) {
            const needs = em.getComponent<NeedsComponent>(crewId, 'needs')
            if (needs && needs.health > 0) {
              needs.health -= 2 + Math.random() * 3
            }
          }
          // Hull degrades during boarding
          ship.hull = Math.max(0, ship.hull - 1)
        }
      }
    }

    // Check for retreats or sinking
    for (const [civId, ships] of battle.ships) {
      for (let i = ships.length - 1; i >= 0; i--) {
        const ship = ships[i]
        if (ship.hull <= 0) {
          ships.splice(i, 1)
          this.battleLog.push(`A ${ship.shipType} has sunk!`)
        } else if (ship.hull / ship.maxHull < RETREAT_HULL_PCT) {
          battle.state = 'retreating'
        }
      }
      if (ships.length === 0) battle.ships.delete(civId)
    }

    // Battle ends when only one side remains
    if (battle.ships.size <= 1) {
      this.battles.delete(battle.id)
    }
  }

  /** Render naval battle effects */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    for (const battle of this.battles.values()) {
      const sx = (battle.centerX - camX) * zoom
      const sy = (battle.centerY - camY) * zoom

      // Draw battle indicator
      ctx.save()
      ctx.globalAlpha = 0.6

      if (battle.state === 'broadside') {
        // Cannon smoke puffs
        ctx.fillStyle = '#aaa'
        for (let i = 0; i < 5; i++) {
          const ox = (Math.random() - 0.5) * 40
          const oy = (Math.random() - 0.5) * 40
          ctx.beginPath()
          ctx.arc(sx + ox, sy + oy, 3 + Math.random() * 4, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (battle.state === 'boarding') {
        // Crossed swords icon
        ctx.strokeStyle = '#ff4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(sx - 8, sy - 8)
        ctx.lineTo(sx + 8, sy + 8)
        ctx.moveTo(sx + 8, sy - 8)
        ctx.lineTo(sx - 8, sy + 8)
        ctx.stroke()
      }

      ctx.restore()
    }
  }

  getActiveBattles(): NavalBattle[] {
    return [...this.battles.values()]
  }

  getBattleLog(): string[] {
    return this.battleLog
  }

  getShipCount(): number {
    return this.ships.size
  }
}
