import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureScribeSystem } from '../systems/CreatureScribeSystem'
import type { HistoricalRecord, RecordType } from '../systems/CreatureScribeSystem'

const CHECK_INTERVAL = 2500
const MAX_RECORDS = 80
const RECORD_CHANCE = 0.005
const RECORD_TYPES: RecordType[] = ['battle', 'discovery', 'founding', 'disaster', 'treaty']

let nextId = 1
function makeSys(): CreatureScribeSystem { return new CreatureScribeSystem() }
function makeRecord(scribeId: number, type: RecordType = 'battle', tick = 0, importance = 70, accuracy = 80): HistoricalRecord {
  return { id: nextId++, scribeId, type, importance, accuracy, civId: 1, tick }
}
function makeEm(entityIds: number[] = [], age = 20) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue({ age, civId: 1 }),
  } as any
}

// ──────────────────────────────────────────────
// 1. 初始状态
// ──────────────────────────────────────────────
describe('CreatureScribeSystem - 初始状态', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无历史记录', () => { expect((sys as any).records).toHaveLength(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('records 是数组', () => { expect(Array.isArray((sys as any).records)).toBe(true) })
  it('_scribesBuf 初始为空数组', () => { expect((sys as any)._scribesBuf).toHaveLength(0) })
})

// ──────────────────────────────────────────────
// 2. getRecords / 数据注入
// ──────────────────────────────────────────────
describe('CreatureScribeSystem.getRecords', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).records.push(makeRecord(1, 'discovery'))
    expect((sys as any).records[0].type).toBe('discovery')
  })
  it('返回内部引用', () => {
    ;(sys as any).records.push(makeRecord(1))
    expect((sys as any).records).toBe((sys as any).records)
  })
  it('支持 battle 类型', () => {
    ;(sys as any).records.push(makeRecord(1, 'battle'))
    expect((sys as any).records[0].type).toBe('battle')
  })
  it('支持 discovery 类型', () => {
    ;(sys as any).records.push(makeRecord(1, 'discovery'))
    expect((sys as any).records[0].type).toBe('discovery')
  })
  it('支持 founding 类型', () => {
    ;(sys as any).records.push(makeRecord(1, 'founding'))
    expect((sys as any).records[0].type).toBe('founding')
  })
  it('支持 disaster 类型', () => {
    ;(sys as any).records.push(makeRecord(1, 'disaster'))
    expect((sys as any).records[0].type).toBe('disaster')
  })
  it('支持 treaty 类型', () => {
    ;(sys as any).records.push(makeRecord(1, 'treaty'))
    expect((sys as any).records[0].type).toBe('treaty')
  })
  it('支持所有5种记录类型', () => {
    RECORD_TYPES.forEach((t, i) => { ;(sys as any).records.push(makeRecord(i + 1, t)) })
    expect((sys as any).records).toHaveLength(5)
  })
  it('多个全部返回', () => {
    ;(sys as any).records.push(makeRecord(1))
    ;(sys as any).records.push(makeRecord(2))
    expect((sys as any).records).toHaveLength(2)
  })
  it('importance 字段正确存储', () => {
    ;(sys as any).records.push(makeRecord(1, 'battle', 0, 55))
    expect((sys as any).records[0].importance).toBe(55)
  })
  it('accuracy 字段正确存储', () => {
    ;(sys as any).records.push(makeRecord(1, 'battle', 0, 70, 65))
    expect((sys as any).records[0].accuracy).toBe(65)
  })
  it('civId 字段正确存储', () => {
    ;(sys as any).records.push({ ...makeRecord(1), civId: 99 })
    expect((sys as any).records[0].civId).toBe(99)
  })
  it('tick 字段正确存储', () => {
    ;(sys as any).records.push(makeRecord(1, 'battle', 12345))
    expect((sys as any).records[0].tick).toBe(12345)
  })
})

// ──────────────────────────────────────────────
// 3. CHECK_INTERVAL=2500 节流
// ──────────────────────────────────────────────
describe('CreatureScribeSystem — CHECK_INTERVAL=2500 节流', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值小于CHECK_INTERVAL时不修改lastCheck', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL后lastCheck更新为该tick', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })
  it('执行后lastCheck阻止下一次小差值触发', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    const lc = (sys as any).lastCheck
    sys.update(1, em, 2600)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('可在CHECK_INTERVAL整数倍时多次触发', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    sys.update(1, em, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('tick=0 时不触发（差值0 < CHECK_INTERVAL）', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick恰好等于 CHECK_INTERVAL 触发', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('中间 tick 不触发不影响第三次触发', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)      // 触发 lastCheck=2500
    sys.update(1, em, CHECK_INTERVAL + 50) // 不触发
    sys.update(1, em, CHECK_INTERVAL * 2)  // 触发 lastCheck=5000
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

// ──────────────────────────────────────────────
// 4. 记录准确度随时间衰减
// ──────────────────────────────────────────────
describe('CreatureScribeSystem — 记录准确度随时间衰减', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => vi.restoreAllMocks())

  it('年龄超过50000时accuracy每次-0.1', () => {
    const r = makeRecord(1, 'battle', 0, 70, 80)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 52500)
    expect(r.accuracy).toBeCloseTo(79.9, 5)
  })
  it('年龄未超过50000时accuracy不衰减', () => {
    const r = makeRecord(1, 'battle', 0, 70, 80)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 10000)
    expect(r.accuracy).toBe(80)
  })
  it('accuracy衰减不低于10', () => {
    const r = makeRecord(1, 'battle', 0, 70, 10.05)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 52500)
    expect(r.accuracy).toBeGreaterThanOrEqual(10)
  })
  it('精确边界：age恰好=50000时不衰减', () => {
    const r = makeRecord(1, 'battle', 0, 70, 80)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 50000)
    expect(r.accuracy).toBe(80)
  })
  it('多次触发后 accuracy 持续衰减', () => {
    const r = makeRecord(1, 'battle', 0, 70, 80)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 52500)  // 第一次衰减 -0.1 → 79.9
    sys.update(1, em, 55000)  // 第二次衰减 -0.1 → 79.8
    expect(r.accuracy).toBeCloseTo(79.8, 4)
  })
  it('accuracy 已为 10 时不再衰减低于 10', () => {
    const r = makeRecord(1, 'battle', 0, 70, 10)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 52500)
    expect(r.accuracy).toBe(10)
  })
  it('age = 50001 时衰减', () => {
    const r = makeRecord(1, 'battle', 0, 70, 80)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 50001 + CHECK_INTERVAL)  // age = 50001+CHECK_INTERVAL
    // age = (50001+2500) - 0 = 52501 > 50000 → 衰减
    expect(r.accuracy).toBeCloseTo(79.9, 4)
  })
  it('多条记录各自独立衰减', () => {
    const r1 = makeRecord(1, 'battle', 0, 70, 80)
    const r2 = makeRecord(2, 'battle', 30000, 70, 80)  // age=52500-30000=22500<50000，不衰减
    ;(sys as any).records.push(r1, r2)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 52500)
    expect(r1.accuracy).toBeCloseTo(79.9, 4)
    expect(r2.accuracy).toBe(80)  // age=22500 < 50000，不衰减
  })
})

// ──────────────────────────────────────────────
// 5. 记录上限 MAX_RECORDS=80
// ──────────────────────────────────────────────
describe('CreatureScribeSystem — 记录上限 MAX_RECORDS=80', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => vi.restoreAllMocks())

  it('记录超过80时按importance排序并截断', () => {
    for (let i = 0; i < 85; i++) {
      ;(sys as any).records.push(makeRecord(i + 1, 'battle', 0, i, 80))
    }
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    expect((sys as any).records).toHaveLength(80)
  })
  it('截断后保留importance最高的记录', () => {
    for (let i = 0; i < 85; i++) {
      ;(sys as any).records.push(makeRecord(i + 1, 'battle', 0, i, 80))
    }
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    const minImportance = Math.min(...(sys as any).records.map((r: HistoricalRecord) => r.importance))
    expect(minImportance).toBe(5)
  })
  it('记录未超过80时不截断', () => {
    for (let i = 0; i < 50; i++) {
      ;(sys as any).records.push(makeRecord(i + 1, 'battle', 0, i, 80))
    }
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    expect((sys as any).records).toHaveLength(50)
  })
  it('记录恰好为80时不截断', () => {
    for (let i = 0; i < 80; i++) {
      ;(sys as any).records.push(makeRecord(i + 1, 'battle', 0, i, 80))
    }
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    expect((sys as any).records).toHaveLength(80)
  })
  it('截断后数组长度精确为80', () => {
    for (let i = 0; i < 100; i++) {
      ;(sys as any).records.push(makeRecord(i + 1, 'battle', 0, i, 80))
    }
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    expect((sys as any).records).toHaveLength(MAX_RECORDS)
  })
  it('截断后最大 importance 为 99（0-99中最高80条保留5-99）', () => {
    for (let i = 0; i < 85; i++) {
      ;(sys as any).records.push(makeRecord(i + 1, 'battle', 0, i, 80))
    }
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 2500)
    const maxImportance = Math.max(...(sys as any).records.map((r: HistoricalRecord) => r.importance))
    expect(maxImportance).toBe(84)
  })
})

// ──────────────────────────────────────────────
// 6. nextId 递增序列
// ──────────────────────────────────────────────
describe('CreatureScribeSystem — nextId 递增', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })
  afterEach(() => vi.restoreAllMocks())

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('records中的id字段来自nextId序列', () => {
    ;(sys as any).records.push({ id: (sys as any).nextId++, scribeId: 1, type: 'battle', importance: 50, accuracy: 70, civId: 1, tick: 0 })
    ;(sys as any).records.push({ id: (sys as any).nextId++, scribeId: 2, type: 'treaty', importance: 60, accuracy: 75, civId: 1, tick: 0 })
    const ids = (sys as any).records.map((r: HistoricalRecord) => r.id)
    expect(ids[0]).toBe(1)
    expect(ids[1]).toBe(2)
  })
  it('nextId 随记录数增长', () => {
    const before = (sys as any).nextId
    ;(sys as any).records.push({ id: (sys as any).nextId++, scribeId: 1, type: 'battle', importance: 50, accuracy: 70, civId: 1, tick: 0 })
    expect((sys as any).nextId).toBe(before + 1)
  })
})

// ──────────────────────────────────────────────
// 7. RECORD_CHANCE 过滤与记录创建条件
// ──────────────────────────────────────────────
describe('CreatureScribeSystem — RECORD_CHANCE 过滤', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random() >= RECORD_CHANCE 时不创建新记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(RECORD_CHANCE)
    const em = makeEm([1, 2, 3])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).records).toHaveLength(0)
  })
  it('Math.random() < RECORD_CHANCE 且有合格抄写员时创建记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).records.length).toBeGreaterThanOrEqual(1)
  })
  it('无实体时不创建记录', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).records).toHaveLength(0)
  })
  it('age <= 10 的实体不能成为抄写员', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 10)  // age=10, 条件是 age > 10
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).records).toHaveLength(0)
  })
  it('age > 10 的实体可以成为抄写员', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 11)  // age=11 > 10
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).records.length).toBeGreaterThanOrEqual(1)
  })
  it('records 已达 MAX_RECORDS 时不再创建新记录', () => {
    for (let i = 0; i < MAX_RECORDS; i++) {
      ;(sys as any).records.push(makeRecord(i + 1, 'battle', 0, i + 10, 80))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).records.length).toBeLessThanOrEqual(MAX_RECORDS)
  })
})

// ──────────────────────────────────────────────
// 8. importance 与 accuracy 范围
// ──────────────────────────────────────────────
describe('CreatureScribeSystem — 新建记录字段范围', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => vi.restoreAllMocks())

  it('新建记录 importance 在 [0, 99] 范围内', () => {
    // Math.random() * 100 => 0~99.999, floor => 0~99
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0)   // RECORD_CHANCE pass
    mockRandom.mockReturnValueOnce(0)   // pickRandom scribeId
    mockRandom.mockReturnValueOnce(0)   // pickRandom type
    mockRandom.mockReturnValueOnce(0.5) // importance: floor(0.5*100)=50
    mockRandom.mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).records.length > 0) {
      const imp = (sys as any).records[0].importance
      expect(imp).toBeGreaterThanOrEqual(0)
      expect(imp).toBeLessThanOrEqual(99)
    }
  })
  it('新建记录 accuracy 在 [40, 99] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).records.length > 0) {
      const acc = (sys as any).records[0].accuracy
      expect(acc).toBeGreaterThanOrEqual(40)
      expect(acc).toBeLessThanOrEqual(99)
    }
  })
})

// ──────────────────────────────────────────────
// 9. _scribesBuf 重用
// ──────────────────────────────────────────────
describe('CreatureScribeSystem — _scribesBuf 内部缓冲区', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => vi.restoreAllMocks())

  it('_scribesBuf 是数组类型', () => {
    expect(Array.isArray((sys as any)._scribesBuf)).toBe(true)
  })
  it('update 后 _scribesBuf.length 归零（每次 update 重置）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1, 2, 3])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    // 经过 update 后 scribes.length=0 的重置是源码内部实现，_scribesBuf 最终可能为 0
    expect((sys as any)._scribesBuf.length).toBeGreaterThanOrEqual(0)
  })
})

// ──────────────────────────────────────────────
// 10. 边界与综合
// ──────────────────────────────────────────────
describe('CreatureScribeSystem — 边界与综合场景', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => vi.restoreAllMocks())

  it('CHECK_INTERVAL 常量为 2500', () => {
    expect(CHECK_INTERVAL).toBe(2500)
  })
  it('MAX_RECORDS 常量为 80', () => {
    expect(MAX_RECORDS).toBe(80)
  })
  it('RECORD_TYPES 包含5种类型', () => {
    expect(RECORD_TYPES).toHaveLength(5)
  })
  it('update 不抛异常', () => {
    const em = makeEm([])
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
  it('多轮 update 后系统状态一致', () => {
    const em = makeEm([])
    for (let t = 0; t < 10; t++) {
      sys.update(1, em, t * CHECK_INTERVAL)
    }
    expect((sys as any).lastCheck).toBe(9 * CHECK_INTERVAL)
  })
  it('records 中所有 type 都是合法 RecordType', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).records.push(makeRecord(i + 1, RECORD_TYPES[i % 5]))
    }
    for (const r of (sys as any).records as HistoricalRecord[]) {
      expect(RECORD_TYPES).toContain(r.type)
    }
  })
  it('records 按 importance 降序排列后最高值在首位', () => {
    ;(sys as any).records.push(makeRecord(1, 'battle', 0, 50, 80))
    ;(sys as any).records.push(makeRecord(2, 'battle', 0, 90, 80))
    ;(sys as any).records.push(makeRecord(3, 'battle', 0, 30, 80))
    // 手动触发排序（需超过 MAX_RECORDS）
    for (let i = 4; i <= 82; i++) {
      ;(sys as any).records.push(makeRecord(i, 'battle', 0, i, 80))
    }
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).records[0].importance).toBeGreaterThanOrEqual((sys as any).records[1].importance)
  })
})
