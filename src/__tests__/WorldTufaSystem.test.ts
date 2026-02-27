import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTufaSystem } from '../systems/WorldTufaSystem'
import type { TufaTower } from '../systems/WorldTufaSystem'

function makeSys(): WorldTufaSystem { return new WorldTufaSystem() }
let nextId = 1
function makeTower(): TufaTower {
  return { id: nextId++, x: 20, y: 30, towerHeight: 10, calciumContent: 80, porosityLevel: 30, waterAlkalinity: 70, age: 3000, tick: 0 }
}

describe('WorldTufaSystem.getTowers', () => {
  let sys: WorldTufaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石灰华塔', () => { expect(sys.getTowers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).towers.push(makeTower())
    expect(sys.getTowers()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getTowers()).toBe((sys as any).towers)
  })
  it('石灰华塔字段正确', () => {
    ;(sys as any).towers.push(makeTower())
    const t = sys.getTowers()[0]
    expect(t.calciumContent).toBe(80)
    expect(t.waterAlkalinity).toBe(70)
    expect(t.towerHeight).toBe(10)
  })
  it('多个石灰华塔全部返回', () => {
    ;(sys as any).towers.push(makeTower())
    ;(sys as any).towers.push(makeTower())
    expect(sys.getTowers()).toHaveLength(2)
  })
})
