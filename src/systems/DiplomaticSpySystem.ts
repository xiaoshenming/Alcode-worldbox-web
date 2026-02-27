// Diplomatic Spy System (v2.68) - Civilizations send spies to gather intelligence on rivals
// Spies can scout, sabotage, steal tech, assassinate, spread propaganda, or counter-spy

export type SpyMission = 'scout' | 'sabotage' | 'steal_tech' | 'assassinate' | 'propaganda' | 'counter_spy'
export type SpyStatus = 'active' | 'captured' | 'returned' | 'dead'

export interface Spy {
  id: number
  originCivId: number
  targetCivId: number
  mission: SpyMission
  skill: number          // 1-10
  status: SpyStatus
  deployedTick: number
  successChance: number  // 0-1
}

export interface SpyIncident {
  spyId: number
  originCivId: number
  targetCivId: number
  type: 'captured' | 'killed' | 'mission_success' | 'mission_fail'
  tick: number
}

const CHECK_INTERVAL = 800
const MAX_SPIES = 30
const MIN_POP_FOR_SPIES = 8
const MISSION_DURATION = 3000
const CAPTURE_RELATION_PENALTY = 15
const BASE_SUCCESS = 0.5
const COUNTER_INTEL_BONUS = 0.2

const MISSIONS: SpyMission[] = ['scout', 'sabotage', 'steal_tech', 'assassinate', 'propaganda', 'counter_spy']

let nextSpyId = 1

export class DiplomaticSpySystem {
  private spies: Spy[] = []
  private incidents: SpyIncident[] = []
  private nextCheckTick = CHECK_INTERVAL

  getSpies(): Spy[] { return this.spies }
  getSpyCount(): number { return this.spies.length }
  getSpiesByCiv(civId: number): Spy[] { return this.spies.filter(s => s.originCivId === civId) }
  getActiveSpies(): Spy[] { return this.spies.filter(s => s.status === 'active') }
  getIncidents(): SpyIncident[] { return this.incidents }

  private countActiveSpies(): number {
    let n = 0
    for (const s of this.spies) { if (s.status === 'active') n++ }
    return n
  }

  update(dt: number, civManager: any, tick: number): void {
    if (tick < this.nextCheckTick) return
    this.nextCheckTick = tick + CHECK_INTERVAL

    const civs = civManager?.civs
    if (!civs || civs.length < 2) return

    // Recruit new spies
    if (this.countActiveSpies() < MAX_SPIES) {
      this.tryRecruitSpy(civs, tick)
    }

    // Resolve active missions
    for (let i = this.spies.length - 1; i >= 0; i--) {
      const spy = this.spies[i]
      if (spy.status !== 'active') continue
      if (tick - spy.deployedTick < MISSION_DURATION) continue

      this.resolveMission(spy, civs, tick)
    }

    // Prune old non-active spies
    for (let i = this.spies.length - 1; i >= 0; i--) {
      const spy = this.spies[i]
      if (spy.status !== 'active' && tick - spy.deployedTick > MISSION_DURATION * 3) {
        this.spies.splice(i, 1)
      }
    }

    // Cap incidents
    if (this.incidents.length > 60) {
      this.incidents.splice(0, this.incidents.length - 40)
    }
  }

  private tryRecruitSpy(civs: any[], tick: number): void {
    const eligible = civs.filter((c: any) => c.population >= MIN_POP_FOR_SPIES)
    if (eligible.length === 0) return
    if (Math.random() > 0.3) return

    const origin = eligible[Math.floor(Math.random() * eligible.length)]
    const targets = civs.filter((c: any) => c.id !== origin.id)
    if (targets.length === 0) return
    const target = targets[Math.floor(Math.random() * targets.length)]

    const mission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)]
    const skill = 1 + Math.floor(Math.random() * 10)

    // Counter-intel from target: count active counter_spy missions targeting this civ
    let counterSpies = 0
    for (let _si = 0; _si < this.spies.length; _si++) {
      const s = this.spies[_si]
      if (s.status === 'active' && s.originCivId === target.id && s.mission === 'counter_spy') counterSpies++
    }
    const successChance = Math.min(0.95, Math.max(0.1,
      BASE_SUCCESS + (skill - 5) * 0.06 - counterSpies * COUNTER_INTEL_BONUS
    ))

    const spy: Spy = {
      id: nextSpyId++,
      originCivId: origin.id,
      targetCivId: target.id,
      mission,
      skill,
      status: 'active',
      deployedTick: tick,
      successChance,
    }
    this.spies.push(spy)
  }

  private resolveMission(spy: Spy, civs: any[], tick: number): void {
    const success = Math.random() < spy.successChance

    const addIncident = (type: SpyIncident['type']) => {
      this.incidents.push({ spyId: spy.id, originCivId: spy.originCivId, targetCivId: spy.targetCivId, type, tick })
    }
    if (success) {
      spy.status = 'returned'
      addIncident('mission_success')
    } else {
      const roll = Math.random()
      if (roll < 0.4) {
        spy.status = 'captured'
        addIncident('captured')
        const targetCiv = civs.find((c: any) => c.id === spy.targetCivId)
        if (targetCiv?.relations) {
          const rel = targetCiv.relations[spy.originCivId]
          if (typeof rel === 'number') targetCiv.relations[spy.originCivId] = rel - CAPTURE_RELATION_PENALTY
        }
      } else if (roll < 0.6) {
        spy.status = 'dead'
        addIncident('killed')
      } else {
        spy.status = 'returned'
        addIncident('mission_fail')
      }
    }
  }
}
