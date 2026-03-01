import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticArbitrementSystem } from '../systems/DiplomaticArbitrementSystem'
function makeSys() { return new DiplomaticArbitrementSystem() }
describe('DiplomaticArbitrementSystem', () => {
  let sys: DiplomaticArbitrementSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getCases为空', () => { expect((sys as any).cases).toHaveLength(0) })
  it('注入后getCases返回数据', () => {
    ;(sys as any).cases.push({ id: 1, civIdA: 1, civIdB: 2, phase: 'filing', caseStrength: 70, neutrality: 80, bindingForce: 60, compliance: 75 })
    expect((sys as any).cases).toHaveLength(1)
    expect((sys as any).cases[0].id).toBe(1)
  })
  it('getCases返回数组', () => { expect(Array.isArray((sys as any).cases)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
