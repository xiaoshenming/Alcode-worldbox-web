import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticLenitySystem } from '../systems/DiplomaticLenitySystem'
function makeSys() { return new DiplomaticLenitySystem() }
describe('DiplomaticLenitySystem', () => {
  let sys: DiplomaticLenitySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPolicies为空', () => { expect(sys.getPolicies()).toHaveLength(0) })
  it('注入后getPolicies返回数据', () => {
    ;(sys as any).policies.push({ id: 1 })
    expect(sys.getPolicies()).toHaveLength(1)
  })
})
