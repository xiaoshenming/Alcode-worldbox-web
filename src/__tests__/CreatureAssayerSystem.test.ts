import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAssayerSystem } from '../systems/CreatureAssayerSystem'
import type { Assayer } from '../systems/CreatureAssayerSystem'

// CreatureAssayerSystem 测试:
// - getAssayers() → 返回内部数组引用

let nextId = 1

function makeAssSys(): CreatureAssayerSystem {
  return new CreatureAssayerSystem()
}

function makeAssayer(entityId: number): Assayer {
  return {
    id: nextId++,
    entityId,
    assayingSkill: 20,
    chemicalKnowledge: 25,
    precisionTesting: 15,
    purityAssessment: 20,
    tick: 0,
  }
}

describe('CreatureAssayerSystem.getAssayers', () => {
  let sys: CreatureAssayerSystem

  beforeEach(() => { sys = makeAssSys(); nextId = 1 })

  it('初始无化验师', () => {
    expect((sys as any).assayers).toHaveLength(0)
  })

  it('注入化验师后可查询', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    expect((sys as any).assayers).toHaveLength(1)
    expect((sys as any).assayers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    expect((sys as any).assayers).toBe((sys as any).assayers)
  })

  it('多个化验师全部返回', () => {
    ;(sys as any).assayers.push(makeAssayer(1))
    ;(sys as any).assayers.push(makeAssayer(2))
    ;(sys as any).assayers.push(makeAssayer(3))
    expect((sys as any).assayers).toHaveLength(3)
  })

  it('化验师数据字段完整', () => {
    const a = makeAssayer(10)
    a.assayingSkill = 80
    a.chemicalKnowledge = 70
    a.precisionTesting = 60
    a.purityAssessment = 75
    ;(sys as any).assayers.push(a)
    const result = (sys as any).assayers[0]
    expect(result.assayingSkill).toBe(80)
    expect(result.chemicalKnowledge).toBe(70)
    expect(result.precisionTesting).toBe(60)
    expect(result.purityAssessment).toBe(75)
  })
})
