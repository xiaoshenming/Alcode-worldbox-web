import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCarbonSpringSystem } from '../systems/WorldCarbonSpringSystem'
import type { CarbonSpringZone } from '../systems/WorldCarbonSpringSystem'

function makeSys(): WorldCarbonSpringSystem { return new WorldCarbonSpringSystem() }
let nextId = 1
function makeZone(): CarbonSpringZone {
  return { id: nextId++, x: 20, y: 30, carbonContent: 40, springFlow: 50, tick: 0 } as CarbonSpringZone
}

describe('WorldCarbonSpringSystem.getZones', () => {
  let sys: WorldCarbonSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无Carbon泉区', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('Carbon泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.carbonContent).toBe(40)
    expect(z.springFlow).toBe(50)
  })
  it('多个Carbon泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
