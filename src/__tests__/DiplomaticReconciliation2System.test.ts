import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticReconciliation2System } from '../systems/DiplomaticReconciliation2System'
function makeSys() { return new DiplomaticReconciliation2System() }
describe('DiplomaticReconciliation2System', () => {
  let sys: DiplomaticReconciliation2System
  beforeEach(() => { sys = makeSys() })
  it('初始getProcesses为空', () => { expect(sys.getProcesses()).toHaveLength(0) })
  it('注入后getProcesses返回数据', () => {
    ;(sys as any).processes.push({ id: 1 })
    expect(sys.getProcesses()).toHaveLength(1)
  })
})
