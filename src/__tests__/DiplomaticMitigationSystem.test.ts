import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticMitigationSystem } from '../systems/DiplomaticMitigationSystem'
function makeSys() { return new DiplomaticMitigationSystem() }
describe('DiplomaticMitigationSystem', () => {
  let sys: DiplomaticMitigationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getMeasures为空', () => { expect(sys.getMeasures()).toHaveLength(0) })
  it('注入后getMeasures返回数据', () => {
    ;(sys as any).measures.push({ id: 1 })
    expect(sys.getMeasures()).toHaveLength(1)
  })
  it('getMeasures返回数组', () => { expect(Array.isArray(sys.getMeasures())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
