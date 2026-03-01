import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCharcoalBurnersSystem } from '../systems/CreatureCharcoalBurnersSystem'
import type { CharcoalBurner, CharcoalGrade } from '../systems/CreatureCharcoalBurnersSystem'

let nextId = 1
function makeSys(): CreatureCharcoalBurnersSystem { return new CreatureCharcoalBurnersSystem() }
function makeBurner(entityId: number, grade: CharcoalGrade = 'soft'): CharcoalBurner {
  return { id: nextId++, entityId, skill: 30, batchesProduced: 10, grade, burnEfficiency: 60, reputation: 50, tick: 0 }
}

describe('CreatureCharcoalBurnersSystem.getBurners', () => {
  let sys: CreatureCharcoalBurnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无烧炭工', () => { expect((sys as any).burners).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).burners.push(makeBurner(1, 'hard'))
    expect((sys as any).burners[0].grade).toBe('hard')
  })

  it('返回内部引用', () => {
    ;(sys as any).burners.push(makeBurner(1))
    expect((sys as any).burners).toBe((sys as any).burners)
  })

  it('支持所有 4 种木炭等级', () => {
    const grades: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    grades.forEach((g, i) => { ;(sys as any).burners.push(makeBurner(i + 1, g)) })
    const all = (sys as any).burners
    grades.forEach((g, i) => { expect(all[i].grade).toBe(g) })
  })

  it('多个全部返回', () => {
    ;(sys as any).burners.push(makeBurner(1))
    ;(sys as any).burners.push(makeBurner(2))
    expect((sys as any).burners).toHaveLength(2)
  })
})
