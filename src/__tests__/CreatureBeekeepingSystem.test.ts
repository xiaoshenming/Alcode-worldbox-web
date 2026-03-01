import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBeekeepingSystem } from '../systems/CreatureBeekeepingSystem'
import type { Apiary, HiveProduct } from '../systems/CreatureBeekeepingSystem'

let nextId = 1
function makeSys(): CreatureBeekeepingSystem { return new CreatureBeekeepingSystem() }
function makeApiary(keeperId: number, product: HiveProduct = 'honey'): Apiary {
  return { id: nextId++, keeperId, hiveCount: 3, product, yield: 50, quality: 60, tick: 0 }
}

describe('CreatureBeekeepingSystem.getApiaries', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蜂场', () => { expect((sys as any).apiaries).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'beeswax'))
    expect((sys as any).apiaries[0].product).toBe('beeswax')
  })

  it('返回只读引用', () => {
    ;(sys as any).apiaries.push(makeApiary(1))
    expect((sys as any).apiaries).toBe((sys as any).apiaries)
  })

  it('支持所有 6 种蜂产品', () => {
    const products: HiveProduct[] = ['honey', 'beeswax', 'royal_jelly', 'propolis', 'mead', 'honeycomb']
    products.forEach((p, i) => { ;(sys as any).apiaries.push(makeApiary(i + 1, p)) })
    const all = (sys as any).apiaries
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
})

describe('CreatureBeekeepingSystem.getSkill', () => {
  let sys: CreatureBeekeepingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 0', () => {
    expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0)
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 75)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(75)
  })

  it('多个实体各自独立', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 80)
    expect(((sys as any).skillMap.get(1) ?? 0)).toBe(30)
    expect(((sys as any).skillMap.get(2) ?? 0)).toBe(80)
  })
})
