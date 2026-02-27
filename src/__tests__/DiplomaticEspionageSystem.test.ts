import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticEspionageSystem } from '../systems/DiplomaticEspionageSystem'
function makeSys() { return new DiplomaticEspionageSystem() }
describe('DiplomaticEspionageSystem', () => {
  let sys: DiplomaticEspionageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getSpies为空', () => { expect(sys.getSpies()).toHaveLength(0) })
  it('注入后getSpies返回数据', () => {
    ;(sys as any).spies.push({ id: 1 })
    expect(sys.getSpies()).toHaveLength(1)
  })
  it('getSpies返回数组', () => { expect(Array.isArray(sys.getSpies())).toBe(true) })
  it('spies初始为空数组', () => { expect((sys as any).spies).toHaveLength(0) })
  it('reports初始为空数组', () => { expect((sys as any).reports).toHaveLength(0) })
})
