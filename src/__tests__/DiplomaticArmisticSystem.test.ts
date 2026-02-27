import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArmisticSystem } from '../systems/DiplomaticArmisticSystem'
function makeSys() { return new DiplomaticArmisticSystem() }
describe('DiplomaticArmisticSystem', () => {
  let sys: DiplomaticArmisticSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArmistices为空', () => { expect(sys.getArmistices()).toHaveLength(0) })
  it('注入后getArmistices返回数据', () => {
    ;(sys as any).armistices.push({ id: 1, civIdA: 1, civIdB: 2, duration: 200, remaining: 200, violations: 0, stability: 80, tick: 0 })
    expect(sys.getArmistices()).toHaveLength(1)
    expect(sys.getArmistices()[0].id).toBe(1)
  })
  it('getArmistices返回数组', () => { expect(Array.isArray(sys.getArmistices())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
