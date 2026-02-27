import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDashboardSystem } from '../systems/WorldDashboardSystem'

function makeSys(): WorldDashboardSystem { return new WorldDashboardSystem() }

describe('WorldDashboardSystem', () => {
  let sys: WorldDashboardSystem
  beforeEach(() => { sys = makeSys() })

  it('初始isVisible返回false', () => { expect(sys.isVisible()).toBe(false) })
  it('toggle后isVisible为true', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })
  it('再次toggle后isVisible为false', () => {
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })
  it('activeTab初始为religion', () => { expect((sys as any).activeTab).toBe('religion') })
  it('popSamples初始为空数组', () => { expect((sys as any).popSamples).toHaveLength(0) })
})
