// Diplomatic Propaganda System (v2.34) - Civs spread propaganda
// Propaganda influences other civs' loyalty and morale
// Can destabilize enemy civs or boost allied civs

export type PropagandaType = 'fear' | 'glory' | 'prosperity' | 'unity' | 'rebellion'

export interface PropagandaCampaign {
  id: number
  sourceCivId: number
  targetCivId: number
  type: PropagandaType
  intensity: number      // 1-10
  duration: number       // ticks remaining
  effectiveness: number  // 0-100
  startedAt: number
}

const CHECK_INTERVAL = 1000
const EFFECT_INTERVAL = 500
const MAX_CAMPAIGNS = 20
const BASE_DURATION = 3000
const EFFECTIVENESS_GAIN = 2
const MAX_EFFECTIVENESS = 80

let nextCampaignId = 1

const PROPAGANDA_TYPES: PropagandaType[] = ['fear', 'glory', 'prosperity', 'unity', 'rebellion']

export class DiplomaticPropagandaSystem {
  private campaigns: PropagandaCampaign[] = []
  private lastCheck = 0
  private lastEffect = 0

  update(dt: number, civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.launchCampaigns(civManager, tick)
    }
    if (tick - this.lastEffect >= EFFECT_INTERVAL) {
      this.lastEffect = tick
      this.applyEffects(civManager)
      this.cleanupCampaigns()
    }
  }

  private launchCampaigns(civManager: { civilizations: Map<number, any> }, tick: number): void {
    if (this.campaigns.length >= MAX_CAMPAIGNS) return
    const civs = [...civManager.civilizations.entries()]
    for (const [idA, civA] of civs) {
      if (this.campaigns.length >= MAX_CAMPAIGNS) break
      if (Math.random() > 0.08) continue
      // Pick a target
      for (const [idB, civB] of civs) {
        if (idA === idB) continue
        if (this.hasCampaign(idA, idB)) continue
        const rel = civA.relations?.get(idB) ?? 0
        // Hostile civs spread fear/rebellion, friendly spread glory/unity
        let type: PropagandaType
        if (rel < -20) {
          type = Math.random() < 0.5 ? 'fear' : 'rebellion'
        } else if (rel > 20) {
          type = Math.random() < 0.5 ? 'glory' : 'unity'
        } else {
          type = 'prosperity'
        }
        const popA = civA.population ?? 0
        const intensity = Math.min(10, Math.max(1, Math.floor(popA / 5)))
        this.campaigns.push({
          id: nextCampaignId++,
          sourceCivId: idA,
          targetCivId: idB,
          type,
          intensity,
          duration: BASE_DURATION + Math.floor(Math.random() * 1000),
          effectiveness: 10 + Math.floor(Math.random() * 20),
          startedAt: tick,
        })
        break
      }
    }
  }

  private applyEffects(civManager: { civilizations: Map<number, any> }): void {
    for (const campaign of this.campaigns) {
      campaign.duration -= EFFECT_INTERVAL
      campaign.effectiveness = Math.min(MAX_EFFECTIVENESS, campaign.effectiveness + EFFECTIVENESS_GAIN)
      const target = civManager.civilizations.get(campaign.targetCivId)
      const source = civManager.civilizations.get(campaign.sourceCivId)
      if (!target || !source) continue
      // Apply relation effects based on propaganda type
      const currentRel = target.relations?.get(campaign.sourceCivId) ?? 0
      switch (campaign.type) {
        case 'fear':
          if (target.relations) target.relations.set(campaign.sourceCivId, Math.max(-100, currentRel - 1))
          break
        case 'glory':
        case 'unity':
          if (target.relations) target.relations.set(campaign.sourceCivId, Math.min(100, currentRel + 1))
          break
        case 'rebellion':
          // Slight destabilization - no direct effect on relations map
          break
        case 'prosperity':
          if (target.relations) target.relations.set(campaign.sourceCivId, Math.min(100, currentRel + 0.5))
          break
      }
    }
  }

  private cleanupCampaigns(): void {
    this.campaigns = this.campaigns.filter(c => c.duration > 0)
  }

  private hasCampaign(source: number, target: number): boolean {
    return this.campaigns.some(c => c.sourceCivId === source && c.targetCivId === target)
  }

  getCampaigns(): PropagandaCampaign[] {
    return this.campaigns
  }

  getCampaignCount(): number {
    return this.campaigns.length
  }
}
