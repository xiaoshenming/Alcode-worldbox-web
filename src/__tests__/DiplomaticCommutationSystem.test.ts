import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCommutationSystem } from '../systems/DiplomaticCommutationSystem'
function makeSys() { return new DiplomaticCommutationSystem() }
describe('DiplomaticCommutationSystem', () => {
  let sys: DiplomaticCommutationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getActs为空', () => { expect(sys.getActs()).toHaveLength(0) })
  it('注入后getActs返回数据', () => {
    ;(sys as any).acts.push({ id: 1 })
    expect(sys.getActs()).toHaveLength(1)
  })
})
