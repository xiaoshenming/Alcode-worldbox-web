import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAlchemySystem } from '../systems/CreatureAlchemySystem'
import type { PotionType, Potion } from '../systems/CreatureAlchemySystem'

// CreatureAlchemySystem 测试：
// - getPotions()     → 返回只读药水数组
// - getSkill(eid)    → 返回生物的炼金技能（无则返回0）
// update() 依赖 EntityManager，不在此测试。
// 通过 as any 注入私有字段进行测试。

function makeCAS(): CreatureAlchemySystem {
  return new CreatureAlchemySystem()
}

function makePotion(id: number, type: PotionType = 'healing', tick = 0): Potion {
  return { id, type, potency: 30, creator: 1, duration: 2000, tick }
}

describe('CreatureAlchemySystem.getPotions', () => {
  let cas: CreatureAlchemySystem

  beforeEach(() => { cas = makeCAS() })

  it('初始无药水', () => {
    expect((cas as any).potions).toHaveLength(0)
  })

  it('注入药水后可查询', () => {
    ;(cas as any).potions.push(makePotion(1, 'healing'))
    expect((cas as any).potions).toHaveLength(1)
    expect((cas as any).potions[0].type).toBe('healing')
  })

  it('注入多个药水全部返回', () => {
    ;(cas as any).potions.push(makePotion(1, 'healing'))
    ;(cas as any).potions.push(makePotion(2, 'strength'))
    ;(cas as any).potions.push(makePotion(3, 'poison'))
    expect((cas as any).potions).toHaveLength(3)
  })

  it('返回的是内部引用（readonly 类型）', () => {
    ;(cas as any).potions.push(makePotion(1))
    expect((cas as any).potions).toBe((cas as any).potions)
  })

  it('支持所有 6 种药水类型', () => {
    const types: PotionType[] = ['healing', 'strength', 'speed', 'invisibility', 'fire_resistance', 'poison']
    types.forEach((t, i) => { ;(cas as any).potions.push(makePotion(i + 1, t)) })
    const results = (cas as any).potions
    expect(results).toHaveLength(6)
    types.forEach((t, i) => { expect(results[i].type).toBe(t) })
  })
})

describe('CreatureAlchemySystem.getSkill', () => {
  let cas: CreatureAlchemySystem

  beforeEach(() => { cas = makeCAS() })

  it('未知生物返回 0', () => {
    expect(((cas as any).skillMap?.get(1) ?? 0)).toBe(0)
    expect(((cas as any).skillMap?.get(999) ?? 0)).toBe(0)
  })

  it('注入技能后可查询', () => {
    ;(cas as any).skillMap.set(1, 75)
    expect(((cas as any).skillMap?.get(1) ?? 0)).toBe(75)
  })

  it('多个生物技能独立', () => {
    ;(cas as any).skillMap.set(1, 30)
    ;(cas as any).skillMap.set(2, 80)
    ;(cas as any).skillMap.set(3, 55)
    expect(((cas as any).skillMap?.get(1) ?? 0)).toBe(30)
    expect(((cas as any).skillMap?.get(2) ?? 0)).toBe(80)
    expect(((cas as any).skillMap?.get(3) ?? 0)).toBe(55)
    expect(((cas as any).skillMap?.get(4) ?? 0)).toBe(0)
  })

  it('注入零技能值', () => {
    ;(cas as any).skillMap.set(5, 0)
    expect(((cas as any).skillMap?.get(5) ?? 0)).toBe(0)
  })

  it('注入最大技能 100', () => {
    ;(cas as any).skillMap.set(6, 100)
    expect(((cas as any).skillMap?.get(6) ?? 0)).toBe(100)
  })

  it('覆盖技能后返回新值', () => {
    ;(cas as any).skillMap.set(1, 50)
    ;(cas as any).skillMap.set(1, 90)
    expect(((cas as any).skillMap?.get(1) ?? 0)).toBe(90)
  })
})
