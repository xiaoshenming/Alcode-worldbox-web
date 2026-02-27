import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticEscheatorSystem } from '../systems/DiplomaticEscheatorSystem'
function makeSys() { return new DiplomaticEscheatorSystem() }
describe('DiplomaticEscheatorSystem', () => {
  let sys: DiplomaticEscheatorSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
