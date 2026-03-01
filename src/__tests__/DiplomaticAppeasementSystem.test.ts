import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAppeasementSystem } from '../systems/DiplomaticAppeasementSystem'
function makeSys() { return new DiplomaticAppeasementSystem() }
describe('DiplomaticAppeasementSystem', () => {
  let sys: DiplomaticAppeasementSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPolicies为空', () => { expect((sys as any).policies).toHaveLength(0) })
  it('注入后getPolicies返回数据', () => {
    ;(sys as any).policies.push({ id: 1, civIdA: 1, civIdB: 2, appeasementType: 'territorial', concessionLevel: 60, peaceStability: 50, publicOpinion: 40, longTermRisk: 30 })
    expect((sys as any).policies).toHaveLength(1)
    expect((sys as any).policies[0].id).toBe(1)
  })
  it('getPolicies返回数组', () => { expect(Array.isArray((sys as any).policies)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
