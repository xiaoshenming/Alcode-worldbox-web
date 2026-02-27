import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticReconciliationSystem } from '../systems/DiplomaticReconciliationSystem'
function makeSys() { return new DiplomaticReconciliationSystem() }
describe('DiplomaticReconciliationSystem', () => {
  let sys: DiplomaticReconciliationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProcesses为空', () => { expect(sys.getProcesses()).toHaveLength(0) })
  it('注入后getProcesses返回数据', () => {
    ;(sys as any).processes.push({ id: 1 })
    expect(sys.getProcesses()).toHaveLength(1)
  })
})
