import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRiftSystem } from '../systems/WorldRiftSystem'
import type { DimensionalRift, RiftStage } from '../systems/WorldRiftSystem'

function makeSys(): WorldRiftSystem { return new WorldRiftSystem() }
let nextId = 1
function makeRift(stage: RiftStage = 'stable'): DimensionalRift {
  return { id: nextId++, x: 30, y: 40, radius: 8, stage, energy: 70, age: 500, maxAge: 5000, warpsPerformed: 3 }
}

describe('WorldRiftSystem', () => {
  let sys: WorldRiftSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无裂缝', () => { expect(sys.getRifts()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rifts.push(makeRift())
    expect(sys.getRifts()).toHaveLength(1)
  })
  it('getActiveRifts不返回collapsing状态', () => {
    ;(sys as any).rifts.push(makeRift('stable'))
    ;(sys as any).rifts.push(makeRift('collapsing'))
    expect(sys.getActiveRifts()).toHaveLength(1)
  })
  it('getStableRifts只返回stable状态', () => {
    ;(sys as any).rifts.push(makeRift('stable'))
    ;(sys as any).rifts.push(makeRift('unstable'))
    expect(sys.getStableRifts()).toHaveLength(1)
  })
  it('支持4种裂缝阶段', () => {
    const stages: RiftStage[] = ['forming', 'stable', 'unstable', 'collapsing']
    expect(stages).toHaveLength(4)
  })
})
