import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticClemency2System } from '../systems/DiplomaticClemency2System'
function makeSys() { return new DiplomaticClemency2System() }
describe('DiplomaticClemency2System', () => {
  let sys: DiplomaticClemency2System
  beforeEach(() => { sys = makeSys() })
  it('初始getActs为空', () => { expect(sys.getActs()).toHaveLength(0) })
  it('注入后getActs返回数据', () => {
    ;(sys as any).acts.push({ id: 1 })
    expect(sys.getActs()).toHaveLength(1)
  })
})
