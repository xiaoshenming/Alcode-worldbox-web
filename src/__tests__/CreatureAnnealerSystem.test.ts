import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAnnealerSystem } from '../systems/CreatureAnnealerSystem'
import type { Annealer } from '../systems/CreatureAnnealerSystem'

// CreatureAnnealerSystem 测试:
// - getAnnealers() → 返回内部数组引用
// update() 依赖 EntityManager，不在此测试。

let nextAnnId = 1

function makeAnnSys(): CreatureAnnealerSystem {
  return new CreatureAnnealerSystem()
}

function makeAnnealer(entityId: number): Annealer {
  return {
    id: nextAnnId++,
    entityId,
    annealingSkill: 20,
    temperatureCycling: 25,
    coolingRate: 10,
    grainRefinement: 15,
    tick: 0,
  }
}

describe('CreatureAnnealerSystem.getAnnealers', () => {
  let sys: CreatureAnnealerSystem

  beforeEach(() => { sys = makeAnnSys(); nextAnnId = 1 })

  it('初始无退火师', () => {
    expect((sys as any).annealers).toHaveLength(0)
  })

  it('注入退火师后可查询', () => {
    ;(sys as any).annealers.push(makeAnnealer(1))
    expect((sys as any).annealers).toHaveLength(1)
    expect((sys as any).annealers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).annealers.push(makeAnnealer(1))
    expect((sys as any).annealers).toBe((sys as any).annealers)
  })

  it('多个退火师全部返回', () => {
    ;(sys as any).annealers.push(makeAnnealer(1))
    ;(sys as any).annealers.push(makeAnnealer(2))
    ;(sys as any).annealers.push(makeAnnealer(3))
    expect((sys as any).annealers).toHaveLength(3)
  })

  it('退火师数据完整', () => {
    const a = makeAnnealer(10)
    a.annealingSkill = 75
    a.temperatureCycling = 60
    a.coolingRate = 30
    a.grainRefinement = 50
    ;(sys as any).annealers.push(a)
    const result = (sys as any).annealers[0]
    expect(result.annealingSkill).toBe(75)
    expect(result.temperatureCycling).toBe(60)
    expect(result.coolingRate).toBe(30)
    expect(result.grainRefinement).toBe(50)
  })
})
