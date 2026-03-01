import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHeraldSystem } from '../systems/CreatureHeraldSystem'
import type { Herald, HeraldRank } from '../systems/CreatureHeraldSystem'

let nextId = 1
function makeSys(): CreatureHeraldSystem { return new CreatureHeraldSystem() }
function makeHerald(creatureId: number, rank: HeraldRank = 'town_crier'): Herald {
  return { id: nextId++, creatureId, rank, reach: 10, moraleBoost: 5, announcements: 3, age: 100, tick: 0 }
}

describe('CreatureHeraldSystem.getHeralds', () => {
  let sys: CreatureHeraldSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无传令官', () => { expect((sys as any).heralds).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).heralds.push(makeHerald(1, 'royal_herald'))
    expect((sys as any).heralds[0].rank).toBe('royal_herald')
  })
  it('返回内部引用', () => {
    ;(sys as any).heralds.push(makeHerald(1))
    expect((sys as any).heralds).toBe((sys as any).heralds)
  })
  it('支持所有 4 种职级', () => {
    const ranks: HeraldRank[] = ['town_crier', 'royal_herald', 'grand_herald', 'legendary']
    ranks.forEach((r, i) => { ;(sys as any).heralds.push(makeHerald(i + 1, r)) })
    const all = (sys as any).heralds
    ranks.forEach((r, i) => { expect(all[i].rank).toBe(r) })
  })
  it('多个全部返回', () => {
    ;(sys as any).heralds.push(makeHerald(1))
    ;(sys as any).heralds.push(makeHerald(2))
    expect((sys as any).heralds).toHaveLength(2)
  })
})
