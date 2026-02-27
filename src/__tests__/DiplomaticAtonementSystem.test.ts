import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAtonementSystem } from '../systems/DiplomaticAtonementSystem'
function makeSys() { return new DiplomaticAtonementSystem() }
describe('DiplomaticAtonementSystem', () => {
  let sys: DiplomaticAtonementSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProcesses为空', () => { expect(sys.getProcesses()).toHaveLength(0) })
  it('注入后getProcesses返回数据', () => {
    ;(sys as any).processes.push({ id: 1, civIdA: 1, civIdB: 2, form: 'public_apology', sincerityLevel: 80, acceptanceRate: 70, publicAwareness: 60, healingEffect: 50 })
    expect(sys.getProcesses()).toHaveLength(1)
    expect(sys.getProcesses()[0].id).toBe(1)
  })
  it('getProcesses返回数组', () => { expect(Array.isArray(sys.getProcesses())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
