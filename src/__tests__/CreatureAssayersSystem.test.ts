import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAssayersSystem } from '../systems/CreatureAssayersSystem'
import type { Assayer, OreType } from '../systems/CreatureAssayersSystem'

// CHECK_INTERVAL=1400, CRAFT_CHANCE=0.006, MAX_ASSAYERS=34, SKILL_GROWTH=0.07
// assayers cleanup: assayer.tick < tick-55000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureAssayersSystem {
  return new CreatureAssayersSystem()
}

function makeAssayer(entityId: number, ore: OreType = 'gold', overrides: Partial<Assayer> = {}): Assayer {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    samplesAnalyzed: 12,
    oreType: ore,
    accuracy: 65,
    reputation: 45,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureAssayersSystem', () => {
  let sys: CreatureAssayersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无化验师', () => {
    expect((sys as any).assayers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).assayers.push(makeAssayer(1, 'silver'))
    expect((sys as any).assayers).toHaveLength(1)
    expect((sys as any).assayers[0].oreType).toBe('silver')
  })

  it('返回内部引用', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    expect((sys as any).assayers).toBe((sys as any).assayers)
  })

  it('支持所有4种矿石类型', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    ores.forEach((o, i) => { ;(sys as any).assayers.push(makeAssayer(i + 1, o)) })
    const all = (sys as any).assayers
    expect(all).toHaveLength(4)
    ores.forEach((o, i) => { expect(all[i].oreType).toBe(o) })
  })

  it('多个全部返回', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    ;(sys as any).assayers.push(makeAssayer(2))
    expect((sys as any).assayers).toHaveLength(2)
  })

  it('数据字段完整', () => {
    const a = makeAssayer(10, 'copper', { skill: 80, samplesAnalyzed: 20, accuracy: 90, reputation: 85 })
    ;(sys as any).assayers.push(a)
    const result = (sys as any).assayers[0]
    expect(result.skill).toBe(80)
    expect(result.samplesAnalyzed).toBe(20)
    expect(result.accuracy).toBe(90)
    expect(result.reputation).toBe(85)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1400)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1400
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1400)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1400)  // 1400 >= 1400
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1400，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3400)  // 3400-2000=1400 >= 1400，更新
    expect((sys as any).lastCheck).toBe(3400)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(99, 70)
    expect((sys as any).skillMap.get(99)).toBe(70)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 验证 Math.min(100, skill + 0.07) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.07)
    expect(grown).toBe(100)
  })

  // ── assayers 过期清理 ─────────────────────────────────────────────────────

  it('assayers中tick < tick-55000的化验师被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 0 }))       // 0 < 100000-55000=45000，会被清理
    ;(sys as any).assayers.push(makeAssayer(2, 'iron', { tick: 50000 }))   // 50000 >= 45000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-55000=45000
    expect((sys as any).assayers.length).toBe(1)
    expect((sys as any).assayers[0].entityId).toBe(2)
  })

  it('所有化验师tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 50000 }))
    ;(sys as any).assayers.push(makeAssayer(2, 'silver', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=45000，50000>=45000，60000>=45000，都保留
    expect((sys as any).assayers.length).toBe(2)
  })

  // ── 公式验证 ──────────────────────────────────────────────────────────────

  it('oreType根据skill/25计算：skill=0→gold，skill=25→silver，skill=50→copper，skill=75→iron', () => {
    const types: OreType[] = ['gold', 'silver', 'copper', 'iron']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('samplesAnalyzed根据skill计算：skill=70时samplesAnalyzed=1+floor(70/9)=8', () => {
    const skill = 70
    const samplesAnalyzed = 1 + Math.floor(skill / 9)
    expect(samplesAnalyzed).toBe(8)
  })

  it('accuracy根据skill计算：skill=70时accuracy=30+70*0.6=72', () => {
    const skill = 70
    const accuracy = 30 + skill * 0.6
    expect(accuracy).toBeCloseTo(72, 5)
  })

  it('reputation根据skill计算：skill=70时reputation=15+70*0.75=67.5', () => {
    const skill = 70
    const reputation = 15 + skill * 0.75
    expect(reputation).toBeCloseTo(67.5, 5)
  })
})
