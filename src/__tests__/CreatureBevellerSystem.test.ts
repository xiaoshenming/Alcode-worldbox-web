import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBevellerSystem } from '../systems/CreatureBevellerSystem'
import type { Beveller } from '../systems/CreatureBevellerSystem'

let nextId = 1
function makeSys(): CreatureBevellerSystem { return new CreatureBevellerSystem() }
function makeBeveller(entityId: number): Beveller {
  return { id: nextId++, entityId, bevellingSkill: 20, angleAccuracy: 25, edgeSmoothing: 15, chamferControl: 20, tick: 0 }
}

describe('CreatureBevellerSystem.getBevellers', () => {
  let sys: CreatureBevellerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无斜切师', () => { expect((sys as any).bevellers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    expect((sys as any).bevellers).toHaveLength(1)
    expect((sys as any).bevellers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    expect((sys as any).bevellers).toBe((sys as any).bevellers)
  })

  it('多个斜切师全部返回', () => {
    ;(sys as any).bevellers.push(makeBeveller(1))
    ;(sys as any).bevellers.push(makeBeveller(2))
    expect((sys as any).bevellers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBeveller(10)
    b.bevellingSkill = 80; b.angleAccuracy = 75; b.edgeSmoothing = 70; b.chamferControl = 65
    ;(sys as any).bevellers.push(b)
    const r = (sys as any).bevellers[0]
    expect(r.bevellingSkill).toBe(80)
    expect(r.angleAccuracy).toBe(75)
    expect(r.edgeSmoothing).toBe(70)
    expect(r.chamferControl).toBe(65)
  })
})
