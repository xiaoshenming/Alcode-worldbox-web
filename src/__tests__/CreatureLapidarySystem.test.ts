import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLapidarySystem } from '../systems/CreatureLapidarySystem'
import type { Lapidary } from '../systems/CreatureLapidarySystem'

let nextId = 1
function makeSys(): CreatureLapidarySystem { return new CreatureLapidarySystem() }
function makeLap(entityId: number): Lapidary {
  return { id: nextId++, entityId, cuttingSkill: 70, polishingControl: 65, gemIdentification: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureLapidarySystem.getLapidaries', () => {
  let sys: CreatureLapidarySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无宝石工', () => { expect(sys.getLapidaries()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect(sys.getLapidaries()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    expect(sys.getLapidaries()).toBe((sys as any).lapidaries)
  })
  it('字段正确', () => {
    ;(sys as any).lapidaries.push(makeLap(3))
    const l = sys.getLapidaries()[0]
    expect(l.cuttingSkill).toBe(70)
    expect(l.gemIdentification).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).lapidaries.push(makeLap(1))
    ;(sys as any).lapidaries.push(makeLap(2))
    expect(sys.getLapidaries()).toHaveLength(2)
  })
})
