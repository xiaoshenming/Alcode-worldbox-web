import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRockBridgeSystem } from '../systems/WorldRockBridgeSystem'
import type { RockBridge } from '../systems/WorldRockBridgeSystem'

function makeSys(): WorldRockBridgeSystem { return new WorldRockBridgeSystem() }
let nextId = 1
function makeBridge(): RockBridge {
  return { id: nextId++, x: 20, y: 30, span: 15, width: 4, thickness: 3, loadCapacity: 5, erosionRate: 0.01, spectacle: 90, tick: 0 }
}

describe('WorldRockBridgeSystem.getBridges', () => {
  let sys: WorldRockBridgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无天然石桥', () => { expect(sys.getBridges()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).bridges.push(makeBridge())
    expect(sys.getBridges()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getBridges()).toBe((sys as any).bridges)
  })
  it('天然石桥字段正确', () => {
    ;(sys as any).bridges.push(makeBridge())
    const b = sys.getBridges()[0]
    expect(b.span).toBe(15)
    expect(b.loadCapacity).toBe(5)
    expect(b.spectacle).toBe(90)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
