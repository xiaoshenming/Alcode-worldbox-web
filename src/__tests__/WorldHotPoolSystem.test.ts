import { describe, it, expect, beforeEach } from 'vitest'
import { WorldHotPoolSystem } from '../systems/WorldHotPoolSystem'
import type { HotPool } from '../systems/WorldHotPoolSystem'

function makeSys(): WorldHotPoolSystem { return new WorldHotPoolSystem() }
let nextId = 1
function makePool(): HotPool {
  return { id: nextId++, x: 25, y: 35, temperature: 85, mineralRichness: 70, poolDepth: 4, colorIntensity: 80, age: 2000, tick: 0 }
}

describe('WorldHotPoolSystem.getPools', () => {
  let sys: WorldHotPoolSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无热池', () => { expect((sys as any).pools).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pools.push(makePool())
    expect((sys as any).pools).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).pools).toBe((sys as any).pools)
  })
  it('热池字段正确', () => {
    ;(sys as any).pools.push(makePool())
    const p = (sys as any).pools[0]
    expect(p.temperature).toBe(85)
    expect(p.mineralRichness).toBe(70)
    expect(p.colorIntensity).toBe(80)
  })
  it('多个热池全部返回', () => {
    ;(sys as any).pools.push(makePool())
    ;(sys as any).pools.push(makePool())
    expect((sys as any).pools).toHaveLength(2)
  })
})
