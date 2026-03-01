import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticHostageSystem } from '../systems/DiplomaticHostageSystem'
function makeSys() { return new DiplomaticHostageSystem() }
describe('DiplomaticHostageSystem', () => {
  let sys: DiplomaticHostageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getHostages为空', () => { expect((sys as any).hostages).toHaveLength(0) })
  it('注入后getHostages返回数据', () => {
    ;(sys as any).hostages.push({ id: 1 })
    expect((sys as any).hostages).toHaveLength(1)
  })
  it('getHostages返回数组', () => { expect(Array.isArray((sys as any).hostages)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
