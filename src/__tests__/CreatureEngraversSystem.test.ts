import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEngraversSystem } from '../systems/CreatureEngraversSystem'
import type { Engraver, EngravingMedium } from '../systems/CreatureEngraversSystem'

let nextId = 1
function makeSys(): CreatureEngraversSystem { return new CreatureEngraversSystem() }
function makeEngraver(entityId: number, medium: EngravingMedium = 'metal'): Engraver {
  return { id: nextId++, entityId, skill: 40, piecesCompleted: 10, medium, precision: 70, creativity: 60, tick: 0 }
}

describe('CreatureEngraversSystem.getEngravers', () => {
  let sys: CreatureEngraversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无雕刻工', () => { expect((sys as any).engravers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).engravers.push(makeEngraver(1, 'gem'))
    expect((sys as any).engravers[0].medium).toBe('gem')
  })

  it('返回内部引用', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    expect((sys as any).engravers).toBe((sys as any).engravers)
  })

  it('支持所有 4 种雕刻材质', () => {
    const meds: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    meds.forEach((m, i) => { ;(sys as any).engravers.push(makeEngraver(i + 1, m)) })
    const all = (sys as any).engravers
    meds.forEach((m, i) => { expect(all[i].medium).toBe(m) })
  })

  it('多个全部返回', () => {
    ;(sys as any).engravers.push(makeEngraver(1))
    ;(sys as any).engravers.push(makeEngraver(2))
    expect((sys as any).engravers).toHaveLength(2)
  })
})
