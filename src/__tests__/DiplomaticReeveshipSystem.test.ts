import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticReeveshipSystem } from '../systems/DiplomaticReeveshipSystem'
function makeSys() { return new DiplomaticReeveshipSystem() }
describe('DiplomaticReeveshipSystem', () => {
  let sys: DiplomaticReeveshipSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
