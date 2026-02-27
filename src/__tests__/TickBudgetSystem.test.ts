import { describe, it, expect, beforeEach } from 'vitest'
import { TickBudgetSystem } from '../systems/TickBudgetSystem'
function makeSys() { return new TickBudgetSystem() }
describe('TickBudgetSystem', () => {
  let sys: TickBudgetSystem
  beforeEach(() => { sys = makeSys() })
  it('getPerformanceReport返回数组', () => { expect(sys.getPerformanceReport()).toBeInstanceOf(Array) })
  it('getTotalTickTime初始为0', () => { expect(sys.getTotalTickTime()).toBe(0) })
})
