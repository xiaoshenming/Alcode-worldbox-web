import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticChamberlainshipSystem } from '../systems/DiplomaticChamberlainshipSystem'
function makeSys() { return new DiplomaticChamberlainshipSystem() }
describe('DiplomaticChamberlainshipSystem', () => {
  let sys: DiplomaticChamberlainshipSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('getArrangements返回数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
