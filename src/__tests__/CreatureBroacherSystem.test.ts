import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBroacherSystem } from '../systems/CreatureBroacherSystem'
import type { Broacher } from '../systems/CreatureBroacherSystem'

let nextId = 1
function makeSys(): CreatureBroacherSystem { return new CreatureBroacherSystem() }
function makeBroacher(entityId: number): Broacher {
  return { id: nextId++, entityId, broachingSkill: 30, toothAlignment: 25, internalShaping: 20, keywayCutting: 35, tick: 0 }
}

describe('CreatureBroacherSystem.getBroachers', () => {
  let sys: CreatureBroacherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无拉削师', () => { expect(sys.getBroachers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).broachers.push(makeBroacher(1))
    expect(sys.getBroachers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).broachers.push(makeBroacher(1))
    expect(sys.getBroachers()).toBe((sys as any).broachers)
  })

  it('多个全部返回', () => {
    ;(sys as any).broachers.push(makeBroacher(1))
    ;(sys as any).broachers.push(makeBroacher(2))
    expect(sys.getBroachers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBroacher(10)
    b.broachingSkill = 80; b.toothAlignment = 75; b.internalShaping = 70; b.keywayCutting = 65
    ;(sys as any).broachers.push(b)
    const r = sys.getBroachers()[0]
    expect(r.broachingSkill).toBe(80); expect(r.toothAlignment).toBe(75)
    expect(r.internalShaping).toBe(70); expect(r.keywayCutting).toBe(65)
  })
})
