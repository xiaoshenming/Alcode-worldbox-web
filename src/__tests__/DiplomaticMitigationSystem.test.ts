import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticMitigationSystem } from '../systems/DiplomaticMitigationSystem'
function makeSys() { return new DiplomaticMitigationSystem() }
describe('DiplomaticMitigationSystem', () => {
  let sys: DiplomaticMitigationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getMeasures为空', () => { expect(sys.getMeasures()).toHaveLength(0) })
  it('注入后getMeasures返回数据', () => {
    ;(sys as any).measures.push({ id: 1 })
    expect(sys.getMeasures()).toHaveLength(1)
  })
})
