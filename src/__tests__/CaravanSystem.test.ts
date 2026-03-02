import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CaravanSystem } from '../systems/CaravanSystem'
import type { Caravan } from '../systems/CaravanSystem'

// CaravanSystem 测试：
// - getCaravans()  → 返回内部商队数组引用
// - reset()        → 清空商队、计时器，nextId 重置为 1
// update() 依赖 CivManager/EntityManager/World/ParticleSystem，不在此测试。

function makeCS(): CaravanSystem {
  return new CaravanSystem()
}

function makeCaravan(id: number, fromCivId = 1, toCivId = 2): Caravan {
  return {
    id, fromCivId, toCivId,
    fromPort: { x: 0, y: 0 }, toPort: { x: 10, y: 10 },
    x: 0, y: 0, progress: 0, speed: 0.002,
    goods: { food: 2, gold: 1, wood: 1, stone: 0.5 },
    returning: false, color: '#ff0000',
  }
}

afterEach(() => vi.restoreAllMocks())

describe('CaravanSystem.getCaravans - 基础查询', () => {
  let cs: CaravanSystem

  beforeEach(() => { cs = makeCS() })

  it('初始无商队', () => {
    expect(cs.getCaravans()).toHaveLength(0)
  })

  it('注入商队后可查询', () => {
    ;cs.getCaravans().push(makeCaravan(1))
    expect(cs.getCaravans()).toHaveLength(1)
    expect(cs.getCaravans()[0].id).toBe(1)
  })

  it('返回内部引用（修改会影响后续查询）', () => {
    ;cs.getCaravans().push(makeCaravan(1))
    const caravans = cs.getCaravans()
    expect(caravans).toBe(cs.getCaravans())
  })

  it('注入多个商队全部返回', () => {
    ;cs.getCaravans().push(makeCaravan(1, 1, 2))
    ;cs.getCaravans().push(makeCaravan(2, 2, 3))
    ;cs.getCaravans().push(makeCaravan(3, 1, 3))
    expect(cs.getCaravans()).toHaveLength(3)
  })

  it('商队属性正确保存', () => {
    ;cs.getCaravans().push(makeCaravan(5, 10, 20))
    const c = cs.getCaravans()[0]
    expect(c.fromCivId).toBe(10)
    expect(c.toCivId).toBe(20)
    expect(c.returning).toBe(false)
  })

  it('可通过引用直接删除商队', () => {
    cs.getCaravans().push(makeCaravan(1))
    cs.getCaravans().push(makeCaravan(2))
    cs.getCaravans().splice(0, 1)
    expect(cs.getCaravans()).toHaveLength(1)
    expect(cs.getCaravans()[0].id).toBe(2)
  })

  it('返回数组可以迭代', () => {
    cs.getCaravans().push(makeCaravan(1))
    cs.getCaravans().push(makeCaravan(2))
    const ids: number[] = []
    for (const c of cs.getCaravans()) {
      ids.push(c.id)
    }
    expect(ids).toEqual([1, 2])
  })

  it('getCaravans 不创建新数组（多次调用返回同一引用）', () => {
    const ref1 = cs.getCaravans()
    const ref2 = cs.getCaravans()
    expect(ref1).toBe(ref2)
  })
})

describe('CaravanSystem.getCaravans - 商队属性完整性', () => {
  let cs: CaravanSystem

  beforeEach(() => { cs = makeCS() })

  it('progress 默认为 0', () => {
    cs.getCaravans().push(makeCaravan(1))
    expect(cs.getCaravans()[0].progress).toBe(0)
  })

  it('speed 默认为 0.002', () => {
    cs.getCaravans().push(makeCaravan(1))
    expect(cs.getCaravans()[0].speed).toBe(0.002)
  })

  it('returning 默认为 false', () => {
    cs.getCaravans().push(makeCaravan(1))
    expect(cs.getCaravans()[0].returning).toBe(false)
  })

  it('goods 包含四种资源', () => {
    cs.getCaravans().push(makeCaravan(1))
    const goods = cs.getCaravans()[0].goods
    expect(goods).toHaveProperty('food')
    expect(goods).toHaveProperty('gold')
    expect(goods).toHaveProperty('wood')
    expect(goods).toHaveProperty('stone')
  })

  it('fromPort 和 toPort 正确保存', () => {
    const c = makeCaravan(1)
    c.fromPort = { x: 5, y: 7 }
    c.toPort = { x: 15, y: 25 }
    cs.getCaravans().push(c)
    expect(cs.getCaravans()[0].fromPort).toEqual({ x: 5, y: 7 })
    expect(cs.getCaravans()[0].toPort).toEqual({ x: 15, y: 25 })
  })

  it('color 属性正确保存', () => {
    const c = makeCaravan(1)
    c.color = '#00ff00'
    cs.getCaravans().push(c)
    expect(cs.getCaravans()[0].color).toBe('#00ff00')
  })

  it('x/y 坐标正确保存', () => {
    const c = makeCaravan(1)
    c.x = 3.5
    c.y = 7.8
    cs.getCaravans().push(c)
    expect(cs.getCaravans()[0].x).toBe(3.5)
    expect(cs.getCaravans()[0].y).toBe(7.8)
  })

  it('修改 goods 中的 food 值后可读回', () => {
    cs.getCaravans().push(makeCaravan(1))
    cs.getCaravans()[0].goods.food = 99
    expect(cs.getCaravans()[0].goods.food).toBe(99)
  })

  it('returning 可被设为 true', () => {
    cs.getCaravans().push(makeCaravan(1))
    cs.getCaravans()[0].returning = true
    expect(cs.getCaravans()[0].returning).toBe(true)
  })

  it('progress 可被更新到 1', () => {
    cs.getCaravans().push(makeCaravan(1))
    cs.getCaravans()[0].progress = 1
    expect(cs.getCaravans()[0].progress).toBe(1)
  })
})

describe('CaravanSystem.reset - 基础重置', () => {
  let cs: CaravanSystem

  beforeEach(() => { cs = makeCS() })

  it('reset 后商队列表为空', () => {
    ;cs.getCaravans().push(makeCaravan(1))
    ;cs.getCaravans().push(makeCaravan(2))
    cs.reset()
    expect(cs.getCaravans()).toHaveLength(0)
  })

  it('reset 后 spawnTimers 为空', () => {
    ;(cs as any).spawnTimers.set('1:2', 300)
    cs.reset()
    expect((cs as any).spawnTimers.size).toBe(0)
  })

  it('reset 后 nextId 重置为 1', () => {
    ;(cs as any).nextId = 50
    cs.reset()
    expect((cs as any).nextId).toBe(1)
  })

  it('多次 reset 不报错', () => {
    expect(() => {
      cs.reset()
      cs.reset()
    }).not.toThrow()
  })

  it('reset 后 getCaravans 仍然可调用', () => {
    cs.getCaravans().push(makeCaravan(1))
    cs.reset()
    expect(() => cs.getCaravans()).not.toThrow()
    expect(cs.getCaravans()).toHaveLength(0)
  })

  it('reset 后可以重新添加商队', () => {
    cs.getCaravans().push(makeCaravan(1))
    cs.reset()
    cs.getCaravans().push(makeCaravan(5))
    expect(cs.getCaravans()).toHaveLength(1)
    expect(cs.getCaravans()[0].id).toBe(5)
  })

  it('reset 清除多个 spawnTimers 条目', () => {
    ;(cs as any).spawnTimers.set(10001, 100)
    ;(cs as any).spawnTimers.set(10002, 200)
    ;(cs as any).spawnTimers.set(20001, 300)
    cs.reset()
    expect((cs as any).spawnTimers.size).toBe(0)
  })

  it('reset 后 nextId 始终为 1 不论之前值多大', () => {
    ;(cs as any).nextId = 99999
    cs.reset()
    expect((cs as any).nextId).toBe(1)
  })

  it('reset 前有大量商队，reset 后均清除', () => {
    for (let i = 0; i < 100; i++) {
      cs.getCaravans().push(makeCaravan(i + 1))
    }
    expect(cs.getCaravans()).toHaveLength(100)
    cs.reset()
    expect(cs.getCaravans()).toHaveLength(0)
  })
})

describe('CaravanSystem.reset - 重置后状态一致性', () => {
  let cs: CaravanSystem

  beforeEach(() => { cs = makeCS() })

  it('reset 后再次 reset，nextId 仍为 1', () => {
    cs.reset()
    cs.reset()
    expect((cs as any).nextId).toBe(1)
  })

  it('reset 后添加然后再 reset，商队再次清空', () => {
    cs.getCaravans().push(makeCaravan(1))
    cs.reset()
    cs.getCaravans().push(makeCaravan(2))
    expect(cs.getCaravans()).toHaveLength(1)
    cs.reset()
    expect(cs.getCaravans()).toHaveLength(0)
  })

  it('reset 后 spawnTimers 可重新设置', () => {
    ;(cs as any).spawnTimers.set(10001, 100)
    cs.reset()
    ;(cs as any).spawnTimers.set(20002, 50)
    expect((cs as any).spawnTimers.size).toBe(1)
    expect((cs as any).spawnTimers.get(20002)).toBe(50)
  })

  it('reset 不会改变实例身份（同一个对象）', () => {
    const ref = cs
    cs.reset()
    expect(cs).toBe(ref)
  })

  it('初始状态与 reset 后状态等价', () => {
    const fresh = makeCS()
    ;(cs as any).nextId = 42
    cs.getCaravans().push(makeCaravan(1))
    ;(cs as any).spawnTimers.set(99, 1)
    cs.reset()
    expect(cs.getCaravans()).toHaveLength(fresh.getCaravans().length)
    expect((cs as any).nextId).toBe((fresh as any).nextId)
    expect((cs as any).spawnTimers.size).toBe((fresh as any).spawnTimers.size)
  })
})

describe('CaravanSystem - spawnTimers 内部状态', () => {
  let cs: CaravanSystem

  beforeEach(() => { cs = makeCS() })

  it('初始 spawnTimers 为空 Map', () => {
    expect((cs as any).spawnTimers.size).toBe(0)
  })

  it('可手动设置 spawnTimers 条目', () => {
    ;(cs as any).spawnTimers.set(10001, 500)
    expect((cs as any).spawnTimers.get(10001)).toBe(500)
  })

  it('多个 spawnTimers 条目共存', () => {
    ;(cs as any).spawnTimers.set(10001, 100)
    ;(cs as any).spawnTimers.set(10002, 200)
    expect((cs as any).spawnTimers.size).toBe(2)
  })

  it('spawnTimers 是 Map 类型', () => {
    expect((cs as any).spawnTimers).toBeInstanceOf(Map)
  })
})

describe('CaravanSystem - nextId 内部状态', () => {
  let cs: CaravanSystem

  beforeEach(() => { cs = makeCS() })

  it('初始 nextId 为 1', () => {
    expect((cs as any).nextId).toBe(1)
  })

  it('nextId 可以手动修改', () => {
    ;(cs as any).nextId = 99
    expect((cs as any).nextId).toBe(99)
  })

  it('reset 后 nextId 从 0 恢复到 1', () => {
    ;(cs as any).nextId = 0
    cs.reset()
    expect((cs as any).nextId).toBe(1)
  })

  it('reset 后 nextId 从负数恢复到 1', () => {
    ;(cs as any).nextId = -999
    cs.reset()
    expect((cs as any).nextId).toBe(1)
  })
})

describe('CaravanSystem - Caravan 对象结构验证', () => {
  it('makeCaravan 生成的商队包含所有必要字段', () => {
    const c = makeCaravan(1, 2, 3)
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('fromCivId')
    expect(c).toHaveProperty('toCivId')
    expect(c).toHaveProperty('fromPort')
    expect(c).toHaveProperty('toPort')
    expect(c).toHaveProperty('x')
    expect(c).toHaveProperty('y')
    expect(c).toHaveProperty('progress')
    expect(c).toHaveProperty('speed')
    expect(c).toHaveProperty('goods')
    expect(c).toHaveProperty('returning')
    expect(c).toHaveProperty('color')
  })

  it('不同 fromCivId/toCivId 的商队可区分', () => {
    const c1 = makeCaravan(1, 1, 2)
    const c2 = makeCaravan(2, 3, 4)
    expect(c1.fromCivId).not.toBe(c2.fromCivId)
    expect(c1.toCivId).not.toBe(c2.toCivId)
  })

  it('goods 对象中的 stone 初始值为 0.5', () => {
    const c = makeCaravan(1)
    expect(c.goods.stone).toBe(0.5)
  })

  it('goods 对象中的 food 初始值为 2', () => {
    const c = makeCaravan(1)
    expect(c.goods.food).toBe(2)
  })

  it('goods 对象中的 gold 初始值为 1', () => {
    const c = makeCaravan(1)
    expect(c.goods.gold).toBe(1)
  })

  it('goods 对象中的 wood 初始值为 1', () => {
    const c = makeCaravan(1)
    expect(c.goods.wood).toBe(1)
  })

  it('fromPort 默认坐标为 (0,0)', () => {
    const c = makeCaravan(1)
    expect(c.fromPort).toEqual({ x: 0, y: 0 })
  })

  it('toPort 默认坐标为 (10,10)', () => {
    const c = makeCaravan(1)
    expect(c.toPort).toEqual({ x: 10, y: 10 })
  })

  it('color 默认为 #ff0000', () => {
    const c = makeCaravan(1)
    expect(c.color).toBe('#ff0000')
  })
})

describe('CaravanSystem - 实例独立性', () => {
  it('两个 CaravanSystem 实例状态互不影响', () => {
    const cs1 = makeCS()
    const cs2 = makeCS()
    cs1.getCaravans().push(makeCaravan(1))
    expect(cs2.getCaravans()).toHaveLength(0)
  })

  it('重置一个实例不影响另一个', () => {
    const cs1 = makeCS()
    const cs2 = makeCS()
    cs1.getCaravans().push(makeCaravan(1))
    cs2.getCaravans().push(makeCaravan(2))
    cs1.reset()
    expect(cs1.getCaravans()).toHaveLength(0)
    expect(cs2.getCaravans()).toHaveLength(1)
  })

  it('两个实例的 nextId 独立', () => {
    const cs1 = makeCS()
    const cs2 = makeCS()
    ;(cs1 as any).nextId = 10
    expect((cs2 as any).nextId).toBe(1)
  })

  it('两个实例的 spawnTimers 独立', () => {
    const cs1 = makeCS()
    const cs2 = makeCS()
    ;(cs1 as any).spawnTimers.set(999, 100)
    expect((cs2 as any).spawnTimers.size).toBe(0)
  })
})
