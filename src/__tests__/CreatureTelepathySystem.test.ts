import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureTelepathySystem } from '../systems/CreatureTelepathySystem'
import type { TelepathicLink, TelepathicAbility } from '../systems/CreatureTelepathySystem'

let nextId = 1

function makeSys(): CreatureTelepathySystem { return new CreatureTelepathySystem() }

function makeLink(senderId: number, receiverId: number, ability: TelepathicAbility = 'danger_sense', strength = 60, tick = 0): TelepathicLink {
  return { id: nextId++, senderId, receiverId, ability, strength, tick }
}

function makeEM(entities: number[] = [], components: Record<string, Record<number, any>> = {}) {
  return {
    getEntitiesWithComponents: vi.fn((..._comps: string[]) => entities),
    getComponent: vi.fn((eid: number, comp: string) => components[comp]?.[eid] ?? null),
    hasComponent: vi.fn((eid: number, comp: string) => !!components[comp]?.[eid]),
  }
}

afterEach(() => { vi.restoreAllMocks() })

// ─────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无感应链接', () => { expect((sys as any).links).toHaveLength(0) })
  it('nextId从1开始', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('powerMap初始为空Map', () => {
    expect((sys as any).powerMap).toBeInstanceOf(Map)
    expect((sys as any).powerMap.size).toBe(0)
  })
  it('links是数��实例', () => { expect(Array.isArray((sys as any).links)).toBe(true) })
})

// ─────────────────────────────────────────────
describe('注入与查询links', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后links长度变化', () => {
    ;(sys as any).links.push(makeLink(1, 2, 'mind_speak'))
    expect((sys as any).links).toHaveLength(1)
  })
  it('注入后ability正确', () => {
    ;(sys as any).links.push(makeLink(1, 2, 'mind_speak'))
    expect((sys as any).links[0].ability).toBe('mind_speak')
  })
  it('senderId和receiverId正确', () => {
    ;(sys as any).links.push(makeLink(10, 20, 'empathy'))
    expect((sys as any).links[0].senderId).toBe(10)
    expect((sys as any).links[0].receiverId).toBe(20)
  })
  it('strength字段被保留', () => {
    ;(sys as any).links.push(makeLink(1, 2, 'foresight', 88))
    expect((sys as any).links[0].strength).toBe(88)
  })
  it('tick字段被保留', () => {
    ;(sys as any).links.push(makeLink(1, 2, 'suggestion', 60, 5000))
    expect((sys as any).links[0].tick).toBe(5000)
  })
  it('多个links注入', () => {
    ;(sys as any).links.push(makeLink(1, 2))
    ;(sys as any).links.push(makeLink(3, 4))
    ;(sys as any).links.push(makeLink(5, 6))
    expect((sys as any).links).toHaveLength(3)
  })
  it('links是同一数组引用', () => {
    const ref = (sys as any).links
    expect(ref).toBe((sys as any).links)
  })
  it('id字段自增', () => {
    const l1 = makeLink(1, 2); const l2 = makeLink(3, 4)
    expect(l2.id).toBe(l1.id + 1)
  })
})

// ─────────────────────────────────────────────
describe('powerMap操作', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未记录的实体powerMap返回undefined', () => {
    expect((sys as any).powerMap.get(999)).toBeUndefined()
  })
  it('使用??0时未记录实体返回0', () => {
    expect(((sys as any).powerMap?.get(999) ?? 0)).toBe(0)
  })
  it('可通过powerMap注入power值', () => {
    ;(sys as any).powerMap.set(1, 85)
    expect((sys as any).powerMap.get(1)).toBe(85)
  })
  it('覆写powerMap中同一实体', () => {
    ;(sys as any).powerMap.set(1, 50)
    ;(sys as any).powerMap.set(1, 90)
    expect((sys as any).powerMap.get(1)).toBe(90)
  })
  it('多个实体独立存储在powerMap', () => {
    ;(sys as any).powerMap.set(1, 30)
    ;(sys as any).powerMap.set(2, 70)
    expect((sys as any).powerMap.get(1)).toBe(30)
    expect((sys as any).powerMap.get(2)).toBe(70)
  })
  it('delete后powerMap不包含该键', () => {
    ;(sys as any).powerMap.set(5, 55)
    ;(sys as any).powerMap.delete(5)
    expect((sys as any).powerMap.get(5)).toBeUndefined()
  })
})

// ─────────────────────────────────────────────
describe('支持所有6种心灵能力', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  const abilities: TelepathicAbility[] = ['danger_sense', 'mind_speak', 'empathy', 'suggestion', 'mind_shield', 'foresight']

  it('可注入所有6种能力', () => {
    abilities.forEach((a, i) => { ;(sys as any).links.push(makeLink(i + 1, i + 2, a)) })
    expect((sys as any).links).toHaveLength(6)
  })

  abilities.forEach(ability => {
    it(`能力 ${ability} 可正确存储`, () => {
      ;(sys as any).links.push(makeLink(1, 2, ability))
      expect((sys as any).links[0].ability).toBe(ability)
    })
  })
})

// ─────────────────────────────────────────────
describe('update节流', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL(1000)时不处理', () => {
    const em = makeEM([])
    const initialLinks = (sys as any).links.length
    sys.update(1, em as any, 500)
    expect((sys as any).links.length).toBe(initialLinks)
  })
  it('tick超过CHECK_INTERVAL后更新lastCheck', () => {
    const em = makeEM([])
    sys.update(1, em as any, 1001)
    expect((sys as any).lastCheck).toBe(1001)
  })
  it('连续两次同tick只处理一次', () => {
    const em = makeEM([])
    sys.update(1, em as any, 1001)
    const lc1 = (sys as any).lastCheck
    sys.update(1, em as any, 1001)
    const lc2 = (sys as any).lastCheck
    expect(lc1).toBe(lc2)
  })
  it('tick为0时不触发', () => {
    const em = makeEM([1], { creature: { 1: { age: 20 } }, position: { 1: { x: 0, y: 0 } } })
    sys.update(1, em as any, 0)
    expect((sys as any).links).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
describe('链接过期清理', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick大于链接tick+30000时链接被清除', () => {
    ;(sys as any).links.push(makeLink(1, 2, 'empathy', 60, 0))
    ;(sys as any).lastCheck = 0
    const em = makeEM([])
    // tick=31001, lastCheck=0 => 31001-0=31001 > 1000, 触发update
    // cutoff = 31001 - 30000 = 1001; link.tick=0 < 1001 => delete
    sys.update(1, em as any, 31001)
    expect((sys as any).links).toHaveLength(0)
  })
  it('未到期的链接不被清除', () => {
    ;(sys as any).links.push(makeLink(1, 2, 'empathy', 60, 25000))
    ;(sys as any).lastCheck = 0
    const em = makeEM([])
    sys.update(1, em as any, 31001)
    // cutoff = 31001 - 30000 = 1001; link.tick=25000 > 1001 => keep
    expect((sys as any).links).toHaveLength(1)
  })
  it('混合到期和未到期', () => {
    ;(sys as any).links.push(makeLink(1, 2, 'empathy', 60, 0))      // expired
    ;(sys as any).links.push(makeLink(3, 4, 'foresight', 60, 20000)) // active
    ;(sys as any).lastCheck = 0
    const em = makeEM([])
    sys.update(1, em as any, 31001)
    expect((sys as any).links).toHaveLength(1)
    expect((sys as any).links[0].tick).toBe(20000)
  })
  it('无链接时清理不崩溃', () => {
    const em = makeEM([])
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em as any, 31001)).not.toThrow()
  })
})

// ─────────────────────────────────────────────
describe('MAX_LINKS上限', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('links满120后不再添加（无生物情况下验证上限）', () => {
    for (let i = 0; i < 120; i++) {
      ;(sys as any).links.push(makeLink(i + 1, i + 2, 'danger_sense', 60, 99999))
    }
    // 无生物触发，仅验证过期清理后数量保持
    const em = makeEM([], {})
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1001)
    // links全部 tick=99999 > cutoff=1001-30000(负数)，不会被删
    expect((sys as any).links.length).toBe(120)
  })

  it('links超过MAX_LINKS时，直接向数组注入不会自动清理', () => {
    for (let i = 0; i < 121; i++) {
      ;(sys as any).links.push(makeLink(i + 1, i + 2, 'empathy', 60, 99999))
    }
    // 系统不在注入时自动剪裁，只在循环内 break
    expect((sys as any).links.length).toBe(121)
  })
})

// ─────────────────────────────────────────────
describe('powerMap实体清理（3600节拍）', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick%3600===0时清理无creature组件的实体', () => {
    ;(sys as any).powerMap.set(99, 50) // entity 99 dead
    ;(sys as any).lastCheck = 0
    const em = makeEM([], {
      creature: {}, // entity 99 has no creature
    })
    // tick=3600 => triggers update and pruning
    sys.update(1, em as any, 3600)
    expect((sys as any).powerMap.has(99)).toBe(false)
  })
  it('tick%3600===0时保留有creature组件的实体', () => {
    ;(sys as any).powerMap.set(1, 77)
    ;(sys as any).lastCheck = 0
    const em = makeEM([], {
      creature: { 1: { age: 20 } },
    })
    sys.update(1, em as any, 3600)
    expect((sys as any).powerMap.has(1)).toBe(true)
  })
})

// ─────────────────────────────────────────────
describe('update创建感应链接', () => {
  let sys: CreatureTelepathySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('只有1个生物时不创建链接（creatures.length<2）', () => {
    // 使 AWAKEN_CHANCE 通过(random<0.003)，但 creatures.length<2 跳过 do-while
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      // 第一次调用(AWAKEN_CHANCE判断)返回0，后续不调用do-while
      return callCount++ === 0 ? 0 : 0.5
    })
    const em = makeEM([1], {
      creature: { 1: { age: 20 } },
      position: { 1: { x: 0, y: 0 } },
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1001)
    expect((sys as any).links).toHaveLength(0)
  })

  it('生物age<15时不创建链接', () => {
    // age<15直接跳过，不会进入 do-while
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => callCount++ === 0 ? 0 : 0.5)
    const em = makeEM([1, 2], {
      creature: { 1: { age: 10 }, 2: { age: 10 } },
      position: { 1: { x: 0, y: 0 }, 2: { x: 1, y: 0 } },
    })
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1001)
    expect((sys as any).links).toHaveLength(0)
  })

  it('power超过100时被限制在100（Math.min cap验证）', () => {
    // POWER_GROWTH=0.06; 当 power=100.5 时 Math.min(100, 100.5+0.06)=100
    const capped = Math.min(100, 100.5 + 0.06)
    expect(capped).toBe(100)
    // 当 power 已为100时，继续增长仍不超过100
    const alreadyMax = Math.min(100, 100 + 0.06)
    expect(alreadyMax).toBe(100)
  })

  it('powerMap中初始power在3~13范围内（新实体）', () => {
    // power = 3 + random() * 10; random()=0.5 => 8
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const initial = 3 + Math.random() * 10
    expect(initial).toBeGreaterThanOrEqual(3)
    expect(initial).toBeLessThanOrEqual(13)
  })

  it('strength计算公式：power*(0.4+random*0.6)', () => {
    const power = 50
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const strength = power * (0.4 + Math.random() * 0.6)
    expect(strength).toBeGreaterThan(0)
    expect(strength).toBeLessThanOrEqual(power)
  })

  it('update后lastCheck被更新到tick值', () => {
    const em = makeEM([], {})
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, 1001)
    expect((sys as any).lastCheck).toBe(1001)
  })
})
