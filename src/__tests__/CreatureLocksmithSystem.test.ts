import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLocksmithSystem } from '../systems/CreatureLocksmithSystem'
import type { Locksmith } from '../systems/CreatureLocksmithSystem'

let nextId = 1
function makeSys(): CreatureLocksmithSystem { return new CreatureLocksmithSystem() }
function makeLocksmith(entityId: number): Locksmith {
  return { id: nextId++, entityId, precisionWork: 70, mechanismDesign: 65, keyFitting: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureLocksmithSystem.getLocksmiths', () => {
  let sys: CreatureLocksmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锁匠', () => { expect(sys.getLocksmiths()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1))
    expect(sys.getLocksmiths()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1))
    expect(sys.getLocksmiths()).toBe((sys as any).locksmiths)
  })
  it('字段正确', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(3))
    const l = sys.getLocksmiths()[0]
    expect(l.precisionWork).toBe(70)
    expect(l.keyFitting).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).locksmiths.push(makeLocksmith(1))
    ;(sys as any).locksmiths.push(makeLocksmith(2))
    expect(sys.getLocksmiths()).toHaveLength(2)
  })
})
