import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticExileSystem } from '../systems/DiplomaticExileSystem'
function makeSys() { return new DiplomaticExileSystem() }
describe('DiplomaticExileSystem', () => {
  let sys: DiplomaticExileSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getExiles为空', () => { expect((sys as any).exiles).toHaveLength(0) })
  it('注入后getExiles返回数据', () => {
    ;(sys as any).exiles.push({ id: 1 })
    expect((sys as any).exiles).toHaveLength(1)
  })
  it('getExiles返回数组', () => { expect(Array.isArray((sys as any).exiles)).toBe(true) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('lastFate初始为0', () => { expect((sys as any).lastFate).toBe(0) })
})
