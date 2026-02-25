// Creature Rivalry Duel System (v2.78) - Rival creatures challenge each other to formal duels
// Duels resolve disputes, establish dominance, and can end in death or submission

import { EntityManager, PositionComponent, CreatureComponent } from '../ecs/Entity'

export type DuelOutcome = 'victory' | 'defeat' | 'draw' | 'fled'
export type DuelStake = 'honor' | 'territory' | 'mate' | 'leadership' | 'grudge'

export interface Duel {
  id: number
  challengerId: number
  defenderId: number
  stake: DuelStake
  round: number
  maxRounds: number
  challengerHp: number
  defenderHp: number
  outcome: DuelOutcome | null
  startTick: number
}

export interface DuelRecord {
  duelId: number
  winnerId: number
  loserId: number
  stake: DuelStake
  rounds: number
  tick: number
}

const CHECK_INTERVAL = 900
const MAX_ACTIVE_DUELS = 8
const CHALLENGE_CHANCE = 0.012
const PROXIMITY_RANGE = 5
const BASE_HP = 100
const DAMAGE_RANGE = [8, 25] as const
const MAX_ROUNDS = 10
const FLEE_HP_THRESHOLD = 20

const STAKE_WEIGHTS: Record<DuelStake, number> = {
  honor: 0.3,
  territory: 0.25,
  mate: 0.15,
  leadership: 0.1,
  grudge: 0.2,
}

export class CreatureRivalryDuelSystem {
  private activeDuels: Duel[] = []
  private history: DuelRecord[] = []
  private duelingIds = new Set<number>()
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.initiateChallenge(em, tick)
    this.resolveDuels(em, tick)
  }

  private initiateChallenge(em: EntityManager, tick: number): void {
    if (this.activeDuels.length >= MAX_ACTIVE_DUELS) return
    const entities = em.getEntitiesWithComponents('position', 'creature')

    for (const id of entities) {
      if (Math.random() > CHALLENGE_CHANCE) continue
      if (this.duelingIds.has(id)) continue

      const pos = em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue

      // Find nearby rival
      for (const oid of entities) {
        if (oid === id || this.duelingIds.has(oid)) continue
        const opos = em.getComponent<PositionComponent>(oid, 'position')
        if (!opos) continue

        const dx = pos.x - opos.x
        const dy = pos.y - opos.y
        if (dx * dx + dy * dy > PROXIMITY_RANGE * PROXIMITY_RANGE) continue

        // Different race or same race rivalry
        const c1 = em.getComponent<CreatureComponent>(id, 'creature')
        const c2 = em.getComponent<CreatureComponent>(oid, 'creature')
        if (!c1 || !c2) continue

        const stake = this.pickStake()
        this.activeDuels.push({
          id: this.nextId++,
          challengerId: id,
          defenderId: oid,
          stake,
          round: 0,
          maxRounds: MAX_ROUNDS,
          challengerHp: BASE_HP,
          defenderHp: BASE_HP,
          outcome: null,
          startTick: tick,
        })
        this.duelingIds.add(id)
        this.duelingIds.add(oid)
        break
      }
    }
  }

  private resolveDuels(em: EntityManager, tick: number): void {
    for (let i = this.activeDuels.length - 1; i >= 0; i--) {
      const duel = this.activeDuels[i]

      // Check if participants still exist
      const c1 = em.getComponent<CreatureComponent>(duel.challengerId, 'creature')
      const c2 = em.getComponent<CreatureComponent>(duel.defenderId, 'creature')
      if (!c1 || !c2) {
        this.endDuel(i, duel, c1 ? 'victory' : 'defeat', tick)
        continue
      }

      // Simulate round
      duel.round++
      const cDmg = DAMAGE_RANGE[0] + Math.random() * (DAMAGE_RANGE[1] - DAMAGE_RANGE[0])
      const dDmg = DAMAGE_RANGE[0] + Math.random() * (DAMAGE_RANGE[1] - DAMAGE_RANGE[0])

      duel.defenderHp -= cDmg
      duel.challengerHp -= dDmg

      // Check flee
      if (duel.defenderHp < FLEE_HP_THRESHOLD && Math.random() < 0.4) {
        this.endDuel(i, duel, 'victory', tick)
        continue
      }
      if (duel.challengerHp < FLEE_HP_THRESHOLD && Math.random() < 0.4) {
        this.endDuel(i, duel, 'defeat', tick)
        continue
      }

      // Check KO
      if (duel.defenderHp <= 0) {
        this.endDuel(i, duel, 'victory', tick)
        continue
      }
      if (duel.challengerHp <= 0) {
        this.endDuel(i, duel, 'defeat', tick)
        continue
      }

      // Max rounds = draw
      if (duel.round >= duel.maxRounds) {
        this.endDuel(i, duel, 'draw', tick)
      }
    }
  }

  private endDuel(index: number, duel: Duel, outcome: DuelOutcome, tick: number): void {
    duel.outcome = outcome
    const winnerId = outcome === 'victory' ? duel.challengerId : duel.defenderId
    const loserId = outcome === 'victory' ? duel.defenderId : duel.challengerId

    if (outcome !== 'draw') {
      this.history.push({
        duelId: duel.id,
        winnerId,
        loserId,
        stake: duel.stake,
        rounds: duel.round,
        tick,
      })
    }

    // Keep history bounded
    if (this.history.length > 50) this.history.splice(0, this.history.length - 50)

    this.duelingIds.delete(duel.challengerId)
    this.duelingIds.delete(duel.defenderId)
    this.activeDuels.splice(index, 1)
  }

  private pickStake(): DuelStake {
    const r = Math.random()
    let cumulative = 0
    for (const [stake, weight] of Object.entries(STAKE_WEIGHTS)) {
      cumulative += weight
      if (r <= cumulative) return stake as DuelStake
    }
    return 'honor'
  }

  getActiveDuels(): Duel[] { return this.activeDuels }
  getDuelHistory(): DuelRecord[] { return this.history }
}
