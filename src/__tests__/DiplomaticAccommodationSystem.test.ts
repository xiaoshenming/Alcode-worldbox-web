import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAccommodationSystem } from '../systems/DiplomaticAccommodationSystem'
function makeSys() { return new DiplomaticAccommodationSystem() }
describe('DiplomaticAccommodationSystem', () => {
  let sys: DiplomaticAccommodationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProceedings为空', () => { expect((sys as any).proceedings).toHaveLength(0) })
  it('注入后getProceedings返回数据', () => {
    ;(sys as any).proceedings.push({ id: 1, civIdA: 1, civIdB: 2, form: 'position_adjustment', flexibility: 60, mutualBenefit: 50, adjustmentDepth: 40, stabilityGain: 30 })
    expect((sys as any).proceedings).toHaveLength(1)
    expect((sys as any).proceedings[0].id).toBe(1)
  })
  it('getProceedings返回数组', () => { expect(Array.isArray((sys as any).proceedings)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
