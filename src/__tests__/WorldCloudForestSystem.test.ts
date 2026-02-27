import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCloudForestSystem } from '../systems/WorldCloudForestSystem'
import type { CloudForestZone } from '../systems/WorldCloudForestSystem'

function makeSys(): WorldCloudForestSystem { return new WorldCloudForestSystem() }
let nextId = 1
function makeZone(): CloudForestZone {
  return { id: nextId++, x: 20, y: 30, moisture: 90, canopyDensity: 80, biodiversity: 95, mistLevel: 70, tick: 0 }
}

describe('WorldCloudForestSystem.getZones', () => {
  let sys: WorldCloudForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无云雾林', () => { expect(sys.getZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getZones()).toBe((sys as any).zones)
  })
  it('云雾林字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = sys.getZones()[0]
    expect(z.moisture).toBe(90)
    expect(z.biodiversity).toBe(95)
    expect(z.mistLevel).toBe(70)
  })
  it('多个云雾林全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect(sys.getZones()).toHaveLength(2)
  })
})
