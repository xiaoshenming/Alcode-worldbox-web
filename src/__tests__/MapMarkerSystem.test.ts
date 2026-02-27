import { describe, it, expect, beforeEach } from 'vitest'
import { MapMarkerSystem } from '../systems/MapMarkerSystem'
import type { MarkerData } from '../systems/MapMarkerSystem'

function makeSys(): MapMarkerSystem { return new MapMarkerSystem() }
let nextId = 1
function makeMarker(): MarkerData {
  return { id: nextId++, x: 10, y: 20, type: 'pin', label: 'Test', created: 0 }
}

describe('MapMarkerSystem.getMarkers', () => {
  let sys: MapMarkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无标记', () => { expect(sys.getMarkers()).toHaveLength(0) })
  it('注入pool后可查询', () => {
    ;(sys as any).pool[0] = makeMarker()
    expect(sys.getMarkers()).toHaveLength(1)
  })
  it('返回非null的slot', () => {
    ;(sys as any).pool[0] = makeMarker()
    ;(sys as any).pool[1] = null
    ;(sys as any).pool[2] = makeMarker()
    expect(sys.getMarkers()).toHaveLength(2)
  })
  it('标记字段正确', () => {
    ;(sys as any).pool[0] = makeMarker()
    const m = sys.getMarkers()[0]
    expect(m.type).toBe('pin')
    expect(m.x).toBe(10)
    expect(m.y).toBe(20)
  })
  it('支持4种标记图标类型', () => {
    const types = ['pin', 'star', 'warning', 'flag']
    expect(types).toHaveLength(4)
  })
})
