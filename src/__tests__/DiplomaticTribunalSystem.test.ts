import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticTribunalSystem } from '../systems/DiplomaticTribunalSystem'
function makeSys() { return new DiplomaticTribunalSystem() }
describe('DiplomaticTribunalSystem', () => {
  let sys: DiplomaticTribunalSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProceedings为空', () => { expect(sys.getProceedings()).toHaveLength(0) })
  it('注入后getProceedings返回数据', () => {
    ;(sys as any).proceedings.push({ id: 1 })
    expect(sys.getProceedings()).toHaveLength(1)
  })
})
