import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSwedgerSystem } from '../systems/CreatureSwedgerSystem'
import type { Swedger } from '../systems/CreatureSwedgerSystem'

let nextId = 1
function makeSys(): CreatureSwedgerSystem { return new CreatureSwedgerSystem() }
function makeSwedger(entityId: number): Swedger {
  return { id: nextId++, entityId, swedgingSkill: 70, dieAlignment: 65, diameterReduction: 80, surfaceFinish: 75, tick: 0 }
}

describe('CreatureSwedgerSystem.getSwedgers', () => {
  let sys: CreatureSwedgerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无缩径工', () => { expect(sys.getSwedgers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).swedgers.push(makeSwedger(1))
    expect(sys.getSwedgers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).swedgers.push(makeSwedger(1))
    expect(sys.getSwedgers()).toBe((sys as any).swedgers)
  })
  it('字段正确', () => {
    ;(sys as any).swedgers.push(makeSwedger(2))
    const s = sys.getSwedgers()[0]
    expect(s.swedgingSkill).toBe(70)
    expect(s.diameterReduction).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).swedgers.push(makeSwedger(1))
    ;(sys as any).swedgers.push(makeSwedger(2))
    expect(sys.getSwedgers()).toHaveLength(2)
  })
})
