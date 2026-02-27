import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAlluvialFanSystem } from '../systems/WorldAlluvialFanSystem'
import type { AlluvialFan } from '../systems/WorldAlluvialFanSystem'

function makeSys(): WorldAlluvialFanSystem { return new WorldAlluvialFanSystem() }
let nextId = 1
function makeFan(): AlluvialFan {
  return { id: nextId++, x: 20, y: 30, radius: 15, sedimentDepth: 4, channelCount: 5, fertility: 70, waterFlow: 50, gravelContent: 30, tick: 0 }
}

describe('WorldAlluvialFanSystem.getFans', () => {
  let sys: WorldAlluvialFanSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冲积扇', () => { expect(sys.getFans()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fans.push(makeFan())
    expect(sys.getFans()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFans()).toBe((sys as any).fans)
  })
  it('冲积扇字段正确', () => {
    ;(sys as any).fans.push(makeFan())
    const f = sys.getFans()[0]
    expect(f.sedimentDepth).toBe(4)
    expect(f.channelCount).toBe(5)
    expect(f.fertility).toBe(70)
  })
  it('多个冲积扇全部返回', () => {
    ;(sys as any).fans.push(makeFan())
    ;(sys as any).fans.push(makeFan())
    expect(sys.getFans()).toHaveLength(2)
  })
})
