import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArmisticSystem } from '../systems/DiplomaticArmisticSystem'
function makeSys() { return new DiplomaticArmisticSystem() }
describe('DiplomaticArmisticSystem', () => {
  let sys: DiplomaticArmisticSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArmistices为空', () => { expect(sys.getArmistices()).toHaveLength(0) })
  it('注入后getArmistices返回数据', () => {
    ;(sys as any).armistices.push({ id: 1 })
    expect(sys.getArmistices()).toHaveLength(1)
  })
})
