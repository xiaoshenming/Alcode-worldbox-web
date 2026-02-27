import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticMarriageSystem } from '../systems/DiplomaticMarriageSystem'
function makeSys() { return new DiplomaticMarriageSystem() }
describe('DiplomaticMarriageSystem', () => {
  let sys: DiplomaticMarriageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getMarriages为空', () => { expect(sys.getMarriages()).toHaveLength(0) })
  it('注入后getMarriages返回数据', () => {
    ;(sys as any).marriages.push({ id: 1 })
    expect(sys.getMarriages()).toHaveLength(1)
  })
  it('getMarriages返回数组', () => { expect(Array.isArray(sys.getMarriages())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
