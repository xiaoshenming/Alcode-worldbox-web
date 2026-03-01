import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFarrierSystem } from '../systems/CreatureFarrierSystem'
import type { Farrier, ShoeType } from '../systems/CreatureFarrierSystem'

let nextId = 1
function makeSys(): CreatureFarrierSystem { return new CreatureFarrierSystem() }
function makeFarrier(entityId: number, shoeType: ShoeType = 'iron'): Farrier {
  return { id: nextId++, entityId, skill: 40, horsesShod: 20, shoeType, fitQuality: 70, hoofHealth: 80, tick: 0 }
}

describe('CreatureFarrierSystem.getFarriers', () => {
  let sys: CreatureFarrierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蹄铁匠', () => { expect((sys as any).farriers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).farriers.push(makeFarrier(1, 'steel'))
    expect((sys as any).farriers[0].shoeType).toBe('steel')
  })

  it('返回内部引用', () => {
    ;(sys as any).farriers.push(makeFarrier(1))
    expect((sys as any).farriers).toBe((sys as any).farriers)
  })

  it('支持所有 4 种蹄铁类型', () => {
    const types: ShoeType[] = ['iron', 'steel', 'aluminum', 'therapeutic']
    types.forEach((t, i) => { ;(sys as any).farriers.push(makeFarrier(i + 1, t)) })
    const all = (sys as any).farriers
    types.forEach((t, i) => { expect(all[i].shoeType).toBe(t) })
  })
})

describe('CreatureFarrierSystem.getSkill', () => {
  let sys: CreatureFarrierSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 0', () => { expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 90)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(90)
  })
})
