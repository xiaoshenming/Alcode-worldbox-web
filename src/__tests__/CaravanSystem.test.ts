import { describe, it, expect, beforeEach } from 'vitest'
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

describe('CaravanSystem.getCaravans', () => {
  let cs: CaravanSystem

  beforeEach(() => { cs = makeCS() })

  it('初始无商队', () => {
    expect(cs.getCaravans()).toHaveLength(0)
  })

  it('注入商队后可查询', () => {
    ;(cs as any).caravans.push(makeCaravan(1))
    expect(cs.getCaravans()).toHaveLength(1)
    expect(cs.getCaravans()[0].id).toBe(1)
  })

  it('返回内部引用（修改会影响后续查询）', () => {
    ;(cs as any).caravans.push(makeCaravan(1))
    const caravans = cs.getCaravans()
    expect(caravans).toBe((cs as any).caravans)
  })

  it('注入多个商队全部返回', () => {
    ;(cs as any).caravans.push(makeCaravan(1, 1, 2))
    ;(cs as any).caravans.push(makeCaravan(2, 2, 3))
    ;(cs as any).caravans.push(makeCaravan(3, 1, 3))
    expect(cs.getCaravans()).toHaveLength(3)
  })

  it('商队属性正��保存', () => {
    ;(cs as any).caravans.push(makeCaravan(5, 10, 20))
    const c = cs.getCaravans()[0]
    expect(c.fromCivId).toBe(10)
    expect(c.toCivId).toBe(20)
    expect(c.returning).toBe(false)
  })
})

describe('CaravanSystem.reset', () => {
  let cs: CaravanSystem

  beforeEach(() => { cs = makeCS() })

  it('reset 后商队列表为空', () => {
    ;(cs as any).caravans.push(makeCaravan(1))
    ;(cs as any).caravans.push(makeCaravan(2))
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
})
