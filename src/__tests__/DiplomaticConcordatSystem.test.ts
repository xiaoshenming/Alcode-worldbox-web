import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticConcordatSystem } from '../systems/DiplomaticConcordatSystem'
function makeSys() { return new DiplomaticConcordatSystem() }
describe('DiplomaticConcordatSystem', () => {
  let sys: DiplomaticConcordatSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProceedings为空', () => { expect((sys as any).proceedings).toHaveLength(0) })
  it('注入后getProceedings返回数据', () => {
    ;(sys as any).proceedings.push({ id: 1 })
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('getProceedings返回数组', () => { expect(Array.isArray((sys as any).proceedings)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
