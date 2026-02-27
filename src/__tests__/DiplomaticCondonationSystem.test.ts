import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCondonationSystem } from '../systems/DiplomaticCondonationSystem'
function makeSys() { return new DiplomaticCondonationSystem() }
describe('DiplomaticCondonationSystem', () => {
  let sys: DiplomaticCondonationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPolicies为空', () => { expect(sys.getPolicies()).toHaveLength(0) })
  it('注入后getPolicies返回数据', () => {
    ;(sys as any).policies.push({ id: 1 })
    expect(sys.getPolicies()).toHaveLength(1)
  })
})
