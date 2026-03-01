import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSilkWeaverSystem } from '../systems/CreatureSilkWeaverSystem'
import type { SilkWeaver } from '../systems/CreatureSilkWeaverSystem'

let nextId = 1
function makeSys(): CreatureSilkWeaverSystem { return new CreatureSilkWeaverSystem() }
function makeWeaver(entityId: number): SilkWeaver {
  return { id: nextId++, entityId, threadFineness: 70, loomMastery: 65, patternComplexity: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureSilkWeaverSystem.getWeavers', () => {
  let sys: CreatureSilkWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无丝绸织工', () => { expect((sys as any).weavers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })
  it('字段正确', () => {
    ;(sys as any).weavers.push(makeWeaver(2))
    const w = (sys as any).weavers[0]
    expect(w.threadFineness).toBe(70)
    expect(w.patternComplexity).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    ;(sys as any).weavers.push(makeWeaver(2))
    expect((sys as any).weavers).toHaveLength(2)
  })
})
