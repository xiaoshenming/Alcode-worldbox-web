import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureToolsmithSystem } from '../systems/CreatureToolsmithSystem'
import type { Toolsmith } from '../systems/CreatureToolsmithSystem'

let nextId = 1
function makeSys(): CreatureToolsmithSystem { return new CreatureToolsmithSystem() }
function makeToolsmith(entityId: number): Toolsmith {
  return { id: nextId++, entityId, metalWorking: 70, toolDesign: 65, temperingSkill: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureToolsmithSystem.getToolsmiths', () => {
  let sys: CreatureToolsmithSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工具匠', () => { expect(sys.getToolsmiths()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    expect(sys.getToolsmiths()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    expect(sys.getToolsmiths()).toBe((sys as any).toolsmiths)
  })
  it('字段正确', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    const t = sys.getToolsmiths()[0]
    expect(t.metalWorking).toBe(70)
    expect(t.temperingSkill).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).toolsmiths.push(makeToolsmith(1))
    ;(sys as any).toolsmiths.push(makeToolsmith(2))
    expect(sys.getToolsmiths()).toHaveLength(2)
  })
})
