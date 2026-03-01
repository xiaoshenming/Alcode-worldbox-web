import { describe, it, expect, beforeEach } from 'vitest'
import { RiverSystem } from '../systems/RiverSystem'

function makeSys(): RiverSystem { return new RiverSystem() }
function makeRiver(): { x: number; y: number }[] {
  return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]
}

describe('RiverSystem.getRivers', () => {
  let sys: RiverSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无河流', () => { expect(sys.getRivers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getRivers().push(makeRiver())
    expect(sys.getRivers()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    ;sys.getRivers().push(makeRiver())
    expect(sys.getRivers()).toBe(sys.getRivers())
  })
  it('河流由坐标点数组组成', () => {
    ;sys.getRivers().push(makeRiver())
    const rivers = sys.getRivers()
    expect(rivers[0]).toHaveLength(3)
    expect(rivers[0][0]).toHaveProperty('x')
    expect(rivers[0][0]).toHaveProperty('y')
  })
  it('多条河流全部返回', () => {
    ;sys.getRivers().push(makeRiver())
    ;sys.getRivers().push(makeRiver())
    ;sys.getRivers().push(makeRiver())
    expect(sys.getRivers()).toHaveLength(3)
  })
})
