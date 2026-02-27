import { describe, it, expect, beforeEach } from 'vitest'
import { WorldStatsOverviewSystem } from '../systems/WorldStatsOverviewSystem'

function makeSys(): WorldStatsOverviewSystem { return new WorldStatsOverviewSystem() }

describe('WorldStatsOverviewSystem', () => {
  let sys: WorldStatsOverviewSystem
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
})
