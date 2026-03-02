import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBeastMasterSystem } from '../systems/CreatureBeastMasterSystem'
import type { BeastMasterRecord, BeastBond } from '../systems/CreatureBeastMasterSystem'

let nextId = 1

function makeBMSys(): CreatureBeastMasterSystem {
  return new CreatureBeastMasterSystem()
}

function makeRecord(
  masterId: number,
  beastId: number,
  loyalty = 50,
  bond: BeastBond = 'companion',
  trainingLevel = 40,
): BeastMasterRecord {
  return { id: nextId++, masterId, beastId, bond, loyalty, trainingLevel, tick: 0 }
}

// ─── 初始化状态 ─────────────────────────────────────────────────────────────
describe('CreatureBeastMasterSystem 初始化状态', () => {
  let sys: CreatureBeastMasterSystem
  beforeEach(() => { sys = makeBMSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 records 为空数组', () => {
    expect((sys as any).records).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 _bondsBuf 为空数组', () => {
    expect((sys as any)._bondsBuf).toHaveLength(0)
  })

  it('实例化不抛异常', () => {
    expect(() => new CreatureBeastMasterSystem()).not.toThrow()
  })

  it('是 CreatureBeastMasterSystem 实例', () => {
    expect(sys).toBeInstanceOf(CreatureBeastMasterSystem)
  })
})

// ─── records 数据结构 ────────────────────────────────────────────────────────
describe('BeastMasterRecord 数据结构', () => {
  let sys: CreatureBeastMasterSystem
  beforeEach(() => { sys = makeBMSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('记录包含所有必要字段', () => {
    const r = makeRecord(1, 100, 75, 'war_mount', 60)
    expect(r).toHaveProperty('id')
    expect(r).toHaveProperty('masterId')
    expect(r).toHaveProperty('beastId')
    expect(r).toHaveProperty('bond')
    expect(r).toHaveProperty('loyalty')
    expect(r).toHaveProperty('trainingLevel')
    expect(r).toHaveProperty('tick')
  })

  it('loyalty 范围 0-100 可被存储', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 0))
    ;(sys as any).records.push(makeRecord(2, 101, 100))
    expect((sys as any).records[0].loyalty).toBe(0)
    expect((sys as any).records[1].loyalty).toBe(100)
  })

  it('trainingLevel 范围 0-100 可被存储', () => {
    const r = makeRecord(1, 100, 50, 'companion', 100)
    ;(sys as any).records.push(r)
    expect((sys as any).records[0].trainingLevel).toBe(100)
  })

  it('tick 字段记录正确时间点', () => {
    const r = makeRecord(5, 200)
    r.tick = 9999
    ;(sys as any).records.push(r)
    expect((sys as any).records[0].tick).toBe(9999)
  })

  it('注入记录后 records 引用不变', () => {
    const ref = (sys as any).records
    ;(sys as any).records.push(makeRecord(1, 100))
    expect((sys as any).records).toBe(ref)
  })
})

// ─── BeastBond 纽带类型 ──────────────────────────────────────────────────────
describe('BeastBond 5 种纽带类型', () => {
  let sys: CreatureBeastMasterSystem
  beforeEach(() => { sys = makeBMSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('companion 纽带可存储', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 50, 'companion'))
    expect((sys as any).records[0].bond).toBe('companion')
  })

  it('war_mount 纽带可存储', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 50, 'war_mount'))
    expect((sys as any).records[0].bond).toBe('war_mount')
  })

  it('pack_animal 纽带可存储', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 50, 'pack_animal'))
    expect((sys as any).records[0].bond).toBe('pack_animal')
  })

  it('scout 纽带可存储', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 50, 'scout'))
    expect((sys as any).records[0].bond).toBe('scout')
  })

  it('guardian 纽带可存储', () => {
    ;(sys as any).records.push(makeRecord(1, 100, 50, 'guardian'))
    expect((sys as any).records[0].bond).toBe('guardian')
  })

  it('5 种纽带类型全部添加后长度为 5', () => {
    const bonds: BeastBond[] = ['companion', 'war_mount', 'pack_animal', 'scout', 'guardian']
    bonds.forEach((b, i) => { ;(sys as any).records.push(makeRecord(i + 1, i + 100, 50, b)) })
    expect((sys as any).records).toHaveLength(5)
  })

  it('5 种纽带类型对应正确', () => {
    const bonds: BeastBond[] = ['companion', 'war_mount', 'pack_animal', 'scout', 'guardian']
    bonds.forEach((b, i) => { ;(sys as any).records.push(makeRecord(i + 1, i + 100, 50, b)) })
    bonds.forEach((b, i) => { expect((sys as any).records[i].bond).toBe(b) })
  })
})

// ─── getMasterBonds ──────────────────────────────────────────────────────────
describe('getMasterBonds(masterId)', () => {
  let sys: CreatureBeastMasterSystem
  beforeEach(() => { sys = makeBMSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无记录时返回空数组', () => {
    expect(sys.getMasterBonds(1)).toHaveLength(0)
  })

  it('masterId 不存在时返回空数组', () => {
    ;(sys as any).records.push(makeRecord(1, 100))
    expect(sys.getMasterBonds(999)).toHaveLength(0)
  })

  it('只返回指定 masterId 的记录', () => {
    ;(sys as any).records.push(makeRecord(1, 100))
    ;(sys as any).records.push(makeRecord(2, 101))
    ;(sys as any).records.push(makeRecord(1, 102))
    expect(sys.getMasterBonds(1)).toHaveLength(2)
  })

  it('其他 masterId 的记录不混入', () => {
    ;(sys as any).records.push(makeRecord(1, 100))
    ;(sys as any).records.push(makeRecord(2, 101))
    const bonds = sys.getMasterBonds(1)
    expect(bonds.every((r: BeastMasterRecord) => r.masterId === 1)).toBe(true)
  })

  it('单条记录匹配时返回长度1', () => {
    ;(sys as any).records.push(makeRecord(5, 200))
    expect(sys.getMasterBonds(5)).toHaveLength(1)
  })

  it('复用内部 _bondsBuf（两次调用引用相同）', () => {
    ;(sys as any).records.push(makeRecord(1, 100))
    const r1 = sys.getMasterBonds(1)
    const r2 = sys.getMasterBonds(1)
    expect(r1).toBe(r2)
  })

  it('_bondsBuf 在两次调用间被清空', () => {
    ;(sys as any).records.push(makeRecord(1, 100))
    ;(sys as any).records.push(makeRecord(1, 101))
    sys.getMasterBonds(1)
    // 第二次只查 masterId=2（无结果）
    ;(sys as any).records.push(makeRecord(2, 200))
    const bonds2 = sys.getMasterBonds(2)
    expect(bonds2).toHaveLength(1)
  })

  it('masterId=3 时三条记录均被返回', () => {
    ;(sys as any).records.push(makeRecord(3, 100))
    ;(sys as any).records.push(makeRecord(3, 101))
    ;(sys as any).records.push(makeRecord(3, 102))
    expect(sys.getMasterBonds(3)).toHaveLength(3)
  })

  it('返回记录的 beastId 正确', () => {
    ;(sys as any).records.push(makeRecord(7, 777, 60, 'scout'))
    const bonds = sys.getMasterBonds(7)
    expect(bonds[0].beastId).toBe(777)
  })

  it('多 masterId 时各自独立统计', () => {
    for (let i = 0; i < 3; i++) { ;(sys as any).records.push(makeRecord(1, 100 + i)) }
    for (let i = 0; i < 2; i++) { ;(sys as any).records.push(makeRecord(2, 200 + i)) }
    expect(sys.getMasterBonds(1)).toHaveLength(3)
    expect(sys.getMasterBonds(2)).toHaveLength(2)
  })
})

// ─── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────
describe('update() 节流逻辑（CHECK_INTERVAL=800）', () => {
  let sys: CreatureBeastMasterSystem
  beforeEach(() => { sys = makeBMSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 差值 < 800 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 799)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 = 800 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 800)
    expect((sys as any).lastCheck).toBe(800)
  })

  it('tick 差值 > 800 时更新 lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('lastCheck 为非零时基准偏移正确', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 5799)
    expect((sys as any).lastCheck).toBe(5000) // 799 < 800，不更新
  })

  it('lastCheck 为非零时刚好满足时更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 5800)
    expect((sys as any).lastCheck).toBe(5800)
  })

  it('连续触发：第一次更新后第二次 tick 不足则跳过', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 800)
    expect((sys as any).lastCheck).toBe(800)
    sys.update(1, em, 1500) // 700 < 800
    expect((sys as any).lastCheck).toBe(800)
  })

  it('连续触发：第一次更新后第二次 tick 满足则更新', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 800)
    sys.update(1, em, 1600)
    expect((sys as any).lastCheck).toBe(1600)
  })
})

// ─── pruneOld（MAX_RECORDS=60）─────────────────────────────────────────────
describe('pruneOld() 截断逻辑（MAX_RECORDS=60）', () => {
  let sys: CreatureBeastMasterSystem
  beforeEach(() => { sys = makeBMSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('记录数 <= 60 时不截断', () => {
    for (let i = 0; i < 60; i++) { ;(sys as any).records.push(makeRecord(i + 1, i + 100)) }
    ;(sys as any).pruneOld()
    expect((sys as any).records).toHaveLength(60)
  })

  it('记录数 = 61 时截断到 60', () => {
    for (let i = 0; i < 61; i++) { ;(sys as any).records.push(makeRecord(i + 1, i + 100)) }
    ;(sys as any).pruneOld()
    expect((sys as any).records).toHaveLength(60)
  })

  it('记录数 = 80 时截断到 60', () => {
    for (let i = 0; i < 80; i++) { ;(sys as any).records.push(makeRecord(i + 1, i + 100)) }
    ;(sys as any).pruneOld()
    expect((sys as any).records).toHaveLength(60)
  })

  it('截断后保留最新记录（删除头部旧记录）', () => {
    for (let i = 0; i < 65; i++) { ;(sys as any).records.push(makeRecord(i + 1, i + 100)) }
    ;(sys as any).pruneOld()
    const recs = (sys as any).records
    expect(recs[0].id).toBe(6)
    expect(recs[59].id).toBe(65)
  })

  it('空记录时 pruneOld 不崩溃', () => {
    expect(() => { ;(sys as any).pruneOld() }).not.toThrow()
    expect((sys as any).records).toHaveLength(0)
  })

  it('恰好 60 条时 pruneOld 不删除任何记录', () => {
    for (let i = 1; i <= 60; i++) { ;(sys as any).records.push(makeRecord(i, i + 100)) }
    ;(sys as any).pruneOld()
    expect((sys as any).records[0].id).toBe(1)
    expect((sys as any).records[59].id).toBe(60)
  })
})

// ─── trainBeasts ─────────────────────────────────────────────────────────────
describe('trainBeasts() 训练逻辑', () => {
  let sys: CreatureBeastMasterSystem
  beforeEach(() => { sys = makeBMSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('训练后 trainingLevel 增加（不超过 100）', () => {
    const r = makeRecord(1, 100, 50, 'companion', 50)
    ;(sys as any).records.push(r)
    ;(sys as any).trainBeasts()
    expect((sys as any).records[0].trainingLevel).toBeGreaterThanOrEqual(50)
    expect((sys as any).records[0].trainingLevel).toBeLessThanOrEqual(100)
  })

  it('训练后 loyalty 增加（不超过 100）', () => {
    const r = makeRecord(1, 100, 50, 'companion', 50)
    ;(sys as any).records.push(r)
    ;(sys as any).trainBeasts()
    expect((sys as any).records[0].loyalty).toBeGreaterThanOrEqual(50)
    expect((sys as any).records[0].loyalty).toBeLessThanOrEqual(100)
  })

  it('trainingLevel = 100 时不超过上限', () => {
    const r = makeRecord(1, 100, 50, 'companion', 100)
    ;(sys as any).records.push(r)
    ;(sys as any).trainBeasts()
    expect((sys as any).records[0].trainingLevel).toBe(100)
  })

  it('loyalty = 100 时不超过上限', () => {
    const r = makeRecord(1, 100, 100, 'companion', 50)
    ;(sys as any).records.push(r)
    ;(sys as any).trainBeasts()
    expect((sys as any).records[0].loyalty).toBe(100)
  })

  it('多条记录时每条都被训练', () => {
    for (let i = 0; i < 3; i++) { ;(sys as any).records.push(makeRecord(i + 1, i + 100, 50, 'companion', 50)) }
    ;(sys as any).trainBeasts()
    for (const rec of (sys as any).records) {
      expect(rec.trainingLevel).toBeGreaterThanOrEqual(50)
      expect(rec.loyalty).toBeGreaterThanOrEqual(50)
    }
  })
})

// ─── update() 整体集成 ───────────────────────────────────────────────────────
describe('update() 整体集成测试', () => {
  let sys: CreatureBeastMasterSystem
  beforeEach(() => { sys = makeBMSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空实体列表时 records 不变', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    sys.update(1, em, 800)
    expect((sys as any).records).toHaveLength(0)
  })

  it('tick < CHECK_INTERVAL 时不调用 getEntitiesWithComponents', () => {
    const fn = vi.fn().mockReturnValue([])
    const em = { getEntitiesWithComponents: fn } as any
    sys.update(1, em, 700)
    expect(fn).not.toHaveBeenCalled()
  })

  it('tick >= CHECK_INTERVAL 时调用 getEntitiesWithComponents', () => {
    const fn = vi.fn().mockReturnValue([])
    const em = { getEntitiesWithComponents: fn } as any
    sys.update(1, em, 800)
    expect(fn).toHaveBeenCalledWith('creature')
  })

  it('单实体（无法驯服，两个不同生物才能组成纽带）时 records 仍为空', () => {
    // 只有 1 个实体时 entities.length < 2，不创建记录
    const em = { getEntitiesWithComponents: () => [1] } as any
    // 不 mock random，让 random > TAME_CHANCE 自然跳过
    sys.update(1, em, 800)
    expect((sys as any).records).toHaveLength(0)
  })

  it('update 不抛异常（空实体列表）', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    expect(() => sys.update(1, em, 800)).not.toThrow()
  })

  it('nextId 初始为 1，update 节流期间不变', () => {
    const em = { getEntitiesWithComponents: () => [] } as any
    const initId = (sys as any).nextId
    sys.update(1, em, 500) // 节流，不触发
    expect((sys as any).nextId).toBe(initId)
  })
})
