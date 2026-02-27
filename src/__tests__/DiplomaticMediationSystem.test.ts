import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticMediationSystem } from '../systems/DiplomaticMediationSystem'
function makeSys() { return new DiplomaticMediationSystem() }
describe('DiplomaticMediationSystem', () => {
  let sys: DiplomaticMediationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getMediations为空', () => { expect(sys.getMediations()).toHaveLength(0) })
  it('注入后getMediations返回数据', () => {
    ;(sys as any).mediations.push({ id: 1 })
    expect(sys.getMediations()).toHaveLength(1)
  })
  it('getMediations返回数组', () => { expect(Array.isArray(sys.getMediations())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
