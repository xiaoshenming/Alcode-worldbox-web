import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHarnessmakerSystem } from '../systems/CreatureHarnessmakerSystem'
import type { Harnessmaker } from '../systems/CreatureHarnessmakerSystem'

let nextId = 1
function makeSys(): CreatureHarnessmakerSystem { return new CreatureHarnessmakerSystem() }
function makeHm(entityId: number): Harnessmaker {
  return { id: nextId++, entityId, leatherStitching: 70, buckleFitting: 65, strapCutting: 60, outputQuality: 75, tick: 0 }
}

describe('CreatureHarnessmakerSystem.getHarnessmakers', () => {
  let sys: CreatureHarnessmakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无皮具匠', () => { expect((sys as any).harnessmakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).harnessmakers.push(makeHm(1))
    expect((sys as any).harnessmakers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).harnessmakers.push(makeHm(1))
    expect((sys as any).harnessmakers).toBe((sys as any).harnessmakers)
  })
  it('字段正确', () => {
    ;(sys as any).harnessmakers.push(makeHm(3))
    const h = (sys as any).harnessmakers[0]
    expect(h.leatherStitching).toBe(70)
    expect(h.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).harnessmakers.push(makeHm(1))
    ;(sys as any).harnessmakers.push(makeHm(2))
    expect((sys as any).harnessmakers).toHaveLength(2)
  })
})
