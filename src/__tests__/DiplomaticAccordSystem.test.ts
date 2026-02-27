import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAccordSystem } from '../systems/DiplomaticAccordSystem'
function makeSys() { return new DiplomaticAccordSystem() }
describe('DiplomaticAccordSystem', () => {
  let sys: DiplomaticAccordSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAccords为空', () => { expect(sys.getAccords()).toHaveLength(0) })
  it('注入后getAccords返回数据', () => {
    ;(sys as any).accords.push({ id: 1, civIdA: 1, civIdB: 2, domain: 'trade', bindingForce: 70, mutualSatisfaction: 60, implementationRate: 50, longevity: 40 })
    expect(sys.getAccords()).toHaveLength(1)
    expect(sys.getAccords()[0].id).toBe(1)
  })
  it('getAccords返回数组', () => { expect(Array.isArray(sys.getAccords())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
