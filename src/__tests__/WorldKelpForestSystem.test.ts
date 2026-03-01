import { describe, it, expect, beforeEach } from 'vitest'
import { WorldKelpForestSystem } from '../systems/WorldKelpForestSystem'
import type { KelpForest } from '../systems/WorldKelpForestSystem'

function makeSys(): WorldKelpForestSystem { return new WorldKelpForestSystem() }
let nextId = 1
function makeForest(): KelpForest {
  return { id: nextId++, x: 20, y: 30, density: 15, height: 8, biodiversity: 3, carbonAbsorption: 2.5, growthRate: 1.0, tick: 0 }
}

describe('WorldKelpForestSystem.getForests', () => {
  let sys: WorldKelpForestSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无海带森林', () => { expect((sys as any).forests).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).forests).toBe((sys as any).forests)
  })
  it('海带森林字段正确', () => {
    ;(sys as any).forests.push(makeForest())
    const f = (sys as any).forests[0]
    expect(f.density).toBe(15)
    expect(f.biodiversity).toBe(3)
    expect(f.carbonAbsorption).toBe(2.5)
  })
  it('多个森林全部返回', () => {
    ;(sys as any).forests.push(makeForest())
    ;(sys as any).forests.push(makeForest())
    ;(sys as any).forests.push(makeForest())
    expect((sys as any).forests).toHaveLength(3)
  })
})
