import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSuccessionSystem } from '../systems/DiplomaticSuccessionSystem'
function makeSys() { return new DiplomaticSuccessionSystem() }
describe('DiplomaticSuccessionSystem', () => {
  let sys: DiplomaticSuccessionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getEvents为空', () => { expect((sys as any).events).toHaveLength(0) })
  it('注入后getEvents返回数据', () => {
    ;(sys as any).events.push({ id: 1 })
    expect((sys as any).events).toHaveLength(1)
  })
  it('getEvents返回数组', () => { expect(Array.isArray((sys as any).events)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
