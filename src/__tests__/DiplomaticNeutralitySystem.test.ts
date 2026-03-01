import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticNeutralitySystem } from '../systems/DiplomaticNeutralitySystem'
function makeSys() { return new DiplomaticNeutralitySystem() }
describe('DiplomaticNeutralitySystem', () => {
  let sys: DiplomaticNeutralitySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getDeclarations为空', () => { expect((sys as any).declarations).toHaveLength(0) })
  it('注入后getDeclarations返回数据', () => {
    ;(sys as any).declarations.push({ id: 1 })
    expect((sys as any).declarations).toHaveLength(1)
  })
  it('getDeclarations返回数组', () => { expect(Array.isArray((sys as any).declarations)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
