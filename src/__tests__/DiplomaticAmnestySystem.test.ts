import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAmnestySystem } from '../systems/DiplomaticAmnestySystem'
function makeSys() { return new DiplomaticAmnestySystem() }
describe('DiplomaticAmnestySystem', () => {
  let sys: DiplomaticAmnestySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTreaties为空', () => { expect(sys.getTreaties()).toHaveLength(0) })
  it('注入后getTreaties返回数据', () => {
    ;(sys as any).treaties.push({ id: 1, civIdA: 1, civIdB: 2, scope: 'political', pardonLevel: 70, trustRestoration: 60, publicSupport: 50, reconciliationProgress: 40 })
    expect(sys.getTreaties()).toHaveLength(1)
    expect(sys.getTreaties()[0].id).toBe(1)
  })
  it('getTreaties返回数组', () => { expect(Array.isArray(sys.getTreaties())).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
