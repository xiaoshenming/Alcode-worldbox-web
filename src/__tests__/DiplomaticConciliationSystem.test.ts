import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticConciliationSystem } from '../systems/DiplomaticConciliationSystem'
function makeSys() { return new DiplomaticConciliationSystem() }
describe('DiplomaticConciliationSystem', () => {
  let sys: DiplomaticConciliationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProcesses为空', () => { expect(sys.getProcesses()).toHaveLength(0) })
  it('注入后getProcesses返回数据', () => {
    ;(sys as any).processes.push({ id: 1 })
    expect(sys.getProcesses()).toHaveLength(1)
  })
})
