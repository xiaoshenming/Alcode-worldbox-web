import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureVisionSystem } from '../systems/CreatureVisionSystem'
import type { VisionData } from '../systems/CreatureVisionSystem'

function makeSys(): CreatureVisionSystem { return new CreatureVisionSystem() }
function makeVision(entityId: number): VisionData {
  return { entityId, range: 8, effectiveRange: 10, visibleEntities: [2, 3], lastUpdate: 0 }
}

describe('CreatureVisionSystem getters', () => {
  let sys: CreatureVisionSystem
  beforeEach(() => { sys = makeSys() })

  it('无记录时getVision返回undefined', () => {
    expect(sys.getVision(999)).toBeUndefined()
  })
  it('注入后可查询', () => {
    ;(sys as any).visionMap.set(1, makeVision(1))
    expect(sys.getVision(1)?.entityId).toBe(1)
  })
  it('getVisibleEntities无记录返回空数组', () => {
    expect(sys.getVisibleEntities(999)).toHaveLength(0)
  })
  it('getVisibleEntities返回可见实体列表', () => {
    ;(sys as any).visionMap.set(1, makeVision(1))
    expect(sys.getVisibleEntities(1)).toEqual([2, 3])
  })
  it('getAllVisionData返回所有视野数据', () => {
    ;(sys as any).visionMap.set(1, makeVision(1))
    ;(sys as any).visionMap.set(2, makeVision(2))
    expect(sys.getAllVisionData()).toHaveLength(2)
  })
  it('字段正确', () => {
    ;(sys as any).visionMap.set(1, makeVision(1))
    const v = sys.getVision(1)!
    expect(v.range).toBe(8)
    expect(v.effectiveRange).toBe(10)
  })
})
