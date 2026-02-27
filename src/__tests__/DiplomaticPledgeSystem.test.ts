import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPledgeSystem } from '../systems/DiplomaticPledgeSystem'
function makeSys() { return new DiplomaticPledgeSystem() }
describe('DiplomaticPledgeSystem', () => {
  let sys: DiplomaticPledgeSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPledges为空', () => { expect(sys.getPledges()).toHaveLength(0) })
  it('注入后getPledges返回数据', () => {
    ;(sys as any).pledges.push({ id: 1 })
    expect(sys.getPledges()).toHaveLength(1)
  })
  it('getPledges返回数组', () => { expect(Array.isArray(sys.getPledges())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
