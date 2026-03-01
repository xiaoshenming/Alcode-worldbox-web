import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticDetenteSystem } from '../systems/DiplomaticDetenteSystem'
function makeSys() { return new DiplomaticDetenteSystem() }
describe('DiplomaticDetenteSystem', () => {
  let sys: DiplomaticDetenteSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTreaties为空', () => { expect((sys as any).treaties).toHaveLength(0) })
  it('注入后getTreaties返回数据', () => {
    ;(sys as any).treaties.push({ id: 1 })
    expect((sys as any).treaties).toHaveLength(1)
  })
  it('getTreaties返回数组', () => { expect(Array.isArray((sys as any).treaties)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
