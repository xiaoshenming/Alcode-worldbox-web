import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticJusticiarshipSystem } from '../systems/DiplomaticJusticiarshipSystem'
function makeSys() { return new DiplomaticJusticiarshipSystem() }
describe('DiplomaticJusticiarshipSystem', () => {
  let sys: DiplomaticJusticiarshipSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getArrangements为空', () => { expect(sys.getArrangements()).toHaveLength(0) })
  it('注入后getArrangements返回数据', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect(sys.getArrangements()).toHaveLength(1)
  })
})
