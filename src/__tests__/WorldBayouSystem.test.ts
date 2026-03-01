import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBayouSystem } from '../systems/WorldBayouSystem'
import type { Bayou } from '../systems/WorldBayouSystem'

function makeSys(): WorldBayouSystem { return new WorldBayouSystem() }
let nextId = 1
function makeBayou(): Bayou {
  return { id: nextId++, x: 25, y: 35, radius: 10, waterFlow: 30, vegetationDensity: 80, murkiness: 70, biodiversity: 90, depth: 4, tick: 0 }
}

describe('WorldBayouSystem.getBayous', () => {
  let sys: WorldBayouSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无沼泽湾', () => { expect((sys as any).bayous).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).bayous.push(makeBayou())
    expect((sys as any).bayous).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).bayous).toBe((sys as any).bayous)
  })
  it('沼泽湾字段正确', () => {
    ;(sys as any).bayous.push(makeBayou())
    const b = (sys as any).bayous[0]
    expect(b.vegetationDensity).toBe(80)
    expect(b.murkiness).toBe(70)
    expect(b.biodiversity).toBe(90)
  })
  it('多个沼泽湾全部返回', () => {
    ;(sys as any).bayous.push(makeBayou())
    ;(sys as any).bayous.push(makeBayou())
    expect((sys as any).bayous).toHaveLength(2)
  })
})
