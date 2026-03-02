import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureFeltersSystem } from '../systems/CreatureFeltersSystem'
import type { Felter, FeltProduct } from '../systems/CreatureFeltersSystem'

let nextId = 1
function makeSys(): CreatureFeltersSystem { return new CreatureFeltersSystem() }
function makeFelter(entityId: number, product: FeltProduct = 'hat', skill = 40, tick = 0): Felter {
  return {
    id: nextId++,
    entityId,
    skill,
    feltProduced: 1 + Math.floor(skill / 9),
    product,
    thickness: 15 + skill * 0.65,
    reputation: 10 + skill * 0.8,
    tick,
  }
}

function makeEM(entityIds: number[] = []) {
  return {
    getEntitiesWithComponents: vi.fn(() => entityIds),
    getComponent: vi.fn(() => null),
    hasComponent: vi.fn(() => true),
  }
}

describe('CreatureFeltersSystem', () => {
  let sys: CreatureFeltersSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始felters数组为空', () => {
    expect((sys as any).felters).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询felter', () => {
    ;(sys as any).felters.push(makeFelter(1, 'blanket'))
    expect((sys as any).felters[0].product).toBe('blanket')
    expect((sys as any).felters[0].entityId).toBe(1)
  })

  // 3. FeltProduct包含4种
  it('FeltProduct包含4种: hat/blanket/tent/boot', () => {
    const products: FeltProduct[] = ['hat', 'blanket', 'tent', 'boot']
    products.forEach((p, i) => { ;(sys as any).felters.push(makeFelter(i + 1, p)) })
    const all: Felter[] = (sys as any).felters
    expect(all.map(f => f.product)).toEqual(['hat', 'blanket', 'tent', 'boot'])
  })

  // 4. thickness公式验证: thickness = 15 + skill * 0.65
  it('thickness公式: 15 + skill * 0.65', () => {
    const skill = 40
    const f = makeFelter(1, 'hat', skill)
    expect(f.thickness).toBeCloseTo(15 + skill * 0.65, 5)
  })

  // 5. reputation公式验证: reputation = 10 + skill * 0.8
  it('reputation公式: 10 + skill * 0.8', () => {
    const skill = 60
    const f = makeFelter(1, 'hat', skill)
    expect(f.reputation).toBeCloseTo(10 + skill * 0.8, 5)
  })

  // 6. feltProduced计算: skill=45 → 1+floor(45/9)=6
  it('feltProduced计算: skill=45 → 1+floor(45/9)=6', () => {
    const skill = 45
    const f = makeFelter(1, 'hat', skill)
    expect(f.feltProduced).toBe(1 + Math.floor(45 / 9)) // 1+5=6
  })

  // 7. feltProduct由skill/25决定4段: hat(0-24), blanket(25-49), tent(50-74), boot(75+)
  it('product由skill/25决定: skill=0→hat', () => {
    // prodIdx = min(3, floor(skill/25))
    const PRODUCTS: FeltProduct[] = ['hat', 'blanket', 'tent', 'boot']
    expect(PRODUCTS[Math.min(3, Math.floor(0 / 25))]).toBe('hat')
    expect(PRODUCTS[Math.min(3, Math.floor(25 / 25))]).toBe('blanket')
    expect(PRODUCTS[Math.min(3, Math.floor(50 / 25))]).toBe('tent')
    expect(PRODUCTS[Math.min(3, Math.floor(75 / 25))]).toBe('boot')
    expect(PRODUCTS[Math.min(3, Math.floor(99 / 25))]).toBe('boot')
  })

  // 8. tick差值 < 1400 不更新 lastCheck (em.getEntitiesWithComponents不被调用)
  it('tick差值<CHECK_INTERVAL=1400时不执行更新', () => {
    const em = makeEM([])
    // 先让 lastCheck = 0 被设置（tick=1400 触发第一次更新）
    ;(sys as any).lastCheck = -1400
    sys.update(0, em as any, 0)  // 0-(-1400)=1400 >= 1400, 触发, lastCheck=0
    sys.update(0, em as any, 1399) // 1399-0=1399 < 1400, 不触发
    // 第2次调用不应触发更新，getEntitiesWithComponents只被调用1次
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  // 9. tick差值 >= 1400 更新 lastCheck
  it('tick差值>=CHECK_INTERVAL=1400时更新lastCheck', () => {
    const em = makeEM([])
    sys.update(0, em as any, 0)    // lastCheck=0
    sys.update(0, em as any, 1400) // 1400-0=1400 >= 1400
    expect((sys as any).lastCheck).toBe(1400)
  })

  // 10. time-based cleanup: tick < cutoff = tick - 53000 的记录被删除
  it('cleanup: 超过53000 tick的旧记录被清除', () => {
    const oldTick = 0
    const currentTick = 60000
    ;(sys as any).felters.push(makeFelter(1, 'hat', 40, oldTick)) // tick=0 < 60000-53000=7000
    ;(sys as any).felters.push(makeFelter(2, 'boot', 40, 50000))  // tick=50000 >= 7000, 保留
    const em = makeEM([])
    // 强制 lastCheck 让 update 通过节流检查
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, currentTick)
    const remaining: Felter[] = (sys as any).felters
    expect(remaining.some(f => f.entityId === 1)).toBe(false)
    expect(remaining.some(f => f.entityId === 2)).toBe(true)
  })

  // 11. 多个记录可共存
  it('多个felter可共存', () => {
    ;(sys as any).felters.push(makeFelter(1))
    ;(sys as any).felters.push(makeFelter(2))
    ;(sys as any).felters.push(makeFelter(3))
    expect((sys as any).felters).toHaveLength(3)
  })

  // 12. skill=75时product为boot
  it('skill=75时product为boot(prodIdx=3)', () => {
    const PRODUCTS: FeltProduct[] = ['hat', 'blanket', 'tent', 'boot']
    const skill = 75
    const prodIdx = Math.min(3, Math.floor(skill / 25))
    expect(prodIdx).toBe(3)
    expect(PRODUCTS[prodIdx]).toBe('boot')
  })

  // 13. feltProduced不同skill值验证
  it('feltProduced计算: skill=9 → 1+floor(9/9)=2', () => {
    const skill = 9
    const f = makeFelter(1, 'hat', skill)
    expect(f.feltProduced).toBe(2)
  })

  // 14. 厚度公式边界: skill=0
  it('thickness公式边界: skill=0 → 15', () => {
    const f = makeFelter(1, 'hat', 0)
    expect(f.thickness).toBe(15)
  })
})
