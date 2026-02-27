import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEnamelersSystem } from '../systems/CreatureEnamelersSystem'
import type { Enameler, EnamelTechnique } from '../systems/CreatureEnamelersSystem'

let nextId = 1
function makeSys(): CreatureEnamelersSystem { return new CreatureEnamelersSystem() }
function makeMaker(entityId: number, technique: EnamelTechnique = 'cloisonne'): Enameler {
  return { id: nextId++, entityId, skill: 40, piecesEnameled: 10, technique, colorRange: 60, reputation: 50, tick: 0 }
}

describe('CreatureEnamelersSystem.getMakers', () => {
  let sys: CreatureEnamelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珐琅工', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'champleve'))
    expect(sys.getMakers()[0].technique).toBe('champleve')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种珐琅技法', () => {
    const techs: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    techs.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    techs.forEach((t, i) => { expect(all[i].technique).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
