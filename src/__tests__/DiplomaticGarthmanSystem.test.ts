import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticGarthmanSystem } from '../systems/DiplomaticGarthmanSystem'
function makeSys() { return new DiplomaticGarthmanSystem() }
describe('DiplomaticGarthmanSystem', () => {
  let sys: DiplomaticGarthmanSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
