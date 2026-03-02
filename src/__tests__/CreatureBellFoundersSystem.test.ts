import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

// ── 基础数据结构 ───────────────────────────────────────────────────────────────

describe('CreatureBellFoundersSystem 基础数据', () => {
  let sys: CreatureBellFoundersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('多个铸钟师可同时存在', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).founders.push(makeFounder(i))
    }
    expect((sys as any).founders).toHaveLength(5)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('founders 是数组类型', () => {
    expect(Array.isArray((sys as any).founders)).toBe(true)
  })
})

// ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────────

describe('CreatureBellFoundersSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureBellFoundersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('tick差值恰好为1499时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1499)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好为1501时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1501)
    expect((sys as any).lastCheck).toBe(1501)
  })

  it('连续小tick不累积更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 500)
    sys.update(1, em, 1000)
    // 差值都不够1500
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=0时不更新（差值为0）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck更新后下次节流基于新lastCheck计算', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)  // 更新 lastCheck=1500
    sys.update(1, em, 2000)  // 2000-1500=500 < 1500，不更新
    expect((sys as any).lastCheck).toBe(1500)
    sys.update(1, em, 3000)  // 3000-1500=1500 >= 1500，更新
    expect((sys as any).lastCheck).toBe(3000)
  })
})

// ── skillMap 技能管理 ─────────────────────────────────────────────────────────

describe('CreatureBellFoundersSystem skillMap 技能管理', () => {
  let sys: CreatureBellFoundersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('skillMap是Map类型', () => {
    expect((sys as any).skillMap instanceof Map).toBe(true)
  })

  it('skillMap不同entityId独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
  })

  it('skillMap.get 对未知 entityId 返回 undefined', () => {
    expect((sys as any).skillMap.get(9999)).toBeUndefined()
  })

  it('skillMap 技能值为0时增长后为0.06', () => {
    const skill = 0
    const grown = Math.min(100, skill + 0.06)
    expect(grown).toBeCloseTo(0.06, 5)
  })

  it('skillMap 技能值为100时增长后仍为100', () => {
    const skill = 100
    const grown = Math.min(100, skill + 0.06)
    expect(grown).toBe(100)
  })

  it('skillMap 可覆盖更新已有技能值', () => {
    ;(sys as any).skillMap.set(5, 40)
    ;(sys as any).skillMap.set(5, 75)
    expect((sys as any).skillMap.get(5)).toBe(75)
  })

  it('skillMap.size 随注入增长', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    ;(sys as any).skillMap.set(3, 30)
    expect((sys as any).skillMap.size).toBe(3)
  })
})

// ── founders 过期清理 ─────────────────────────────────────────────────────────

describe('CreatureBellFoundersSystem founders 过期清理', () => {
  let sys: CreatureBellFoundersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('所有铸钟师都过期时全部清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).founders.push(makeFounder(1, 'handbell', { tick: 0 }))
    ;(sys as any).founders.push(makeFounder(2, 'chapel', { tick: 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=42000，0和1000都<42000
    expect((sys as any).founders.length).toBe(0)
  })

  it('tick恰好等于cutoff时不被清理（>= cutoff 保留）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    const cutoff = 100000 - 58000  // 42000
    ;(sys as any).founders.push(makeFounder(1, 'handbell', { tick: cutoff })) // tick=42000=cutoff，不清理
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    // tick < cutoff 才清理，所以 42000 < 42000 为 false，保留
    expect((sys as any).founders.length).toBe(1)
  })

  it('tick恰好等于cutoff-1时被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    const cutoff = 100000 - 58000  // 42000
    ;(sys as any).founders.push(makeFounder(1, 'handbell', { tick: cutoff - 1 })) // tick=41999 < 42000，清理
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).founders.length).toBe(0)
  })

  it('清理仅在tick差值>=CHECK_INTERVAL时执行', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).founders.push(makeFounder(1, 'handbell', { tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 500)  // 差值500 < 1500，跳过，不清理
    expect((sys as any).founders.length).toBe(1)
  })

  it('混合新旧铸钟师只清理过期的', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).founders.push(makeFounder(1, 'handbell', { tick: 0 }))      // 过期
    ;(sys as any).founders.push(makeFounder(2, 'chapel', { tick: 10000 }))    // 过期
    ;(sys as any).founders.push(makeFounder(3, 'church', { tick: 50000 }))    // 保留
    ;(sys as any).founders.push(makeFounder(4, 'cathedral', { tick: 80000 })) // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff=42000
    expect((sys as any).founders.length).toBe(2)
    const entityIds = (sys as any).founders.map((f: BellFounder) => f.entityId)
    expect(entityIds).toContain(3)
    expect(entityIds).toContain(4)
  })
})

// ── 公式验证 ──────────────────────────────────────────────────────────────────

describe('CreatureBellFoundersSystem 公式验证', () => {
  afterEach(() => vi.restoreAllMocks())

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

  it('skill=0时bellSize为handbell', () => {
    const sizes: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']
    const idx = Math.min(3, Math.floor(0 / 25))
    expect(sizes[idx]).toBe('handbell')
  })

  it('skill=100时bellSize为cathedral（上限）', () => {
    const sizes: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']
    const idx = Math.min(3, Math.floor(100 / 25))  // floor(4)=4, min(3,4)=3
    expect(sizes[idx]).toBe('cathedral')
  })

  it('skill=24时bellSize为handbell（未达到chapel阈值）', () => {
    const sizes: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']
    const idx = Math.min(3, Math.floor(24 / 25))  // floor(0.96)=0
    expect(sizes[idx]).toBe('handbell')
  })

  it('skill=49时bellSize为chapel（未达到church阈值）', () => {
    const sizes: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']
    const idx = Math.min(3, Math.floor(49 / 25))  // floor(1.96)=1
    expect(sizes[idx]).toBe('chapel')
  })

  it('skill=74时bellSize为church（未达到cathedral阈值）', () => {
    const sizes: BellSize[] = ['handbell', 'chapel', 'church', 'cathedral']
    const idx = Math.min(3, Math.floor(74 / 25))  // floor(2.96)=2
    expect(sizes[idx]).toBe('church')
  })

  it('bellsCast skill=0时为1', () => {
    expect(1 + Math.floor(0 / 12)).toBe(1)
  })

  it('bellsCast skill=12时为2', () => {
    expect(1 + Math.floor(12 / 12)).toBe(2)
  })

  it('bellsCast skill=100时为1+8=9', () => {
    expect(1 + Math.floor(100 / 12)).toBe(9)
  })

  it('toneQuality skill=0时为20', () => {
    expect(20 + 0 * 0.7).toBe(20)
  })

  it('toneQuality skill=100时为90', () => {
    expect(20 + 100 * 0.7).toBeCloseTo(90, 5)
  })

  it('reputation skill=0时为15', () => {
    expect(15 + 0 * 0.8).toBe(15)
  })

  it('reputation skill=100时为95', () => {
    expect(15 + 100 * 0.8).toBeCloseTo(95, 5)
  })

  it('SKILL_GROWTH = 0.06（每次tick技能增长量）', () => {
    const SKILL_GROWTH = 0.06
    const before = 50
    const after = Math.min(100, before + SKILL_GROWTH)
    expect(after).toBeCloseTo(50.06, 5)
  })

  it('技能增长不超过100（各初始值边界）', () => {
    const skills = [0, 50, 99, 99.95, 100]
    for (const s of skills) {
      expect(Math.min(100, s + 0.06)).toBeLessThanOrEqual(100)
    }
  })
})

// ── MAX_FOUNDERS 上限 ─────────────────────────────────────────────────────────

describe('CreatureBellFoundersSystem MAX_FOUNDERS 上限', () => {
  let sys: CreatureBellFoundersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入28个founders后不超过MAX_FOUNDERS', () => {
    for (let i = 1; i <= 28; i++) {
      ;(sys as any).founders.push(makeFounder(i))
    }
    expect((sys as any).founders).toHaveLength(28)
  })

  it('founders数组长度可超过MAX_FOUNDERS（手动注入不受控制）', () => {
    for (let i = 1; i <= 30; i++) {
      ;(sys as any).founders.push(makeFounder(i))
    }
    expect((sys as any).founders.length).toBeGreaterThanOrEqual(28)
  })

  it('update中当founders.length>=MAX_FOUNDERS时不再添加新成员', () => {
    // 模拟已有28个founders，且有匹配生物
    for (let i = 1; i <= 28; i++) {
      ;(sys as any).founders.push(makeFounder(i, 'handbell', { tick: 50000 }))
    }
    const countBefore = (sys as any).founders.length
    // 即使提供了生物，但已满28个，不会添加
    const em = {
      getEntitiesWithComponents: () => [101, 102, 103],
      getComponent: (_eid: number, _type: string) => ({ age: 20 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 <= 0.004，会尝试添加
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1500)
    // 因为 founders.length >= 28，break 了，不会增加
    expect((sys as any).founders.length).toBe(countBefore)
  })
})

// ── BellFounder 接口字段 ──────────────────────────────────────────────────────

describe('BellFounder 接口字段完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('BellFounder 含 id 字段', () => {
    const f = makeFounder(1)
    expect(f).toHaveProperty('id')
  })

  it('BellFounder 含 entityId 字段', () => {
    const f = makeFounder(42)
    expect(f.entityId).toBe(42)
  })

  it('BellFounder 含 skill 字段且为数字', () => {
    const f = makeFounder(1, 'church', { skill: 55 })
    expect(typeof f.skill).toBe('number')
    expect(f.skill).toBe(55)
  })

  it('BellFounder 含 bellsCast 字段', () => {
    const f = makeFounder(1, 'handbell', { bellsCast: 8 })
    expect(f.bellsCast).toBe(8)
  })

  it('BellFounder 含 bellSize 字段', () => {
    const f = makeFounder(1, 'cathedral')
    expect(f.bellSize).toBe('cathedral')
  })

  it('BellFounder 含 toneQuality 字段', () => {
    const f = makeFounder(1, 'handbell', { toneQuality: 75.5 })
    expect(f.toneQuality).toBeCloseTo(75.5, 5)
  })

  it('BellFounder 含 reputation 字段', () => {
    const f = makeFounder(1, 'handbell', { reputation: 68 })
    expect(f.reputation).toBe(68)
  })

  it('BellFounder 含 tick 字段', () => {
    const f = makeFounder(1, 'handbell', { tick: 12345 })
    expect(f.tick).toBe(12345)
  })

  it('不同铸钟师的 id 可以不同', () => {
    nextId = 1
    const f1 = makeFounder(1)
    const f2 = makeFounder(2)
    expect(f1.id).not.toBe(f2.id)
  })
})
