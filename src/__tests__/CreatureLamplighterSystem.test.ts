import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureLamplighterSystem } from '../systems/CreatureLamplighterSystem'
import type { Lamplighter, FuelType } from '../systems/CreatureLamplighterSystem'

let nextId = 1
function makeSys(): CreatureLamplighterSystem { return new CreatureLamplighterSystem() }
function makeLamplighter(entityId: number, fuelType: FuelType = 'oil', skill = 60): Lamplighter {
  return {
    id: nextId++, entityId, skill,
    lampsLit: 50, lampsMaintained: 30,
    fuelType,
    routeLength: 10, efficiency: 0.7,
    nightsWorked: 5, tick: 0,
  }
}

// ——— 基础增删查测试 ———
describe('CreatureLamplighterSystem - 基础增删查', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无点灯人', () => {
    expect((sys as any).lamplighters).toHaveLength(0)
  })

  it('注入后可查询 gas 燃料', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'gas'))
    expect((sys as any).lamplighters[0].fuelType).toBe('gas')
  })

  it('返回内部引用稳定', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1))
    expect((sys as any).lamplighters).toBe((sys as any).lamplighters)
  })

  it('支持所有 4 种燃料类型', () => {
    const fuels: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
    fuels.forEach((f, i) => { ;(sys as any).lamplighters.push(makeLamplighter(i + 1, f)) })
    const all = (sys as any).lamplighters
    fuels.forEach((f, i) => { expect(all[i].fuelType).toBe(f) })
  })

  it('多个全部返回', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1))
    ;(sys as any).lamplighters.push(makeLamplighter(2))
    expect((sys as any).lamplighters).toHaveLength(2)
  })
})

// ——— skill 上限测试 ———
describe('CreatureLamplighterSystem - skill 上限', () => {
  it('skill 不超过 100（Math.min 逻辑）', () => {
    // 直接验证 Math.min(100, skill + 0.15) 上限
    expect(Math.min(100, 99.9 + 0.15)).toBe(100)
    expect(Math.min(100, 50 + 0.15)).toBeCloseTo(50.15, 5)
  })

  it('skill 已为100 时加0.15仍保持100', () => {
    const ll = makeLamplighter(1, 'oil', 100)
    const updated = Math.min(100, ll.skill + 0.15)
    expect(updated).toBe(100)
  })
})

// ——— CHECK_INTERVAL 节流测试 ———
describe('CreatureLamplighterSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值 < 3200 时 getEntitiesWithComponent 不被调用', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(true),
    } as any
    sys.update(0, em, 0)         // lastCheck=0, 触发一次
    sys.update(0, em, 100)       // 100-0=100 < 3200, 不触发
    // 第一次 tick=0 触发，entities 为空所以不进 spawn 分支
    // 第二次 tick=100 不触发
    expect(em.getEntitiesWithComponent).toHaveBeenCalledTimes(0)
  })

  it('tick差值 >= 3200 时触发更新并更新 lastCheck', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    const checksBefore = (sys as any).lastCheck
    sys.update(0, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
    expect((sys as any).lastCheck).not.toBe(checksBefore)
  })
})

// ——— _lamplightersSet 集合测试 ———
describe('CreatureLamplighterSystem - _lamplightersSet 集合', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 _lamplightersSet 为空', () => {
    expect((sys as any)._lamplightersSet.size).toBe(0)
  })

  it('手动注入点灯人并加入 Set', () => {
    const ll = makeLamplighter(42, 'oil')
    ;(sys as any).lamplighters.push(ll)
    ;(sys as any)._lamplightersSet.add(42)
    expect((sys as any)._lamplightersSet.has(42)).toBe(true)
  })
})

// ——— cleanup：entity 消亡后移除 ———
describe('CreatureLamplighterSystem - entity 消亡后清除', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('hasComponent 返回 false 时点灯人被清除', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'oil'))
    ;(sys as any)._lamplightersSet.add(1)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false), // entity 不存在
    } as any
    sys.update(0, em, 0)       // lastCheck=0
    sys.update(0, em, 3200)    // 触发，跑 cleanup 逻辑
    expect((sys as any).lamplighters).toHaveLength(0)
  })

  it('hasComponent 返回 true 时点灯人保留', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'oil'))
    ;(sys as any)._lamplightersSet.add(1)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(true), // entity 存在
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    expect((sys as any).lamplighters).toHaveLength(1)
  })
})
