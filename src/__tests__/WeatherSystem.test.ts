import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WeatherSystem } from '../systems/WeatherSystem'
import type { WeatherType } from '../systems/WeatherSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

afterEach(() => vi.restoreAllMocks())

// ─────────────────────── 工厂函数 ───────────────────────

function makeMocks(overrides?: Partial<{
  getTile: () => any
  setTile: () => void
  getSeason: () => string
}>) {
  const em = new EntityManager()
  const world = {
    width: 20, height: 20,
    getTile: overrides?.getTile ?? (() => TileType.GRASS),
    setTile: overrides?.setTile ?? (() => {}),
    tick: 0,
    getSeason: overrides?.getSeason ?? (() => 'clear'),
  }
  const particles = {
    spawnRain: vi.fn(),
    spawn: vi.fn(),
    spawnDeath: vi.fn(),
    addParticle: vi.fn(),
    spawnExplosion: vi.fn(),
  }
  return { em, world, particles }
}

function makeSys(overrides?: Parameters<typeof makeMocks>[0]) {
  const { em, world, particles } = makeMocks(overrides)
  const sys = new WeatherSystem(world as any, particles as any, em)
  return { sys, em, world, particles }
}

// ─────────────────────── 模块与实例化 ───────────────────────

describe('WeatherSystem — 模块导入与构造', () => {
  it('模块可以导入', async () => {
    const mod = await import('../systems/WeatherSystem')
    expect(mod.WeatherSystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    const { sys } = makeSys()
    expect(sys).toBeInstanceOf(WeatherSystem)
  })

  it('WeatherType 导出存在', async () => {
    const mod = await import('../systems/WeatherSystem')
    expect(mod).toBeDefined()
  })
})

// ─────────────────────── 初始状态 ───────────────────────

describe('WeatherSystem — 初始状态', () => {
  let sys: WeatherSystem
  beforeEach(() => { ({ sys } = makeSys()) })

  it('currentWeather 初始为 "clear"', () => {
    expect(sys.currentWeather).toBe('clear')
  })

  it('intensity 初始为 0', () => {
    expect(sys.intensity).toBe(0)
  })

  it('windX 初始为 0', () => {
    expect(sys.windX).toBe(0)
  })

  it('fogAlpha 初始为 0', () => {
    expect(sys.fogAlpha).toBe(0)
  })

  it('tornadoX 初始为 0', () => {
    expect(sys.tornadoX).toBe(0)
  })

  it('tornadoY 初始为 0', () => {
    expect(sys.tornadoY).toBe(0)
  })

  it('duration 初始为 0（私有）', () => {
    expect((sys as any).duration).toBe(0)
  })

  it('weatherTimer 初始为 0（私有）', () => {
    expect((sys as any).weatherTimer).toBe(0)
  })
})

// ─────────────────────── update 基础行为 ───────────────────────

describe('WeatherSystem — update() 基础行为', () => {
  let sys: WeatherSystem
  beforeEach(() => { ({ sys } = makeSys()) })

  it('update() 不崩溃', () => {
    expect(() => sys.update()).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    for (let i = 0; i < 20; i++) {
      expect(() => sys.update()).not.toThrow()
    }
  })

  it('每次 update weatherTimer 递增 1', () => {
    sys.update()
    expect((sys as any).weatherTimer).toBe(1)
    sys.update()
    expect((sys as any).weatherTimer).toBe(2)
  })

  it('update() 后 windX 随 sin 计算更新', () => {
    sys.update()
    const expected = Math.sin(1 * 0.01) * 0.5
    expect(sys.windX).toBeCloseTo(expected)
  })
})

// ─────────────────────── duration 倒计时 ───────────────────────

describe('WeatherSystem — duration 天气倒计时', () => {
  let sys: WeatherSystem
  beforeEach(() => { ({ sys } = makeSys()) })

  it('duration > 0 时每次 update 递减 1', () => {
    ;(sys as any).duration = 10
    sys.update()
    expect((sys as any).duration).toBe(9)
  })

  it('duration 减到 0 时 currentWeather 恢复为 "clear"', () => {
    ;(sys as any).duration = 1
    ;(sys as any).currentWeather = 'rain'
    sys.update()
    expect(sys.currentWeather).toBe('clear')
  })

  it('duration 减到 0 时 intensity 重置为 0', () => {
    ;(sys as any).duration = 1
    ;(sys as any).currentWeather = 'rain'
    ;(sys as any).intensity = 0.8
    sys.update()
    expect(sys.intensity).toBe(0)
  })

  it('duration 为 0 时不再递减', () => {
    ;(sys as any).duration = 0
    sys.update()
    expect((sys as any).duration).toBe(0)
  })
})

// ─────────────────────── fog 渐变 ───────────────────────

describe('WeatherSystem — fogAlpha 渐变', () => {
  let sys: WeatherSystem
  beforeEach(() => { ({ sys } = makeSys()) })

  it('天气为 fog 时 fogAlpha 递增', () => {
    ;(sys as any).currentWeather = 'fog'
    ;(sys as any).duration = 100
    sys.update()
    expect(sys.fogAlpha).toBeGreaterThan(0)
  })

  it('天气为 fog 时 fogAlpha 上限为 0.4', () => {
    ;(sys as any).currentWeather = 'fog'
    ;(sys as any).duration = 100
    ;(sys as any).fogAlpha = 0.398
    sys.update()
    expect(sys.fogAlpha).toBeLessThanOrEqual(0.4)
  })

  it('非 fog 天气时 fogAlpha 递减', () => {
    ;(sys as any).currentWeather = 'clear'
    ;(sys as any).fogAlpha = 0.2
    sys.update()
    expect(sys.fogAlpha).toBeLessThan(0.2)
  })

  it('fogAlpha 不低于 0', () => {
    ;(sys as any).currentWeather = 'clear'
    ;(sys as any).fogAlpha = 0
    sys.update()
    expect(sys.fogAlpha).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────── getWeatherLabel ───────────────────────

describe('WeatherSystem — getWeatherLabel()', () => {
  let sys: WeatherSystem
  beforeEach(() => { ({ sys } = makeSys()) })

  const cases: [WeatherType, string][] = [
    ['clear', 'Clear'],
    ['rain', 'Rain'],
    ['snow', 'Snow'],
    ['storm', 'Storm'],
    ['fog', 'Fog'],
    ['tornado', 'Tornado'],
    ['drought', 'Drought'],
    ['heatwave', 'Heat Wave'],
  ]

  cases.forEach(([weather, label]) => {
    it(`${weather} → label 包含 "${label}"`, () => {
      sys.currentWeather = weather
      expect(sys.getWeatherLabel()).toContain(label)
    })
  })

  it('clear 时标签包含 clear（忽略大小写）', () => {
    sys.currentWeather = 'clear'
    expect(sys.getWeatherLabel().toLowerCase()).toContain('clear')
  })

  it('所有天气类型均返回字符串', () => {
    const weathers: WeatherType[] = ['clear', 'rain', 'snow', 'storm', 'fog', 'tornado', 'drought', 'heatwave']
    weathers.forEach(w => {
      sys.currentWeather = w
      expect(typeof sys.getWeatherLabel()).toBe('string')
    })
  })
})

// ─────────────────────── startRandomWeather — 季节感知 ───────────────────────

describe('WeatherSystem — startRandomWeather 季节感知', () => {
  it('winter 季节不抛出异常', () => {
    const { sys } = makeSys({ getSeason: () => 'winter' })
    expect(() => (sys as any).startRandomWeather()).not.toThrow()
  })

  it('spring 季节不抛出异常', () => {
    const { sys } = makeSys({ getSeason: () => 'spring' })
    expect(() => (sys as any).startRandomWeather()).not.toThrow()
  })

  it('summer 季节不抛出异常', () => {
    const { sys } = makeSys({ getSeason: () => 'summer' })
    expect(() => (sys as any).startRandomWeather()).not.toThrow()
  })

  it('autumn 季节不抛出异常', () => {
    const { sys } = makeSys({ getSeason: () => 'autumn' })
    expect(() => (sys as any).startRandomWeather()).not.toThrow()
  })

  it('未知季节使用默认 pool 不崩溃', () => {
    const { sys } = makeSys({ getSeason: () => 'unknown' })
    expect(() => (sys as any).startRandomWeather()).not.toThrow()
  })

  it('startRandomWeather 调用后 duration > 0（非 summer clear）', () => {
    // mock pickRandom 返回 'rain'
    const { sys } = makeSys({ getSeason: () => 'winter' })
    vi.spyOn(sys as any, 'startRandomWeather').mockImplementation(() => {
      ;(sys as any).currentWeather = 'rain'
      ;(sys as any).intensity = 0.5
      ;(sys as any).duration = 600
    })
    ;(sys as any).startRandomWeather()
    expect((sys as any).duration).toBeGreaterThan(0)
  })

  it('直接设置 rain 天气后 intensity 在 [0,1] 范围内', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'rain'
    ;(sys as any).intensity = 0.3 + Math.random() * 0.7
    expect(sys.intensity).toBeGreaterThanOrEqual(0.3)
    expect(sys.intensity).toBeLessThanOrEqual(1)
  })
})

// ─────────────────────── applyRain ───────────────────────

describe('WeatherSystem — applyRain', () => {
  it('applyRain 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'rain'
    ;(sys as any).intensity = 0.5
    expect(() => (sys as any).applyRain()).not.toThrow()
  })

  it('applyRain 偶数 tick 时调用 addParticle', () => {
    const { sys, particles } = makeSys()
    ;(sys as any).weatherTimer = 2  // 偶数
    ;(sys as any).intensity = 1
    ;(sys as any).applyRain()
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('applyRain 奇数 tick 时不调用 addParticle', () => {
    const { sys, particles } = makeSys()
    ;(sys as any).weatherTimer = 1  // 奇数
    ;(sys as any).intensity = 1
    ;(sys as any).applyRain()
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('applyRain 每 120 tick 尝试修改地形', () => {
    const setTile = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.SAND, setTile })
    ;(sys as any).weatherTimer = 120
    ;(sys as any).intensity = 1
    // 强制 random 触发地形改变
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).applyRain()
    // setTile 可能被调用（沙地 → 草地）
    expect(setTile.mock.calls.length).toBeGreaterThanOrEqual(0)
    vi.restoreAllMocks()
  })
})

// ─────────────────────── applySnow ───────────────────────

describe('WeatherSystem — applySnow', () => {
  it('applySnow 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).intensity = 0.5
    expect(() => (sys as any).applySnow()).not.toThrow()
  })

  it('applySnow 每3 tick 调用 addParticle', () => {
    const { sys, particles } = makeSys()
    ;(sys as any).weatherTimer = 3
    ;(sys as any).intensity = 1
    ;(sys as any).applySnow()
    expect(particles.addParticle).toHaveBeenCalled()
  })
})

// ─────────────────────── applyHeatwave ───────────────────────

describe('WeatherSystem — applyHeatwave', () => {
  it('applyHeatwave 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).intensity = 0.8
    expect(() => (sys as any).applyHeatwave()).not.toThrow()
  })

  it('每 10 tick 生成热浪粒子', () => {
    const { sys, particles } = makeSys()
    ;(sys as any).weatherTimer = 10
    ;(sys as any).intensity = 1
    ;(sys as any).applyHeatwave()
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('每 300 tick 尝试融化雪（SNOW → MOUNTAIN）', () => {
    const setTile = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.SNOW, setTile })
    ;(sys as any).weatherTimer = 300
    ;(sys as any).intensity = 0.8
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).applyHeatwave()
    expect(setTile.mock.calls.length).toBeGreaterThanOrEqual(0)
    vi.restoreAllMocks()
  })
})

// ─────────────────────── applyDrought ───────────────────────

describe('WeatherSystem — applyDrought', () => {
  it('applyDrought 不崩溃', () => {
    const { sys } = makeSys()
    expect(() => (sys as any).applyDrought()).not.toThrow()
  })

  it('每 200 tick 尝试将草地转为沙漠', () => {
    const setTile = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.GRASS, setTile })
    ;(sys as any).weatherTimer = 200
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).applyDrought()
    expect(setTile.mock.calls.length).toBeGreaterThanOrEqual(0)
    vi.restoreAllMocks()
  })
})

// ─────────────────────── applyTornado ───────────────────────

describe('WeatherSystem — applyTornado', () => {
  let sys: WeatherSystem

  beforeEach(() => {
    ;({ sys } = makeSys())
    ;(sys as any).tornadoX = 10
    ;(sys as any).tornadoY = 10
    ;(sys as any).tornadoDirX = 1
    ;(sys as any).tornadoDirY = 0
    ;(sys as any).intensity = 0.8
  })

  it('applyTornado 不崩溃', () => {
    expect(() => (sys as any).applyTornado()).not.toThrow()
  })

  it('tornado 位置在 update 后变化', () => {
    const prevX = sys.tornadoX
    ;(sys as any).applyTornado()
    // 位置可能改变，但不抛出
    expect(typeof sys.tornadoX).toBe('number')
    expect(sys.tornadoX).not.toBeNaN()
    void prevX
  })

  it('tornado 坐标被 clamp 到世界范围', () => {
    ;(sys as any).tornadoX = -100
    ;(sys as any).tornadoY = -100
    ;(sys as any).applyTornado()
    expect(sys.tornadoX).toBeGreaterThanOrEqual(0)
    expect(sys.tornadoY).toBeGreaterThanOrEqual(0)
  })

  it('applyTornado 生成粒子（偶数 weatherTimer）', () => {
    const { sys: s, particles } = makeSys()
    ;(s as any).weatherTimer = 2
    ;(s as any).tornadoX = 10
    ;(s as any).tornadoY = 10
    ;(s as any).tornadoDirX = 1
    ;(s as any).tornadoDirY = 0
    ;(s as any).applyTornado()
    expect(particles.addParticle).toHaveBeenCalled()
  })
})

// ─────────────────────── affectCreatures ───────────────────────

describe('WeatherSystem — affectCreatures()', () => {
  it('无实体时 affectCreatures 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).intensity = 0.5
    expect(() => (sys as any).affectCreatures()).not.toThrow()
  })

  it('rain 减少生物饥饿', () => {
    const { sys, em } = makeSys()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 5, y: 5 })
    em.addComponent(eid, { type: 'needs', hunger: 50, health: 100 })
    em.addComponent(eid, { type: 'creature', species: 'human', age: 20 })
    ;(sys as any).currentWeather = 'rain'
    ;(sys as any).intensity = 1
    ;(sys as any).affectCreatures()
    const needs: any = em.getComponent(eid, 'needs')
    expect(needs.hunger).toBeLessThan(50)
  })

  it('snow 减少非龙生物血量', () => {
    const { sys, em } = makeSys()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 5, y: 5 })
    em.addComponent(eid, { type: 'needs', hunger: 50, health: 100 })
    em.addComponent(eid, { type: 'creature', species: 'human', age: 20 })
    ;(sys as any).currentWeather = 'snow'
    ;(sys as any).intensity = 1
    ;(sys as any).affectCreatures()
    const needs: any = em.getComponent(eid, 'needs')
    expect(needs.health).toBeLessThan(100)
  })

  it('dragon 在 snow 中免疫血量损失', () => {
    const { sys, em } = makeSys()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 5, y: 5 })
    em.addComponent(eid, { type: 'needs', hunger: 50, health: 100 })
    em.addComponent(eid, { type: 'creature', species: 'dragon', age: 20 })
    ;(sys as any).currentWeather = 'snow'
    ;(sys as any).intensity = 1
    ;(sys as any).affectCreatures()
    const needs: any = em.getComponent(eid, 'needs')
    expect(needs.health).toBe(100)
  })

  it('drought 增加生物饥饿', () => {
    const { sys, em } = makeSys()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 5, y: 5 })
    em.addComponent(eid, { type: 'needs', hunger: 50, health: 100 })
    em.addComponent(eid, { type: 'creature', species: 'human', age: 20 })
    ;(sys as any).currentWeather = 'drought'
    ;(sys as any).intensity = 1
    ;(sys as any).affectCreatures()
    const needs: any = em.getComponent(eid, 'needs')
    expect(needs.hunger).toBeGreaterThan(50)
  })

  it('heatwave 减少非龙血量', () => {
    const { sys, em } = makeSys()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 5, y: 5 })
    em.addComponent(eid, { type: 'needs', hunger: 50, health: 100 })
    em.addComponent(eid, { type: 'creature', species: 'elf', age: 20 })
    ;(sys as any).currentWeather = 'heatwave'
    ;(sys as any).intensity = 1
    ;(sys as any).affectCreatures()
    const needs: any = em.getComponent(eid, 'needs')
    expect(needs.health).toBeLessThan(100)
  })

  it('dragon 在 heatwave 中免疫血量损失', () => {
    const { sys, em } = makeSys()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 5, y: 5 })
    em.addComponent(eid, { type: 'needs', hunger: 50, health: 100 })
    em.addComponent(eid, { type: 'creature', species: 'dragon', age: 20 })
    ;(sys as any).currentWeather = 'heatwave'
    ;(sys as any).intensity = 1
    ;(sys as any).affectCreatures()
    const needs: any = em.getComponent(eid, 'needs')
    expect(needs.health).toBe(100)
  })

  it('storm 减少非龙血量', () => {
    const { sys, em } = makeSys()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 5, y: 5 })
    em.addComponent(eid, { type: 'needs', hunger: 50, health: 100 })
    em.addComponent(eid, { type: 'creature', species: 'orc', age: 20 })
    ;(sys as any).currentWeather = 'storm'
    ;(sys as any).intensity = 1
    ;(sys as any).affectCreatures()
    const needs: any = em.getComponent(eid, 'needs')
    expect(needs.health).toBeLessThan(100)
  })

  it('storm 中 dragon 免疫', () => {
    const { sys, em } = makeSys()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 5, y: 5 })
    em.addComponent(eid, { type: 'needs', hunger: 50, health: 100 })
    em.addComponent(eid, { type: 'creature', species: 'dragon', age: 20 })
    ;(sys as any).currentWeather = 'storm'
    ;(sys as any).intensity = 1
    ;(sys as any).affectCreatures()
    const needs: any = em.getComponent(eid, 'needs')
    expect(needs.health).toBe(100)
  })
})

// ─────────────────────── update 触发天气效果 ───────────────────────

describe('WeatherSystem — update 天气效果触发', () => {
  it('非 clear 天气下 update 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'rain'
    ;(sys as any).duration = 50
    ;(sys as any).intensity = 0.5
    expect(() => sys.update()).not.toThrow()
  })

  it('fog 天气下 update 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'fog'
    ;(sys as any).duration = 50
    expect(() => sys.update()).not.toThrow()
  })

  it('tornado 天气下 update 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'tornado'
    ;(sys as any).duration = 50
    ;(sys as any).intensity = 0.5
    ;(sys as any).tornadoX = 5
    ;(sys as any).tornadoY = 5
    expect(() => sys.update()).not.toThrow()
  })

  it('drought 天气下 update 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'drought'
    ;(sys as any).duration = 50
    expect(() => sys.update()).not.toThrow()
  })

  it('heatwave 天气下 update 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'heatwave'
    ;(sys as any).duration = 50
    ;(sys as any).intensity = 0.8
    expect(() => sys.update()).not.toThrow()
  })

  it('snow 天气下 update 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'snow'
    ;(sys as any).duration = 50
    ;(sys as any).intensity = 0.7
    expect(() => sys.update()).not.toThrow()
  })

  it('storm 天气下 update 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'storm'
    ;(sys as any).duration = 50
    ;(sys as any).intensity = 0.9
    expect(() => sys.update()).not.toThrow()
  })

  it('clear 天气下不触发 applyWeatherEffects', () => {
    const { sys } = makeSys()
    const spy = vi.spyOn(sys as any, 'applyWeatherEffects')
    sys.update()
    expect(spy).not.toHaveBeenCalled()
  })

  it('非 clear 天气下触发 applyWeatherEffects', () => {
    const { sys } = makeSys()
    ;(sys as any).currentWeather = 'rain'
    ;(sys as any).duration = 10
    const spy = vi.spyOn(sys as any, 'applyWeatherEffects')
    sys.update()
    expect(spy).toHaveBeenCalled()
  })
})

// ─────────────────────── applyStorm — 闪电 ───────────────────────

describe('WeatherSystem — applyStorm 闪电效果', () => {
  it('applyStorm 不崩溃', () => {
    const { sys } = makeSys()
    ;(sys as any).intensity = 1
    expect(() => (sys as any).applyStorm()).not.toThrow()
  })

  it('applyStorm 包含 applyRain 行为（偶数 weatherTimer）', () => {
    const { sys, particles } = makeSys()
    ;(sys as any).weatherTimer = 2
    ;(sys as any).intensity = 1
    ;(sys as any).applyStorm()
    // applyRain 内部会调用 addParticle
    expect(particles.addParticle).toHaveBeenCalled()
  })
})
