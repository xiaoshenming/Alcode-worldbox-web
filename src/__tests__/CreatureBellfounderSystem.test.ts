import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBellfounderSystem } from '../systems/CreatureBellfounderSystem'
import type { Bellfounder } from '../systems/CreatureBellfounderSystem'

let nextId = 1
function makeSys(): CreatureBellfounderSystem { return new CreatureBellfounderSystem() }
function makeMaker(entityId: number): Bellfounder {
  return { id: nextId++, entityId, bronzeCasting: 70, moldMaking: 65, toneTuning: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureBellfounderSystem.getBellfounders', () => {
  let sys: CreatureBellfounderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铸钟工', () => { expect(sys.getBellfounders()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    expect(sys.getBellfounders()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    expect(sys.getBellfounders()).toBe((sys as any).bellfounders)
  })
  it('字段正确', () => {
    ;(sys as any).bellfounders.push(makeMaker(2))
    const b = sys.getBellfounders()[0]
    expect(b.bronzeCasting).toBe(70)
    expect(b.toneTuning).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).bellfounders.push(makeMaker(1))
    ;(sys as any).bellfounders.push(makeMaker(2))
    expect(sys.getBellfounders()).toHaveLength(2)
  })
})
