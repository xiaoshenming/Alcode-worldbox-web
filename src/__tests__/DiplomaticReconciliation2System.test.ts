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
  it('getProcesses返回数组', () => { expect(Array.isArray(sys.getProcesses())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
