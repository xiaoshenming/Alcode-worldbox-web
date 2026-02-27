import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticRehabilitationSystem } from '../systems/DiplomaticRehabilitationSystem'
function makeSys() { return new DiplomaticRehabilitationSystem() }
describe('DiplomaticRehabilitationSystem', () => {
  let sys: DiplomaticRehabilitationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProcesses为空', () => { expect(sys.getProcesses()).toHaveLength(0) })
  it('注入后getProcesses返回数据', () => {
    ;(sys as any).processes.push({ id: 1 })
    expect(sys.getProcesses()).toHaveLength(1)
  })
})
