import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticWoodwardSystem } from '../systems/DiplomaticWoodwardSystem'
function makeSys() { return new DiplomaticWoodwardSystem() }
describe('DiplomaticWoodwardSystem', () => {
  let sys: DiplomaticWoodwardSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
