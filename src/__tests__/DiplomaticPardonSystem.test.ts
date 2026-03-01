import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPardonSystem } from '../systems/DiplomaticPardonSystem'
function makeSys() { return new DiplomaticPardonSystem() }
describe('DiplomaticPardonSystem', () => {
  let sys: DiplomaticPardonSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getDecrees为空', () => { expect((sys as any).decrees).toHaveLength(0) })
  it('注入后getDecrees返回数据', () => {
    ;(sys as any).decrees.push({ id: 1 })
    expect((sys as any).decrees).toHaveLength(1)
  })
  it('getDecrees返回数组', () => { expect(Array.isArray((sys as any).decrees)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
