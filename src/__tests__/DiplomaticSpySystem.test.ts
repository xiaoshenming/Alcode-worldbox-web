import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSpySystem } from '../systems/DiplomaticSpySystem'
function makeSys() { return new DiplomaticSpySystem() }
describe('DiplomaticSpySystem', () => {
  let sys: DiplomaticSpySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getSpies为空', () => { expect(sys.getSpies()).toHaveLength(0) })
  it('注入后getSpies返回数据', () => {
    ;(sys as any).spies.push({ id: 1 })
    expect(sys.getSpies()).toHaveLength(1)
  })
})
