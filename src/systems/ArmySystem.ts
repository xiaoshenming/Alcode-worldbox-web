import { CivManager } from '../civilization/CivManager'
import { BuildingType, BuildingComponent, CivMemberComponent } from '../civilization/Civilization'
import { EntityManager, EntityId, PositionComponent, NeedsComponent, CreatureComponent } from '../ecs/Entity'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'

export interface Army {
  civId: number
  soldiers: EntityId[]
  state: 'idle' | 'marching' | 'sieging' | 'defending'
  targetX: number
  targetY: number
  targetCivId: number
  morale: number
}

const RECRUIT_INTERVAL = 300
const WAR_CHECK_INTERVAL = 600
const MARCH_SPEED = 0.05
const SIEGE_RANGE = 3
const SIEGE_TICK_INTERVAL = 30
const WALL_DAMAGE_REDUCTION = 0.3
const CASTLE_DEFENSE_BONUS = 0.2
const TOWER_DAMAGE = 10
const MAX_SOLDIER_RATIO = 0.3

export class ArmySystem {
  private armies: Map<number, Army> = new Map()
  private _buildingsToRemoveBuf: number[] = []
  // Reusable buffer for cleanupAndCheckEnd (every tick)
  private _civsToRemoveBuf: number[] = []

  getArmies(): Map<number, Army> {
    return this.armies
  }

  update(em: EntityManager, civManager: CivManager, world: World, particles: ParticleSystem, tick: number): void {
    // Recruit soldiers every RECRUIT_INTERVAL ticks
    if (tick % RECRUIT_INTERVAL === 0) {
      this.recruitSoldiers(em, civManager)
    }

    // Check for war initiation every WAR_CHECK_INTERVAL ticks
    if (tick % WAR_CHECK_INTERVAL === 0) {
      this.checkWarInitiation(em, civManager)
    }

    // Update marching armies
    this.updateMarching(em)

    // Update sieging armies
    if (tick % SIEGE_TICK_INTERVAL === 0) {
      this.updateSiege(em, civManager, particles, tick)
    }

    // Clean up dead soldiers and check war end conditions
    this.cleanupAndCheckEnd(em, civManager, particles, tick)
  }

  private recruitSoldiers(em: EntityManager, civManager: CivManager): void {
    for (const [civId, civ] of civManager.civilizations) {
      // Need barracks to recruit
      const hasBarracks = civ.buildings.some(id => {
        const b = em.getComponent<BuildingComponent>(id, 'building')
        return b && b.buildingType === BuildingType.BARRACKS
      })
      if (!hasBarracks) continue

      // Count current soldiers
      const members = em.getEntitiesWithComponent('civMember')
      let workerCount = 0
      let soldierCount = 0
      for (const id of members) {
        const m = em.getComponent<CivMemberComponent>(id, 'civMember')
        if (!m || m.civId !== civId) continue
        if (m.role === 'worker') workerCount++
        else if (m.role === 'soldier') soldierCount++
      }

      const totalPop = workerCount + soldierCount
      if (totalPop === 0) continue
      const maxSoldiers = Math.floor(totalPop * MAX_SOLDIER_RATIO)
      if (soldierCount >= maxSoldiers) continue

      // Convert some workers to soldiers
      const toRecruit = Math.min(maxSoldiers - soldierCount, Math.ceil(workerCount * 0.1))
      let recruited = 0
      for (const id of members) {
        if (recruited >= toRecruit) break
        const m = em.getComponent<CivMemberComponent>(id, 'civMember')
        if (!m || m.civId !== civId || m.role !== 'worker') continue
        m.role = 'soldier'
        // Boost soldier damage
        const creature = em.getComponent<CreatureComponent>(id, 'creature')
        if (creature) creature.damage += 5
        recruited++
      }
    }
  }

  private checkWarInitiation(em: EntityManager, civManager: CivManager): void {
    for (const [civId, civ] of civManager.civilizations) {
      // Skip if already has an active army attacking
      const existing = this.armies.get(civId)
      if (existing && existing.state !== 'idle') continue

      for (const [otherId, relation] of civ.relations) {
        if (relation >= -50) continue
        const prob = Math.abs(relation) / 500
        if (Math.random() > prob) continue

        const otherCiv = civManager.civilizations.get(otherId)
        if (!otherCiv || otherCiv.buildings.length === 0) continue

        // Find nearest enemy building
        const target = this.findNearestEnemyBuilding(em, civ.buildings, otherCiv.buildings)
        if (!target) continue

        // Assemble army from soldiers
        const soldiers = this.gatherSoldiers(em, civId)
        if (soldiers.length < 2) continue

        this.armies.set(civId, {
          civId,
          soldiers,
          state: 'marching',
          targetX: target.x,
          targetY: target.y,
          targetCivId: otherId,
          morale: 80
        })

        EventLog.log('war', `${civ.name} sends ${soldiers.length} soldiers to attack ${otherCiv.name}!`, 0)

        // Trigger defense
        this.raiseDefense(em, civManager, otherId, target.x, target.y)
        break // one war at a time per civ
      }
    }
  }

  private findNearestEnemyBuilding(
    em: EntityManager,
    ownBuildings: EntityId[],
    enemyBuildings: EntityId[]
  ): { x: number; y: number } | null {
    // Use centroid of own buildings as origin
    let ox = 0, oy = 0, count = 0
    for (const id of ownBuildings) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (pos) { ox += pos.x; oy += pos.y; count++ }
    }
    if (count === 0) return null
    ox /= count; oy /= count

    let best: { x: number; y: number } | null = null
    let bestDist = Infinity
    for (const id of enemyBuildings) {
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const d = (pos.x - ox) ** 2 + (pos.y - oy) ** 2
      if (d < bestDist) { bestDist = d; best = { x: pos.x, y: pos.y } }
    }
    return best
  }

  private gatherSoldiers(em: EntityManager, civId: number): EntityId[] {
    const soldiers: EntityId[] = []
    const members = em.getEntitiesWithComponent('civMember')
    for (const id of members) {
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (m && m.civId === civId && m.role === 'soldier') {
        soldiers.push(id)
      }
    }
    return soldiers
  }

  private raiseDefense(em: EntityManager, civManager: CivManager, defCivId: number, threatX: number, threatY: number): void {
    const existing = this.armies.get(defCivId)
    if (existing && existing.state !== 'idle') return

    const soldiers = this.gatherSoldiers(em, defCivId)
    if (soldiers.length === 0) return

    const defCiv = civManager.civilizations.get(defCivId)

    this.armies.set(defCivId, {
      civId: defCivId,
      soldiers,
      state: 'defending',
      targetX: threatX,
      targetY: threatY,
      targetCivId: 0, // defending, no attack target civ
      morale: 90
    })

    if (defCiv) {
      EventLog.log('war', `${defCiv.name} rallies ${soldiers.length} defenders!`, 0)
    }
  }

  private updateMarching(em: EntityManager): void {
    for (const [, army] of this.armies) {
      if (army.state !== 'marching' && army.state !== 'defending') continue

      let arrived = 0
      for (const id of army.soldiers) {
        const pos = em.getComponent<PositionComponent>(id, 'position')
        if (!pos) continue
        const dx = army.targetX - pos.x
        const dy = army.targetY - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < SIEGE_RANGE) {
          arrived++
          continue
        }
        // Move toward target
        const nx = dx / dist
        const ny = dy / dist
        pos.x += nx * MARCH_SPEED
        pos.y += ny * MARCH_SPEED
      }

      // If majority arrived and army is attacking, switch to sieging
      if (army.state === 'marching' && arrived > army.soldiers.length * 0.5) {
        army.state = 'sieging'
      }
    }
  }

  private updateSiege(em: EntityManager, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    for (const [, army] of this.armies) {
      if (army.state !== 'sieging') continue

      const targetCiv = civManager.civilizations.get(army.targetCivId)
      if (!targetCiv) { army.state = 'idle'; continue }

      // Check for CASTLE defense bonus
      const hasCastle = targetCiv.buildings.some(id => {
        const b = em.getComponent<BuildingComponent>(id, 'building')
        return b && b.buildingType === BuildingType.CASTLE
      })
      const defenseMultiplier = hasCastle ? (1 - CASTLE_DEFENSE_BONUS) : 1

      // Attack buildings in range
      let baseDamage = army.soldiers.length * 2
      baseDamage *= defenseMultiplier

      const buildingsToRemove = this._buildingsToRemoveBuf
      buildingsToRemove.length = 0
      for (let i = 0; i < targetCiv.buildings.length; i++) {
        const bId = targetCiv.buildings[i]
        const bPos = em.getComponent<PositionComponent>(bId, 'position')
        const bComp = em.getComponent<BuildingComponent>(bId, 'building')
        if (!bPos || !bComp) continue

        const dx = bPos.x - army.targetX
        const dy = bPos.y - army.targetY
        if (dx * dx + dy * dy > SIEGE_RANGE * SIEGE_RANGE) continue

        // WALL reduces damage by 30%
        let dmg = baseDamage
        if (bComp.buildingType === BuildingType.WALL) {
          dmg *= (1 - WALL_DAMAGE_REDUCTION)
        }

        bComp.health -= dmg
        if (bComp.health <= 0) {
          buildingsToRemove.push(i)
          particles.spawnExplosion(bPos.x, bPos.y)
          EventLog.log('war', `${targetCiv.name}'s ${bComp.buildingType} destroyed!`, tick)
        }

        // TOWER counter-attack
        if (bComp.buildingType === BuildingType.TOWER && bComp.health > 0 && army.soldiers.length > 0) {
          const victimIdx = Math.floor(Math.random() * army.soldiers.length)
          const victimId = army.soldiers[victimIdx]
          const needs = em.getComponent<NeedsComponent>(victimId, 'needs')
          if (needs) {
            needs.health -= TOWER_DAMAGE
          }
        }
      }

      // Remove destroyed buildings (reverse order to preserve indices)
      for (let i = buildingsToRemove.length - 1; i >= 0; i--) {
        const idx = buildingsToRemove[i]
        const bId = targetCiv.buildings[idx]
        em.removeEntity(bId)
        targetCiv.buildings.splice(idx, 1)
      }

      // Morale decay while sieging
      army.morale -= 0.5
    }
  }

  private cleanupAndCheckEnd(em: EntityManager, civManager: CivManager, particles: ParticleSystem, tick: number): void {
    const toRemove = this._civsToRemoveBuf
    toRemove.length = 0

    for (const [civId, army] of this.armies) {
      if (army.state === 'idle') continue

      // Remove dead soldiers
      for (let i = army.soldiers.length - 1; i >= 0; i--) {
        const needs = em.getComponent<NeedsComponent>(army.soldiers[i], 'needs')
        if (!needs || needs.health <= 0) {
          army.morale -= 2
          army.soldiers.splice(i, 1)
        }
      }

      const civ = civManager.civilizations.get(civId)
      const civName = civ?.name ?? `Civ#${civId}`

      // All soldiers dead -> defeat
      if (army.soldiers.length === 0) {
        if (army.state === 'sieging' || army.state === 'marching') {
          army.morale = Math.max(0, army.morale - 30)
          EventLog.log('war', `${civName}'s army was wiped out!`, tick)
        }
        toRemove.push(civId)
        continue
      }

      // Morale too low -> retreat
      if (army.morale < 10) {
        EventLog.log('war', `${civName}'s army retreats (low morale)!`, tick)
        this.disbandArmy(em, army)
        toRemove.push(civId)
        continue
      }

      // Sieging army: check if target buildings are all destroyed -> victory
      if (army.state === 'sieging') {
        const targetCiv = civManager.civilizations.get(army.targetCivId)
        if (!targetCiv) {
          toRemove.push(civId)
          continue
        }

        // Check if any target buildings remain in siege range
        const remainingInRange = targetCiv.buildings.some(bId => {
          const bPos = em.getComponent<PositionComponent>(bId, 'position')
          if (!bPos) return false
          const dx = bPos.x - army.targetX
          const dy = bPos.y - army.targetY
          return dx * dx + dy * dy <= SIEGE_RANGE * SIEGE_RANGE
        })

        if (!remainingInRange) {
          // Victory: claim territory around target
          civManager.claimTerritory(civId, Math.floor(army.targetX), Math.floor(army.targetY), 4)
          EventLog.log('war', `${civName} conquered territory from ${targetCiv.name}!`, tick)
          particles.spawnFirework(army.targetX, army.targetY, civ?.color ?? '#fff')
          this.disbandArmy(em, army)
          toRemove.push(civId)

          // Also disband defender if present
          const defArmy = this.armies.get(army.targetCivId)
          if (defArmy && defArmy.state === 'defending') {
            this.disbandArmy(em, defArmy)
            toRemove.push(army.targetCivId)
          }
        }
      }
    }

    for (const civId of toRemove) {
      this.armies.delete(civId)
    }
  }

  private disbandArmy(em: EntityManager, army: Army): void {
    // Return soldiers to worker role
    for (const id of army.soldiers) {
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (m) m.role = 'worker'
    }
    army.state = 'idle'
    army.soldiers = []
  }
}
