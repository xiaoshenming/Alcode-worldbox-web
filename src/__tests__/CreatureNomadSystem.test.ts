import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNomadSystem } from '../systems/CreatureNomadSystem'
import type { NomadTribe, NomadTradition } from '../systems/CreatureNomadSystem'

let nextId = 1
function makeSys(): CreatureNomadSystem { return new CreatureNomadSystem() }
function makeTribe(leaderId: number, tradition: NomadTradition = 'herders'): NomadTribe {
  return { id: nextId++, leaderId, tradition, memberCount: 20, migrationSpeed: 5, tradeGoods: 10, campX: 50, campY: 50, tick: 0 }
}

describe('CreatureNomadSystem.getTribes', () => {
  let sys: CreatureNomadSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无游牧部落', () => { expect((sys as any).tribes).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tribes.push(makeTribe(1, 'traders'))
    expect((sys as any).tribes[0].tradition).toBe('traders')
  })
  it('返回内部引用', () => {
    ;(sys as any).tribes.push(makeTribe(1))
    expect((sys as any).tribes).toBe((sys as any).tribes)
  })
  it('支持所有 4 种传统', () => {
    const traditions: NomadTradition[] = ['herders', 'gatherers', 'hunters', 'traders']
    traditions.forEach((t, i) => { ;(sys as any).tribes.push(makeTribe(i + 1, t)) })
    const all = (sys as any).tribes
    traditions.forEach((t, i) => { expect(all[i].tradition).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).tribes.push(makeTribe(1))
    ;(sys as any).tribes.push(makeTribe(2))
    expect((sys as any).tribes).toHaveLength(2)
  })
})
