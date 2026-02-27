import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureClaustrophobiaSystem } from '../systems/CreatureClaustrophobiaSystem'
import type { Claustrophobe } from '../systems/CreatureClaustrophobiaSystem'

let nextId = 1
function makeSys(): CreatureClaustrophobiaSystem { return new CreatureClaustrophobiaSystem() }
function makeClaustrophobe(entityId: number): Claustrophobe {
  return { id: nextId++, entityId, severity: 50, panicLevel: 20, triggers: 3, tick: 0 }
}

describe('CreatureClaustrophobiaSystem.getClaustrophobes', () => {
  let sys: CreatureClaustrophobiaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无幽闭恐惧者', () => { expect(sys.getClaustrophobes()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).claustrophobes.push(makeClaustrophobe(1))
    expect(sys.getClaustrophobes()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).claustrophobes.push(makeClaustrophobe(1))
    expect(sys.getClaustrophobes()).toBe((sys as any).claustrophobes)
  })

  it('多个全部返回', () => {
    ;(sys as any).claustrophobes.push(makeClaustrophobe(1))
    ;(sys as any).claustrophobes.push(makeClaustrophobe(2))
    expect(sys.getClaustrophobes()).toHaveLength(2)
  })

  it('severity 和 panicLevel 字段正确', () => {
    const c = makeClaustrophobe(10)
    c.severity = 90; c.panicLevel = 80
    ;(sys as any).claustrophobes.push(c)
    const r = sys.getClaustrophobes()[0]
    expect(r.severity).toBe(90); expect(r.panicLevel).toBe(80)
  })
})
