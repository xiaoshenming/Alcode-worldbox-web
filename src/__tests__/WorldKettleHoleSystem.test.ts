import { describe, it, expect, beforeEach } from 'vitest'
import { WorldKettleHoleSystem } from '../systems/WorldKettleHoleSystem'
import type { KettleHole } from '../systems/WorldKettleHoleSystem'

function makeSys(): WorldKettleHoleSystem { return new WorldKettleHoleSystem() }
let nextId = 1
function makeKettle(): KettleHole {
  return { id: nextId++, x: 20, y: 30, diameter: 10, depth: 5, waterFilled: true, sedimentLayer: 3, vegetationRing: 60, wildlifeValue: 70, tick: 0 }
}

describe('WorldKettleHoleSystem.getKettles', () => {
  let sys: WorldKettleHoleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰壶湖', () => { expect(sys.getKettles()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).kettles.push(makeKettle())
    expect(sys.getKettles()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getKettles()).toBe((sys as any).kettles)
  })
  it('冰壶湖字段正确', () => {
    ;(sys as any).kettles.push(makeKettle())
    const k = sys.getKettles()[0]
    expect(k.waterFilled).toBe(true)
    expect(k.wildlifeValue).toBe(70)
    expect(k.vegetationRing).toBe(60)
  })
})
