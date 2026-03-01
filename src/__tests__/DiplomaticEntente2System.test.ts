import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticEntente2System } from '../systems/DiplomaticEntente2System'
function makeSys() { return new DiplomaticEntente2System() }
describe('DiplomaticEntente2System', () => {
  let sys: DiplomaticEntente2System
  beforeEach(() => { sys = makeSys() })
  it('初始getEntentes为空', () => { expect((sys as any).ententes).toHaveLength(0) })
  it('注入后getEntentes返回数据', () => {
    ;(sys as any).ententes.push({ id: 1 })
    expect((sys as any).ententes).toHaveLength(1)
  })
  it('getEntentes返回数组', () => { expect(Array.isArray((sys as any).ententes)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
