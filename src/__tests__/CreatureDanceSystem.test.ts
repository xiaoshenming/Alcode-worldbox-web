import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureDanceSystem } from '../systems/CreatureDanceSystem'
import type { DanceEvent, DanceType, DanceEffect } from '../systems/CreatureDanceSystem'

let nextId = 1
function makeSys(): CreatureDanceSystem { return new CreatureDanceSystem() }
function makeDance(type: DanceType = 'celebration', effect: DanceEffect = 'morale'): DanceEvent {
  return { id: nextId++, x: 10, y: 10, type, participants: 5, intensity: 60, startTick: 0, duration: 100, effect }
}

describe('CreatureDanceSystem.getDances', () => {
  let sys: CreatureDanceSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无舞蹈', () => { expect((sys as any).dances).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).dances.push(makeDance('war', 'combat'))
    expect((sys as any).dances[0].type).toBe('war')
    expect((sys as any).dances[0].effect).toBe('combat')
  })

  it('返回内部引用', () => {
    ;(sys as any).dances.push(makeDance())
    expect((sys as any).dances).toBe((sys as any).dances)
  })

  it('支持所有 6 种舞蹈类型', () => {
    const types: DanceType[] = ['celebration', 'war', 'rain', 'harvest', 'funeral', 'mating']
    types.forEach((t, i) => { ;(sys as any).dances.push(makeDance(t)) })
    const all = (sys as any).dances
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })

  it('支持所有 6 种舞蹈效果', () => {
    const effects: DanceEffect[] = ['morale', 'combat', 'fertility', 'luck', 'healing', 'unity']
    effects.forEach((e, i) => { ;(sys as any).dances.push(makeDance('celebration', e)) })
    const all = (sys as any).dances
    effects.forEach((e, i) => { expect(all[i].effect).toBe(e) })
  })
})
