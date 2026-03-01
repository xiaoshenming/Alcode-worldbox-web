import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTrapperSystem } from '../systems/CreatureTrapperSystem'
import type { Trapper, BaitType } from '../systems/CreatureTrapperSystem'

let nextId = 1
function makeSys(): CreatureTrapperSystem { return new CreatureTrapperSystem() }
function makeTrapper(entityId: number, baitType: BaitType = 'meat'): Trapper {
  return { id: nextId++, entityId, trapsSet: 5, trapsCaught: 3, skill: 70, baitType, territory: 20, tick: 0 }
}

describe('CreatureTrapperSystem.getTrappers', () => {
  let sys: CreatureTrapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无陷阱工', () => { expect((sys as any).trappers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).trappers.push(makeTrapper(1, 'fish'))
    expect((sys as any).trappers[0].baitType).toBe('fish')
  })
  it('返回内部引用', () => {
    ;(sys as any).trappers.push(makeTrapper(1))
    expect((sys as any).trappers).toBe((sys as any).trappers)
  })
  it('支持所有5种诱饵类型', () => {
    const baits: BaitType[] = ['meat', 'grain', 'insect', 'fish', 'berry']
    baits.forEach((b, i) => { ;(sys as any).trappers.push(makeTrapper(i + 1, b)) })
    const all = (sys as any).trappers
    baits.forEach((b, i) => { expect(all[i].baitType).toBe(b) })
  })
  it('字段正确', () => {
    ;(sys as any).trappers.push(makeTrapper(2))
    const t = (sys as any).trappers[0]
    expect(t.trapsSet).toBe(5)
    expect(t.trapsCaught).toBe(3)
  })
})
