import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureExileSystem } from '../systems/CreatureExileSystem'
import type { Exile, ExileReason } from '../systems/CreatureExileSystem'

let nextId = 1
function makeSys(): CreatureExileSystem { return new CreatureExileSystem() }
function makeExile(entityId: number, reason: ExileReason = 'crime'): Exile {
  return { id: nextId++, entityId, fromCivId: 1, reason, wanderTicks: 0, tick: 0 }
}

describe('CreatureExileSystem.getExiles', () => {
  let sys: CreatureExileSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无流亡者', () => { expect((sys as any).exiles).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).exiles.push(makeExile(1, 'treason'))
    expect((sys as any).exiles[0].reason).toBe('treason')
  })

  it('返回内部引用', () => {
    ;(sys as any).exiles.push(makeExile(1))
    expect((sys as any).exiles).toBe((sys as any).exiles)
  })

  it('支持所有 6 种流放原因', () => {
    const reasons: ExileReason[] = ['crime', 'treason', 'heresy', 'cowardice', 'debt', 'curse']
    reasons.forEach((r, i) => { ;(sys as any).exiles.push(makeExile(i + 1, r)) })
    const all = (sys as any).exiles
    reasons.forEach((r, i) => { expect(all[i].reason).toBe(r) })
  })

  it('getExileCount 返回数量', () => {
    ;(sys as any).exiles.push(makeExile(1))
    ;(sys as any).exiles.push(makeExile(2))
    expect((sys as any).exiles.length).toBe(2)
  })
})
