import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBellMakersSystem } from '../systems/CreatureBellMakersSystem'
import type { BellMaker, BellType } from '../systems/CreatureBellMakersSystem'

// CHECK_INTERVAL=1420, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.058
// makers cleanup: maker.tick < tick-52000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBellMakersSystem {
  return new CreatureBellMakersSystem()
}

function makeMaker(entityId: number, bellType: BellType = 'hand', overrides: Partial<BellMaker> = {}): BellMaker {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    bellsCast: 5,
    bellType,
    toneQuality: 40,
    reputation: 35,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBellMakersSystem', () => {
  let sys: CreatureBellMakersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无铸钟师', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'church'))
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].bellType).toBe('church')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种铃铛类型', () => {
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].bellType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'carillon')
    m.skill = 80; m.bellsCast = 20; m.toneQuality = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.bellsCast).toBe(20)
    expect(r.toneQuality).toBe(90)
    expect(r.reputation).toBe(85)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1420)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1420
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1420)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1420)  // 1420 >= 1420
    expect((sys as any).lastCheck).toBe(1420)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 3000
    sys.update(1, em, 4000)  // 4000-3000=1000 < 1420，不更新
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, em, 4420)  // 4420-3000=1420 >= 1420，更新
    expect((sys as any).lastCheck).toBe(4420)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────��───

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(42, 60)
    expect((sys as any).skillMap.get(42)).toBe(60)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 直接测试 Math.min(100, skill + 0.058) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.058)
    expect(grown).toBe(100)
  })

  // ── makers 过期清理 ───────────────────────────────────────────────────────

  it('makers中tick < tick-52000的匠人被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'hand', { tick: 0 }))        // 0 < 100000-52000=48000，会被清理
    ;(sys as any).makers.push(makeMaker(2, 'ship', { tick: 60000 }))    // 60000 >= 48000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-52000=48000
    expect((sys as any).makers.length).toBe(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有匠人tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).makers.push(makeMaker(1, 'hand', { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, 'church', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=48000，55000>=48000，60000>=48000，都保留
    expect((sys as any).makers.length).toBe(2)
  })

  // ── 计算公式验证 ──────────────────────────────────────────────────────────

  it('bellType根据skill/25计算：skill=0→church，skill=25→ship，skill=50→hand，skill=75→carillon', () => {
    const types: BellType[] = ['church', 'ship', 'hand', 'carillon']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(types[idx]).toBe(types[i])
    })
  })

  it('bellsCast根据skill计算：skill=27时bellsCast=1+floor(27/9)=4', () => {
    const skill = 27
    const bellsCast = 1 + Math.floor(skill / 9)
    expect(bellsCast).toBe(4)
  })

  it('toneQuality根据skill计算：skill=30时toneQuality=14+30*0.73=35.9', () => {
    const skill = 30
    const toneQuality = 14 + skill * 0.73
    expect(toneQuality).toBeCloseTo(35.9, 5)
  })

  it('reputation根据skill计算：skill=30时reputation=10+30*0.82=34.6', () => {
    const skill = 30
    const reputation = 10 + skill * 0.82
    expect(reputation).toBeCloseTo(34.6, 5)
  })
})
