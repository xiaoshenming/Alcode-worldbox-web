import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticMarshwardSystem } from '../systems/DiplomaticMarshwardSystem'
function makeSys() { return new DiplomaticMarshwardSystem() }
describe('DiplomaticMarshwardSystem', () => {
  let sys: DiplomaticMarshwardSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
