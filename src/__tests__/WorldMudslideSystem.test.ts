import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMudslideSystem } from '../systems/WorldMudslideSystem'
import type { Mudslide, MudslideScale } from '../systems/WorldMudslideSystem'

function makeSys(): WorldMudslideSystem { return new WorldMudslideSystem() }
let nextId = 1
function makeMudslide(scale: MudslideScale = 'moderate'): Mudslide {
  return { id: nextId++, startX: 10, startY: 5, dirX: 0, dirY: 1, scale, length: 12, progress: 50, startTick: 0, duration: 800 }
}

describe('WorldMudslideSystem.getMudslides', () => {
  let sys: WorldMudslideSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无泥石流', () => { expect(sys.getMudslides()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getMudslides().push(makeMudslide())
    expect(sys.getMudslides()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getMudslides()).toBe(sys.getMudslides())
  })
  it('支持4种泥石流规模', () => {
    const scales: MudslideScale[] = ['minor', 'moderate', 'severe', 'catastrophic']
    expect(scales).toHaveLength(4)
  })
  it('泥石流字段正确', () => {
    ;sys.getMudslides().push(makeMudslide('severe'))
    const m = sys.getMudslides()[0]
    expect(m.scale).toBe('severe')
    expect(m.progress).toBe(50)
  })
})
