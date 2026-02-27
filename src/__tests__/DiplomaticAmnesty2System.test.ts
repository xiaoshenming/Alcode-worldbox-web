import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAmnesty2System } from '../systems/DiplomaticAmnesty2System'
function makeSys() { return new DiplomaticAmnesty2System() }
describe('DiplomaticAmnesty2System', () => {
  let sys: DiplomaticAmnesty2System
  beforeEach(() => { sys = makeSys() })
  it('初始getDecrees为空', () => { expect(sys.getDecrees()).toHaveLength(0) })
  it('注入后getDecrees返回数据', () => {
    ;(sys as any).decrees.push({ id: 1 })
    expect(sys.getDecrees()).toHaveLength(1)
  })
})
