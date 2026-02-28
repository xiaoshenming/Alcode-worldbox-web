import { EntityManager, EntityId, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { BuildingComponent, BuildingType, CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'
import { World } from '../game/World'
import { EventLog } from './EventLog'

/** Types of siege equipment available to attacking armies. */
export enum SiegeEquipmentType {
  BATTERING_RAM = 'battering_ram',
  SIEGE_TOWER = 'siege_tower',
  CATAPULT = 'catapult',
  TREBUCHET = 'trebuchet',
}

interface SiegeEquipmentStats {
  wallDamage: number
  speed: number
  buildCost: number
  range: number
}

const EQUIPMENT_STATS: Record<SiegeEquipmentType, SiegeEquipmentStats> = {
  [SiegeEquipmentType.BATTERING_RAM]: { wallDamage: 8, speed: 0.03, buildCost: 120, range: 1 },
  [SiegeEquipmentType.SIEGE_TOWER]:   { wallDamage: 2, speed: 0.02, buildCost: 200, range: 1 },
  [SiegeEquipmentType.CATAPULT]:      { wallDamage: 12, speed: 0.015, buildCost: 300, range: 8 },
  [SiegeEquipmentType.TREBUCHET]:     { wallDamage: 20, speed: 0.01, buildCost: 500, range: 12 },
}

/** Phases a siege progresses through. */
export enum SiegePhase {
  APPROACHING = 'approaching',
  DEPLOYING = 'deploying',
  ASSAULTING = 'assaulting',
  BREACHING = 'breaching',
}

interface SiegeEquipment {
  type: SiegeEquipmentType
  buildProgress: number
  deployed: boolean
}

/** Full state of an active siege. */
export interface SiegeInfo {
  id: number
  attackerCivId: number
  defenderCivId: number
  targetX: number
  targetY: number
  phase: SiegePhase
  equipment: SiegeEquipment[]
  wall: { hp: number; maxHp: number; breached: boolean }
  startTick: number
  duration: number
  attackerMorale: number
  defenderMorale: number
  sortieTimer: number
  breachBonus: number
}

const DEPLOY_TICKS = 60
const SORTIE_COOLDOWN = 200
const SORTIE_CHANCE = 0.25
const SORTIE_DAMAGE = 8
const MORALE_DECAY_RATE = 1.5
const MORALE_KILL_LOSS = 3
const BREACH_COMBAT_BONUS = 1.5
const BASE_WALL_HP = 200
const WALL_HP_PER_WALL = 80
const WALL_HP_PER_CASTLE = 150
const SIEGE_RANGE_SQ = 100 // 10^2

/**
 * SiegeSystem manages structured siege warfare between civilizations.
 *
 * Tracks siege equipment construction/deployment, wall HP for defending cities,
 * siege phases (approaching -> deploying -> assaulting -> breaching),
 * defender sorties, and morale effects on both sides.
 */
export class SiegeSystem {
  private sieges: Map<number, SiegeInfo> = new Map()
  private nextId = 1
  private _siegesBuf: SiegeInfo[] = []
  // Reusable buffer for update() toRemove (every tick)
  private _siegesToRemoveBuf: number[] = []

  /**
   * Start a new siege against a target city location.
   * @returns The created SiegeInfo, or null if a siege already exists at that location
   */
  startSiege(attackerCivId: number, defenderCivId: number, targetX: number, targetY: number): SiegeInfo | null {
    for (const s of this.sieges.values()) {
      if (s.targetX === targetX && s.targetY === targetY) return null
    }
    const siege: SiegeInfo = {
      id: this.nextId++, attackerCivId, defenderCivId, targetX, targetY,
      phase: SiegePhase.APPROACHING, equipment: [],
      wall: { hp: BASE_WALL_HP, maxHp: BASE_WALL_HP, breached: false },
      startTick: 0, duration: 0,
      attackerMorale: 100, defenderMorale: 100,
      sortieTimer: SORTIE_COOLDOWN, breachBonus: 1,
    }
    this.sieges.set(siege.id, siege)
    EventLog.log('war', `Siege begun: Civ#${attackerCivId} besieges Civ#${defenderCivId} at (${targetX},${targetY})`, 0)
    return siege
  }

  /** Returns all currently active sieges. */
  getSieges(): SiegeInfo[] {
    const buf = this._siegesBuf; buf.length = 0
    for (const s of this.sieges.values()) buf.push(s)
    return buf
  }

  /** Returns the siege near the given coordinates, or null if none exists. */
  getSiegeAt(x: number, y: number): SiegeInfo | null {
    for (const s of this.sieges.values()) {
      const dx = s.targetX - x, dy = s.targetY - y
      if (dx * dx + dy * dy <= SIEGE_RANGE_SQ) return s
    }
    return null
  }

  /** Add siege equipment to an active siege. */
  addEquipment(siegeId: number, type: SiegeEquipmentType): boolean {
    const siege = this.sieges.get(siegeId)
    if (!siege) return false
    siege.equipment.push({ type, buildProgress: 0, deployed: false })
    return true
  }

  /**
   * Main update loop. Advances all active sieges by one tick.
   * @param tick - Current game tick
   * @param em - Entity manager for querying entities
   * @param civManager - Civilization manager for civ data
   * @param _world - World reference (reserved for terrain checks)
   */
  update(tick: number, em: EntityManager, civManager: CivManager, _world: World): void {
    const toRemove = this._siegesToRemoveBuf
    toRemove.length = 0

    for (const siege of this.sieges.values()) {
      if (siege.startTick === 0) siege.startTick = tick
      siege.duration = tick - siege.startTick

      const aCiv = civManager.civilizations.get(siege.attackerCivId)
      const dCiv = civManager.civilizations.get(siege.defenderCivId)
      if (!aCiv || !dCiv) { toRemove.push(siege.id); continue }

      this.recalcWallHp(em, siege, dCiv.buildings)

      switch (siege.phase) {
        case SiegePhase.APPROACHING: this.tickApproach(siege); break
        case SiegePhase.DEPLOYING:   this.tickDeploy(siege); break
        case SiegePhase.ASSAULTING:  this.tickAssault(em, siege, tick); break
        case SiegePhase.BREACHING:   this.tickBreach(em, siege, tick); break
      }

      if (siege.phase === SiegePhase.ASSAULTING || siege.phase === SiegePhase.DEPLOYING) {
        this.tickSortie(em, siege, tick)
      }

      // Morale decay from siege duration
      const decay = MORALE_DECAY_RATE * (siege.duration / 100)
      siege.attackerMorale = Math.max(0, siege.attackerMorale - decay * 0.01)
      siege.defenderMorale = Math.max(0, siege.defenderMorale - decay * 0.005)

      if (siege.attackerMorale <= 0) {
        EventLog.log('war', `Siege at (${siege.targetX},${siege.targetY}) lifted - attackers lost morale`, tick)
        toRemove.push(siege.id)
      } else if (siege.defenderMorale <= 0) {
        EventLog.log('war', `Siege at (${siege.targetX},${siege.targetY}) - defenders surrendered!`, tick)
        toRemove.push(siege.id)
      }
    }

    for (const id of toRemove) this.sieges.delete(id)
  }

  private recalcWallHp(em: EntityManager, siege: SiegeInfo, buildings: EntityId[]): void {
    let hp = BASE_WALL_HP
    for (const bId of buildings) {
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      const pos = em.getComponent<PositionComponent>(bId, 'position')
      if (!b || !pos) continue
      const dx = pos.x - siege.targetX, dy = pos.y - siege.targetY
      if (dx * dx + dy * dy > SIEGE_RANGE_SQ) continue
      if (b.buildingType === BuildingType.WALL) hp += WALL_HP_PER_WALL * (b.health / 100)
      else if (b.buildingType === BuildingType.CASTLE) hp += WALL_HP_PER_CASTLE * (b.health / 100)
    }
    siege.wall.maxHp = hp
    siege.wall.hp = Math.min(siege.wall.hp, hp)
  }

  private tickApproach(siege: SiegeInfo): void {
    if (siege.duration >= 30) siege.phase = SiegePhase.DEPLOYING
  }

  private tickDeploy(siege: SiegeInfo): void {
    let allReady = true
    for (const eq of siege.equipment) {
      if (eq.deployed) continue
      eq.buildProgress += 1
      if (eq.buildProgress >= EQUIPMENT_STATS[eq.type].buildCost) eq.deployed = true
      else allReady = false
    }
    if ((siege.equipment.length === 0 && siege.duration >= DEPLOY_TICKS) ||
        (siege.equipment.length > 0 && allReady)) {
      siege.phase = SiegePhase.ASSAULTING
    }
  }

  private tickAssault(em: EntityManager, siege: SiegeInfo, tick: number): void {
    let dmg = 0
    for (const eq of siege.equipment) {
      if (eq.deployed) dmg += EQUIPMENT_STATS[eq.type].wallDamage
    }
    dmg += this.countSoldiersNear(em, siege.attackerCivId, siege.targetX, siege.targetY) * 0.5
    siege.wall.hp = Math.max(0, siege.wall.hp - dmg * 0.1)

    if (dmg > 10) siege.defenderMorale = Math.max(0, siege.defenderMorale - 0.3)

    if (siege.wall.hp <= 0 && !siege.wall.breached) {
      siege.wall.breached = true
      siege.breachBonus = BREACH_COMBAT_BONUS
      siege.phase = SiegePhase.BREACHING
      siege.defenderMorale = Math.max(0, siege.defenderMorale - 20)
      EventLog.log('war', `Walls breached at (${siege.targetX},${siege.targetY})! Attackers gain combat bonus`, tick)
    }
  }

  private tickBreach(em: EntityManager, siege: SiegeInfo, tick: number): void {
    const buildings = em.getEntitiesWithComponent('building')
    for (const bId of buildings) {
      const b = em.getComponent<BuildingComponent>(bId, 'building')
      if (!b || b.civId !== siege.defenderCivId) continue
      const pos = em.getComponent<PositionComponent>(bId, 'position')
      if (!pos) continue
      const dx = pos.x - siege.targetX, dy = pos.y - siege.targetY
      if (dx * dx + dy * dy > SIEGE_RANGE_SQ) continue

      const soldiers = this.countSoldiersNear(em, siege.attackerCivId, pos.x, pos.y)
      if (soldiers === 0) continue
      b.health -= soldiers * 2 * siege.breachBonus * 0.1
      if (b.health <= 0) {
        EventLog.log('war', `${b.buildingType} destroyed during breach at (${Math.floor(pos.x)},${Math.floor(pos.y)})`, tick)
        em.removeEntity(bId)
      }
    }
    siege.attackerMorale = Math.min(100, siege.attackerMorale + 0.1)
  }

  private tickSortie(em: EntityManager, siege: SiegeInfo, tick: number): void {
    siege.sortieTimer--
    if (siege.sortieTimer > 0) return
    siege.sortieTimer = SORTIE_COOLDOWN
    if (Math.random() > SORTIE_CHANCE) return

    const defCount = this.countSoldiersNear(em, siege.defenderCivId, siege.targetX, siege.targetY)
    if (defCount < 3) return

    const attackers = this.getSoldiersNear(em, siege.attackerCivId, siege.targetX, siege.targetY)
    if (attackers.length === 0) return

    const hits = Math.min(attackers.length, Math.ceil(defCount * 0.3))
    for (let i = 0; i < hits; i++) {
      const needs = em.getComponent<NeedsComponent>(attackers[Math.floor(Math.random() * attackers.length)], 'needs')
      if (needs && needs.health > 0) {
        needs.health -= SORTIE_DAMAGE
        if (needs.health <= 0) siege.attackerMorale = Math.max(0, siege.attackerMorale - MORALE_KILL_LOSS)
      }
    }
    siege.defenderMorale = Math.min(100, siege.defenderMorale + 3)
    EventLog.log('combat', `Defenders sortie at (${siege.targetX},${siege.targetY})! ${hits} attackers hit`, tick)
  }

  /** Get soldiers of a civ near a point (returns entity IDs). */
  private _soldiersNearBuf: EntityId[] = []
  private getSoldiersNear(em: EntityManager, civId: number, x: number, y: number): EntityId[] {
    const result = this._soldiersNearBuf
    result.length = 0
    for (const id of em.getEntitiesWithComponent('civMember')) {
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (!m || m.civId !== civId || m.role !== 'soldier') continue
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const dx = pos.x - x, dy = pos.y - y
      if (dx * dx + dy * dy <= SIEGE_RANGE_SQ) result.push(id)
    }
    return result
  }

  /** Count soldiers of a civ near a point. */
  private countSoldiersNear(em: EntityManager, civId: number, x: number, y: number): number {
    let count = 0
    for (const id of em.getEntitiesWithComponent('civMember')) {
      const m = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (!m || m.civId !== civId || m.role !== 'soldier') continue
      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
      const dx = pos.x - x, dy = pos.y - y
      if (dx * dx + dy * dy <= SIEGE_RANGE_SQ) count++
    }
    return count
  }
}
