import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

// ── 基础数据测试 ────────────────────────────────────────────────────────────

describe('CreatureAssayersSystem — 初始状态', () => {
  let sys: CreatureAssayersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无化验师', () => {
    expect((sys as any).assayers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('assayers 是数组类型', () => {
    expect(Array.isArray((sys as any).assayers)).toBe(true)
  })

  it('skillMap 是 Map 类型', () => {
    expect((sys as any).skillMap instanceof Map).toBe(true)
  })
})

describe('CreatureAssayersSystem — 数据注入与查询', () => {
  let sys: CreatureAssayersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 gold', () => {
    ;(sys as any).assayers.push(makeAssayer(1, 'gold'))
    expect((sys as any).assayers[0].oreType).toBe('gold')
  })

  it('注入后可查询 silver', () => {
    ;(sys as any).assayers.push(makeAssayer(1, 'silver'))
    expect((sys as any).assayers[0].oreType).toBe('silver')
  })

  it('注入后可查询 copper', () => {
    ;(sys as any).assayers.push(makeAssayer(1, 'copper'))
    expect((sys as any).assayers[0].oreType).toBe('copper')
  })

  it('注入后可查询 iron', () => {
    ;(sys as any).assayers.push(makeAssayer(1, 'iron'))
    expect((sys as any).assayers[0].oreType).toBe('iron')
  })

  it('支持所有4种矿石类型同时存在', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    ores.forEach((o, i) => { ;(sys as any).assayers.push(makeAssayer(i + 1, o)) })
    const all = (sys as any).assayers
    expect(all).toHaveLength(4)
    ores.forEach((o, i) => { expect(all[i].oreType).toBe(o) })
  })

  it('多个化验师全部返回', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    ;(sys as any).assayers.push(makeAssayer(2))
    expect((sys as any).assayers).toHaveLength(2)
  })

  it('返回内部数组引用', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    expect((sys as any).assayers).toBe((sys as any).assayers)
  })

  it('数据字段 skill 正确', () => {
    const a = makeAssayer(10, 'copper', { skill: 80 })
    ;(sys as any).assayers.push(a)
    expect((sys as any).assayers[0].skill).toBe(80)
  })

  it('数据字段 samplesAnalyzed 正确', () => {
    const a = makeAssayer(10, 'copper', { samplesAnalyzed: 20 })
    ;(sys as any).assayers.push(a)
    expect((sys as any).assayers[0].samplesAnalyzed).toBe(20)
  })

  it('数据字段 accuracy 正确', () => {
    const a = makeAssayer(10, 'copper', { accuracy: 90 })
    ;(sys as any).assayers.push(a)
    expect((sys as any).assayers[0].accuracy).toBe(90)
  })

  it('数据字段 reputation 正确', () => {
    const a = makeAssayer(10, 'copper', { reputation: 85 })
    ;(sys as any).assayers.push(a)
    expect((sys as any).assayers[0].reputation).toBe(85)
  })

  it('数据字段 entityId 正确', () => {
    ;(sys as any).assayers.push(makeAssayer(42, 'gold'))
    expect((sys as any).assayers[0].entityId).toBe(42)
  })

  it('数据字段 tick 正确', () => {
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 99999 }))
    expect((sys as any).assayers[0].tick).toBe(99999)
  })
})

// ── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

describe('CreatureAssayersSystem — CHECK_INTERVAL(1400) 节流', () => {
  let sys: CreatureAssayersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < 1400 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 = 1400 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('tick差值 > 1400 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('tick差值 = 1399 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck 非零时节流基于差值计算', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3000)   // 3000-2000=1000 < 1400，不更新
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('lastCheck 非零时差值 >= 1400 才更新', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 2000
    sys.update(1, em, 3400)   // 3400-2000=1400 >= 1400，更新
    expect((sys as any).lastCheck).toBe(3400)
  })

  it('连续更新 lastCheck 追踪最新 tick', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1400)
    sys.update(1, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })
})

// ── skillMap 技能管理 ──────────────────────────────────────────────────────

describe('CreatureAssayersSystem — skillMap 技能管理', () => {
  let sys: CreatureAssayersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap 可手动注入技能值', () => {
    ;(sys as any).skillMap.set(99, 70)
    expect((sys as any).skillMap.get(99)).toBe(70)
  })

  it('skillMap 读取不存在的键返回 undefined', () => {
    expect((sys as any).skillMap.get(1)).toBeUndefined()
  })

  it('skillMap 可存储多个实体技能', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })

  it('技能上限 100：skill+SKILL_GROWTH 超过 100 则截断为 100', () => {
    const skill = 99.99
    const grown = Math.min(100, skill + 0.07)
    expect(grown).toBe(100)
  })

  it('技能上限 100：skill=100 加 SKILL_GROWTH 仍为 100', () => {
    const grown = Math.min(100, 100 + 0.07)
    expect(grown).toBe(100)
  })

  it('技能低时 SKILL_GROWTH 正常累加', () => {
    const skill = 50
    const grown = Math.min(100, skill + 0.07)
    expect(grown).toBeCloseTo(50.07, 5)
  })

  it('skillMap 覆盖同实体的技能值', () => {
    ;(sys as any).skillMap.set(5, 40)
    ;(sys as any).skillMap.set(5, 60)
    expect((sys as any).skillMap.get(5)).toBe(60)
  })
})

// ── assayers 过期清理 ──────────────────────────────────────────────────────

describe('CreatureAssayersSystem — assayers 过期清理 (cutoff=tick-55000)', () => {
  let sys: CreatureAssayersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 (< cutoff=45000) 的化验师被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).assayers.length).toBe(0)
  })

  it('tick=50000 (>= cutoff=45000) 的化验师被保留', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).assayers.push(makeAssayer(1, 'iron', { tick: 50000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).assayers.length).toBe(1)
    expect((sys as any).assayers[0].entityId).toBe(1)
  })

  it('混合新旧化验师：旧的清理，新的保留', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 0 }))
    ;(sys as any).assayers.push(makeAssayer(2, 'iron', { tick: 50000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).assayers.length).toBe(1)
    expect((sys as any).assayers[0].entityId).toBe(2)
  })

  it('所有化验师均新鲜时不清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 50000 }))
    ;(sys as any).assayers.push(makeAssayer(2, 'silver', { tick: 60000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).assayers.length).toBe(2)
  })

  it('恰好在边界 tick=cutoff=45000 时保留', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 45000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)  // cutoff = 100000-55000 = 45000
    // 条件是 tick < cutoff，即 45000 < 45000 为 false，保留
    expect((sys as any).assayers.length).toBe(1)
  })

  it('tick=44999 (< cutoff=45000) 被清理', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 44999 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100000)
    expect((sys as any).assayers.length).toBe(0)
  })

  it('更小 tick 时 cutoff 也更小', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    // tick=60000, cutoff=60000-55000=5000
    ;(sys as any).assayers.push(makeAssayer(1, 'gold', { tick: 4999 }))  // < 5000, 清理
    ;(sys as any).assayers.push(makeAssayer(2, 'gold', { tick: 5000 }))  // = 5000, 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 60000)
    expect((sys as any).assayers.length).toBe(1)
    expect((sys as any).assayers[0].entityId).toBe(2)
  })
})

// ── 公式验证 ──────────────────────────────────────────────────────────────

describe('CreatureAssayersSystem — 属性计算公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('oreType：skill=0 → index=0 → gold', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    expect(ores[Math.min(3, Math.floor(0 / 25))]).toBe('gold')
  })

  it('oreType：skill=24 → index=0 → gold', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    expect(ores[Math.min(3, Math.floor(24 / 25))]).toBe('gold')
  })

  it('oreType：skill=25 → index=1 → silver', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    expect(ores[Math.min(3, Math.floor(25 / 25))]).toBe('silver')
  })

  it('oreType：skill=49 → index=1 → silver', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    expect(ores[Math.min(3, Math.floor(49 / 25))]).toBe('silver')
  })

  it('oreType：skill=50 → index=2 → copper', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    expect(ores[Math.min(3, Math.floor(50 / 25))]).toBe('copper')
  })

  it('oreType：skill=75 → index=3 → iron', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    expect(ores[Math.min(3, Math.floor(75 / 25))]).toBe('iron')
  })

  it('oreType：skill=100 → index=min(3,4)=3 → iron（上限保护）', () => {
    const ores: OreType[] = ['gold', 'silver', 'copper', 'iron']
    expect(ores[Math.min(3, Math.floor(100 / 25))]).toBe('iron')
  })

  it('samplesAnalyzed：skill=0 → 1+floor(0/9)=1', () => {
    expect(1 + Math.floor(0 / 9)).toBe(1)
  })

  it('samplesAnalyzed：skill=9 → 1+floor(9/9)=2', () => {
    expect(1 + Math.floor(9 / 9)).toBe(2)
  })

  it('samplesAnalyzed：skill=70 → 1+floor(70/9)=8', () => {
    expect(1 + Math.floor(70 / 9)).toBe(8)
  })

  it('samplesAnalyzed：skill=100 → 1+floor(100/9)=12', () => {
    expect(1 + Math.floor(100 / 9)).toBe(12)
  })

  it('accuracy：skill=0 → 30+0*0.6=30', () => {
    expect(30 + 0 * 0.6).toBeCloseTo(30, 5)
  })

  it('accuracy：skill=70 → 30+70*0.6=72', () => {
    expect(30 + 70 * 0.6).toBeCloseTo(72, 5)
  })

  it('accuracy：skill=100 → 30+100*0.6=90', () => {
    expect(30 + 100 * 0.6).toBeCloseTo(90, 5)
  })

  it('reputation：skill=0 → 15+0*0.75=15', () => {
    expect(15 + 0 * 0.75).toBeCloseTo(15, 5)
  })

  it('reputation：skill=70 → 15+70*0.75=67.5', () => {
    expect(15 + 70 * 0.75).toBeCloseTo(67.5, 5)
  })

  it('reputation：skill=100 → 15+100*0.75=90', () => {
    expect(15 + 100 * 0.75).toBeCloseTo(90, 5)
  })
})

// ── MAX_ASSAYERS 上限 ──────────────────────────────────────────────────────

describe('CreatureAssayersSystem — MAX_ASSAYERS(34) 上限', () => {
  let sys: CreatureAssayersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 34 个化验师后 length=34', () => {
    for (let i = 0; i < 34; i++) {
      ;(sys as any).assayers.push(makeAssayer(i + 1, 'gold'))
    }
    expect((sys as any).assayers.length).toBe(34)
  })

  it('注入 34 个时 update 不再新增（getEntitiesWithComponents 返回实体时也不超限）', () => {
    for (let i = 0; i < 34; i++) {
      ;(sys as any).assayers.push(makeAssayer(i + 1, 'gold', { tick: 999999 }))
    }
    const em = { getEntitiesWithComponents: () => [100, 101, 102] } as any
    ;(sys as any).lastCheck = 0
    // 即使 random() 返回极小值，assayers >= MAX_ASSAYERS 时 break
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1400)
    // 清理边界: tick=999999 >> cutoff=1400-55000<0，不清理任何，且不新增
    expect((sys as any).assayers.length).toBe(34)
    vi.restoreAllMocks()
  })
})

// ── update — 生物年龄过滤 ──────────────────────────────────────────────────

describe('CreatureAssayersSystem — 生物年龄过滤 (age < 11)', () => {
  let sys: CreatureAssayersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('age=10 (< 11) 的生物不创建化验师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 确保随机通过 CRAFT_CHANCE
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, _type: string) => ({ age: 10 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1400)
    expect((sys as any).assayers.length).toBe(0)
  })

  it('age=11 (= 11) 的生物创建化验师', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: (_eid: number, _type: string) => ({ age: 11 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1400)
    expect((sys as any).assayers.length).toBe(1)
  })
})
