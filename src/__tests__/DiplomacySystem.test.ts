import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomacySystem } from '../systems/DiplomacySystem'
import type { Treaty, DiplomaticEvent, TreatyType } from '../systems/DiplomacySystem'

// DiplomacySystem 测试：
// - getTreaties()       → 返回未破坏的条约过滤结果
// - getEvents(count)    → 返回最近 count 个外交事件
// 通过 as any 注入私有字段 treaties/events 进行测试。

function makeDS(): DiplomacySystem {
  return new DiplomacySystem()
}

function makeTreaty(id: number, type: TreatyType = 'non_aggression', broken = false): Treaty {
  return { id, type, civA: 1, civB: 2, startTick: 0, duration: -1, strength: 50, broken }
}

function makeEvent(tick: number, type: DiplomaticEvent['type'] = 'treaty_signed'): DiplomaticEvent {
  return { tick, type, civA: 1, civB: 2, description: `Event at tick ${tick}` }
}

// ── getTreaties ───────────────────────────────────────────────────────────────

describe('DiplomacySystem.getTreaties', () => {
  let ds: DiplomacySystem

  beforeEach(() => {
    ds = makeDS()
  })

  it('初始无条约', () => {
    expect(ds.getTreaties()).toHaveLength(0)
  })

  it('未破坏的条约出现在结果中', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false))
    expect(ds.getTreaties()).toHaveLength(1)
    expect(ds.getTreaties()[0].id).toBe(1)
  })

  it('已破坏的条约不出现在结果中', () => {
    ;(ds as any).treaties.push(makeTreaty(2, 'trade_agreement', true))
    expect(ds.getTreaties()).toHaveLength(0)
  })

  it('混合条约时只返回未破坏的', () => {
    ;(ds as any).treaties.push(makeTreaty(1, 'non_aggression', false))
    ;(ds as any).treaties.push(makeTreaty(2, 'trade_agreement', true))
    ;(ds as any).treaties.push(makeTreaty(3, 'military_alliance', false))
    const result = ds.getTreaties()
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id)).toEqual([1, 3])
  })

  it('所有合法条约类型都能保存', () => {
    const types: TreatyType[] = ['non_aggression', 'trade_agreement', 'military_alliance', 'vassalage']
    types.forEach((type, i) => { ;(ds as any).treaties.push(makeTreaty(i + 1, type, false)) })
    expect(ds.getTreaties()).toHaveLength(4)
  })

  it('getTreaties 返回的是过滤后的新数组（非内部引用）', () => {
    ;(ds as any).treaties.push(makeTreaty(1))
    const r1 = ds.getTreaties()
    const r2 = ds.getTreaties()
    expect(r1).not.toBe(r2)  // 每次 filter 返回新数组
  })
})

// ── getEvents ─────────────────────────────────────────────────────────────────

describe('DiplomacySystem.getEvents', () => {
  let ds: DiplomacySystem

  beforeEach(() => {
    ds = makeDS()
  })

  it('初始无事件', () => {
    expect(ds.getEvents()).toHaveLength(0)
  })

  it('返回最近 count 个事件（默认 20）', () => {
    for (let i = 0; i < 25; i++) {
      ;(ds as any).events.push(makeEvent(i))
    }
    expect(ds.getEvents()).toHaveLength(20)
    expect(ds.getEvents(20)[0].tick).toBe(5)  // 从第5个开始的20个
  })

  it('getEvents(5) 返回最近 5 个', () => {
    for (let i = 0; i < 10; i++) {
      ;(ds as any).events.push(makeEvent(i))
    }
    const result = ds.getEvents(5)
    expect(result).toHaveLength(5)
    expect(result[0].tick).toBe(5)  // 最后5个: tick 5-9
    expect(result[4].tick).toBe(9)
  })

  it('事件数少于 count 时返回全部', () => {
    ;(ds as any).events.push(makeEvent(1))
    ;(ds as any).events.push(makeEvent(2))
    expect(ds.getEvents(20)).toHaveLength(2)
  })

  it('返回的是切片副本，修改不影响内部', () => {
    ;(ds as any).events.push(makeEvent(100))
    const result = ds.getEvents()
    result.length = 0
    expect(ds.getEvents()).toHaveLength(1)  // 内部不受影响
  })

  it('getEvents(0) 等价于 slice(-0) 返回全部（-0 === 0）', () => {
    ;(ds as any).events.push(makeEvent(1))
    // slice(-0) 等同于 slice(0)，返回全部元素，不是空数组
    expect(ds.getEvents(0)).toHaveLength(1)
  })

  it('注入 50 个事件（maxEvents）时不溢出', () => {
    for (let i = 0; i < 50; i++) {
      ;(ds as any).events.push(makeEvent(i))
    }
    expect(ds.getEvents(50)).toHaveLength(50)
  })
})
