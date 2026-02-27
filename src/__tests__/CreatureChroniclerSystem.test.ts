import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChroniclerSystem } from '../systems/CreatureChroniclerSystem'
import type { ChroniclerData, ChroniclerSpecialty } from '../systems/CreatureChroniclerSystem'

function makeSys(): CreatureChroniclerSystem { return new CreatureChroniclerSystem() }
function makeChronicler(entityId: number, specialty: ChroniclerSpecialty = 'war'): ChroniclerData {
  return { entityId, recordCount: 5, specialty, reputation: 50, active: true, tick: 0 }
}

describe('CreatureChroniclerSystem.getChroniclers', () => {
  let sys: CreatureChroniclerSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无编年史家', () => { expect(sys.getChroniclers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1, 'culture'))
    expect(sys.getChroniclers()[0].specialty).toBe('culture')
  })

  it('返回只读引用', () => {
    ;(sys as any).chroniclers.push(makeChronicler(1))
    expect(sys.getChroniclers()).toBe((sys as any).chroniclers)
  })

  it('支持所有 4 种专长', () => {
    const specialties: ChroniclerSpecialty[] = ['war', 'nature', 'culture', 'trade']
    specialties.forEach((s, i) => { ;(sys as any).chroniclers.push(makeChronicler(i + 1, s)) })
    const all = sys.getChroniclers()
    specialties.forEach((s, i) => { expect(all[i].specialty).toBe(s) })
  })

  it('active 字段可区分', () => {
    ;(sys as any).chroniclers.push({ ...makeChronicler(1), active: false })
    expect(sys.getChroniclers()[0].active).toBe(false)
  })
})
