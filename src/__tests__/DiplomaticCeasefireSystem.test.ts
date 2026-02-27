import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCeasefireSystem } from '../systems/DiplomaticCeasefireSystem'
function makeSys() { return new DiplomaticCeasefireSystem() }
describe('DiplomaticCeasefireSystem', () => {
  let sys: DiplomaticCeasefireSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getCeasefires为空', () => { expect(sys.getCeasefires()).toHaveLength(0) })
  it('注入后getCeasefires返回数据', () => {
    ;(sys as any).ceasefires.push({ id: 1 })
    expect(sys.getCeasefires()).toHaveLength(1)
  })
  it('getCeasefires返回数组', () => { expect(Array.isArray(sys.getCeasefires())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
