import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSeneschalrySystem } from '../systems/DiplomaticSeneschalrySystem'
function makeSys() { return new DiplomaticSeneschalrySystem() }
describe('DiplomaticSeneschalrySystem', () => {
  let sys: DiplomaticSeneschalrySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
