import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'
import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'

export interface Alliance {
  id: number
  name: string
  members: Set<number>       // civ IDs
  createdTick: number
  isFederation: boolean      // upgraded after 5000 ticks with 3+ members
  federationTick: number     // tick when upgraded to federation
}

const ALLIANCE_NAMES = [
  'Northern Pact', 'Iron League', 'Golden Accord', 'Silver Coalition',
  'Storm Alliance', 'Dawn Federation', 'Shield Compact', 'Star Union',
  'Crimson Covenant', 'Emerald Entente', 'Azure Concord', 'Obsidian Order',
]

let nextAllianceId = 1

export class AllianceSystem {
  private alliances: Alliance[] = []
  private readonly TICK_INTERVAL = 180
  private readonly FEDERATION_THRESHOLD = 5000
  private readonly RELATION_ALLY_MIN = 50
  private readonly RELATION_LEAVE_THRESHOLD = 0
  private readonly TECH_SHARE_RATE = 0.005
  // Reusable buffer to avoid Array.from() every 180 ticks
  private _civsBuf: Civilization[] = []
  // Reusable map for tryAllianceWar enemy scoring
  private _enemyScoresBuf: Map<number, number> = new Map()

  update(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    if (tick % this.TICK_INTERVAL !== 0) return

    const civs = this._civsBuf
    civs.length = 0
    for (const c of civManager.civilizations.values()) civs.push(c)

    this.cleanupDeadMembers(civManager)
    this.tryFormAlliances(civs, tick)
    this.checkMemberLeave(civs)
    this.applyJointDefense(civs, civManager)
    this.tryAllianceWar(civs, civManager, tick)
    this.tryFederationUpgrade(tick)
    this.applyFederationBonuses(civManager)
  }

  getAlliances(): Alliance[] {
    return this.alliances
  }

  getAllianceForCiv(civId: number): Alliance | null {
    return this.alliances.find(a => a.members.has(civId)) ?? null
  }

  /** Remove members whose civ no longer exists, disband empty alliances */
  private cleanupDeadMembers(civManager: CivManager): void {
    for (const alliance of this.alliances) {
      for (const id of alliance.members) {
        if (!civManager.civilizations.has(id)) alliance.members.delete(id)
      }
    }
    for (let i = this.alliances.length - 1; i >= 0; i--) {
      if (this.alliances[i].members.size < 2) this.alliances.splice(i, 1)
    }
  }

  /** Two civs with relation > 50 and a shared enemy may form or join an alliance */
  private tryFormAlliances(civs: Civilization[], tick: number): void {
    for (let i = 0; i < civs.length; i++) {
      for (let j = i + 1; j < civs.length; j++) {
        const a = civs[i], b = civs[j]
        const rel = a.relations.get(b.id) ?? 0
        if (rel <= this.RELATION_ALLY_MIN) continue
        if (!this.hasCommonEnemy(a, b)) continue
        if (Math.random() > 0.05) continue // ~5% chance per eligible pair per check

        const allianceA = this.getAllianceForCiv(a.id)
        const allianceB = this.getAllianceForCiv(b.id)

        if (allianceA && allianceB) {
          // Both already in alliances — skip
          continue
        } else if (allianceA && !allianceB) {
          allianceA.members.add(b.id)
          EventLog.log('diplomacy', `${b.name} joined ${allianceA.name}`, tick)
        } else if (!allianceA && allianceB) {
          allianceB.members.add(a.id)
          EventLog.log('diplomacy', `${a.name} joined ${allianceB.name}`, tick)
        } else {
          // Neither in an alliance — create new
          const name = ALLIANCE_NAMES[nextAllianceId % ALLIANCE_NAMES.length]
          const alliance: Alliance = {
            id: nextAllianceId++,
            name,
            members: new Set([a.id, b.id]),
            createdTick: tick,
            isFederation: false,
            federationTick: 0,
          }
          this.alliances.push(alliance)
          EventLog.log('diplomacy', `${a.name} and ${b.name} formed ${name}`, tick)
        }
      }
    }
  }

  private hasCommonEnemy(a: Civilization, b: Civilization): boolean {
    for (const [civId, rel] of a.relations) {
      if (rel < -50 && (b.relations.get(civId) ?? 0) < -50) return true
    }
    return false
  }

  /** Members with relation < 0 toward any other member leave */
  private checkMemberLeave(civs: Civilization[]): void {
    for (const alliance of this.alliances) {
      const toRemove: number[] = []
      for (const memberId of alliance.members) {
        const civ = civs.find(c => c.id === memberId)
        if (!civ) continue
        for (const otherId of alliance.members) {
          if (otherId === memberId) continue
          const rel = civ.relations.get(otherId) ?? 0
          if (rel < this.RELATION_LEAVE_THRESHOLD) {
            toRemove.push(memberId)
            break
          }
        }
      }
      for (const id of toRemove) {
        alliance.members.delete(id)
        const civName = civs.find(c => c.id === id)?.name ?? `Civ#${id}`
        EventLog.log('diplomacy', `${civName} left ${alliance.name}`, 0)
      }
    }
    for (let i = this.alliances.length - 1; i >= 0; i--) {
      if (this.alliances[i].members.size < 2) this.alliances.splice(i, 1)
    }
  }

  /** When an alliance member is attacked (relation < -50), other members worsen relations with attacker */
  private applyJointDefense(civs: Civilization[], civManager: CivManager): void {
    for (const alliance of this.alliances) {
      for (const memberId of alliance.members) {
        const member = civManager.civilizations.get(memberId)
        if (!member) continue
        for (const [otherId, rel] of member.relations) {
          if (rel >= -50) continue
          if (alliance.members.has(otherId)) continue
          // otherId is at war with this member — penalize from all allies
          for (const allyId of alliance.members) {
            if (allyId === memberId) continue
            const ally = civManager.civilizations.get(allyId)
            if (!ally) continue
            const allyRel = ally.relations.get(otherId) ?? 0
            ally.relations.set(otherId, Math.max(-100, allyRel - 3))
          }
        }
      }
    }
  }

  /** Alliance can collectively declare war on a civ/alliance that most members dislike */
  private tryAllianceWar(civs: Civilization[], civManager: CivManager, tick: number): void {
    for (const alliance of this.alliances) {
      if (Math.random() > 0.02) continue
      // Find a common enemy: majority of members have relation < -30
      const enemyScores = this._enemyScoresBuf
      enemyScores.clear()
      for (const memberId of alliance.members) {
        const civ = civManager.civilizations.get(memberId)
        if (!civ) continue
        for (const [otherId, rel] of civ.relations) {
          if (alliance.members.has(otherId)) continue
          if (rel < -30) {
            enemyScores.set(otherId, (enemyScores.get(otherId) ?? 0) + 1)
          }
        }
      }
      const majority = Math.ceil(alliance.members.size / 2)
      for (const [enemyId, votes] of enemyScores) {
        if (votes < majority) continue
        const enemy = civManager.civilizations.get(enemyId)
        if (!enemy) continue
        // Declare collective war
        for (const memberId of alliance.members) {
          const member = civManager.civilizations.get(memberId)
          if (!member) continue
          const rel = member.relations.get(enemyId) ?? 0
          member.relations.set(enemyId, Math.max(-100, Math.min(rel, -60)))
          enemy.relations.set(memberId, Math.max(-100, Math.min(enemy.relations.get(memberId) ?? 0, -60)))
        }
        EventLog.log('war', `${alliance.name} declared war on ${enemy.name}!`, tick)
        break // one war declaration per tick
      }
    }
  }

  /** 3+ members and 5000 ticks old => upgrade to federation */
  private tryFederationUpgrade(tick: number): void {
    for (const alliance of this.alliances) {
      if (alliance.isFederation) continue
      if (alliance.members.size < 3) continue
      if (tick - alliance.createdTick < this.FEDERATION_THRESHOLD) continue
      alliance.isFederation = true
      alliance.federationTick = tick
      alliance.name = alliance.name.replace(/Pact|League|Accord|Coalition|Alliance|Compact|Union|Covenant|Entente|Concord|Order/, 'Federation')
      EventLog.log('diplomacy', `${alliance.name} upgraded to a Federation!`, tick)
    }
  }

  /** Federation members share tech: lowest techLevel members slowly catch up */
  private applyFederationBonuses(civManager: CivManager): void {
    for (const alliance of this.alliances) {
      if (!alliance.isFederation) continue
      let maxTech = 0
      for (const id of alliance.members) {
        const civ = civManager.civilizations.get(id)
        if (civ && civ.techLevel > maxTech) maxTech = civ.techLevel
      }
      for (const id of alliance.members) {
        const civ = civManager.civilizations.get(id)
        if (!civ || civ.techLevel >= maxTech) continue
        // Slowly boost research progress toward next level
        civ.research.progress = Math.min(100, civ.research.progress + this.TECH_SHARE_RATE * (maxTech - civ.techLevel))
      }
    }
  }
}
