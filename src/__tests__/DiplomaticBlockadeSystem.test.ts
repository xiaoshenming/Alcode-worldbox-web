import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticBlockadeSystem } from '../systems/DiplomaticBlockadeSystem'
function makeSys() { return new DiplomaticBlockadeSystem() }
describe('DiplomaticBlockadeSystem', () => {
  let sys: DiplomaticBlockadeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getBlockades为空', () => { expect(sys.getBlockades()).toHaveLength(0) })
  it('注入后getBlockades返回数据', () => {
    ;(sys as any).blockades.push({ id: 1 })
    expect(sys.getBlockades()).toHaveLength(1)
  })
})
