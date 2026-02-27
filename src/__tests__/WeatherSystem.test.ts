import { describe, it, expect } from 'vitest'
import { WeatherSystem } from '../systems/WeatherSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeMocks() {
  const em = new EntityManager()
  const world = { width: 20, height: 20, getTile: () => TileType.GRASS, setTile: () => {}, tick: 0 }
  const particles = { spawnRain: () => {}, spawn: () => {}, spawnDeath: () => {} }
  return { em, world, particles }
}

function makeSys() {
  const { em, world, particles } = makeMocks()
  const sys = new WeatherSystem(world as any, particles as any, em)
  return { sys, em }
}

describe('WeatherSystem', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/WeatherSystem')
    expect(mod.WeatherSystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    const { sys } = makeSys()
    expect(sys).toBeInstanceOf(WeatherSystem)
  })

  it('初始天气为 clear', () => {
    const { sys } = makeSys()
    expect(sys.currentWeather).toBe('clear')
  })

  it('初始 intensity 为 0', () => {
    const { sys } = makeSys()
    expect(sys.intensity).toBe(0)
  })

  it('update() 不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update()).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const { sys } = makeSys()
    for (let i = 0; i < 10; i++) {
      expect(() => sys.update()).not.toThrow()
    }
  })
})
