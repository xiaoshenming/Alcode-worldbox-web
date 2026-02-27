import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticVindicationSystem } from '../systems/DiplomaticVindicationSystem'
function makeSys() { return new DiplomaticVindicationSystem() }
describe('DiplomaticVindicationSystem', () => {
  let sys: DiplomaticVindicationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProceedings为空', () => { expect(sys.getProceedings()).toHaveLength(0) })
  it('注入后getProceedings返回数据', () => {
    ;(sys as any).proceedings.push({ id: 1 })
    expect(sys.getProceedings()).toHaveLength(1)
  })
  it('getProceedings返回数组', () => { expect(Array.isArray(sys.getProceedings())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
