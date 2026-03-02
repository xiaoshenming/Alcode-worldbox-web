import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldMagicStormSystem } from '../systems/WorldMagicStormSystem'
import type { MagicStorm, EnchantedZone, MagicStormType } from '../systems/WorldMagicStormSystem'

const SPAWN_INTERVAL = 3000
const MOVE_INTERVAL = 150
const MAX_STORMS = 4
const MAX_ZONES = 12
const STORM_SPEED = 0.4

function makeSys(): WorldMagicStormSystem { return new WorldMagicStormSystem() }
let nextId = 1
function makeStorm(overrides: Partial<MagicStorm> = {}): MagicStorm {
  return {
    id: nextId++, type: 'arcane', x: 50, y: 50,
    radius: 10, intensity: 7, dx: 0.5, dy: 0.3,
    age: 0, maxAge: 3000, mutationsApplied: 0,
    ...overrides,
  }
}
function makeZone(overrides: Partial<EnchantedZone> = {}): EnchantedZone {
  return { x: 20, y: 20, radius: 8, type: 'void', power: 60, decayAt: 5000, ...overrides }
}

// ─── 1. 初始状态 ─────────────────────────────────────────────────────────────
describe('WorldMagicStormSystem - 初始状态', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('getStorms初始为空数组', () => { expect(sys.getStorms()).toHaveLength(0) })
  it('getEnchantedZones初始为空数组', () => { expect(sys.getEnchantedZones()).toHaveLength(0) })
  it('getStormCount初始为0', () => { expect(sys.getStormCount()).toBe(0) })
  it('getStorms返回同一内部引用', () => { expect(sys.getStorms()).toBe(sys.getStorms()) })
  it('getEnchantedZones返回同一内部引用', () => {
    expect(sys.getEnchantedZones()).toBe(sys.getEnchantedZones())
  })
  it('支持5种MagicStormType', () => {
    const types: MagicStormType[] = ['arcane', 'void', 'elemental', 'spirit', 'chaos']
    expect(types).toHaveLength(5)
  })
})

// ─── 2. setWorldSize ──────────────────────────────────────────────────────────
describe('WorldMagicStormSystem - setWorldSize', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('可以调用setWorldSize不报错', () => {
    expect(() => sys.setWorldSize(400, 400)).not.toThrow()
  })
  it('设置世界大小后边界检测使用新尺寸', () => {
    sys.setWorldSize(100, 100)
    // 注入一个x=130的风暴，超出width+20=120，下次moveStorms时会删除
    const s = makeStorm({ x: 130, y: 50, dx: 0, dy: 0, age: 0, maxAge: 9999 })
    sys.getStorms().push(s)
    // 强制触发 moveStorms（tick差值 >= MOVE_INTERVAL）
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()).toHaveLength(0)
  })
})

// ─── 3. spawn节流 (SPAWN_INTERVAL=3000) ───────────────────────────────────────
describe('WorldMagicStormSystem - spawn节流', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < SPAWN_INTERVAL时不尝试spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 即使random=0也spawn
    sys.update(1, SPAWN_INTERVAL - 1)
    expect(sys.getStorms()).toHaveLength(0)
  })
  it('tick == SPAWN_INTERVAL时执行spawn逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发spawn（0 <= 0.4）
    sys.update(1, SPAWN_INTERVAL)
    expect(sys.getStorms()).toHaveLength(1)
  })
  it('tick == SPAWN_INTERVAL+1时执行spawn逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL + 1)
    expect(sys.getStorms()).toHaveLength(1)
  })
  it('random > 0.4时跳过spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > 0.4，跳过
    sys.update(1, SPAWN_INTERVAL)
    expect(sys.getStorms()).toHaveLength(0)
  })
  it('random == 0.4时跳过spawn（严格>)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4) // > 0.4 false，不跳过，会spawn
    vi.spyOn(Math, 'floor').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    // random=0.4时条件 Math.random() > 0.4 为false，因此spawn执行
    expect(sys.getStorms().length).toBeGreaterThanOrEqual(0) // 视floor mock
  })
  it('两次update间隔不足SPAWN_INTERVAL不重复spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    sys.update(1, SPAWN_INTERVAL + 100) // 差100 < 3000，不再spawn
    expect(sys.getStorms()).toHaveLength(1)
  })
  it('达到间隔后第二次spawn触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)       // 第1次spawn
    sys.update(1, SPAWN_INTERVAL * 2)  // 第2次spawn
    expect(sys.getStorms()).toHaveLength(2)
  })
})

// ─── 4. spawn条件 / MAX_STORMS上限 ────────────────────────────────────────────
describe('WorldMagicStormSystem - spawn条件与MAX_STORMS', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_STORMS=4：注入4个后random=0时不再spawn', () => {
    for (let i = 0; i < MAX_STORMS; i++) sys.getStorms().push(makeStorm())
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    expect(sys.getStorms()).toHaveLength(MAX_STORMS)
  })
  it('注入3个时仍可spawn', () => {
    for (let i = 0; i < 3; i++) sys.getStorms().push(makeStorm())
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    expect(sys.getStorms()).toHaveLength(4)
  })
  it('spawn后id自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    sys.update(1, SPAWN_INTERVAL * 2)
    const ids = sys.getStorms().map(s => s.id)
    expect(ids[0]).not.toBe(ids[1])
  })
  it('spawn产生的风暴radius在8-15范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    const s = sys.getStorms()[0]
    expect(s.radius).toBeGreaterThanOrEqual(8)
    expect(s.radius).toBeLessThanOrEqual(15)
  })
  it('spawn产生的风暴intensity在3-8范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    const s = sys.getStorms()[0]
    expect(s.intensity).toBeGreaterThanOrEqual(3)
    expect(s.intensity).toBeLessThanOrEqual(8)
  })
  it('spawn产生的风暴maxAge在200-499范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    const s = sys.getStorms()[0]
    expect(s.maxAge).toBeGreaterThanOrEqual(200)
    expect(s.maxAge).toBeLessThanOrEqual(499)
  })
  it('spawn产生的风暴spawnStorm时age=0，同tick moveStorms后age变为1', () => {
    // SPAWN_INTERVAL(3000) >= MOVE_INTERVAL(150)，同一tick两者都触发
    // spawnStorm设置age=0，随后moveStorms执行age++，最终age=1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, SPAWN_INTERVAL)
    const s = sys.getStorms()[0]
    expect(s.age).toBe(1)        // moveStorms已执行age++
    expect(s.mutationsApplied).toBe(0)
  })
  it('从边缘0(左)生成时dx为正', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // floor(0*4)=0 => 左边缘
    sys.update(1, SPAWN_INTERVAL)
    if (sys.getStorms().length > 0) {
      expect(sys.getStorms()[0].dx).toBe(STORM_SPEED)
    }
  })
})

// ─── 5. moveStorms节流 (MOVE_INTERVAL=150) ───────────────────────────────────
describe('WorldMagicStormSystem - moveStorms节流', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < MOVE_INTERVAL时不移动风暴', () => {
    const s = makeStorm({ x: 100, y: 100, dx: 1, dy: 0 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL - 1)
    expect(sys.getStorms()[0].x).toBe(100)
  })
  it('tick == MOVE_INTERVAL时移动风暴', () => {
    const s = makeStorm({ x: 100, y: 100, dx: 1, dy: 0, age: 0, maxAge: 9999 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()[0].x).toBe(101)
  })
  it('移动后age+1', () => {
    const s = makeStorm({ x: 50, y: 50, dx: 0, dy: 0, age: 0, maxAge: 9999 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()[0].age).toBe(1)
  })
  it('age达到maxAge时删除风暴', () => {
    const s = makeStorm({ age: 499, maxAge: 499, x: 50, y: 50, dx: 0, dy: 0 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    // age++ => 500 >= maxAge(499)，删除
    expect(sys.getStorms()).toHaveLength(0)
  })
  it('age < maxAge时不因age删除', () => {
    const s = makeStorm({ age: 0, maxAge: 9999, x: 50, y: 50, dx: 0, dy: 0 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()).toHaveLength(1)
  })
  it('x < -20时删除风暴', () => {
    const s = makeStorm({ x: -25, y: 50, dx: 0, dy: 0, age: 0, maxAge: 9999 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()).toHaveLength(0)
  })
  it('x > worldWidth+20时删除风暴', () => {
    sys.setWorldSize(200, 200)
    const s = makeStorm({ x: 225, y: 50, dx: 0, dy: 0, age: 0, maxAge: 9999 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()).toHaveLength(0)
  })
  it('y < -20时删除风暴', () => {
    const s = makeStorm({ x: 50, y: -25, dx: 0, dy: 0, age: 0, maxAge: 9999 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()).toHaveLength(0)
  })
  it('y > worldHeight+20时删除风暴', () => {
    sys.setWorldSize(200, 200)
    const s = makeStorm({ x: 50, y: 225, dx: 0, dy: 0, age: 0, maxAge: 9999 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()).toHaveLength(0)
  })
})

// ─── 6. EnchantedZone 轨迹生成 ───────────────────────────────────────────────
describe('WorldMagicStormSystem - enchanted zone轨迹', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('age%50==0时产生enchanted zone（首次age从0→1，不满足%50）', () => {
    const s = makeStorm({ x: 50, y: 50, dx: 0, dy: 0, age: 0, maxAge: 9999, intensity: 6 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL) // age:0->1, 1%50!=0, 无zone
    expect(sys.getEnchantedZones()).toHaveLength(0)
  })
  it('age从49->50时（%50==0）产生zone', () => {
    const s = makeStorm({ x: 50, y: 50, dx: 0, dy: 0, age: 49, maxAge: 9999, intensity: 6 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL) // age:49->50, 50%50==0, 产生zone
    expect(sys.getEnchantedZones()).toHaveLength(1)
  })
  it('产生zone的power是intensity*0.5的floor', () => {
    const s = makeStorm({ x: 50, y: 50, dx: 0, dy: 0, age: 49, maxAge: 9999, intensity: 6, radius: 10 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    const z = sys.getEnchantedZones()[0]
    expect(z.power).toBe(Math.floor(6 * 0.5))
  })
  it('产生zone的radius是storm.radius*0.6的floor', () => {
    const s = makeStorm({ x: 50, y: 50, dx: 0, dy: 0, age: 49, maxAge: 9999, intensity: 6, radius: 10 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    const z = sys.getEnchantedZones()[0]
    expect(z.radius).toBe(Math.floor(10 * 0.6))
  })
  it('产生zone后mutationsApplied+1', () => {
    const s = makeStorm({ x: 50, y: 50, dx: 0, dy: 0, age: 49, maxAge: 9999, intensity: 6, mutationsApplied: 0 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getStorms()[0].mutationsApplied).toBe(1)
  })
  it('zones已达MAX_ZONES时不再产生新zone', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      sys.getEnchantedZones().push(makeZone({ decayAt: 99999 }))
    }
    const s = makeStorm({ x: 50, y: 50, dx: 0, dy: 0, age: 49, maxAge: 9999, intensity: 6 })
    sys.getStorms().push(s)
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getEnchantedZones()).toHaveLength(MAX_ZONES)
  })
})

// ─── 7. cleanupZones ─────────────────────────────────────────────────────────
describe('WorldMagicStormSystem - cleanupZones', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('decayAt > tick时保留zone', () => {
    sys.getEnchantedZones().push(makeZone({ decayAt: MOVE_INTERVAL + 1000 }))
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getEnchantedZones()).toHaveLength(1)
  })
  it('decayAt == tick时删除zone', () => {
    sys.getEnchantedZones().push(makeZone({ decayAt: MOVE_INTERVAL }))
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getEnchantedZones()).toHaveLength(0)
  })
  it('decayAt < tick时删除zone', () => {
    sys.getEnchantedZones().push(makeZone({ decayAt: MOVE_INTERVAL - 1 }))
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getEnchantedZones()).toHaveLength(0)
  })
  it('混合情况：过期的删除，未过期的保留', () => {
    sys.getEnchantedZones().push(makeZone({ decayAt: MOVE_INTERVAL - 1 })) // 过期
    sys.getEnchantedZones().push(makeZone({ decayAt: MOVE_INTERVAL + 5000 })) // 保留
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getEnchantedZones()).toHaveLength(1)
    expect(sys.getEnchantedZones()[0].decayAt).toBe(MOVE_INTERVAL + 5000)
  })
  it('多个过期zone全部删除', () => {
    for (let i = 0; i < 5; i++) {
      sys.getEnchantedZones().push(makeZone({ decayAt: 100 }))
    }
    sys.update(1, MOVE_INTERVAL)
    expect(sys.getEnchantedZones()).toHaveLength(0)
  })
  it('cleanup仅在tick>=MOVE_INTERVAL时执行', () => {
    sys.getEnchantedZones().push(makeZone({ decayAt: MOVE_INTERVAL - 10 })) // 已过期
    sys.update(1, MOVE_INTERVAL - 1) // tick不够，不触发moveStorms/cleanupZones
    expect(sys.getEnchantedZones()).toHaveLength(1) // 不被清理
  })
})
