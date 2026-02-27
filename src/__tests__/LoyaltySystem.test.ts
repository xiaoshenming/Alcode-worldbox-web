import { describe, it, expect, beforeEach } from 'vitest'
import { LoyaltySystem } from '../systems/LoyaltySystem'

// LoyaltySystem 测试：
// - getLoyalty(civId)  → 返回 loyalty Map 中的值，无则返回默认值 70
// update() 依赖 CivManager/EntityManager/World/ParticleSystem，不在此测试。

function makeLS(): LoyaltySystem {
  return new LoyaltySystem()
}

describe('LoyaltySystem.getLoyalty', () => {
  let ls: LoyaltySystem

  beforeEach(() => { ls = makeLS() })

  it('未注册的文明返回默认值 70', () => {
    expect(ls.getLoyalty(1)).toBe(70)
    expect(ls.getLoyalty(99)).toBe(70)
    expect(ls.getLoyalty(0)).toBe(70)
  })

  it('注入后返回注入的值', () => {
    ;(ls as any).loyalty.set(1, 85)
    expect(ls.getLoyalty(1)).toBe(85)
  })

  it('注入低忠诚度值', () => {
    ;(ls as any).loyalty.set(2, 20)
    expect(ls.getLoyalty(2)).toBe(20)
  })

  it('注入满忠诚度 100', () => {
    ;(ls as any).loyalty.set(3, 100)
    expect(ls.getLoyalty(3)).toBe(100)
  })

  it('注入零忠诚度', () => {
    ;(ls as any).loyalty.set(4, 0)
    expect(ls.getLoyalty(4)).toBe(0)
  })

  it('多个文明独立存储', () => {
    ;(ls as any).loyalty.set(1, 90)
    ;(ls as any).loyalty.set(2, 30)
    ;(ls as any).loyalty.set(3, 55)
    expect(ls.getLoyalty(1)).toBe(90)
    expect(ls.getLoyalty(2)).toBe(30)
    expect(ls.getLoyalty(3)).toBe(55)
    expect(ls.getLoyalty(4)).toBe(70)
  })

  it('未注入文明与已注入文明共存时互不干扰', () => {
    ;(ls as any).loyalty.set(10, 45)
    expect(ls.getLoyalty(10)).toBe(45)
    expect(ls.getLoyalty(11)).toBe(70)
  })

  it('注入后可覆盖', () => {
    ;(ls as any).loyalty.set(1, 50)
    ;(ls as any).loyalty.set(1, 80)
    expect(ls.getLoyalty(1)).toBe(80)
  })
})
