import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChandlerSystem } from '../systems/CreatureChandlerSystem'
import type { Chandler, WickType } from '../systems/CreatureChandlerSystem'

let nextId = 1
function makeSys(): CreatureChandlerSystem { return new CreatureChandlerSystem() }
function makeChandler(entityId: number, wickType: WickType = 'cotton'): Chandler {
  return { id: nextId++, entityId, skill: 30, candlesProduced: 10, waxStored: 50, wickType, lightOutput: 60, tick: 0 }
}

describe('CreatureChandlerSystem.getChandlers', () => {
  let sys: CreatureChandlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蜡烛师', () => { expect(sys.getChandlers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'silk'))
    expect(sys.getChandlers()[0].wickType).toBe('silk')
  })

  it('返回只读引用', () => {
    ;(sys as any).chandlers.push(makeChandler(1))
    expect(sys.getChandlers()).toBe((sys as any).chandlers)
  })

  it('支持所有 4 种灯芯类型', () => {
    const types: WickType[] = ['cotton', 'hemp', 'linen', 'silk']
    types.forEach((t, i) => { ;(sys as any).chandlers.push(makeChandler(i + 1, t)) })
    const all = sys.getChandlers()
    types.forEach((t, i) => { expect(all[i].wickType).toBe(t) })
  })
})

describe('CreatureChandlerSystem.getSkill', () => {
  let sys: CreatureChandlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 0', () => { expect(sys.getSkill(999)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 85)
    expect(sys.getSkill(42)).toBe(85)
  })
})
