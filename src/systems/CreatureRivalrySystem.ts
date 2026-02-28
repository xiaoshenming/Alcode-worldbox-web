// Creature Rivalry System (v2.53) - Long-term rivalries between creatures
// Rivals compete for resources, mates, and status
// Rivalries can escalate to duels or resolve through reconciliation

import { EntityManager, EntityId, PositionComponent, CreatureComponent } from '../ecs/Entity'

export type RivalryStage = 'tension' | 'competition' | 'hostility' | 'feud' | 'resolved'

export interface Rivalry {
  id: number
  entityA: EntityId
  entityB: EntityId
  stage: RivalryStage
  intensity: number     // 0-100
  startedAt: number
  encounters: number
  cause: string
}

const CHECK_INTERVAL = 900
const UPDATE_INTERVAL = 500
const MAX_RIVALRIES = 60
const RIVALRY_CHANCE = 0.04
const ESCALATION_RATE = 3
const RESOLUTION_CHANCE = 0.02

const CAUSES = ['territory', 'mate', 'resources', 'insult', 'status', 'theft']
const STAGES: RivalryStage[] = ['tension', 'competition', 'hostility', 'feud']

let nextRivalryId = 1

export class CreatureRivalrySystem {
  private rivalries: Rivalry[] = []
  private lastCheck = 0
  private lastUpdate = 0
  private resolvedCount = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.detectRivalries(em, tick)
    }
    if (tick - this.lastUpdate >= UPDATE_INTERVAL) {
      this.lastUpdate = tick
      this.updateRivalries(em, tick)
    }
  }

  private detectRivalries(em: EntityManager, tick: number): void {
    if (this.rivalries.length >= MAX_RIVALRIES) return
    const arr = em.getEntitiesWithComponents('creature', 'position')
    for (let i = 0; i < Math.min(arr.length, 50); i++) {
      const a = arr[Math.floor(Math.random() * arr.length)]
      if (Math.random() > RIVALRY_CHANCE) continue
      const posA = em.getComponent<PositionComponent>(a, 'position')
      if (!posA) continue

      // Find nearby creature to become rival
      for (const b of arr) {
        if (a === b) continue
        if (this.rivalries.some(r => (r.entityA === a && r.entityB === b) || (r.entityA === b && r.entityB === a))) continue
        const posB = em.getComponent<PositionComponent>(b, 'position')
        if (!posB) continue
        const dx = posA.x - posB.x, dy = posA.y - posB.y
        if (dx * dx + dy * dy > 225) continue

        this.rivalries.push({
          id: nextRivalryId++,
          entityA: a,
          entityB: b,
          stage: 'tension',
          intensity: 10 + Math.floor(Math.random() * 20),
          startedAt: tick,
          encounters: 0,
          cause: CAUSES[Math.floor(Math.random() * CAUSES.length)],
        })
        break
      }
    }
  }

  private updateRivalries(em: EntityManager, tick: number): void {
    for (let i = this.rivalries.length - 1; i >= 0; i--) {
      const rivalry = this.rivalries[i]
      if (rivalry.stage === 'resolved') { this.rivalries.splice(i, 1); continue }

      // Check both entities alive
      const cA = em.getComponent<CreatureComponent>(rivalry.entityA, 'creature')
      const cB = em.getComponent<CreatureComponent>(rivalry.entityB, 'creature')
      if (!cA || !cB) { this.rivalries.splice(i, 1); continue }

      // Chance to resolve
      if (Math.random() < RESOLUTION_CHANCE) {
        rivalry.stage = 'resolved'
        this.resolvedCount++
        continue
      }

      // Escalate
      rivalry.intensity = Math.min(100, rivalry.intensity + ESCALATION_RATE)
      rivalry.encounters++
      const stageIdx = STAGES.indexOf(rivalry.stage)
      if (stageIdx >= 0 && stageIdx < STAGES.length - 1 && rivalry.intensity > (stageIdx + 1) * 25) {
        rivalry.stage = STAGES[stageIdx + 1]
      }

      // High intensity affects mood
      if (rivalry.intensity > 60) {
        if (cA.mood != null) cA.mood = Math.max(0, cA.mood - 2)
        if (cB.mood != null) cB.mood = Math.max(0, cB.mood - 2)
      }
    }
  }

  private _activeRivalriesBuf: Rivalry[] = []
  getRivalries(): Rivalry[] { return this.rivalries }
  getActiveRivalries(): Rivalry[] {
    this._activeRivalriesBuf.length = 0
    for (const r of this.rivalries) { if (r.stage !== 'resolved') this._activeRivalriesBuf.push(r) }
    return this._activeRivalriesBuf
  }
  getResolvedCount(): number { return this.resolvedCount }
}
