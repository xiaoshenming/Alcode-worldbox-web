import { describe, it, expect, beforeEach } from 'vitest'
import { WorldDrumlinSystem } from '../systems/WorldDrumlinSystem'
import type { Drumlin } from '../systems/WorldDrumlinSystem'

function makeSys(): WorldDrumlinSystem { return new WorldDrumlinSystem() }
let nextId = 1
function makeDrumlin(): Drumlin {
  return { id: nextId++, x: 25, y: 35, length: 20, width: 8, height: 10, orientation: 45, soilFertility: 70, glacialOrigin: 90, tick: 0 }
}

describe('WorldDrumlinSystem.getDrumlins', () => {
  let sys: WorldDrumlinSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无鼓丘', () => { expect(sys.getDrumlins()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).drumlins.push(makeDrumlin())
    expect(sys.getDrumlins()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDrumlins()).toBe((sys as any).drumlins)
  })
  it('鼓丘字段正确', () => {
    ;(sys as any).drumlins.push(makeDrumlin())
    const d = sys.getDrumlins()[0]
    expect(d.soilFertility).toBe(70)
    expect(d.glacialOrigin).toBe(90)
    expect(d.orientation).toBe(45)
  })
  it('多个鼓丘全部返回', () => {
    ;(sys as any).drumlins.push(makeDrumlin())
    ;(sys as any).drumlins.push(makeDrumlin())
    expect(sys.getDrumlins()).toHaveLength(2)
  })
})
