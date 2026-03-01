import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureQuarrymenSystem } from '../systems/CreatureQuarrymenSystem'
import type { Quarryman, StoneType } from '../systems/CreatureQuarrymenSystem'

let nextId = 1
function makeSys(): CreatureQuarrymenSystem { return new CreatureQuarrymenSystem() }
function makeQuarryman(entityId: number, stone: StoneType = 'limestone'): Quarryman {
  return { id: nextId++, entityId, skill: 70, blocksExtracted: 50, stoneType: stone, precision: 65, reputation: 40, tick: 0 }
}

describe('CreatureQuarrymenSystem.getQuarrymen', () => {
  let sys: CreatureQuarrymenSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无采石工', () => { expect((sys as any).quarrymen).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1, 'marble'))
    expect((sys as any).quarrymen[0].stoneType).toBe('marble')
  })
  it('返回内部引用', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1))
    expect((sys as any).quarrymen).toBe((sys as any).quarrymen)
  })
  it('支持所有4种石材类型', () => {
    const types: StoneType[] = ['limestone', 'granite', 'marble', 'slate']
    types.forEach((t, i) => { ;(sys as any).quarrymen.push(makeQuarryman(i + 1, t)) })
    const all = (sys as any).quarrymen
    types.forEach((t, i) => { expect(all[i].stoneType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).quarrymen.push(makeQuarryman(1))
    ;(sys as any).quarrymen.push(makeQuarryman(2))
    expect((sys as any).quarrymen).toHaveLength(2)
  })
})
