import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticMediationSystem } from '../systems/DiplomaticMediationSystem'
function makeSys() { return new DiplomaticMediationSystem() }
describe('DiplomaticMediationSystem', () => {
  let sys: DiplomaticMediationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getMediations为空', () => { expect(sys.getMediations()).toHaveLength(0) })
  it('注入后getMediations返回数据', () => {
    ;(sys as any).mediations.push({ id: 1 })
    expect(sys.getMediations()).toHaveLength(1)
  })
})
