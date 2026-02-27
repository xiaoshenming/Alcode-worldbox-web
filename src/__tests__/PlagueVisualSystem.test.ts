import { describe, it, expect, beforeEach } from 'vitest'
import { PlagueVisualSystem } from '../systems/PlagueVisualSystem'
import type { InfectedZone, QuarantineZone } from '../systems/PlagueVisualSystem'

function makeSys() { return new PlagueVisualSystem() }

describe('PlagueVisualSystem', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })

  it('初始zones为空', () => { expect((sys as any).zones).toHaveLength(0) })
  it('初始visible为true', () => { expect((sys as any).visible).toBe(true) })
  it('toggle()后visible变为false', () => {
    sys.toggle()
    expect((sys as any).visible).toBe(false)
  })
  it('toggle()两次后visible恢复为true', () => {
    sys.toggle()
    sys.toggle()
    expect((sys as any).visible).toBe(true)
  })
  it('setInfectedZones后zones更新', () => {
    const zones: InfectedZone[] = [{ x: 5, y: 10, severity: 0.5 }]
    sys.setInfectedZones(zones)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].x).toBe(5)
  })
  it('setQuarantineZones后quarantines更新', () => {
    const zones: QuarantineZone[] = [{ x: 0, y: 0, width: 10, height: 10 }]
    sys.setQuarantineZones(zones)
    expect((sys as any).quarantines).toHaveLength(1)
    expect((sys as any).quarantines[0].width).toBe(10)
  })
  it('setInfectedZones空数组后zones为空', () => {
    sys.setInfectedZones([{ x: 1, y: 1, severity: 0.3 }])
    sys.setInfectedZones([])
    expect((sys as any).zones).toHaveLength(0)
  })
})
