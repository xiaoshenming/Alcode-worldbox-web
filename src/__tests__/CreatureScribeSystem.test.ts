import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureScribeSystem } from '../systems/CreatureScribeSystem'
import type { HistoricalRecord, RecordType } from '../systems/CreatureScribeSystem'

let nextId = 1
function makeSys(): CreatureScribeSystem { return new CreatureScribeSystem() }
function makeRecord(scribeId: number, type: RecordType = 'battle', tick = 0, importance = 70, accuracy = 80): HistoricalRecord {
  return { id: nextId++, scribeId, type, importance, accuracy, civId: 1, tick }
}
function makeEm(entityIds: number[] = []) {
  return {
    getEntitiesWithComponent: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue({ age: 20, civId: 1 }),
  } as any
}

describe('CreatureScribeSystem.getRecords', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无历史记录', () => { expect((sys as any).records).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).records.push(makeRecord(1, 'discovery'))
    expect((sys as any).records[0].type).toBe('discovery')
  })
  it('返回内部引用', () => {
    ;(sys as any).records.push(makeRecord(1))
    expect((sys as any).records).toBe((sys as any).records)
  })
  it('支持所有5种记录类型', () => {
    const types: RecordType[] = ['battle', 'discovery', 'founding', 'disaster', 'treaty']
    types.forEach((t, i) => { ;(sys as any).records.push(makeRecord(i + 1, t)) })
    expect((sys as any).records).toHaveLength(5)
  })
  it('多个全部返回', () => {
    ;(sys as any).records.push(makeRecord(1))
    ;(sys as any).records.push(makeRecord(2))
    expect((sys as any).records).toHaveLength(2)
  })
})

describe('CreatureScribeSystem — CHECK_INTERVAL=2500 节流', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick差值小于CHECK_INTERVAL时不修改lastCheck', () => {
    const em = makeEm([])
    sys.update(1, em, 0)    // lastCheck = 0
    sys.update(1, em, 100)  // 100 < 2500，跳过，lastCheck 仍为 0
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
    sys.update(1, em, 2500) // lastCheck = 2500
    // 2600 - 2500 = 100 < 2500，跳过
    const lc = (sys as any).lastCheck
    sys.update(1, em, 2600)
    expect((sys as any).lastCheck).toBe(lc)
  })

  it('可在CHECK_INTERVAL整数倍时多次触发', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 2500) // 触发，lastCheck=2500
    sys.update(1, em, 5000) // 触发，lastCheck=5000
    expect((sys as any).lastCheck).toBe(5000)
  })
})

describe('CreatureScribeSystem — 记录准确度随时间衰减', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('年龄超过50000时accuracy每次-0.1', () => {
    const r = makeRecord(1, 'battle', 0, 70, 80)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 52500) // age = 52500 > 50000
    expect(r.accuracy).toBeCloseTo(79.9, 5)
  })

  it('年龄未超过50000时accuracy不衰减', () => {
    const r = makeRecord(1, 'battle', 0, 70, 80)
    ;(sys as any).records.push(r)
    const em = makeEm([])
    sys.update(1, em, 0)
    sys.update(1, em, 10000) // age = 10000 < 50000
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
    sys.update(1, em, 50000) // age=50000，条件是 age > 50000，不满足
    expect(r.accuracy).toBe(80)
  })
})

describe('CreatureScribeSystem — 记录上限 MAX_RECORDS=80', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

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
    expect(minImportance).toBe(5) // 保留importance 5..84，共80条
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
})

describe('CreatureScribeSystem — nextId 递增', () => {
  let sys: CreatureScribeSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

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
})
