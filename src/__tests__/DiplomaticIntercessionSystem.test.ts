import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticIntercessionSystem } from '../systems/DiplomaticIntercessionSystem'
function makeSys() { return new DiplomaticIntercessionSystem() }
describe('DiplomaticIntercessionSystem', () => {
  let sys: DiplomaticIntercessionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getActions为空', () => { expect(sys.getActions()).toHaveLength(0) })
  it('注入后getActions返回数据', () => {
    ;(sys as any).actions.push({ id: 1 })
    expect(sys.getActions()).toHaveLength(1)
  })
})
