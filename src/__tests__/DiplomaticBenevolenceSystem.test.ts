import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticBenevolenceSystem } from '../systems/DiplomaticBenevolenceSystem'
function makeSys() { return new DiplomaticBenevolenceSystem() }
describe('DiplomaticBenevolenceSystem', () => {
  let sys: DiplomaticBenevolenceSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getInitiatives为空', () => { expect((sys as any).initiatives).toHaveLength(0) })
  it('注入后getInitiatives返回数据', () => {
    ;(sys as any).initiatives.push({ id: 1 })
    expect((sys as any).initiatives).toHaveLength(1)
  })
  it('getInitiatives返回数组', () => { expect(Array.isArray((sys as any).initiatives)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
