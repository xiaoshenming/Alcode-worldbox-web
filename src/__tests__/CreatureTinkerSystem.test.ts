import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTinkerSystem } from '../systems/CreatureTinkerSystem'
import type { Tinker } from '../systems/CreatureTinkerSystem'

let nextId = 1
function makeSys(): CreatureTinkerSystem { return new CreatureTinkerSystem() }
function makeTinker(entityId: number): Tinker {
  return { id: nextId++, entityId, metalRepair: 70, solderingSkill: 65, resourcefulness: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureTinkerSystem.getTinkers', () => {
  let sys: CreatureTinkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无修锅匠', () => { expect(sys.getTinkers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tinkers.push(makeTinker(1))
    expect(sys.getTinkers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).tinkers.push(makeTinker(1))
    expect(sys.getTinkers()).toBe((sys as any).tinkers)
  })
  it('字段正确', () => {
    ;(sys as any).tinkers.push(makeTinker(2))
    const t = sys.getTinkers()[0]
    expect(t.metalRepair).toBe(70)
    expect(t.outputQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).tinkers.push(makeTinker(1))
    ;(sys as any).tinkers.push(makeTinker(2))
    expect(sys.getTinkers()).toHaveLength(2)
  })
})
