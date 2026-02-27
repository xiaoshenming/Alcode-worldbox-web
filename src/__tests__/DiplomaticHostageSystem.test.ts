import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticHostageSystem } from '../systems/DiplomaticHostageSystem'
function makeSys() { return new DiplomaticHostageSystem() }
describe('DiplomaticHostageSystem', () => {
  let sys: DiplomaticHostageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getHostages为空', () => { expect(sys.getHostages()).toHaveLength(0) })
  it('注入后getHostages返回数据', () => {
    ;(sys as any).hostages.push({ id: 1 })
    expect(sys.getHostages()).toHaveLength(1)
  })
})
