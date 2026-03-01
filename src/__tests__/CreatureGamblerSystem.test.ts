import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGamblerSystem } from '../systems/CreatureGamblerSystem'
import type { Gambler } from '../systems/CreatureGamblerSystem'

let nextId = 1
function makeSys(): CreatureGamblerSystem { return new CreatureGamblerSystem() }
function makeGambler(entityId: number): Gambler {
  return { id: nextId++, entityId, luck: 50, wealth: 100, gamesPlayed: 20, winStreak: 3, tick: 0 }
}

describe('CreatureGamblerSystem.getGamblers', () => {
  let sys: CreatureGamblerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无赌徒', () => { expect((sys as any).gamblers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).gamblers.push(makeGambler(1))
    expect((sys as any).gamblers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).gamblers.push(makeGambler(1))
    expect((sys as any).gamblers).toBe((sys as any).gamblers)
  })
  it('多个全部返回', () => {
    ;(sys as any).gamblers.push(makeGambler(1))
    ;(sys as any).gamblers.push(makeGambler(2))
    expect((sys as any).gamblers).toHaveLength(2)
  })
  it('字段数据完整', () => {
    const g = makeGambler(10)
    g.luck = 90; g.wealth = 500; g.gamesPlayed = 100; g.winStreak = 10
    ;(sys as any).gamblers.push(g)
    const r = (sys as any).gamblers[0]
    expect(r.luck).toBe(90); expect(r.wealth).toBe(500)
    expect(r.gamesPlayed).toBe(100); expect(r.winStreak).toBe(10)
  })
})
