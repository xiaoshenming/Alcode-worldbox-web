import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePiercerSystem } from '../systems/CreaturePiercerSystem'
import type { Piercer } from '../systems/CreaturePiercerSystem'

let nextId = 1
function makeSys(): CreaturePiercerSystem { return new CreaturePiercerSystem() }
function makePiercer(entityId: number): Piercer {
  return { id: nextId++, entityId, piercingSkill: 70, holePrecision: 65, plateHandling: 75, punchMaintenance: 80, tick: 0 }
}

describe('CreaturePiercerSystem.getPiercers', () => {
  let sys: CreaturePiercerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无穿孔工', () => { expect(sys.getPiercers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).piercers.push(makePiercer(1))
    expect(sys.getPiercers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).piercers.push(makePiercer(1))
    expect(sys.getPiercers()).toBe((sys as any).piercers)
  })
  it('字段正确', () => {
    ;(sys as any).piercers.push(makePiercer(3))
    const p = sys.getPiercers()[0]
    expect(p.piercingSkill).toBe(70)
    expect(p.punchMaintenance).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).piercers.push(makePiercer(1))
    ;(sys as any).piercers.push(makePiercer(2))
    expect(sys.getPiercers()).toHaveLength(2)
  })
})
