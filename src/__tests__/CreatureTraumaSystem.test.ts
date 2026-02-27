import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTraumaSystem } from '../systems/CreatureTraumaSystem'
import type { Trauma, TraumaSource, TraumaEffect } from '../systems/CreatureTraumaSystem'

let nextId = 1
function makeSys(): CreatureTraumaSystem { return new CreatureTraumaSystem() }
function makeTrauma(creatureId: number, source: TraumaSource = 'combat', effect: TraumaEffect = 'avoidance'): Trauma {
  return { id: nextId++, creatureId, source, effect, severity: 60, locationX: 10, locationY: 20, formedTick: 0, healingRate: 0.1 }
}

describe('CreatureTraumaSystem getters', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无创伤', () => { expect(sys.getTraumas()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'disaster'))
    expect(sys.getTraumas()[0].source).toBe('disaster')
  })
  it('返回内部引用', () => {
    ;(sys as any).traumas.push(makeTrauma(1))
    expect(sys.getTraumas()).toBe((sys as any).traumas)
  })
  it('getCreatureTraumas按creatureId过滤', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat'))
    ;(sys as any).traumas.push(makeTrauma(2, 'loss'))
    ;(sys as any).traumas.push(makeTrauma(1, 'starvation'))
    const result = sys.getCreatureTraumas(1)
    expect(result).toHaveLength(2)
    result.forEach(t => expect(t.creatureId).toBe(1))
  })
  it('支持所有创伤来源', () => {
    const sources: TraumaSource[] = ['combat', 'disaster', 'loss', 'starvation', 'exile', 'betrayal']
    sources.forEach((s, i) => { ;(sys as any).traumas.push(makeTrauma(i + 1, s)) })
    expect(sys.getTraumas()).toHaveLength(6)
  })
  it('字段正确', () => {
    ;(sys as any).traumas.push(makeTrauma(2, 'exile', 'withdrawal'))
    const t = sys.getTraumas()[0]
    expect(t.severity).toBe(60)
    expect(t.effect).toBe('withdrawal')
  })
})
