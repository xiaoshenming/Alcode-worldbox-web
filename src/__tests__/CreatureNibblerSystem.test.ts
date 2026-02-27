import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNibblerSystem } from '../systems/CreatureNibblerSystem'
import type { Nibbler } from '../systems/CreatureNibblerSystem'

let nextId = 1
function makeSys(): CreatureNibblerSystem { return new CreatureNibblerSystem() }
function makeNibbler(entityId: number): Nibbler {
  return { id: nextId++, entityId, nibblingSkill: 70, cutPrecision: 65, sheetHandling: 80, toolMaintenance: 75, tick: 0 }
}

describe('CreatureNibblerSystem.getNibblers', () => {
  let sys: CreatureNibblerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无剪切工', () => { expect(sys.getNibblers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).nibblers.push(makeNibbler(1))
    expect(sys.getNibblers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).nibblers.push(makeNibbler(1))
    expect(sys.getNibblers()).toBe((sys as any).nibblers)
  })
  it('字段正确', () => {
    ;(sys as any).nibblers.push(makeNibbler(3))
    const n = sys.getNibblers()[0]
    expect(n.nibblingSkill).toBe(70)
    expect(n.sheetHandling).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).nibblers.push(makeNibbler(1))
    ;(sys as any).nibblers.push(makeNibbler(2))
    expect(sys.getNibblers()).toHaveLength(2)
  })
})
