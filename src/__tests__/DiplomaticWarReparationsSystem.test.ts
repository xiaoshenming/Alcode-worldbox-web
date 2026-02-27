import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticWarReparationsSystem } from '../systems/DiplomaticWarReparationsSystem'
function makeSys() { return new DiplomaticWarReparationsSystem() }
describe('DiplomaticWarReparationsSystem', () => {
  let sys: DiplomaticWarReparationsSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getReparations为空', () => { expect(sys.getReparations()).toHaveLength(0) })
  it('注入后getReparations返回数据', () => {
    ;(sys as any).reparations.push({ id: 1 })
    expect(sys.getReparations()).toHaveLength(1)
  })
})
