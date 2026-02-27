import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPardonSystem } from '../systems/DiplomaticPardonSystem'
function makeSys() { return new DiplomaticPardonSystem() }
describe('DiplomaticPardonSystem', () => {
  let sys: DiplomaticPardonSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getDecrees为空', () => { expect(sys.getDecrees()).toHaveLength(0) })
  it('注入后getDecrees返回数据', () => {
    ;(sys as any).decrees.push({ id: 1 })
    expect(sys.getDecrees()).toHaveLength(1)
  })
})
