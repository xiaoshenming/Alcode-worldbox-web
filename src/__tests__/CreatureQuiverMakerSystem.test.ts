import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureQuiverMakerSystem } from '../systems/CreatureQuiverMakerSystem'
import type { QuiverMaker } from '../systems/CreatureQuiverMakerSystem'

let nextId = 1
function makeSys(): CreatureQuiverMakerSystem { return new CreatureQuiverMakerSystem() }
function makeMaker(entityId: number): QuiverMaker {
  return { id: nextId++, entityId, leatherStitching: 70, shapeDesign: 65, waterproofing: 75, outputQuality: 80, tick: 0 }
}

describe('CreatureQuiverMakerSystem.getMakers', () => {
  let sys: CreatureQuiverMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无箭袋制作者', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = sys.getMakers()[0]
    expect(m.leatherStitching).toBe(70)
    expect(m.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
