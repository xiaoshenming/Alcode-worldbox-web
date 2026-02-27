import { describe, it, expect, beforeEach } from 'vitest'
import { DisasterWarningSystem } from '../systems/DisasterWarningSystem'
import type { WarningType } from '../systems/DisasterWarningSystem'

function makeSys(): DisasterWarningSystem { return new DisasterWarningSystem() }
function makeWarning(type: WarningType) {
  return { type, x: 5, y: 5, intensity: 0.8, ticksRemaining: 100, radius: 10 }
}

describe('DisasterWarningSystem.getActiveWarnings', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无预警', () => { expect(sys.getActiveWarnings()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR'))
    expect(sys.getActiveWarnings()).toHaveLength(1)
  })
  it('getActiveWarnings返回副本（不是内部引用）', () => {
    ;(sys as any).warnings.push(makeWarning('VOLCANO_RUMBLE'))
    const result = sys.getActiveWarnings()
    // Returns slice() so it is a copy
    expect(result).not.toBe((sys as any).warnings)
    expect(result).toHaveLength(1)
  })
  it('支持6种预警类型', () => {
    const types: WarningType[] = ['EARTHQUAKE_TREMOR', 'VOLCANO_RUMBLE', 'TSUNAMI_WAVE', 'METEOR_STREAK', 'TORNADO_WIND', 'PLAGUE_OMEN']
    types.forEach(t => { ;(sys as any).warnings.push(makeWarning(t)) })
    const all = sys.getActiveWarnings()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
  it('getWarningCount返回正确数量', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR'))
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN'))
    expect(sys.getWarningCount()).toBe(2)
  })
})
