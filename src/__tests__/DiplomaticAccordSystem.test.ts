import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAccordSystem } from '../systems/DiplomaticAccordSystem'
function makeSys() { return new DiplomaticAccordSystem() }
describe('DiplomaticAccordSystem', () => {
  let sys: DiplomaticAccordSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getAccords为空', () => { expect(sys.getAccords()).toHaveLength(0) })
  it('注入后getAccords返回数据', () => {
    ;(sys as any).accords.push({ id: 1 })
    expect(sys.getAccords()).toHaveLength(1)
  })
})
