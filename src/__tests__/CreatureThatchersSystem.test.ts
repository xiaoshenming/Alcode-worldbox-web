import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureThatchersSystem } from '../systems/CreatureThatchersSystem'
import type { Thatcher, ThatchMaterial } from '../systems/CreatureThatchersSystem'

let nextId = 1
function makeSys(): CreatureThatchersSystem { return new CreatureThatchersSystem() }
function makeMaker(entityId: number, material: ThatchMaterial = 'straw'): Thatcher {
  return { id: nextId++, entityId, skill: 70, roofsBuilt: 12, material, weatherproofing: 65, lifespan: 80, tick: 0 }
}

describe('CreatureThatchersSystem.getThatchers', () => {
  let sys: CreatureThatchersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无茅草工', () => { expect((sys as any).thatchers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).thatchers.push(makeMaker(1, 'reed'))
    expect((sys as any).thatchers[0].material).toBe('reed')
  })
  it('返回内部引用', () => {
    ;(sys as any).thatchers.push(makeMaker(1))
    expect((sys as any).thatchers).toBe((sys as any).thatchers)
  })
  it('支持所有4种茅草材料', () => {
    const materials: ThatchMaterial[] = ['straw', 'reed', 'palm', 'heather']
    materials.forEach((m, i) => { ;(sys as any).thatchers.push(makeMaker(i + 1, m)) })
    const all = (sys as any).thatchers
    materials.forEach((m, i) => { expect(all[i].material).toBe(m) })
  })
  it('多个全部返回', () => {
    ;(sys as any).thatchers.push(makeMaker(1))
    ;(sys as any).thatchers.push(makeMaker(2))
    expect((sys as any).thatchers).toHaveLength(2)
  })
})
