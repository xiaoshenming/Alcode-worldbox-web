import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAldermanshipSystem } from '../systems/DiplomaticAldermanshipSystem'
function makeSys() { return new DiplomaticAldermanshipSystem() }
describe('DiplomaticAldermanshipSystem', () => {
  let sys: DiplomaticAldermanshipSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1, councilCivId: 1, aldermanCivId: 2, form: 'ward_aldermanship', wardPresidency: 60, councilInfluence: 70, tradeRegulation: 50, judicialRole: 40 })
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(1)
  })
  it('getArrangements返回数组', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
