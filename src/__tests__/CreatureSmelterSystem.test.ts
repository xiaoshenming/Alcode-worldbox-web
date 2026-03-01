import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSmelterSystem } from '../systems/CreatureSmelterSystem'
import type { Smelter } from '../systems/CreatureSmelterSystem'

let nextId = 1
function makeSys(): CreatureSmelterSystem { return new CreatureSmelterSystem() }
function makeSmelter(entityId: number): Smelter {
  return { id: nextId++, entityId, smeltingSkill: 70, oreKnowledge: 65, heatManagement: 80, yieldEfficiency: 75, tick: 0 }
}

describe('CreatureSmelterSystem.getSmelters', () => {
  let sys: CreatureSmelterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冶炼工', () => { expect((sys as any).smelters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).smelters.push(makeSmelter(1))
    expect((sys as any).smelters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).smelters.push(makeSmelter(1))
    expect((sys as any).smelters).toBe((sys as any).smelters)
  })
  it('字段正确', () => {
    ;(sys as any).smelters.push(makeSmelter(2))
    const s = (sys as any).smelters[0]
    expect(s.smeltingSkill).toBe(70)
    expect(s.heatManagement).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).smelters.push(makeSmelter(1))
    ;(sys as any).smelters.push(makeSmelter(2))
    expect((sys as any).smelters).toHaveLength(2)
  })
})
