import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticClemencySystem } from '../systems/DiplomaticClemencySystem'
function makeSys() { return new DiplomaticClemencySystem() }
describe('DiplomaticClemencySystem', () => {
  let sys: DiplomaticClemencySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getActs为空', () => { expect(sys.getActs()).toHaveLength(0) })
  it('注入后getActs返回数据', () => {
    ;(sys as any).acts.push({ id: 1 })
    expect(sys.getActs()).toHaveLength(1)
  })
})
