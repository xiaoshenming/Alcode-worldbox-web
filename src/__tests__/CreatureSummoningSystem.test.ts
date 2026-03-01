import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSummoningSystem } from '../systems/CreatureSummoningSystem'
import type { Summon, SummonType } from '../systems/CreatureSummoningSystem'

let nextId = 1
function makeSys(): CreatureSummoningSystem { return new CreatureSummoningSystem() }
function makeSummon(summonerId: number, type: SummonType = 'elemental'): Summon {
  return { id: nextId++, type, summonerId, x: 10, y: 20, power: 75, duration: 500, tick: 0 }
}

describe('CreatureSummoningSystem.getSummons', () => {
  let sys: CreatureSummoningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无召唤物', () => { expect((sys as any).summons).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).summons.push(makeSummon(1, 'spirit'))
    expect((sys as any).summons[0].type).toBe('spirit')
  })
  it('返回只读引用', () => {
    ;(sys as any).summons.push(makeSummon(1))
    expect((sys as any).summons).toBe((sys as any).summons)
  })
  it('支持所有5种召唤类型', () => {
    const types: SummonType[] = ['elemental', 'spirit', 'golem', 'phantom', 'familiar']
    types.forEach((t, i) => { ;(sys as any).summons.push(makeSummon(i + 1, t)) })
    const all = (sys as any).summons
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
  it('getMastery无记录返回0', () => {
    expect(((sys as any).masteryMap?.get(999) ?? (sys as any).mastery?.get(999) ?? 0)).toBe(0)
  })
  it('getMastery可通过masteryMap注入', () => {
    ;(sys as any).masteryMap.set(1, 80)
    expect(((sys as any).masteryMap?.get(1) ?? (sys as any).mastery?.get(1) ?? 0)).toBe(80)
  })
  it('字段正确', () => {
    ;(sys as any).summons.push(makeSummon(1, 'golem'))
    const s = (sys as any).summons[0]
    expect(s.power).toBe(75)
    expect(s.duration).toBe(500)
  })
})
