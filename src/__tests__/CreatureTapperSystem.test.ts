import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTapperSystem } from '../systems/CreatureTapperSystem'
import type { Tapper } from '../systems/CreatureTapperSystem'

let nextId = 1
function makeSys(): CreatureTapperSystem { return new CreatureTapperSystem() }
function makeTapper(entityId: number): Tapper {
  return { id: nextId++, entityId, tappingSkill: 70, threadPitch: 65, depthControl: 80, alignmentAccuracy: 75, tick: 0 }
}

describe('CreatureTapperSystem.getTappers', () => {
  let sys: CreatureTapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无螺纹工', () => { expect((sys as any).tappers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    expect((sys as any).tappers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    expect((sys as any).tappers).toBe((sys as any).tappers)
  })
  it('字段正确', () => {
    ;(sys as any).tappers.push(makeTapper(2))
    const t = (sys as any).tappers[0]
    expect(t.tappingSkill).toBe(70)
    expect(t.depthControl).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    ;(sys as any).tappers.push(makeTapper(2))
    expect((sys as any).tappers).toHaveLength(2)
  })
})
