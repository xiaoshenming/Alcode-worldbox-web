import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSwagerSystem } from '../systems/CreatureSwagerSystem'
import type { Swager } from '../systems/CreatureSwagerSystem'

let nextId = 1
function makeSys(): CreatureSwagerSystem { return new CreatureSwagerSystem() }
function makeSwager(entityId: number): Swager {
  return { id: nextId++, entityId, swagingSkill: 70, dieAlignment: 65, metalForming: 80, dimensionalAccuracy: 75, tick: 0 }
}

describe('CreatureSwagerSystem.getSwagers', () => {
  let sys: CreatureSwagerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无旋锻工', () => { expect(sys.getSwagers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).swagers.push(makeSwager(1))
    expect(sys.getSwagers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).swagers.push(makeSwager(1))
    expect(sys.getSwagers()).toBe((sys as any).swagers)
  })
  it('字段正确', () => {
    ;(sys as any).swagers.push(makeSwager(2))
    const s = sys.getSwagers()[0]
    expect(s.swagingSkill).toBe(70)
    expect(s.dimensionalAccuracy).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).swagers.push(makeSwager(1))
    ;(sys as any).swagers.push(makeSwager(2))
    expect(sys.getSwagers()).toHaveLength(2)
  })
})
