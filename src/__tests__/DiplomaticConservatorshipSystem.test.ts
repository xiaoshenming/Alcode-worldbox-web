import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticConservatorshipSystem } from '../systems/DiplomaticConservatorshipSystem'
function makeSys() { return new DiplomaticConservatorshipSystem() }
describe('DiplomaticConservatorshipSystem', () => {
  let sys: DiplomaticConservatorshipSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
