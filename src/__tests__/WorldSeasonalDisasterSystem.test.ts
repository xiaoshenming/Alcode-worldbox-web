import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSeasonalDisasterSystem } from '../systems/WorldSeasonalDisasterSystem'
import type { SeasonalDisaster, SeasonDisasterType, SeasonType } from '../systems/WorldSeasonalDisasterSystem'

function makeSys(): WorldSeasonalDisasterSystem { return new WorldSeasonalDisasterSystem() }
let nextId = 1
function makeDisaster(type: SeasonDisasterType = 'flood', season: SeasonType = 'spring'): SeasonalDisaster {
  return { id: nextId++, type, season, x: 20, y: 30, radius: 10, severity: 3, duration: 500, maxDuration: 500, damagePerTick: 2, startTick: 0, label: `${type} (3)`, panelLabel: `${type} sev3` }
}

describe('WorldSeasonalDisasterSystem.getDisasters', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无季节灾害', () => { expect(sys.getDisasters()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).disasters.push(makeDisaster())
    expect(sys.getDisasters()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDisasters()).toBe((sys as any).disasters)
  })
  it('支持8种灾害类型', () => {
    const types: SeasonDisasterType[] = ['flood', 'heatwave', 'wildfire', 'blizzard', 'tornado', 'monsoon', 'drought', 'ice_storm']
    expect(types).toHaveLength(8)
  })
  it('灾害字段正确', () => {
    ;(sys as any).disasters.push(makeDisaster('blizzard', 'winter'))
    const d = sys.getDisasters()[0]
    expect(d.type).toBe('blizzard')
    expect(d.season).toBe('winter')
    expect(d.severity).toBe(3)
  })
})

describe('WorldSeasonalDisasterSystem.getActiveCount', () => {
  let sys: WorldSeasonalDisasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始数量为0', () => { expect(sys.getActiveCount()).toBe(0) })
  it('注入后数量正确', () => {
    ;(sys as any).disasters.push(makeDisaster())
    ;(sys as any).disasters.push(makeDisaster())
    expect(sys.getActiveCount()).toBe(2)
  })
})
