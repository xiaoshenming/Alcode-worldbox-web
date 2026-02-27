// Espionage & Advanced Diplomacy System
// Spies, tributes, casus belli, and alliance warfare

import { CivManager } from '../civilization/CivManager'
import { EntityManager } from '../ecs/Entity'
import { Civilization, BuildingComponent, CivMemberComponent } from '../civilization/Civilization'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { EventLog } from './EventLog'

// --- Interfaces ---

export interface Spy {
  id: number
  ownerCivId: number
  targetCivId: number
  skill: number       // 1-10
  cover: number       // 0-100, detected when reaches 0
  mission: SpyMission | null
  missionTimer: number
  alive: boolean
}

export type SpyMission = 'steal_tech' | 'sabotage' | 'incite_revolt' | 'assassinate'

export type CasusBelli = 'border_conflict' | 'spy_caught' | 'tribute_refused' | 'religious_diff'

interface TributeRecord {
  fromCivId: number
  toCivId: number
  amount: number
  lastTick: number
}

interface WarJustification {
  attackerId: number
  defenderId: number
  reason: CasusBelli
  tick: number
}

// --- Constants ---

const SPY_INTERVAL = 600
const TRIBUTE_INTERVAL = 1200
const ALLIANCE_WAR_CHANCE = 0.6
const MAX_SPIES_PER_CIV = 3

let nextSpyId = 1

// --- System ---

export class EspionageSystem {
  private spies: Spy[] = []
  private tributes: TributeRecord[] = []
  private warJustifications: WarJustification[] = []
  private _aliveBuf: Spy[] = []
  private _civSpyBuf: Spy[] = []

  update(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    const civs: Civilization[] = []
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Spy missions execute every SPY_INTERVAL ticks
    if (tick % SPY_INTERVAL === 0) {
      this.recruitSpies(civs, civManager)
      this.executeSpyMissions(civManager, em, tick)
    }

    // Tribute checks every TRIBUTE_INTERVAL ticks
    if (tick % TRIBUTE_INTERVAL === 0) {
      this.processTributes(civManager, tick)
    }

    // Alliance war checks — run each tick but internally gated by war declarations
    this.checkAllianceWars(civManager, tick)

    // Decay old war justifications (expire after 6000 ticks)
    for (let i = this.warJustifications.length - 1; i >= 0; i--) {
      if (tick - this.warJustifications[i].tick >= 6000) this.warJustifications.splice(i, 1)
    }
  }

  // --- Spy Recruitment ---

  private recruitSpies(civs: Civilization[], civManager: CivManager): void {
    for (const civ of civs) {
      let ownedCount = 0
      for (const s of this.spies) { if (s.ownerCivId === civ.id && s.alive) ownedCount++ }
      if (ownedCount >= MAX_SPIES_PER_CIV) continue
      if (civ.techLevel < 2 || civ.resources.gold < 10) continue

      // Find a hostile target
      const target = this.pickSpyTarget(civ, civManager)
      if (!target) continue

      if (Math.random() < 0.3) {
        civ.resources.gold -= 10
        const spy: Spy = {
          id: nextSpyId++,
          ownerCivId: civ.id,
          targetCivId: target.id,
          skill: Math.floor(Math.random() * 5) + 1 + Math.min(civ.techLevel, 5),
          cover: 80 + Math.floor(Math.random() * 21),
          mission: null,
          missionTimer: 0,
          alive: true,
        }
        this.assignMission(spy)
        this.spies.push(spy)
      }
    }
  }

  private pickSpyTarget(civ: Civilization, civManager: CivManager): Civilization | null {
    let worst: Civilization | null = null
    let worstRel = 0
    for (const [otherId, rel] of civ.relations) {
      if (rel < worstRel) {
        const other = civManager.civilizations.get(otherId)
        if (other) { worst = other; worstRel = rel }
      }
    }
    return worst
  }

  private assignMission(spy: Spy): void {
    const missions: SpyMission[] = ['steal_tech', 'sabotage', 'incite_revolt', 'assassinate']
    spy.mission = missions[Math.floor(Math.random() * missions.length)]
    spy.missionTimer = 0
  }

  // --- Spy Mission Execution ---

  private executeSpyMissions(civManager: CivManager, em: EntityManager, tick: number): void {
    for (const spy of this.spies) {
      if (!spy.alive || !spy.mission) continue

      const owner = civManager.civilizations.get(spy.ownerCivId)
      const target = civManager.civilizations.get(spy.targetCivId)
      if (!owner || !target) { spy.alive = false; continue }

      // Detection roll: lower cover = higher chance of being caught
      const detectChance = Math.max(0.05, (100 - spy.cover) / 200)
      if (Math.random() < detectChance) {
        this.spyCaught(spy, owner, target, civManager, tick)
        continue
      }

      // Success roll: higher skill = better odds
      const successChance = 0.2 + spy.skill * 0.07
      spy.cover = Math.max(0, spy.cover - (10 - spy.skill))

      if (Math.random() < successChance) {
        this.missionSuccess(spy, owner, target, em, civManager, tick)
      }

      // Reassign after execution
      this.assignMission(spy)
    }

    // Clean up dead spies
    for (let i = this.spies.length - 1; i >= 0; i--) {
      if (!this.spies[i].alive) this.spies.splice(i, 1)
    }
  }

  private missionSuccess(spy: Spy, owner: Civilization, target: Civilization, em: EntityManager, civManager: CivManager, tick: number): void {
    switch (spy.mission) {
      case 'steal_tech': {
        if (target.techLevel > owner.techLevel) {
          owner.research.progress = Math.min(100, owner.research.progress + 15 + spy.skill * 2)
          EventLog.log('diplomacy', `${owner.name}'s spy stole technology from ${target.name}`, tick)
        } else {
          owner.resources.gold += 5 + spy.skill
          EventLog.log('diplomacy', `${owner.name}'s spy gathered intelligence on ${target.name}`, tick)
        }
        break
      }
      case 'sabotage': {
        if (target.buildings.length > 0) {
          const idx = Math.floor(Math.random() * target.buildings.length)
          const bId = target.buildings[idx]
          const b = em.getComponent<BuildingComponent>(bId, 'building')
          if (b) {
            b.health = Math.max(0, b.health - 30 - spy.skill * 3)
            if (b.health <= 0) {
              em.removeEntity(bId)
              target.buildings.splice(idx, 1)
              EventLog.log('diplomacy', `${owner.name}'s spy destroyed a building in ${target.name}!`, tick)
            } else {
              EventLog.log('diplomacy', `${owner.name}'s spy damaged a building in ${target.name}`, tick)
            }
          }
        }
        break
      }
      case 'incite_revolt': {
        target.happiness = Math.max(0, target.happiness - 10 - spy.skill)
        EventLog.log('diplomacy', `${owner.name}'s spy incited unrest in ${target.name}`, tick)
        break
      }
      case 'assassinate': {
        const heroes = em.getEntitiesWithComponent('hero')
        const targetHero = heroes.find(id => {
          const cm = em.getComponent<CivMemberComponent>(id, 'civMember')
          return cm && cm.civId === target.id
        })
        if (targetHero) {
          em.removeEntity(targetHero)
          target.population = Math.max(0, target.population - 1)
          EventLog.log('diplomacy', `${owner.name}'s spy assassinated a hero of ${target.name}!`, tick)
        } else {
          // No hero found, damage morale instead
          target.happiness = Math.max(0, target.happiness - 5)
        }
        break
      }
    }
  }

  private spyCaught(spy: Spy, owner: Civilization, target: Civilization, civManager: CivManager, tick: number): void {
    spy.alive = false
    // Relations worsen significantly
    const rel = target.relations.get(owner.id) ?? 0
    target.relations.set(owner.id, Math.max(-100, rel - 20))
    owner.relations.set(target.id, Math.max(-100, (owner.relations.get(target.id) ?? 0) - 10))

    // Create casus belli
    this.warJustifications.push({
      attackerId: target.id,
      defenderId: owner.id,
      reason: 'spy_caught',
      tick,
    })

    EventLog.log('diplomacy', `${target.name} caught a spy from ${owner.name}! Relations deteriorated`, tick)
  }

  // --- Tribute System ---

  private processTributes(civManager: CivManager, tick: number): void {
    for (const weak of civManager.civilizations.values()) {
      for (const [otherId, rel] of weak.relations) {
        const strong = civManager.civilizations.get(otherId)
        if (!strong) continue

        // Tribute condition: weaker civ with negative-to-neutral relations toward a much stronger one
        const powerRatio = (strong.population * strong.techLevel) / Math.max(1, weak.population * weak.techLevel)
        if (powerRatio < 2.0) continue

        const existing = this.tributes.find(t => t.fromCivId === weak.id && t.toCivId === strong.id)

        // Vassal-like states (very negative power balance) auto-tribute
        if (powerRatio > 3.0 || (rel < -20 && rel > -60)) {
          const amount = Math.floor(Math.min(weak.resources.gold * 0.15, 8))
          if (amount < 1 || weak.resources.gold < amount) {
            // Can't pay — refuse tribute
            if (existing) {
              this.tributeRefused(weak, strong, civManager, tick)
              for (let _i = this.tributes.length - 1; _i >= 0; _i--) { if (!((t) => !(t.fromCivId === weak.id && t.toCivId === strong.id))(this.tributes[_i])) this.tributes.splice(_i, 1) }
            }
            continue
          }

          weak.resources.gold -= amount
          strong.resources.gold += amount

          // Tribute improves relations
          const newRel = Math.min(100, (weak.relations.get(strong.id) ?? 0) + 5)
          weak.relations.set(strong.id, newRel)
          strong.relations.set(weak.id, Math.min(100, (strong.relations.get(weak.id) ?? 0) + 3))

          if (existing) {
            existing.amount = amount
            existing.lastTick = tick
          } else {
            this.tributes.push({ fromCivId: weak.id, toCivId: strong.id, amount, lastTick: tick })
            EventLog.log('trade', `${weak.name} pays tribute to ${strong.name} (${amount} gold)`, tick)
          }
        }
      }
    }
  }

  private tributeRefused(weak: Civilization, strong: Civilization, civManager: CivManager, tick: number): void {
    const rel = strong.relations.get(weak.id) ?? 0
    strong.relations.set(weak.id, Math.max(-100, rel - 15))
    weak.relations.set(strong.id, Math.max(-100, (weak.relations.get(strong.id) ?? 0) - 10))

    this.warJustifications.push({
      attackerId: strong.id,
      defenderId: weak.id,
      reason: 'tribute_refused',
      tick,
    })

    EventLog.log('diplomacy', `${weak.name} refused tribute to ${strong.name}!`, tick)
  }

  // --- Alliance Warfare ---

  private checkAllianceWars(civManager: CivManager, tick: number): void {
    // Check for new wars (relation crossing -50 threshold) and pull in allies
    for (const [, civ] of civManager.civilizations) {
      for (const [otherId, rel] of civ.relations) {
        if (rel > -50) continue
        const enemy = civManager.civilizations.get(otherId)
        if (!enemy) continue

        // Look for allies of the defender
        for (const [allyId, allyRel] of civ.relations) {
          if (allyId === otherId || allyRel < 50) continue
          const ally = civManager.civilizations.get(allyId)
          if (!ally) continue

          const allyVsEnemy = ally.relations.get(otherId) ?? 0
          // Ally already at war or friendly with enemy — skip
          if (allyVsEnemy <= -50 || allyVsEnemy > 30) continue

          // Chance to join the war
          if (Math.random() < ALLIANCE_WAR_CHANCE * 0.01) {
            ally.relations.set(otherId, Math.max(-100, allyVsEnemy - 40))
            enemy.relations.set(allyId, Math.max(-100, (enemy.relations.get(allyId) ?? 0) - 30))
            EventLog.log('war', `${ally.name} joined ${civ.name}'s war against ${enemy.name}!`, tick)
          }
        }
      }
    }
  }

  // --- Casus Belli Queries ---

  hasJustification(attackerId: number, defenderId: number): boolean {
    return this.warJustifications.some(j => j.attackerId === attackerId && j.defenderId === defenderId)
  }

  addBorderConflict(civAId: number, civBId: number, tick: number): void {
    if (!this.warJustifications.some(j => j.reason === 'border_conflict' && j.attackerId === civAId && j.defenderId === civBId)) {
      this.warJustifications.push({ attackerId: civAId, defenderId: civBId, reason: 'border_conflict', tick })
    }
  }

  addReligiousTension(civAId: number, civBId: number, tick: number): void {
    if (!this.warJustifications.some(j => j.reason === 'religious_diff' && j.attackerId === civAId && j.defenderId === civBId)) {
      this.warJustifications.push({ attackerId: civAId, defenderId: civBId, reason: 'religious_diff', tick })
    }
  }

  // --- Public Accessors ---

  getSpies(): Spy[] {
    this._aliveBuf.length = 0
    for (const s of this.spies) { if (s.alive) this._aliveBuf.push(s) }
    return this._aliveBuf
  }
  getSpiesFor(civId: number): Spy[] {
    this._civSpyBuf.length = 0
    for (const s of this.spies) { if (s.ownerCivId === civId && s.alive) this._civSpyBuf.push(s) }
    return this._civSpyBuf
  }
  getTributes(): TributeRecord[] { return this.tributes }
  getJustifications(): WarJustification[] { return this.warJustifications }
}
