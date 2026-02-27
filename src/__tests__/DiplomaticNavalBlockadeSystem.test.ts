import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticNavalBlockadeSystem } from '../systems/DiplomaticNavalBlockadeSystem'
function makeSys() { return new DiplomaticNavalBlockadeSystem() }
describe('DiplomaticNavalBlockadeSystem', () => {
  let sys: DiplomaticNavalBlockadeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getBlockades为空', () => { expect(sys.getBlockades()).toHaveLength(0) })
  it('注入后getBlockades返回数据', () => {
    ;(sys as any).blockades.push({ id: 1 })
    expect(sys.getBlockades()).toHaveLength(1)
  })
  it('getBlockades返回数组', () => { expect(Array.isArray(sys.getBlockades())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
