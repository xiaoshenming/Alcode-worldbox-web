import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticProcuratorshipSystem } from '../systems/DiplomaticProcuratorshipSystem'
function makeSys() { return new DiplomaticProcuratorshipSystem() }
describe('DiplomaticProcuratorshipSystem', () => {
  let sys: DiplomaticProcuratorshipSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
