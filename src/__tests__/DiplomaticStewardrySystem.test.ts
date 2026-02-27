import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticStewardrySystem } from '../systems/DiplomaticStewardrySystem'
function makeSys() { return new DiplomaticStewardrySystem() }
describe('DiplomaticStewardrySystem', () => {
  let sys: DiplomaticStewardrySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
