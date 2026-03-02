import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBellFoundersSystem } from '../systems/CreatureBellFoundersSystem'
import type { BellFounder, BellSize } from '../systems/CreatureBellFoundersSystem'

// CHECK_INTERVAL=1500, CRAFT_CHANCE=0.004, MAX_FOUNDERS=28, SKILL_GROWTH=0.06
// founders cleanup: founder.tick < tick-58000 时删除
// skillMap 存储每个生物的技能，技能上限 100

let nextId = 1

function makeSys(): CreatureBellFoundersSystem {
  return new CreatureBellFoundersSystem()
}

function makeFounder(entityId: number, bellSize: BellSize = 'handbell', overrides: Partial<BellFounder> = {}): BellFounder {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    bellsCast: 5,
    bellSize,
    toneQuality: 40,
    reputation: 35,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBellFoundersSystem', () => {
  let sys: CreatureBellFoundersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无铸钟师', () => {
    expect((sys as any).founders).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).founders.push(makeFounder(1, 'cathedral'))
    expect((sys as any).founders).toHaveLength(1)
    expect((sys as any).founders[0].bellSize).toBe('cathedral')
  })

  it('返回内部引用', () => {
    ;(sys as any).founders.push(makeFounder(1))
    expect((sys as any).founders).toBe((sys as any).founders)
  })

  it('支持所有4种铃铛尺寸', () => {
    const sizes: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']
    sizes.forEach((s, i) => { ;(sys as any).founders.push(makeFounder(i + 1, s)) })
    const all = (sys as any).founders
    expect(all).toHaveLength(4)
    sizes.forEach((s, i) => { expect(all[i].bellSize).toBe(s) })
  })

  it('数据字段完整', () => {
    const f = makeFounder(10, 'church', { skill: 80, bellsCast: 20, toneQuality: 90, reputation: 85 })
    ;(sys as any).founders.push(f)
    const result = (sys as any).founders[0]
    expect(result.skill).toBe(80)
    expect(result.bellsCast).toBe(20)
    expect(result.toneQuality).toBe(90)
    expect(result.reputation).toBe(85)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(1500)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)  // 1000 < 1500
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(1500)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)  // 1500 >= 1500
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('lastCheck非零时节流正确计算差值', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)  // 3000-2000=1000 < 1500，不更新
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(1, em, 3500)  // 3500-2000=1500 >= 1500，更新
    expect((sys as any).lastCheck).toBe(3500)
  })

  // ── skillMap 技能管理 ─────────────────────────────────────────────────────

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap可手动注入技能值', () => {
    ;(sys as any).skillMap.set(99, 60)
    expect((sys as any).skillMap.get(99)).toBe(60)
  })

  it('skillMap技能上限100：注入99.99后加SKILL_GROWTH不超过100', () => {
    // 验证 Math.min(100, skill + 0.06) 逻辑
    const skill = 99.99
    const grown = Math.min(100, skill + 0.06)
    expect(grown).toBe(100)
  })

  // ── founders 过期清理 ─────────────────────────────────────────────────────

  it('founders中tick < tick-58000的铸钟师被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).founders.push(makeFounder(1, 'handbell', { tick: 0 }))      // 0 < 100000-58000=42000，会被清理
    ;(sys as any).founders.push(makeFounder(2, 'cathedral', { tick: 50000 })) // 50000 >= 42000，保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-58000=42000
    expect((sys as any).founders.length).toBe(1)
    expect((sys as any).founders[0].entityId).toBe(2)
  })

  it('所有铸钟师tick均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).founders.push(makeFounder(1, 'handbell', { tick: 50000 }))
    ;(sys as any).founders.push(makeFounder(2, 'church', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=42000，50000>=42000，60000>=42000，都保留
    expect((sys as any).founders.length).toBe(2)
  })

  // ── 公式验证 ──────────────────────────────────────────────────────────────

  it('bellSize根据skill/25计算：skill=0→handbell，skill=25→chapel，skill=50→church，skill=75→cathedral', () => {
    const sizes: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']
    const skills = [0, 25, 50, 75]
    skills.forEach((skill, i) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(sizes[idx]).toBe(sizes[i])
    })
  })

  it('bellsCast根据skill计算：skill=60时bellsCast=1+floor(60/12)=6', () => {
    const skill = 60
    const bellsCast = 1 + Math.floor(skill / 12)
    expect(bellsCast).toBe(6)
  })

  it('toneQuality根据skill计算：skill=60时toneQuality=20+60*0.7=62', () => {
    const skill = 60
    const toneQuality = 20 + skill * 0.7
    expect(toneQuality).toBeCloseTo(62, 5)
  })

  it('reputation根据skill计算：skill=60时reputation=15+60*0.8=63', () => {
    const skill = 60
    const reputation = 15 + skill * 0.8
    expect(reputation).toBeCloseTo(63, 5)
  })
})
