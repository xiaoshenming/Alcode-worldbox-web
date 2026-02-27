import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSolidaritySystem } from '../systems/DiplomaticSolidaritySystem'
function makeSys() { return new DiplomaticSolidaritySystem() }
describe('DiplomaticSolidaritySystem', () => {
  let sys: DiplomaticSolidaritySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPacts为空', () => { expect(sys.getPacts()).toHaveLength(0) })
  it('注入后getPacts返回数据', () => {
    ;(sys as any).pacts.push({ id: 1 })
    expect(sys.getPacts()).toHaveLength(1)
  })
})
