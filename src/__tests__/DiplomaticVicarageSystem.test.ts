import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticVicarageSystem } from '../systems/DiplomaticVicarageSystem'
function makeSys() { return new DiplomaticVicarageSystem() }
describe('DiplomaticVicarageSystem', () => {
  let sys: DiplomaticVicarageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
