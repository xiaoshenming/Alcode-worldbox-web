import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomacySystem } from '../systems/DiplomacySystem'
import type { Treaty, DiplomaticEvent, TreatyType } from '../systems/DiplomacySystem'

function makeDS(): DiplomacySystem {
  return new DiplomacySystem()
}

function makeTreaty(
  id: number,
  type: TreatyType = 'non_aggression',
  broken = false,
  civA = 1,
  civB = 2,
  strength = 50,
  duration = -1,
  startTick = 0
): Treaty {
  return { id, type, civA, civB, startTick, duration, strength, broken }
}

function makeEvent(
  tick: number,
  type: DiplomaticEvent['type'] = 'treaty_signed',
  civA = 1,
  civB = 2
): DiplomaticEvent {
  return { tick, type, civA, civB, description: `Event at tick ${tick}` }
}

describe('DiplomacySystem 初始化状态', () => {
  let ds: DiplomacySystem

  beforeEach(() => { ds = makeDS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始无条约', () => {
    expect((ds as any).treaties).toHaveLength(0)
  })

  it('初始无事件', () => {
    expect((ds as any).events).toHaveLength(0)
  })

  it('treaties 是数组', () => {
    expect(Array.isArray((ds as any).treaties)).toBe(true)
  })

  it('events 是数组', () => {
    expect(Array.isArray((ds as any).events)).toBe(true)
  })

  it('maxEvents 默认为 50', () => {
    expect((ds as any).maxEvents).toBe(50)
  })

  it('_civsBuf 初始为空数组', () => {
    expect(Array.isArray((ds as any)._civsBuf)).toBe(true)
    expect((ds as any)._civsBuf).toHaveLength(0)
  })

  it('_treatyBuf 初始为空数组', () => {
    expect(Array.isArray((ds as any)._treatyBuf)).toBe(true)
    expect((ds as any)._treatyBuf).toHaveLength(0)
  })

  it('_embassySet 初始为空 Map', () => {
    expect((ds as any)._embassySet instanceof Map).toBe(true)
    expect((ds as any)._embassySet.size).toBe(0)
  })
})

describe('DiplomacySystem 条约注入与查询', () => {
  let ds: DiplomacySystem

  beforeEach(() => { ds = makeDS() })
  afterEach(() => vi.restoreAllMocks())

  it('注入未破坏的条约后内部数组有数据', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false))
    expect((ds as any).treaties).toHaveLength(1)
    expect((ds as any).treaties[0].id).toBe(1)
  })

  it('已破坏的条约可以注入', () => {
    ;(ds as any).treaties.push(makeTreaty(2, 'trade_agreement', true))
    expect((ds as any).treaties[0].broken).toBe(true)
  })

  it('混合条约可过滤未破坏的', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false))
    ;(ds as any).treaties.push(makeTreaty(2, 'trade_agreement', true))
    ;(ds as any).treaties.push(makeTreaty(3, 'military_alliance', false))
    const active = (ds as any).treaties.filter((t: Treaty) => !t.broken)
    expect(active).toHaveLength(2)
    expect(active.map((t: Treaty) => t.id)).toEqual([1, 3])
  })

  it('所有合法条约类型都能保存', () => {
    const types: TreatyType[] = ['non_aggression', 'trade_agreement', 'military_alliance', 'vassalage']
    types.forEach((type, i) => { ;(ds as any).treaties.push(makeTreaty(i + 1, type, false)) })
    expect((ds as any).treaties).toHaveLength(4)
  })

  it('non_aggression 条约类型字段正确', () => {
    const t = makeTreaty(1, 'non_aggression', false)
    ;(ds as any).treaties.push(t)
    expect((ds as any).treaties[0].type).toBe('non_aggression')
  })

  it('trade_agreement 条约类型字段正确', () => {
    const t = makeTreaty(2, 'trade_agreement', false)
    ;(ds as any).treaties.push(t)
    expect((ds as any).treaties[0].type).toBe('trade_agreement')
  })

  it('military_alliance 条约类型字段正确', () => {
    const t = makeTreaty(3, 'military_alliance', false)
    ;(ds as any).treaties.push(t)
    expect((ds as any).treaties[0].type).toBe('military_alliance')
  })

  it('vassalage 条约类型字段正确', () => {
    const t = makeTreaty(4, 'vassalage', false)
    ;(ds as any).treaties.push(t)
    expect((ds as any).treaties[0].type).toBe('vassalage')
  })

  it('条约字段 civA 和 civB 正确存储', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 10, 20))
    const t = (ds as any).treaties[0]
    expect(t.civA).toBe(10)
    expect(t.civB).toBe(20)
  })

  it('条约字段 strength 正确存储', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 1, 2, 75))
    expect((ds as any).treaties[0].strength).toBe(75)
  })

  it('条约字段 duration=-1 表示永久', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 1, 2, 50, -1))
    expect((ds as any).treaties[0].duration).toBe(-1)
  })

  it('条约字段 startTick 正确存储', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 1, 2, 50, -1, 100))
    expect((ds as any).treaties[0].startTick).toBe(100)
  })

  it('可以存储多个不同 id 的条约', () => {
    for (let i = 1; i <= 10; i++) {
      ;(ds as any).treaties.push(makeTreaty(i, 'non_aggression', false))
    }
    expect((ds as any).treaties).toHaveLength(10)
    const ids = (ds as any).treaties.map((t: Treaty) => t.id)
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('所有条约都 broken 时过滤结果为空', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', true))
    ;(ds as any).treaties.push(makeTreaty(2, 'trade_agreement', true))
    const active = (ds as any).treaties.filter((t: Treaty) => !t.broken)
    expect(active).toHaveLength(0)
  })
})

describe('DiplomacySystem getActiveTreatiesBetween 私有方法', () => {
  let ds: DiplomacySystem

  beforeEach(() => { ds = makeDS() })
  afterEach(() => vi.restoreAllMocks())

  it('无条约时返回空缓冲区', () => {
    const result = (ds as any).getActiveTreatiesBetween(1, 2)
    expect(result).toHaveLength(0)
  })

  it('双方之间有未破坏条约时返回该条约', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 1, 2))
    const result = (ds as any).getActiveTreatiesBetween(1, 2)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('civA 和 civB 顺序颠倒也能找到条约', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 1, 2))
    const result = (ds as any).getActiveTreatiesBetween(2, 1)
    expect(result).toHaveLength(1)
  })

  it('已破坏的条约不被返回', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', true, 1, 2))
    const result = (ds as any).getActiveTreatiesBetween(1, 2)
    expect(result).toHaveLength(0)
  })

  it('不相关文明对的条约不被返回', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 3, 4))
    const result = (ds as any).getActiveTreatiesBetween(1, 2)
    expect(result).toHaveLength(0)
  })

  it('多条约时只返回指定文明对的条约', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 1, 2))
    ;(ds as any).treaties.push(makeTreaty(2, 'trade_agreement', false, 3, 4))
    ;(ds as any).treaties.push(makeTreaty(3, 'military_alliance', false, 1, 2))
    const result = (ds as any).getActiveTreatiesBetween(1, 2)
    expect(result).toHaveLength(2)
    const ids = result.map((t: Treaty) => t.id)
    expect(ids).toContain(1)
    expect(ids).toContain(3)
  })

  it('_treatyBuf 每次调用时先清空', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false, 1, 2))
    const r1 = (ds as any).getActiveTreatiesBetween(1, 2)
    expect(r1).toHaveLength(1)
    const r2 = (ds as any).getActiveTreatiesBetween(3, 4)
    expect(r2).toHaveLength(0)
  })
})

describe('DiplomacySystem addEvent 私有方法', () => {
  let ds: DiplomacySystem

  beforeEach(() => { ds = makeDS() })
  afterEach(() => vi.restoreAllMocks())

  it('addEvent 增加事件数量', () => {
    ;(ds as any).addEvent(1, 'treaty_signed', 1, 2, '测试事件')
    expect((ds as any).events).toHaveLength(1)
  })

  it('addEvent 存储正确的字段', () => {
    ;(ds as any).addEvent(42, 'treaty_broken', 5, 6, '测试描述')
    const ev = (ds as any).events[0]
    expect(ev.tick).toBe(42)
    expect(ev.type).toBe('treaty_broken')
    expect(ev.civA).toBe(5)
    expect(ev.civB).toBe(6)
    expect(ev.description).toBe('测试描述')
  })

  it('事件超过 maxEvents 时旧事件被移除', () => {
    for (let i = 0; i < 55; i++) {
      ;(ds as any).addEvent(i, 'treaty_signed', 1, 2, `event ${i}`)
    }
    expect((ds as any).events).toHaveLength(50)
  })

  it('事件溢出时最新的事件保留', () => {
    for (let i = 0; i < 55; i++) {
      ;(ds as any).addEvent(i, 'treaty_signed', 1, 2, `event ${i}`)
    }
    const events: DiplomaticEvent[] = (ds as any).events
    expect(events[events.length - 1].tick).toBe(54)
  })

  it('事件溢出时最旧的事件被移除', () => {
    for (let i = 0; i < 55; i++) {
      ;(ds as any).addEvent(i, 'treaty_signed', 1, 2, `event ${i}`)
    }
    const events: DiplomaticEvent[] = (ds as any).events
    expect(events[0].tick).toBe(5)
  })

  it('恰好 50 个事件时不移除', () => {
    for (let i = 0; i < 50; i++) {
      ;(ds as any).addEvent(i, 'treaty_signed', 1, 2, `event ${i}`)
    }
    expect((ds as any).events).toHaveLength(50)
    expect((ds as any).events[0].tick).toBe(0)
  })

  it('所有合法事件类型都能存储', () => {
    const types: DiplomaticEvent['type'][] = [
      'treaty_signed', 'treaty_broken', 'betrayal',
      'embassy_built', 'gift_sent', 'insult', 'marriage'
    ]
    types.forEach((type, i) => {
      ;(ds as any).addEvent(i, type, 1, 2, `${type} 事件`)
    })
    expect((ds as any).events).toHaveLength(7)
    const storedTypes = (ds as any).events.map((e: DiplomaticEvent) => e.type)
    expect(storedTypes).toEqual(types)
  })
})

describe('DiplomacySystem events 数组操作', () => {
  let ds: DiplomacySystem

  beforeEach(() => { ds = makeDS() })
  afterEach(() => vi.restoreAllMocks())

  it('注入事件后 events 增加', () => {
    for (let i = 0; i < 5; i++) {
      ;(ds as any).events.push(makeEvent(i))
    }
    expect((ds as any).events).toHaveLength(5)
  })

  it('events 数组可以 slice 获取最近 N 个', () => {
    for (let i = 0; i < 10; i++) {
      ;(ds as any).events.push(makeEvent(i))
    }
    const last5 = (ds as any).events.slice(-5)
    expect(last5).toHaveLength(5)
    expect(last5[4].tick).toBe(9)
  })

  it('events 按注入顺序排列', () => {
    ;(ds as any).events.push(makeEvent(1))
    ;(ds as any).events.push(makeEvent(2))
    ;(ds as any).events.push(makeEvent(3))
    const ticks = (ds as any).events.map((e: DiplomaticEvent) => e.tick)
    expect(ticks).toEqual([1, 2, 3])
  })

  it('事件可以通过 civA 过滤', () => {
    ;(ds as any).events.push(makeEvent(1, 'treaty_signed', 1, 2))
    ;(ds as any).events.push(makeEvent(2, 'treaty_signed', 3, 4))
    ;(ds as any).events.push(makeEvent(3, 'treaty_signed', 1, 5))
    const civ1Events = (ds as any).events.filter((e: DiplomaticEvent) => e.civA === 1)
    expect(civ1Events).toHaveLength(2)
  })

  it('事件可以通过类型过滤', () => {
    ;(ds as any).events.push(makeEvent(1, 'treaty_signed'))
    ;(ds as any).events.push(makeEvent(2, 'treaty_broken'))
    ;(ds as any).events.push(makeEvent(3, 'betrayal'))
    const signingEvents = (ds as any).events.filter(
      (e: DiplomaticEvent) => e.type === 'treaty_signed'
    )
    expect(signingEvents).toHaveLength(1)
  })
})

describe('DiplomacySystem getCivName 私有方法', () => {
  let ds: DiplomacySystem | undefined

  afterEach(() => vi.restoreAllMocks())

  it('找不到文明时返回 Civ#id 格式', () => {
    const civManager = { civilizations: new Map() } as any
    const name = (ds as any as { getCivName: (id: number, mgr: any) => string })
    // 通过构造新实例访问
    const instance = makeDS()
    const result = (instance as any).getCivName(42, civManager)
    expect(result).toBe('Civ#42')
  })

  it('找到文明时返回文明名称', () => {
    const instance = makeDS()
    const civManager = {
      civilizations: new Map([[7, { name: 'Romans' }]])
    } as any
    const result = (instance as any).getCivName(7, civManager)
    expect(result).toBe('Romans')
  })
})

describe('DiplomacySystem removeTreatyFromCivs 私有方法', () => {
  let ds: DiplomacySystem

  beforeEach(() => { ds = makeDS() })
  afterEach(() => vi.restoreAllMocks())

  it('文明不存在时不报错', () => {
    const treaty = makeTreaty(1, 'non_aggression', false, 1, 2)
    const civManager = { civilizations: new Map() } as any
    expect(() => (ds as any).removeTreatyFromCivs(treaty, civManager)).not.toThrow()
  })

  it('文明存在且包含条约时正确移除', () => {
    const treaty = makeTreaty(10, 'trade_agreement', false, 1, 2)
    const civA = { id: 1, treaties: [10, 20] }
    const civB = { id: 2, treaties: [10, 30] }
    const civManager = {
      civilizations: new Map([[1, civA], [2, civB]])
    } as any
    ;(ds as any).removeTreatyFromCivs(treaty, civManager)
    expect(civA.treaties).toEqual([20])
    expect(civB.treaties).toEqual([30])
  })

  it('文明不包含该条约 id 时不改变数组', () => {
    const treaty = makeTreaty(99, 'non_aggression', false, 1, 2)
    const civA = { id: 1, treaties: [1, 2] }
    const civB = { id: 2, treaties: [3, 4] }
    const civManager = {
      civilizations: new Map([[1, civA], [2, civB]])
    } as any
    ;(ds as any).removeTreatyFromCivs(treaty, civManager)
    expect(civA.treaties).toEqual([1, 2])
    expect(civB.treaties).toEqual([3, 4])
  })
})

describe('DiplomacySystem _embassySet 使馆集合管理', () => {
  let ds: DiplomacySystem

  beforeEach(() => { ds = makeDS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 _embassySet 为空', () => {
    expect((ds as any)._embassySet.size).toBe(0)
  })

  it('可以手动向 _embassySet 添加条目', () => {
    const embassySet = (ds as any)._embassySet as Map<number, Set<number>>
    embassySet.set(1, new Set([2, 3]))
    expect(embassySet.size).toBe(1)
    expect(embassySet.get(1)!.has(2)).toBe(true)
    expect(embassySet.get(1)!.has(3)).toBe(true)
  })

  it('_embassySet 支持 has 操作', () => {
    const embassySet = (ds as any)._embassySet as Map<number, Set<number>>
    embassySet.set(5, new Set([10]))
    expect(embassySet.get(5)?.has(10)).toBe(true)
    expect(embassySet.get(5)?.has(99)).toBe(false)
  })
})

describe('DiplomacySystem 条约结构完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Treaty 对象包含所有必要字段', () => {
    const t = makeTreaty(1)
    expect(t).toHaveProperty('id')
    expect(t).toHaveProperty('type')
    expect(t).toHaveProperty('civA')
    expect(t).toHaveProperty('civB')
    expect(t).toHaveProperty('startTick')
    expect(t).toHaveProperty('duration')
    expect(t).toHaveProperty('strength')
    expect(t).toHaveProperty('broken')
  })

  it('DiplomaticEvent 对象包含所有必要字段', () => {
    const ev = makeEvent(1)
    expect(ev).toHaveProperty('tick')
    expect(ev).toHaveProperty('type')
    expect(ev).toHaveProperty('civA')
    expect(ev).toHaveProperty('civB')
    expect(ev).toHaveProperty('description')
  })

  it('strength 范围 0-100 内的边界值可存储', () => {
    ;(makeDS() as any).treaties.push(makeTreaty(1, 'non_aggression', false, 1, 2, 0))
    ;(makeDS() as any).treaties.push(makeTreaty(2, 'non_aggression', false, 1, 2, 100))
    // 无异常即通过
  })

  it('可以创建新的 DiplomacySystem 实例（无副作用）', () => {
    const a = makeDS()
    const b = makeDS()
    ;(a as any).treaties.push(makeTreaty(1))
    expect((b as any).treaties).toHaveLength(0)
  })
})
