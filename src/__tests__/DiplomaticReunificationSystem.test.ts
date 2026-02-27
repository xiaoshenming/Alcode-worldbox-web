import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticReunificationSystem } from '../systems/DiplomaticReunificationSystem'
function makeSys() { return new DiplomaticReunificationSystem() }
describe('DiplomaticReunificationSystem', () => {
  let sys: DiplomaticReunificationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTreaties为空', () => { expect(sys.getTreaties()).toHaveLength(0) })
  it('注入后getTreaties返回数据', () => {
    ;(sys as any).treaties.push({ id: 1 })
    expect(sys.getTreaties()).toHaveLength(1)
  })
  it('getTreaties返回数组', () => { expect(Array.isArray(sys.getTreaties())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
