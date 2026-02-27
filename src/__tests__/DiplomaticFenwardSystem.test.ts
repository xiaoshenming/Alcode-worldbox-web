import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticFenwardSystem } from '../systems/DiplomaticFenwardSystem'
function makeSys() { return new DiplomaticFenwardSystem() }
describe('DiplomaticFenwardSystem', () => {
  let sys: DiplomaticFenwardSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
