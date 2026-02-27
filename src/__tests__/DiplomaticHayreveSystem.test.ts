import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticHayreveSystem } from '../systems/DiplomaticHayreveSystem'
function makeSys() { return new DiplomaticHayreveSystem() }
describe('DiplomaticHayreveSystem', () => {
  let sys: DiplomaticHayreveSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
