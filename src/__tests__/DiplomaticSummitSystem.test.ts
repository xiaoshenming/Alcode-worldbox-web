import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSummitSystem } from '../systems/DiplomaticSummitSystem'
function makeSys() { return new DiplomaticSummitSystem() }
describe('DiplomaticSummitSystem', () => {
  let sys: DiplomaticSummitSystem
  beforeEach(() => { sys = makeSys() })
  it('初始activeSummit为null', () => { expect((sys as any).activeSummit).toBeNull() })
  it('初始summits历史为空', () => { expect((sys as any).summits).toHaveLength(0) })
  it('注入activeSummit后可查询', () => {
    ;(sys as any).activeSummit = { id: 1 }
    expect((sys as any).activeSummit).not.toBeNull()
  })
  it('nextSummitTick初始为正数', () => { expect((sys as any).nextSummitTick).toBeGreaterThan(0) })
  it('displayAlpha初始为0', () => { expect((sys as any).displayAlpha).toBe(0) })
})
