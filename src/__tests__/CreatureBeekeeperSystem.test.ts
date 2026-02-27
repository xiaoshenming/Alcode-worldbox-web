import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBeekeeperSystem } from '../systems/CreatureBeekeeperSystem'
import type { Beekeeper, HiveType } from '../systems/CreatureBeekeeperSystem'

// CreatureBeekeeperSystem 测试:
// - getBeekeepers() → 返回只读养蜂人数组内部引用

let nextId = 1

function makeBKSys(): CreatureBeekeeperSystem {
  return new CreatureBeekeeperSystem()
}

function makeBeekeeper(entityId: number, hiveType: HiveType = 'log'): Beekeeper {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    hivesManaged: 2,
    honeyHarvested: 50,
    waxCollected: 10,
    hiveType,
    beeHealth: 80,
    tick: 0,
  }
}

describe('CreatureBeekeeperSystem.getBeekeepers', () => {
  let sys: CreatureBeekeeperSystem

  beforeEach(() => { sys = makeBKSys(); nextId = 1 })

  it('初始无养蜂人', () => {
    expect(sys.getBeekeepers()).toHaveLength(0)
  })

  it('注入养蜂人后可查询', () => {
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'frame'))
    expect(sys.getBeekeepers()).toHaveLength(1)
    expect(sys.getBeekeepers()[0].hiveType).toBe('frame')
  })

  it('返回内部引用', () => {
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    expect(sys.getBeekeepers()).toBe((sys as any).beekeepers)
  })

  it('支持所有 4 种蜂箱类型', () => {
    const types: HiveType[] = ['log', 'clay', 'woven', 'frame']
    types.forEach((t, i) => {
      ;(sys as any).beekeepers.push(makeBeekeeper(i + 1, t))
    })
    const all = sys.getBeekeepers()
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].hiveType).toBe(t) })
  })

  it('养蜂人数据字段完整', () => {
    const b = makeBeekeeper(10, 'frame')
    b.skill = 90
    b.hivesManaged = 8
    b.honeyHarvested = 200
    b.waxCollected = 50
    b.beeHealth = 95
    ;(sys as any).beekeepers.push(b)
    const result = sys.getBeekeepers()[0]
    expect(result.skill).toBe(90)
    expect(result.hivesManaged).toBe(8)
    expect(result.honeyHarvested).toBe(200)
    expect(result.waxCollected).toBe(50)
    expect(result.beeHealth).toBe(95)
  })
})
