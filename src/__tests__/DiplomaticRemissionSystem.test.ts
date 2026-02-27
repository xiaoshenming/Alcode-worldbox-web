import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticRemissionSystem } from '../systems/DiplomaticRemissionSystem'
function makeSys() { return new DiplomaticRemissionSystem() }
describe('DiplomaticRemissionSystem', () => {
  let sys: DiplomaticRemissionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getActs为空', () => { expect(sys.getActs()).toHaveLength(0) })
  it('注入后getActs返回数据', () => {
    ;(sys as any).acts.push({ id: 1 })
    expect(sys.getActs()).toHaveLength(1)
  })
})
