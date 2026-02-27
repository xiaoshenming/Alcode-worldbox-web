import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticParkwardSystem } from '../systems/DiplomaticParkwardSystem'
function makeSys() { return new DiplomaticParkwardSystem() }
describe('DiplomaticParkwardSystem', () => {
  let sys: DiplomaticParkwardSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
