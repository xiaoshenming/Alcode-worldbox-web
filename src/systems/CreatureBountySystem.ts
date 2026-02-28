// Creature Bounty System (v2.11) - Civilizations post bounties on enemy creatures
// Hunters pursue bounty targets for gold rewards, creating emergent conflict

import { EntityManager, EntityId, PositionComponent, NeedsComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { EventLog } from './EventLog'

export interface Bounty {
  id: number
  targetId: EntityId
  posterId: number       // civ id
  reward: number
  reason: string
  postedTick: number
  claimed: boolean
  claimedBy: EntityId | null
  expiresAt: number
}

type CivLike = { id: number; name: string; resources: { gold: number }; relations: Map<number, number> }
type CivManagerLike = { civilizations: Map<number, CivLike> }

const BOUNTY_CHECK_INTERVAL = 600
const BOUNTY_DURATION = 6000
const MIN_REWARD = 20
const MAX_REWARD = 200
const MAX_ACTIVE_BOUNTIES = 12
const HUNT_RANGE = 25
const HOSTILITY_THRESHOLD = -30

const REASONS = ['raiding villages', 'destroying crops', 'killing civilians', 'espionage', 'territorial aggression']

let nextBountyId = 1

export class CreatureBountySystem {
  private _civsBuf: CivLike[] = []
  private bounties: Bounty[] = []
  private nextCheckTick = BOUNTY_CHECK_INTERVAL
  private showPanel = false

  private _activeBountiesBuf: Bounty[] = []
  /** Get all active (unclaimed) bounties. */
  getActiveBounties(): Bounty[] {
    this._activeBountiesBuf.length = 0
    for (const b of this.bounties) { if (!b.claimed) this._activeBountiesBuf.push(b) }
    return this._activeBountiesBuf
  }

  private countActiveBounties(): number {
    let n = 0
    for (const b of this.bounties) { if (!b.claimed) n++ }
    return n
  }

  /** Get bounty on a specific creature. */
  getBountyOn(targetId: EntityId): Bounty | null {
    return this.bounties.find(b => b.targetId === targetId && !b.claimed) ?? null
  }

  update(dt: number, em: EntityManager, civManager: CivManagerLike, tick: number): void {
    // Expire old bounties
    for (let i = this.bounties.length - 1; i >= 0; i--) {
      const b = this.bounties[i]
      if (!b.claimed && tick >= b.expiresAt) {
        this.bounties.splice(i, 1)
      }
    }

    // Post new bounties periodically
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + BOUNTY_CHECK_INTERVAL
      if (this.countActiveBounties() < MAX_ACTIVE_BOUNTIES) {
        this.tryPostBounty(em, civManager, tick)
      }
    }

    // Check if targets died
    this.checkClaims(em, civManager, tick)
  }

  private tryPostBounty(em: EntityManager, civManager: CivManagerLike, tick: number): void {
    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    const poster = civs[Math.floor(Math.random() * civs.length)]
    // Find a hostile civ
    let targetCivId = -1
    for (const [civId, rel] of poster.relations) {
      if (rel < HOSTILITY_THRESHOLD && civManager.civilizations.has(civId)) {
        targetCivId = civId
        break
      }
    }
    if (targetCivId < 0) return

    // Find a creature from the target civ
    const entities = em.getEntitiesWithComponents('position', 'creature', 'civMember')
    let target: EntityId | null = null
    for (const eid of entities) {
      const cm = em.getComponent<CivMemberComponent>(eid, 'civMember')
      if (cm && cm.civId === targetCivId) {
        if (!this.getBountyOn(eid)) { target = eid; break }
      }
    }
    if (target === null) return

    const reward = MIN_REWARD + Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD))
    const reason = REASONS[Math.floor(Math.random() * REASONS.length)]
    const bounty: Bounty = {
      id: nextBountyId++,
      targetId: target,
      posterId: poster.id,
      reward,
      reason,
      postedTick: tick,
      claimed: false,
      claimedBy: null,
      expiresAt: tick + BOUNTY_DURATION,
    }
    this.bounties.push(bounty)
    EventLog.log('diplomacy', `${poster.name} posted a bounty of ${reward}g for ${reason}`, tick)
  }

  private checkClaims(em: EntityManager, civManager: CivManagerLike, tick: number): void {
    for (const bounty of this.bounties) {
      if (bounty.claimed) continue
      const tp = em.getComponent<PositionComponent>(bounty.targetId, 'position')
      const needs = em.getComponent<NeedsComponent>(bounty.targetId, 'needs')
      if (!tp || !needs || needs.health <= 0) {
        // Target dead or gone - find nearest allied creature to claim
        const hunters = em.getEntitiesWithComponents('position', 'civMember')
        let bestDist = HUNT_RANGE * HUNT_RANGE
        let bestHunter: EntityId | null = null
        for (const eid of hunters) {
          if (eid === bounty.targetId) continue
          const cm = em.getComponent<CivMemberComponent>(eid, 'civMember')
          if (!cm || cm.civId !== bounty.posterId) continue
          const hp = em.getComponent<PositionComponent>(eid, 'position')
          if (!hp || !tp) continue
          const dx = hp.x - tp.x, dy = hp.y - tp.y
          const d2 = dx * dx + dy * dy
          if (d2 < bestDist) { bestDist = d2; bestHunter = eid }
        }
        bounty.claimed = true
        bounty.claimedBy = bestHunter
        const civ = civManager.civilizations.get(bounty.posterId)
        if (civ) {
          EventLog.log('diplomacy', `Bounty claimed! ${civ.name} pays ${bounty.reward}g reward`, tick)
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.showPanel) return
    const active = this.getActiveBounties()
    if (active.length === 0) return

    const x = 10, y = 400, w = 220, h = 30 + active.length * 22
    ctx.save()
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#1a0a0a'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#c44'
    ctx.strokeRect(x, y, w, h)

    ctx.fillStyle = '#f88'
    ctx.font = 'bold 12px monospace'
    ctx.fillText('BOUNTY BOARD', x + 8, y + 18)

    ctx.font = '10px monospace'
    for (let i = 0; i < active.length; i++) {
      const b = active[i]
      ctx.fillStyle = '#faa'
      ctx.fillText(`#${b.id} - ${b.reward}g - ${b.reason}`, x + 8, y + 36 + i * 22)
    }
    ctx.restore()
  }

  togglePanel(): void { this.showPanel = !this.showPanel }
}
