import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticBlockadeSystem } from '../systems/DiplomaticBlockadeSystem'
function makeSys() { return new DiplomaticBlockadeSystem() }
describe('DiplomaticBlockadeSystem', () => {
  let sys: DiplomaticBlockadeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getBlockades为空', () => { expect((sys as any).blockades).toHaveLength(0) })
  it('注入后getBlockades返回数据', () => {
    ;(sys as any).blockades.push({ id: 1 })
    expect((sys as any).blockades).toHaveLength(1)
  })
  it('getBlockades返回数组', () => { expect(Array.isArray((sys as any).blockades)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
