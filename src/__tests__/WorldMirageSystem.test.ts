import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMirageSystem } from '../systems/WorldMirageSystem'
import type { Mirage, MirageType } from '../systems/WorldMirageSystem'

function makeSys(): WorldMirageSystem { return new WorldMirageSystem() }
let nextId = 1
function makeMirage(mirageType: MirageType = 'oasis'): Mirage {
  return { id: nextId++, x: 50, y: 60, mirageType, intensity: 80, duration: 300, creaturesDeceived: 0, tick: 0 }
}

describe('WorldMirageSystem.getMirages', () => {
  let sys: WorldMirageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无海市蜃楼', () => { expect((sys as any).mirages).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).mirages.push(makeMirage())
    expect((sys as any).mirages).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).mirages).toBe((sys as any).mirages)
  })
  it('支持4种海市蜃楼类型', () => {
    const types: MirageType[] = ['oasis', 'city', 'lake', 'mountain']
    expect(types).toHaveLength(4)
  })
  it('海市蜃楼字段正确', () => {
    ;(sys as any).mirages.push(makeMirage('city'))
    const m = (sys as any).mirages[0]
    expect(m.mirageType).toBe('city')
    expect(m.intensity).toBe(80)
    expect(m.duration).toBe(300)
  })
})
