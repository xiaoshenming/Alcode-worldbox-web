import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAbsolution2System } from '../systems/DiplomaticAbsolution2System'
function makeSys() { return new DiplomaticAbsolution2System() }
describe('DiplomaticAbsolution2System', () => {
  let sys: DiplomaticAbsolution2System
  beforeEach(() => { sys = makeSys() })
  it('初始getDecrees为空', () => { expect(sys.getDecrees()).toHaveLength(0) })
  it('注入后getDecrees返回数据', () => {
    ;(sys as any).decrees.push({ id: 1 })
    expect(sys.getDecrees()).toHaveLength(1)
  })
})
