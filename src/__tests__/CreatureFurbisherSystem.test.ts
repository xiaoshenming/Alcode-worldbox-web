import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFurbisherSystem } from '../systems/CreatureFurbisherSystem'
import type { Furbisher } from '../systems/CreatureFurbisherSystem'

let nextId = 1
function makeSys(): CreatureFurbisherSystem { return new CreatureFurbisherSystem() }
function makeFurbisher(entityId: number, furbishingSkill = 50): Furbisher {
  return { id: nextId++, entityId, furbishingSkill, polishingTechnique: 60, surfaceRestoration: 70, lustreQuality: 80, tick: 0 }
}

describe('CreatureFurbisherSystem', () => {
  let sys: CreatureFurbisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抛光工', () => {
    expect((sys as any).furbishers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).furbishers.push(makeFurbisher(1))
    expect((sys as any).furbishers[0].entityId).toBe(1)
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
    expect(r.furbishingSkill).toBe(90)
    expect(r.polishingTechnique).toBe(85)
    expect(r.surfaceRestoration).toBe(80)
    expect(r.lustreQuality).toBe(75)
  })

  it('tick差值<2840不触发更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 3839)  // 3839 - 1000 = 2839 < 2840
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=2840更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, {} as any, 3840)  // 3840 - 1000 = 2840 >= 2840
    expect((sys as any).lastCheck).toBe(3840)
  })

  it('update后furbishingSkill+0.02', () => {
    const f = makeFurbisher(1, 50)
    ;(sys as any).furbishers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2840)
    expect((sys as any).furbishers[0].furbishingSkill).toBeCloseTo(50.02, 5)
  })

  it('update后polishingTechnique+0.015', () => {
    const f = makeFurbisher(1, 50)
    f.polishingTechnique = 60
    ;(sys as any).furbishers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2840)
    expect((sys as any).furbishers[0].polishingTechnique).toBeCloseTo(60.015, 5)
  })

  it('update后lustreQuality+0.01', () => {
    const f = makeFurbisher(1, 50)
    f.lustreQuality = 80
    ;(sys as any).furbishers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2840)
    expect((sys as any).furbishers[0].lustreQuality).toBeCloseTo(80.01, 5)
  })

  it('furbishingSkill上限100', () => {
    const f = makeFurbisher(1, 99.99)
    ;(sys as any).furbishers.push(f)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2840)
    expect((sys as any).furbishers[0].furbishingSkill).toBe(100)
  })

  it('cleanup: furbishingSkill<=4时删除，>4时保留', () => {
    // entityId=1: furbishingSkill=3.98, after +0.02 => 4.00 <= 4 => 删除
    const f1 = makeFurbisher(1, 3.98)
    // entityId=2: furbishingSkill=4.01, after +0.02 => 4.03 > 4 => 保留
    const f2 = makeFurbisher(2, 4.01)
    ;(sys as any).furbishers.push(f1)
    ;(sys as any).furbishers.push(f2)
    ;(sys as any).lastCheck = 0
    sys.update(16, {} as any, 2840)
    const remaining = (sys as any).furbishers
    expect(remaining.some((f: Furbisher) => f.entityId === 1)).toBe(false)
    expect(remaining.some((f: Furbisher) => f.entityId === 2)).toBe(true)
  })
})
