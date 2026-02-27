import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticBenevolenceSystem } from '../systems/DiplomaticBenevolenceSystem'
function makeSys() { return new DiplomaticBenevolenceSystem() }
describe('DiplomaticBenevolenceSystem', () => {
  let sys: DiplomaticBenevolenceSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getInitiatives为空', () => { expect(sys.getInitiatives()).toHaveLength(0) })
  it('注入后getInitiatives返回数据', () => {
    ;(sys as any).initiatives.push({ id: 1 })
    expect(sys.getInitiatives()).toHaveLength(1)
  })
})
