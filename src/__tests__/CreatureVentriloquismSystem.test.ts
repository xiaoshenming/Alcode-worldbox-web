import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureVentriloquismSystem } from '../systems/CreatureVentriloquismSystem'
import type { VentriloquismAct, VoiceTrick } from '../systems/CreatureVentriloquismSystem'

let nextId = 1
function makeSys(): CreatureVentriloquismSystem { return new CreatureVentriloquismSystem() }
function makeAct(performerId: number, trick: VoiceTrick = 'distraction'): VentriloquismAct {
  return { id: nextId++, performerId, trick, skill: 70, effectiveness: 60, targetId: null, detected: false, tick: 0 }
}

describe('CreatureVentriloquismSystem.getActs', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无口技表演', () => { expect(sys.getActs()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).acts.push(makeAct(1, 'mimicry'))
    expect(sys.getActs()[0].trick).toBe('mimicry')
  })
  it('返回只读引用', () => {
    ;(sys as any).acts.push(makeAct(1))
    expect(sys.getActs()).toBe((sys as any).acts)
  })
  it('支持所有6种口技技巧', () => {
    const tricks: VoiceTrick[] = ['distraction', 'mimicry', 'intimidation', 'lure', 'comedy', 'warning']
    tricks.forEach((t, i) => { ;(sys as any).acts.push(makeAct(i + 1, t)) })
    expect(sys.getActs()).toHaveLength(6)
  })
  it('targetId可为null', () => {
    ;(sys as any).acts.push(makeAct(1))
    expect(sys.getActs()[0].targetId).toBeNull()
  })
})
