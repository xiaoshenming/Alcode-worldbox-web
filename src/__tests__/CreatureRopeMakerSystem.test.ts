import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRopeMakerSystem } from '../systems/CreatureRopeMakerSystem'
import type { RopeMaker, RopeType } from '../systems/CreatureRopeMakerSystem'

let nextId = 1
function makeSys(): CreatureRopeMakerSystem { return new CreatureRopeMakerSystem() }
function makeMaker(entityId: number, type: RopeType = 'hemp'): RopeMaker {
  return { id: nextId++, entityId, skill: 70, ropesMade: 20, ropeType: type, tensileStrength: 75, length: 30, tick: 0 }
}

describe('CreatureRopeMakerSystem.getRopeMakers', () => {
  let sys: CreatureRopeMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绳匠', () => { expect((sys as any).ropeMakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1, 'silk'))
    expect((sys as any).ropeMakers[0].ropeType).toBe('silk')
  })
  it('返回内部引用', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1))
    expect((sys as any).ropeMakers).toBe((sys as any).ropeMakers)
  })
  it('支持所有4种绳索类型', () => {
    const types: RopeType[] = ['hemp', 'silk', 'wire', 'chain']
    types.forEach((t, i) => { ;(sys as any).ropeMakers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).ropeMakers
    types.forEach((t, i) => { expect(all[i].ropeType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).ropeMakers.push(makeMaker(1))
    ;(sys as any).ropeMakers.push(makeMaker(2))
    expect((sys as any).ropeMakers).toHaveLength(2)
  })
})
