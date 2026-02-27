import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSuccessionSystem } from '../systems/DiplomaticSuccessionSystem'
function makeSys() { return new DiplomaticSuccessionSystem() }
describe('DiplomaticSuccessionSystem', () => {
  let sys: DiplomaticSuccessionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getEvents为空', () => { expect(sys.getEvents()).toHaveLength(0) })
  it('注入后getEvents返回数据', () => {
    ;(sys as any).events.push({ id: 1 })
    expect(sys.getEvents()).toHaveLength(1)
  })
})
