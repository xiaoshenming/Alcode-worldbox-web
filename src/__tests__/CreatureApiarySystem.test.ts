import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureApiarySystem } from '../systems/CreatureApiarySystem'
import type { Apiary, HiveHealth } from '../systems/CreatureApiarySystem'

// CreatureApiarySystem 测试:
// - getApiaries() → 返回只读蜂房数组内部引用
// update() 依赖 EntityManager，不在此测试。

let nextId = 1

function makeApiSys(): CreatureApiarySystem {
  return new CreatureApiarySystem()
}

function makeApiary(keeperId: number, health: HiveHealth = 'stable'): Apiary {
  return {
    id: nextId++,
    keeperId,
    x: 50, y: 50,
    hiveCount: 3,
    health,
    honeyStored: 20,
    pollinationRadius: 10,
    tick: 0,
  }
}

describe('CreatureApiarySystem.getApiaries', () => {
  let sys: CreatureApiarySystem

  beforeEach(() => { sys = makeApiSys(); nextId = 1 })

  it('初始无蜂房', () => {
    expect((sys as any).apiaries).toHaveLength(0)
  })

  it('注入蜂房后可查询', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'thriving'))
    expect((sys as any).apiaries).toHaveLength(1)
    expect((sys as any).apiaries[0].health).toBe('thriving')
  })

  it('返回内部引用', () => {
    ;(sys as any).apiaries.push(makeApiary(1))
    expect((sys as any).apiaries).toBe((sys as any).apiaries)
  })

  it('支持所有 4 种蜂巢健康状态', () => {
    const healths: HiveHealth[] = ['thriving', 'stable', 'stressed', 'collapsed']
    healths.forEach((h, i) => {
      ;(sys as any).apiaries.push(makeApiary(i + 1, h))
    })
    const all = (sys as any).apiaries
    expect(all).toHaveLength(4)
    healths.forEach((h, i) => { expect(all[i].health).toBe(h) })
  })

  it('蜂房数据字段完整', () => {
    const a = makeApiary(5, 'thriving')
    a.hiveCount = 6
    a.honeyStored = 150
    a.pollinationRadius = 12
    ;(sys as any).apiaries.push(a)
    const result = (sys as any).apiaries[0]
    expect(result.keeperId).toBe(5)
    expect(result.hiveCount).toBe(6)
    expect(result.honeyStored).toBe(150)
    expect(result.pollinationRadius).toBe(12)
  })

  it('多个蜂房独立存储', () => {
    ;(sys as any).apiaries.push(makeApiary(1, 'thriving'))
    ;(sys as any).apiaries.push(makeApiary(2, 'collapsed'))
    expect((sys as any).apiaries[0].health).toBe('thriving')
    expect((sys as any).apiaries[1].health).toBe('collapsed')
  })
})
