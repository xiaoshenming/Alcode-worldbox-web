import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAtonementSystem } from '../systems/DiplomaticAtonementSystem'
function makeSys() { return new DiplomaticAtonementSystem() }
describe('DiplomaticAtonementSystem', () => {
  let sys: DiplomaticAtonementSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProcesses为空', () => { expect(sys.getProcesses()).toHaveLength(0) })
  it('注入后getProcesses返回数据', () => {
    ;(sys as any).processes.push({ id: 1 })
    expect(sys.getProcesses()).toHaveLength(1)
  })
})
