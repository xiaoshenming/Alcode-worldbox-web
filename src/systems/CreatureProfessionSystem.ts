/**
 * CreatureProfessionSystem - 生物职业系统
 *
 * 生物根据自身属性和所在文明需求自动分配职业。
 * 职业提供不同加成，可从 apprentice 升级到 master。
 * 按 Shift+P 查看职业信息面板。
 */
import { EntityManager, EntityId, CreatureComponent, GeneticsComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { CivManager } from '../civilization/CivManager'

type ProfessionType = 'farmer' | 'miner' | 'builder' | 'soldier' | 'merchant' | 'scholar' | 'priest' | 'blacksmith'
type ProfessionRank = 'apprentice' | 'journeyman' | 'master'

interface ProfessionData {
  type: ProfessionType
  rank: ProfessionRank
  experience: number
  assignedTick: number
  expStr: string   // cached display string — rebuilt when Math.floor(experience) changes
  _prevExpFloor: number
}

const RANK_THRESHOLDS: Record<ProfessionRank, number> = { apprentice: 0, journeyman: 100, master: 300 }
const RANK_MULTIPLIER: Record<ProfessionRank, number> = { apprentice: 1.0, journeyman: 1.3, master: 1.6 }

/** 加成键名 */
type BonusKey = 'foodOutput' | 'combatDamage' | 'buildSpeed' | 'miningRate' | 'tradeIncome' | 'researchRate' | 'faithGain' | 'craftQuality'
type ProfessionBonus = Record<BonusKey, number>
const BONUS_KEYS: BonusKey[] = ['foodOutput', 'combatDamage', 'buildSpeed', 'miningRate', 'tradeIncome', 'researchRate', 'faithGain', 'craftQuality']
const NEUTRAL_BONUS: ProfessionBonus = { foodOutput: 1, combatDamage: 1, buildSpeed: 1, miningRate: 1, tradeIncome: 1, researchRate: 1, faithGain: 1, craftQuality: 1 }

/** 每个职业的主要加成键和加成值，其余键为 1.0 */
const PROFESSION_PRIMARY: Record<ProfessionType, { key: BonusKey; val: number }[]> = {
  farmer:     [{ key: 'foodOutput', val: 1.5 }],
  miner:      [{ key: 'miningRate', val: 1.5 }],
  builder:    [{ key: 'buildSpeed', val: 1.5 }],
  soldier:    [{ key: 'combatDamage', val: 1.5 }],
  merchant:   [{ key: 'tradeIncome', val: 1.5 }],
  scholar:    [{ key: 'researchRate', val: 1.5 }],
  priest:     [{ key: 'faithGain', val: 1.5 }],
  blacksmith: [{ key: 'combatDamage', val: 1.2 }, { key: 'craftQuality', val: 1.5 }],
}

const PROFESSION_LABELS: Record<ProfessionType, string> = {
  farmer: '农夫', miner: '矿工', builder: '建筑师', soldier: '士兵',
  merchant: '商人', scholar: '学者', priest: '祭司', blacksmith: '铁匠',
}
const RANK_LABELS: Record<ProfessionRank, string> = { apprentice: '学徒', journeyman: '熟练工', master: '大师' }
const PROFESSION_COLORS: Record<ProfessionType, string> = {
  farmer: '#7cb342', miner: '#8d6e63', builder: '#ffa726', soldier: '#ef5350',
  merchant: '#ffca28', scholar: '#42a5f5', priest: '#ab47bc', blacksmith: '#78909c',
}
const BONUS_LABELS: Record<BonusKey, string> = {
  foodOutput: '食物产出', combatDamage: '战斗伤害', buildSpeed: '建造速度', miningRate: '采矿效率',
  tradeIncome: '贸易收入', researchRate: '研究速度', faithGain: '信仰增长', craftQuality: '制造品质',
}

const ALL_PROFESSIONS: ProfessionType[] = ['farmer', 'miner', 'builder', 'soldier', 'merchant', 'scholar', 'priest', 'blacksmith']
const ASSIGN_INTERVAL = 120
const XP_INTERVAL = 30
const PANEL_W = 360, PANEL_H = 320, HEADER_H = 36

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v }

function buildBonus(profType: ProfessionType, rank: ProfessionRank): ProfessionBonus {
  const bonus = { ...NEUTRAL_BONUS }
  const mult = RANK_MULTIPLIER[rank]
  for (const { key, val } of PROFESSION_PRIMARY[profType]) {
    bonus[key] = 1 + (val - 1) * mult
  }
  return bonus
}

export class CreatureProfessionSystem {
  private professions: Map<number, ProfessionData> = new Map()
  private civManager: CivManager | null = null
  private visible = false
  private panelX = 140
  private panelY = 70
  private selectedEntity = -1
  // Pre-allocated map for assignProfessions grouping (every 120 ticks)
  private _byCivBuf: Map<number, EntityId[]> = new Map()
  // Pre-allocated needs/aptitude buffers — avoids 2 Record object literals per entity per 120 ticks
  private _needsBuf: Record<ProfessionType, number> = { farmer: 0, miner: 0, builder: 0, soldier: 0, merchant: 0, scholar: 0, priest: 0, blacksmith: 0 }
  private _aptitudeBuf: Record<ProfessionType, number> = { farmer: 0, miner: 0, builder: 0, soldier: 0, merchant: 0, scholar: 0, priest: 0, blacksmith: 0 }
  /** Pre-allocated bonus percentage strings — rebuilt per render to avoid toFixed in loop */
  private _bonusPctStrs: Record<BonusKey, string> = {
    foodOutput: '0', combatDamage: '0', buildSpeed: '0', miningRate: '0',
    tradeIncome: '0', researchRate: '0', faithGain: '0', craftQuality: '0',
  }

  setCivManager(cm: CivManager): void { this.civManager = cm }
  setSelectedEntity(id: number): void { this.selectedEntity = id }

  /** 获取生物职业 */
  getProfession(entityId: number): ProfessionData | undefined {
    return this.professions.get(entityId)
  }

  /** 获取职业加成（含等级倍率） */
  getBonus(entityId: number): ProfessionBonus {
    const prof = this.professions.get(entityId)
    if (!prof) return { ...NEUTRAL_BONUS }
    return buildBonus(prof.type, prof.rank)
  }

  /** 移除实体 */
  remove(entityId: number): void { this.professions.delete(entityId) }

  /** 主更新 */
  update(dt: number, em: EntityManager, tick: number): void {
    if (tick % ASSIGN_INTERVAL === 0) this.assignProfessions(em, tick)
    if (tick % XP_INTERVAL === 0) this.gainExperience(em)
    this.cleanup(em)
  }

  private assignProfessions(em: EntityManager, tick: number): void {
    const civCreatures = em.getEntitiesWithComponents('creature', 'civMember', 'position')
    const byCiv = this._byCivBuf
    // Clear map and all cached arrays before reuse
    for (const arr of byCiv.values()) arr.length = 0
    byCiv.clear()
    for (const id of civCreatures) {
      if (this.professions.has(id)) continue
      const civ = em.getComponent<CivMemberComponent>(id, 'civMember')
      if (!civ) continue
      let list = byCiv.get(civ.civId)
      if (!list) { list = []; byCiv.set(civ.civId, list) }
      list.push(id)
    }
    for (const [civId, entities] of byCiv) {
      const needs = this.assessCivNeeds(civId)
      for (const id of entities) {
        const best = this.pickBestProfession(em, id, needs)
        this.professions.set(id, { type: best, rank: 'apprentice', experience: 0, assignedTick: tick, expStr: `经验: 0 / 100`, _prevExpFloor: 0 })
      }
    }
  }

  private assessCivNeeds(civId: number): Record<ProfessionType, number> {
    const w = this._needsBuf
    w.farmer = 3; w.miner = 1; w.builder = 1; w.soldier = 2; w.merchant = 1; w.scholar = 1; w.priest = 1; w.blacksmith = 1
    if (!this.civManager) return w
    const civ = this.civManager.civilizations.get(civId)
    if (!civ) return w
    if (civ.resources.food < 30) w.farmer += 4
    for (const [, rel] of civ.relations) {
      if (rel < -30) { w.soldier += 3; w.blacksmith += 1; break }
    }
    if (civ.techLevel >= 3) w.scholar += 2
    if (civ.religion.temples > 0) w.priest += 2
    if (civ.tradeRoutes.length > 0) w.merchant += 2
    if (civ.resources.wood > 50 && civ.resources.stone > 20) w.builder += 2
    if (civ.resources.stone > 0 || civ.resources.gold > 0) w.miner += 1
    return w
  }

  private pickBestProfession(em: EntityManager, entityId: EntityId, needs: Record<ProfessionType, number>): ProfessionType {
    const genetics = em.getComponent<GeneticsComponent>(entityId, 'genetics')
    const creature = em.getComponent<CreatureComponent>(entityId, 'creature')
    const a = this._aptitudeBuf
    a.farmer = 1; a.miner = 1; a.builder = 1; a.soldier = 1; a.merchant = 1; a.scholar = 1; a.priest = 1; a.blacksmith = 1
    if (genetics) {
      const t = genetics.traits
      a.farmer += t.vitality * 0.5 + t.strength * 0.3
      a.miner += t.strength * 0.6 + t.vitality * 0.3
      a.builder += t.strength * 0.4 + t.intelligence * 0.4
      a.soldier += t.strength * 0.5 + t.agility * 0.4
      a.merchant += t.intelligence * 0.4 + t.agility * 0.3
      a.scholar += t.intelligence * 0.7
      a.priest += t.intelligence * 0.3 + t.longevity * 0.3
      a.blacksmith += t.strength * 0.5 + t.intelligence * 0.3
    }
    if (creature) {
      if (creature.damage > 8) a.soldier += 1.5
      if (creature.speed > 3) a.merchant += 1.0
    }
    let bestType: ProfessionType = 'farmer'
    let bestScore = -Infinity
    for (const prof of ALL_PROFESSIONS) {
      const score = needs[prof] * a[prof] + Math.random() * 2
      if (score > bestScore) { bestScore = score; bestType = prof }
    }
    return bestType
  }

  private gainExperience(em: EntityManager): void {
    for (const [entityId, prof] of this.professions) {
      if (!em.hasComponent(entityId, 'creature')) continue
      const genetics = em.getComponent<GeneticsComponent>(entityId, 'genetics')
      prof.experience += 1 + (genetics ? genetics.traits.intelligence * 0.5 : 0)
      if (prof.rank === 'apprentice' && prof.experience >= RANK_THRESHOLDS.journeyman) {
        prof.rank = 'journeyman'
      } else if (prof.rank === 'journeyman' && prof.experience >= RANK_THRESHOLDS.master) {
        prof.rank = 'master'
      }
      const expFloor = Math.floor(prof.experience)
      if (expFloor !== prof._prevExpFloor) {
        prof._prevExpFloor = expFloor
        const nextRank: ProfessionRank | null = prof.rank === 'apprentice' ? 'journeyman' : prof.rank === 'journeyman' ? 'master' : null
        const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank] : RANK_THRESHOLDS.master
        prof.expStr = `经验: ${expFloor} / ${nextRank ? nextThreshold : 'MAX'}`
      }
    }
  }

  private cleanup(em: EntityManager): void {
    for (const id of this.professions.keys()) {
      if (!em.hasComponent(id, 'creature')) this.professions.delete(id)
    }
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'P') { this.visible = !this.visible; return true }
    return false
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const px = this.panelX, py = this.panelY
    const prof = this.professions.get(this.selectedEntity)

    ctx.fillStyle = 'rgba(8,10,15,0.93)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()
    ctx.fillStyle = 'rgba(40,50,70,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#b0d0ff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left'
    ctx.fillText('\u2692 \u751F\u7269\u804C\u4E1A', px + 12, py + 24)

    if (!prof) {
      ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
      ctx.fillText('\u672A\u9009\u4E2D\u751F\u7269\u6216\u65E0\u804C\u4E1A', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'; return
    }

    let drawY = py + HEADER_H + 20
    const color = PROFESSION_COLORS[prof.type]
    ctx.fillStyle = color; ctx.font = 'bold 16px monospace'
    ctx.fillText(PROFESSION_LABELS[prof.type], px + 16, drawY)
    ctx.fillStyle = '#ccc'; ctx.font = '13px monospace'
    ctx.fillText(`- ${RANK_LABELS[prof.rank]}`, px + 80, drawY)
    drawY += 28

    const nextRank: ProfessionRank | null = prof.rank === 'apprentice' ? 'journeyman' : prof.rank === 'journeyman' ? 'master' : null
    const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank] : RANK_THRESHOLDS.master
    const progress = nextRank ? clamp(prof.experience / nextThreshold, 0, 1) : 1
    ctx.fillStyle = '#aac'; ctx.font = '12px monospace'
    ctx.fillText(prof.expStr, px + 16, drawY)
    drawY += 16
    const barX = px + 16, barW = PANEL_W - 32, barH = 10
    ctx.fillStyle = 'rgba(40,45,55,0.6)'; ctx.fillRect(barX, drawY, barW, barH)
    ctx.fillStyle = color; ctx.fillRect(barX, drawY, barW * progress, barH)
    drawY += 28

    ctx.fillStyle = '#8ab'; ctx.font = '12px monospace'
    ctx.fillText('\u804C\u4E1A\u52A0\u6210:', px + 16, drawY)
    drawY += 20
    const bonus = this.getBonus(this.selectedEntity)
    // Pre-compute percentage strings to avoid toFixed in loop
    for (const key of BONUS_KEYS) {
      const val = bonus[key]
      this._bonusPctStrs[key] = ((val - 1) * 100).toFixed(0)
    }
    for (const key of BONUS_KEYS) {
      const val = bonus[key]
      ctx.fillStyle = val > 1.01 ? '#aed581' : '#666'; ctx.font = '11px monospace'
      ctx.fillText(`  ${BONUS_LABELS[key]}: ${val >= 1 ? '+' : ''}${this._bonusPctStrs[key]}%`, px + 16, drawY)
      drawY += 18
    }
    ctx.textAlign = 'left'
  }
}
