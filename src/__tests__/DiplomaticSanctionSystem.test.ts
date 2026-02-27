import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSanctionSystem } from '../systems/DiplomaticSanctionSystem'
function makeSys() { return new DiplomaticSanctionSystem() }
describe('DiplomaticSanctionSystem', () => {
  let sys: DiplomaticSanctionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getSanctions为空', () => { expect(sys.getSanctions()).toHaveLength(0) })
  it('注入后getSanctions返回数据', () => {
    ;(sys as any).sanctions.push({ id: 1 })
    expect(sys.getSanctions()).toHaveLength(1)
  })
  it('getSanctions返回数组', () => { expect(Array.isArray(sys.getSanctions())).toBe(true) })
  it('sanctions初始为空数组', () => { expect((sys as any).sanctions).toHaveLength(0) })
  it('nextCheckTick初始大于0', () => { expect((sys as any).nextCheckTick).toBeGreaterThan(0) })
})
