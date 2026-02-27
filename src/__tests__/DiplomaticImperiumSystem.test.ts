import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticImperiumSystem } from '../systems/DiplomaticImperiumSystem'
function makeSys() { return new DiplomaticImperiumSystem() }
describe('DiplomaticImperiumSystem', () => {
  let sys: DiplomaticImperiumSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getRelations为空', () => { expect(sys.getRelations()).toHaveLength(0) })
  it('注入后getRelations返回数据', () => {
    ;(sys as any).relations.push({ id: 1 })
    expect(sys.getRelations()).toHaveLength(1)
  })
  it('getRelations返回数组', () => { expect(Array.isArray(sys.getRelations())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
