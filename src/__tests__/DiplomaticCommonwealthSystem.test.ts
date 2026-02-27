import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCommonwealthSystem } from '../systems/DiplomaticCommonwealthSystem'
function makeSys() { return new DiplomaticCommonwealthSystem() }
describe('DiplomaticCommonwealthSystem', () => {
  let sys: DiplomaticCommonwealthSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getUnions为空', () => { expect(sys.getUnions()).toHaveLength(0) })
  it('注入后getUnions返回数据', () => {
    ;(sys as any).unions.push({ id: 1 })
    expect(sys.getUnions()).toHaveLength(1)
  })
})
