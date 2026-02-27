import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCuriersSystem } from '../systems/CreatureCuriersSystem'
import type { Curier, LeatherGrade } from '../systems/CreatureCuriersSystem'

let nextId = 1
function makeSys(): CreatureCuriersSystem { return new CreatureCuriersSystem() }
function makeCurier(entityId: number, leatherGrade: LeatherGrade = 'rawhide'): Curier {
  return { id: nextId++, entityId, skill: 30, hidesCured: 10, leatherGrade, quality: 60, reputation: 50, tick: 0 }
}

describe('CreatureCuriersSystem.getCuriers', () => {
  let sys: CreatureCuriersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无制革工', () => { expect(sys.getCuriers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).curiers.push(makeCurier(1, 'fine'))
    expect(sys.getCuriers()[0].leatherGrade).toBe('fine')
  })

  it('返回内部引用', () => {
    ;(sys as any).curiers.push(makeCurier(1))
    expect(sys.getCuriers()).toBe((sys as any).curiers)
  })

  it('支持所有 4 种皮革等级', () => {
    const grades: LeatherGrade[] = ['rawhide', 'tanned', 'tooled', 'fine']
    grades.forEach((g, i) => { ;(sys as any).curiers.push(makeCurier(i + 1, g)) })
    const all = sys.getCuriers()
    grades.forEach((g, i) => { expect(all[i].leatherGrade).toBe(g) })
  })

  it('多个全部返回', () => {
    ;(sys as any).curiers.push(makeCurier(1))
    ;(sys as any).curiers.push(makeCurier(2))
    expect(sys.getCuriers()).toHaveLength(2)
  })
})
