import { describe, it, expect, beforeEach } from 'vitest'
import { WorldHeatmapSystem } from '../systems/WorldHeatmapSystem'

function makeSys(): WorldHeatmapSystem { return new WorldHeatmapSystem() }

describe('WorldHeatmapSystem.currentMode', () => {
  let sys: WorldHeatmapSystem
  beforeEach(() => { sys = makeSys() })

  it('初始模式为off', () => { expect(sys.currentMode).toBe('off') })
  it('cycleMode后模式变化', () => {
    ;(sys as any).modeIndex = 1
    expect(sys.currentMode).toBe('population')
  })
  it('modeIndex=2时为resource', () => {
    ;(sys as any).modeIndex = 2
    expect(sys.currentMode).toBe('resource')
  })
  it('grids包含population模式数据', () => { expect((sys as any).grids.has('population')).toBe(true) })
  it('maxValues初始population值为0', () => { expect((sys as any).maxValues.get('population')).toBe(0) })
})
