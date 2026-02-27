import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNeedlerSystem } from '../systems/CreatureNeedlerSystem'
import type { Needler } from '../systems/CreatureNeedlerSystem'

let nextId = 1
function makeSys(): CreatureNeedlerSystem { return new CreatureNeedlerSystem() }
function makeNeedler(entityId: number): Needler {
  return { id: nextId++, entityId, needlingSkill: 70, pointSharpness: 80, eyeForming: 65, tempeControl: 75, tick: 0 }
}

describe('CreatureNeedlerSystem.getNeedlers', () => {
  let sys: CreatureNeedlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无制针工', () => { expect(sys.getNeedlers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    expect(sys.getNeedlers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    expect(sys.getNeedlers()).toBe((sys as any).needlers)
  })
  it('字段正确', () => {
    ;(sys as any).needlers.push(makeNeedler(5))
    const n = sys.getNeedlers()[0]
    expect(n.needlingSkill).toBe(70)
    expect(n.pointSharpness).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).needlers.push(makeNeedler(1))
    ;(sys as any).needlers.push(makeNeedler(2))
    expect(sys.getNeedlers()).toHaveLength(2)
  })
})
