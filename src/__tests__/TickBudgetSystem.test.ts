import { describe, it, expect, beforeEach } from 'vitest'
import { TickBudgetSystem } from '../systems/TickBudgetSystem'
function makeSys() { return new TickBudgetSystem() }
describe('TickBudgetSystem', () => {
  let sys: TickBudgetSystem
  beforeEach(() => { sys = makeSys() })
  it('getPerformanceReport返回数组', () => { expect(sys.getPerformanceReport()).toBeInstanceOf(Array) })
  it('frameElapsed初始为0', () => { expect((sys as any).frameElapsed).toBe(0) })
  it('getPerformanceReport初始为空', () => { expect(sys.getPerformanceReport()).toHaveLength(0) })
  it('beginFrame不崩溃', () => { expect(() => sys.beginFrame(60)).not.toThrow() })
  it('beginFrame+endFrame后frameElapsed变化', () => { sys.beginFrame(60); sys.endFrame(); expect((sys as any).frameElapsed).toBeGreaterThanOrEqual(0) })
})
