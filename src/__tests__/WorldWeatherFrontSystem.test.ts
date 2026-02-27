import { describe, it, expect, beforeEach } from 'vitest'
import { WorldWeatherFrontSystem } from '../systems/WorldWeatherFrontSystem'
import type { WeatherFront, FrontCollision, FrontType } from '../systems/WorldWeatherFrontSystem'

function makeSys(): WorldWeatherFrontSystem { return new WorldWeatherFrontSystem() }
let nextId = 1
function makeFront(type: FrontType = 'cold'): WeatherFront {
  return { id: nextId++, type, x: 30, y: 40, dx: 1, dy: 0, width: 10, length: 20, intensity: 5, age: 0, maxAge: 5000 }
}
function makeCollision(frontA: number, frontB: number): FrontCollision {
  return { frontA, frontB, x: 35, y: 40, severity: 7 }
}

describe('WorldWeatherFrontSystem', () => {
  let sys: WorldWeatherFrontSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无天气锋', () => { expect(sys.getFronts()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fronts.push(makeFront())
    expect(sys.getFronts()).toHaveLength(1)
  })
  it('getFrontCount返回数量', () => {
    ;(sys as any).fronts.push(makeFront())
    ;(sys as any).fronts.push(makeFront('warm'))
    expect(sys.getFrontCount()).toBe(2)
  })
  it('getCollisions返回碰撞列表', () => {
    ;(sys as any).collisions.push(makeCollision(1, 2))
    expect(sys.getCollisions()).toHaveLength(1)
  })
  it('支持5种锋面类型', () => {
    const types: FrontType[] = ['cold', 'warm', 'storm', 'dry', 'humid']
    expect(types).toHaveLength(5)
  })
})
