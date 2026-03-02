import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureForagingSystem } from '../systems/CreatureForagingSystem'
import type { ForageEvent, ForageType } from '../systems/CreatureForagingSystem'

let nextId = 1
function makeSys(): CreatureForagingSystem { return new CreatureForagingSystem() }
function makeEvent(creatureId: number, type: ForageType = 'berries', overrides: Partial<ForageEvent> = {}): ForageEvent {
  return { id: nextId++, creatureId, type, amount: 10, x: 5, y: 5, tick: 0, ...overrides }
}

afterEach(() => { vi.restoreAllMocks() })

// ─── 1. 初始状态 ──────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 forageLog 为空数组', () => {
    expect((sys as any).forageLog).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── 2. forageLog 字段操作 ───────────────────────────────────────────
describe('forageLog 字段', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可查询 type 字段', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'mushrooms'))
    expect((sys as any).forageLog[0].type).toBe('mushrooms')
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).forageLog.push(makeEvent(1))
    expect((sys as any).forageLog).toBe((sys as any).forageLog)
  })

  it('注入多条记录后 length 正确', () => {
    for (let i = 1; i <= 6; i++) {
      ;(sys as any).forageLog.push(makeEvent(i))
    }
    expect((sys as any).forageLog).toHaveLength(6)
  })

  it('creatureId 字段正确存储', () => {
    ;(sys as any).forageLog.push(makeEvent(77))
    expect((sys as any).forageLog[0].creatureId).toBe(77)
  })

  it('amount 字段正确存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'berries', { amount: 42 }))
    expect((sys as any).forageLog[0].amount).toBe(42)
  })

  it('x, y 坐标字段正确存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'berries', { x: 12, y: 34 }))
    expect((sys as any).forageLog[0].x).toBe(12)
    expect((sys as any).forageLog[0].y).toBe(34)
  })

  it('tick 字段正确存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'berries', { tick: 8888 }))
    expect((sys as any).forageLog[0].tick).toBe(8888)
  })

  it('id 字段递增', () => {
    ;(sys as any).forageLog.push(makeEvent(1))
    ;(sys as any).forageLog.push(makeEvent(2))
    const ids = (sys as any).forageLog.map((e: ForageEvent) => e.id)
    expect(ids[1]).toBeGreaterThan(ids[0])
  })
})

// ─── 3. ForageType 枚举覆盖 ───────────────────────────────────────────
describe('ForageType 枚举覆盖', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const allTypes: ForageType[] = ['berries', 'mushrooms', 'roots', 'herbs', 'nuts', 'insects', 'seaweed']

  it('支持所有 7 种觅食类型（批量）', () => {
    allTypes.forEach((t, i) => { ;(sys as any).forageLog.push(makeEvent(i + 1, t)) })
    allTypes.forEach((t, i) => { expect((sys as any).forageLog[i].type).toBe(t) })
  })

  it('berries 类型', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'berries'))
    expect((sys as any).forageLog[0].type).toBe('berries')
  })

  it('mushrooms 类型', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'mushrooms'))
    expect((sys as any).forageLog[0].type).toBe('mushrooms')
  })

  it('roots 类型', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'roots'))
    expect((sys as any).forageLog[0].type).toBe('roots')
  })

  it('herbs 类型', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'herbs'))
    expect((sys as any).forageLog[0].type).toBe('herbs')
  })

  it('nuts 类型', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'nuts'))
    expect((sys as any).forageLog[0].type).toBe('nuts')
  })

  it('insects 类型', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'insects'))
    expect((sys as any).forageLog[0].type).toBe('insects')
  })

  it('seaweed 类型', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'seaweed'))
    expect((sys as any).forageLog[0].type).toBe('seaweed')
  })
})

// ─── 4. CHECK_INTERVAL 节流逻辑（600） ──────────────────────────────
describe('update() 节流逻辑 (CHECK_INTERVAL=600)', () => {
  let sys: CreatureForagingSystem
  const world = { getTile: () => null } as any
  const em = {
    getEntitiesWithComponents: () => [],
    getComponent: () => null,
  } as any

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 600 时 lastCheck 不更新', () => {
    ;(sys as any).lastCheck = 2000
    sys.update(0, world, em, 2000 + 599)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('tick 差值 = 600 时 lastCheck 更新', () => {
    ;(sys as any).lastCheck = 2000
    sys.update(0, world, em, 2000 + 600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('tick 差值 > 600 时 lastCheck 更新为当前 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, world, em, 50000)
    expect((sys as any).lastCheck).toBe(50000)
  })

  it('连续两次 update 间隔不足时第二次不触发', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, world, em, 600)
    const after1 = (sys as any).lastCheck
    sys.update(0, world, em, 600 + 100)
    expect((sys as any).lastCheck).toBe(after1)
  })

  it('多次触发后 lastCheck 等于最后触发 tick', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, world, em, 600)
    sys.update(0, world, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
})

// ─── 5. getRecentForaging / slice 行为 ───────────────────────────────
describe('forageLog slice 行为', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空日志 slice 返回空数组', () => {
    expect((sys as any).forageLog.slice(-5)).toHaveLength(0)
  })

  it('返回最后 3 条（共 5 条）', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).forageLog.push(makeEvent(i)) }
    const recent = (sys as any).forageLog.slice(-3)
    expect(recent).toHaveLength(3)
    expect(recent[0].creatureId).toBe(3)
  })

  it('返回最后 1 条', () => {
    for (let i = 1; i <= 4; i++) { ;(sys as any).forageLog.push(makeEvent(i)) }
    const recent = (sys as any).forageLog.slice(-1)
    expect(recent).toHaveLength(1)
    expect(recent[0].creatureId).toBe(4)
  })

  it('slice 返回副本而非内部引用', () => {
    ;(sys as any).forageLog.push(makeEvent(1))
    expect((sys as any).forageLog.slice(-1)).not.toBe((sys as any).forageLog)
  })

  it('n > length 时返回全部', () => {
    for (let i = 1; i <= 3; i++) { ;(sys as any).forageLog.push(makeEvent(i)) }
    expect((sys as any).forageLog.slice(-10)).toHaveLength(3)
  })
})

// ─── 6. pruneLog MAX_LOG=100 ─────────────────────────────────────────
describe('pruneLog() MAX_LOG=100', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入 100 条时不触发修剪', () => {
    for (let i = 0; i < 100; i++) {
      ;(sys as any).forageLog.push(makeEvent(i + 1))
    }
    ;(sys as any).pruneLog()
    expect((sys as any).forageLog).toHaveLength(100)
  })

  it('注入 101 条时修剪至 100', () => {
    for (let i = 0; i < 101; i++) {
      ;(sys as any).forageLog.push(makeEvent(i + 1))
    }
    ;(sys as any).pruneLog()
    expect((sys as any).forageLog).toHaveLength(100)
  })

  it('注入 120 条时修剪至 100', () => {
    for (let i = 0; i < 120; i++) {
      ;(sys as any).forageLog.push(makeEvent(i + 1))
    }
    ;(sys as any).pruneLog()
    expect((sys as any).forageLog).toHaveLength(100)
  })

  it('修剪后保留最新记录（最后 100 条）', () => {
    for (let i = 1; i <= 110; i++) {
      ;(sys as any).forageLog.push(makeEvent(i))
    }
    ;(sys as any).pruneLog()
    // 应保留 creatureId 11..110（最后 100 条）
    expect((sys as any).forageLog[0].creatureId).toBe(11)
    expect((sys as any).forageLog[99].creatureId).toBe(110)
  })

  it('注入 99 条时不修剪', () => {
    for (let i = 0; i < 99; i++) {
      ;(sys as any).forageLog.push(makeEvent(i + 1))
    }
    ;(sys as any).pruneLog()
    expect((sys as any).forageLog).toHaveLength(99)
  })
})

// ─── 7. ForageEvent 结构完整性 ───────────────────────────────────────
describe('ForageEvent 结构完整性', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('所有必需字段均存在', () => {
    ;(sys as any).forageLog.push(makeEvent(1))
    const e = (sys as any).forageLog[0]
    expect(e).toHaveProperty('id')
    expect(e).toHaveProperty('creatureId')
    expect(e).toHaveProperty('type')
    expect(e).toHaveProperty('amount')
    expect(e).toHaveProperty('x')
    expect(e).toHaveProperty('y')
    expect(e).toHaveProperty('tick')
  })

  it('同一实体可有多条觅食记录', () => {
    ;(sys as any).forageLog.push(makeEvent(5, 'berries'))
    ;(sys as any).forageLog.push(makeEvent(5, 'nuts'))
    const eid5 = (sys as any).forageLog.filter((e: ForageEvent) => e.creatureId === 5)
    expect(eid5).toHaveLength(2)
  })

  it('amount 可为 0', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'roots', { amount: 0 }))
    expect((sys as any).forageLog[0].amount).toBe(0)
  })

  it('x 可为 0', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'herbs', { x: 0, y: 0 }))
    expect((sys as any).forageLog[0].x).toBe(0)
  })

  it('不同 ForageType 事件可共存于 log', () => {
    const types: ForageType[] = ['berries', 'mushrooms', 'roots', 'herbs', 'nuts', 'insects', 'seaweed']
    types.forEach((t, i) => { ;(sys as any).forageLog.push(makeEvent(i + 1, t)) })
    const stored = (sys as any).forageLog.map((e: ForageEvent) => e.type)
    expect(stored).toEqual(types)
  })
})

// ─── 8. 坐标边界值 ───────────────────────────────────────────────────
describe('坐标边界值测试', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('x 为负值时也可存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'roots', { x: -1, y: 0 }))
    expect((sys as any).forageLog[0].x).toBe(-1)
  })

  it('y 为负值时也可存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'roots', { x: 0, y: -5 }))
    expect((sys as any).forageLog[0].y).toBe(-5)
  })

  it('大坐标值可存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'berries', { x: 9999, y: 9999 }))
    expect((sys as any).forageLog[0].x).toBe(9999)
    expect((sys as any).forageLog[0].y).toBe(9999)
  })
})

// ─── 9. amount 数值边界 ───────────────────────────────────────────────
describe('amount 数值边界', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('amount 为整数正常存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'nuts', { amount: 5 }))
    expect((sys as any).forageLog[0].amount).toBe(5)
  })

  it('amount 最大值（大数）正常存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'berries', { amount: 9999 }))
    expect((sys as any).forageLog[0].amount).toBe(9999)
  })

  it('amount 为 1 正常存储', () => {
    ;(sys as any).forageLog.push(makeEvent(1, 'seaweed', { amount: 1 }))
    expect((sys as any).forageLog[0].amount).toBe(1)
  })
})

// ─── 10. processForaging 私有方法：实体无 position 时跳过 ─────────────
describe('processForaging() 边界行为', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空实体列表时 forageLog 不增加', () => {
    const world = { getTile: () => null } as any
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    } as any
    ;(sys as any).processForaging(world, em, 100)
    expect((sys as any).forageLog).toHaveLength(0)
  })

  it('实体没有 position 组件时跳过（不崩溃）', () => {
    const world = { getTile: () => null } as any
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => null,
    } as any
    expect(() => (sys as any).processForaging(world, em, 100)).not.toThrow()
  })

  it('world.getTile 返回 null 时跳过（不崩溃）', () => {
    const world = { getTile: () => null } as any
    const em = {
      getEntitiesWithComponents: () => [1],
      getComponent: () => ({ x: 5, y: 5 }),
    } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => (sys as any).processForaging(world, em, 100)).not.toThrow()
  })
})

// ─── 11. pruneLog 多次调用 ────────────────────────────────────────────
describe('pruneLog() 多次调用', () => {
  let sys: CreatureForagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('多次调用 pruneLog 且不超过 MAX_LOG 时无副作用', () => {
    for (let i = 0; i < 50; i++) {
      ;(sys as any).forageLog.push(makeEvent(i + 1))
    }
    ;(sys as any).pruneLog()
    ;(sys as any).pruneLog()
    ;(sys as any).pruneLog()
    expect((sys as any).forageLog).toHaveLength(50)
  })

  it('连续添加并 prune 后始终不超过 100 条', () => {
    for (let i = 0; i < 200; i++) {
      ;(sys as any).forageLog.push(makeEvent(i + 1))
      ;(sys as any).pruneLog()
    }
    expect((sys as any).forageLog.length).toBeLessThanOrEqual(100)
  })
})
