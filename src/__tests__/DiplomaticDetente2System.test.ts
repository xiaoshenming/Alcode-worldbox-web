import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticDetente2System } from '../systems/DiplomaticDetente2System'
function makeSys() { return new DiplomaticDetente2System() }
describe('DiplomaticDetente2System', () => {
  let sys: DiplomaticDetente2System
  beforeEach(() => { sys = makeSys() })
  it('初始getProcesses为空', () => { expect(sys.getProcesses()).toHaveLength(0) })
  it('注入后getProcesses返回数据', () => {
    ;(sys as any).processes.push({ id: 1 })
    expect(sys.getProcesses()).toHaveLength(1)
  })
})
