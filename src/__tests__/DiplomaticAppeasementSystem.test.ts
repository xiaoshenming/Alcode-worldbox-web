import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAppeasementSystem } from '../systems/DiplomaticAppeasementSystem'
function makeSys() { return new DiplomaticAppeasementSystem() }
describe('DiplomaticAppeasementSystem', () => {
  let sys: DiplomaticAppeasementSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPolicies为空', () => { expect(sys.getPolicies()).toHaveLength(0) })
  it('注入后getPolicies返回数据', () => {
    ;(sys as any).policies.push({ id: 1 })
    expect(sys.getPolicies()).toHaveLength(1)
  })
})
