import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticRapprochementSystem } from '../systems/DiplomaticRapprochementSystem'
function makeSys() { return new DiplomaticRapprochementSystem() }
describe('DiplomaticRapprochementSystem', () => {
  let sys: DiplomaticRapprochementSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProcesses为空', () => { expect((sys as any).processes).toHaveLength(0) })
  it('注入后getProcesses返回数据', () => {
    ;(sys as any).processes.push({ id: 1 })
    expect((sys as any).processes).toHaveLength(1)
  })
  it('getProcesses返回数组', () => { expect(Array.isArray((sys as any).processes)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
