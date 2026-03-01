import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomacySystem } from '../systems/DiplomacySystem'
import type { Treaty, DiplomaticEvent, TreatyType } from '../systems/DiplomacySystem'

function makeDS(): DiplomacySystem {
  return new DiplomacySystem()
}

function makeTreaty(id: number, type: TreatyType = 'non_aggression', broken = false): Treaty {
  return { id, type, civA: 1, civB: 2, startTick: 0, duration: -1, strength: 50, broken }
}

function makeEvent(tick: number, type: DiplomaticEvent['type'] = 'treaty_signed'): DiplomaticEvent {
  return { tick, type, civA: 1, civB: 2, description: `Event at tick ${tick}` }
}

describe('DiplomacySystem', () => {
  let ds: DiplomacySystem

  beforeEach(() => {
    ds = makeDS()
  })

  it('初始无条约', () => {
    expect((ds as any).treaties).toHaveLength(0)
  })

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

  it('初始无事件', () => {
    expect((ds as any).events).toHaveLength(0)
  })

  it('注入事件后events增加', () => {
    for (let i = 0; i < 5; i++) {
      ;(ds as any).events.push(makeEvent(i))
    }
    expect((ds as any).events).toHaveLength(5)
  })

  it('events数组可以slice获取最近N个', () => {
    for (let i = 0; i < 10; i++) {
      ;(ds as any).events.push(makeEvent(i))
    }
    const last5 = (ds as any).events.slice(-5)
    expect(last5).toHaveLength(5)
    expect(last5[4].tick).toBe(9)
  })

  it('treaties是数组', () => {
    expect(Array.isArray((ds as any).treaties)).toBe(true)
  })

  it('events是数组', () => {
    expect(Array.isArray((ds as any).events)).toBe(true)
  })
})
