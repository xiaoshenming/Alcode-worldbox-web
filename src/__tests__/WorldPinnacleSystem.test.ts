import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPinnacleSystem } from '../systems/WorldPinnacleSystem'
import type { Pinnacle } from '../systems/WorldPinnacleSystem'

function makeSys(): WorldPinnacleSystem { return new WorldPinnacleSystem() }
let nextId = 1
function makePinnacle(): Pinnacle {
  return { id: nextId++, x: 10, y: 20, height: 25, sharpness: 90, stability: 75, weathering: 20, mineralContent: 50, tick: 0 }
}

describe('WorldPinnacleSystem.getPinnacles', () => {
  let sys: WorldPinnacleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石柱', () => { expect(sys.getPinnacles()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pinnacles.push(makePinnacle())
    expect(sys.getPinnacles()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPinnacles()).toBe((sys as any).pinnacles)
  })
  it('石柱字段正确', () => {
    ;(sys as any).pinnacles.push(makePinnacle())
    const p = sys.getPinnacles()[0]
    expect(p.sharpness).toBe(90)
    expect(p.stability).toBe(75)
    expect(p.mineralContent).toBe(50)
  })
})
