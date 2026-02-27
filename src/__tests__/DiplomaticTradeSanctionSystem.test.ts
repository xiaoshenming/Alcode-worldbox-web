import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticTradeSanctionSystem } from '../systems/DiplomaticTradeSanctionSystem'
function makeSys() { return new DiplomaticTradeSanctionSystem() }
describe('DiplomaticTradeSanctionSystem', () => {
  let sys: DiplomaticTradeSanctionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getSanctions为空', () => { expect(sys.getSanctions()).toHaveLength(0) })
  it('注入后getSanctions返回数据', () => {
    ;(sys as any).sanctions.push({ id: 1 })
    expect(sys.getSanctions()).toHaveLength(1)
  })
})
