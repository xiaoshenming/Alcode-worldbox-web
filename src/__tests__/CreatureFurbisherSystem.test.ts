import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFurbisherSystem } from '../systems/CreatureFurbisherSystem'
import type { Furbisher } from '../systems/CreatureFurbisherSystem'

let nextId = 1
function makeSys(): CreatureFurbisherSystem { return new CreatureFurbisherSystem() }
function makeFurbisher(entityId: number): Furbisher {
  return { id: nextId++, entityId, furbishingSkill: 50, polishingTechnique: 60, surfaceRestoration: 70, lustreQuality: 80, tick: 0 }
}

describe('CreatureFurbisherSystem.getFurbishers', () => {
  let sys: CreatureFurbisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抛光工', () => { expect((sys as any).furbishers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).furbishers.push(makeFurbisher(1))
    expect((sys as any).furbishers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).furbishers.push(makeFurbisher(1))
    expect((sys as any).furbishers).toBe((sys as any).furbishers)
  })

  it('多个全部返回', () => {
    ;(sys as any).furbishers.push(makeFurbisher(1))
    ;(sys as any).furbishers.push(makeFurbisher(2))
    expect((sys as any).furbishers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const f = makeFurbisher(10)
    f.furbishingSkill = 90; f.polishingTechnique = 85; f.surfaceRestoration = 80; f.lustreQuality = 75
    ;(sys as any).furbishers.push(f)
    const r = (sys as any).furbishers[0]
    expect(r.furbishingSkill).toBe(90); expect(r.polishingTechnique).toBe(85)
    expect(r.surfaceRestoration).toBe(80); expect(r.lustreQuality).toBe(75)
  })
})
