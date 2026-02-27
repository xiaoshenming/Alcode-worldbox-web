import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticProtectorateSystem } from '../systems/DiplomaticProtectorateSystem'
function makeSys() { return new DiplomaticProtectorateSystem() }
describe('DiplomaticProtectorateSystem', () => {
  let sys: DiplomaticProtectorateSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getRelations为空', () => { expect(sys.getRelations()).toHaveLength(0) })
  it('注入后getRelations返回数据', () => {
    ;(sys as any).relations.push({ id: 1 })
    expect(sys.getRelations()).toHaveLength(1)
  })
})
