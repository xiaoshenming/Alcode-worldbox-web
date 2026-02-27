import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAmnesty2System } from '../systems/DiplomaticAmnesty2System'
function makeSys() { return new DiplomaticAmnesty2System() }
describe('DiplomaticAmnesty2System', () => {
  let sys: DiplomaticAmnesty2System
  beforeEach(() => { sys = makeSys() })
  it('初始getDecrees为空', () => { expect(sys.getDecrees()).toHaveLength(0) })
  it('注入后getDecrees返回数据', () => {
    ;(sys as any).decrees.push({ id: 1, civIdA: 1, civIdB: 2, form: 'general_pardon', coverageScope: 70, publicRelief: 60, politicalCost: 30, stabilityEffect: 50 })
    expect(sys.getDecrees()).toHaveLength(1)
    expect(sys.getDecrees()[0].id).toBe(1)
  })
  it('getDecrees返回数组', () => { expect(Array.isArray(sys.getDecrees())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
