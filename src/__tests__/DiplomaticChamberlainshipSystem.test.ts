import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticChamberlainshipSystem } from '../systems/DiplomaticChamberlainshipSystem'
function makeSys() { return new DiplomaticChamberlainshipSystem() }
describe('DiplomaticChamberlainshipSystem', () => {
  let sys: DiplomaticChamberlainshipSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
