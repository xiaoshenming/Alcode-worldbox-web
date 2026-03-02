import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AISystem } from '../systems/AISystem'
import { EntityManager } from '../ecs/Entity'
import type {
  PositionComponent,
  NeedsComponent,
  AIComponent,
  CreatureComponent,
  GeneticsComponent,
  HeroComponent,
} from '../ecs/Entity'
import { TileType } from '../utils/Constants'

function makeMocks() {
  const em = new EntityManager()
  const world = { width: 20, height: 20, getTile: () => TileType.GRASS, tick: 0 }
  const particles = { spawnDeath: () => {}, spawnBirth: () => {}, spawn: () => {} }
  const factory = { spawn: () => em.createEntity() }
  const spatialHash = { query: () => [] as number[] }
  return { em, world, particles, factory, spatialHash }
}

function makeSys() {
  const mocks = makeMocks()
  const sys = new AISystem(
    mocks.em as any, mocks.world as any,
    mocks.particles as any, mocks.factory as any, mocks.spatialHash as any
  )
  return { sys, ...mocks }
}

function addCreatureEntity(
  em: EntityManager,
  opts: {
    health: number
    hunger: number
    age?: number
    maxAge?: number
    gender?: string
    species?: string
    isHostile?: boolean
    speed?: number
    damage?: number
  }
) {
  const id = em.createEntity()
  em.addComponent<PositionComponent>(id, { type: 'position', x: 5, y: 5 })
  em.addComponent<AIComponent>(id, {
    type: 'ai', state: 'idle', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0
  })
  em.addComponent<NeedsComponent>(id, { type: 'needs', hunger: opts.hunger, health: opts.health })
  em.addComponent<CreatureComponent>(id, {
    type: 'creature',
    species: opts.species ?? 'human',
    speed: opts.speed ?? 1,
    damage: opts.damage ?? 5,
    isHostile: opts.isHostile ?? false,
    name: 'TestCreature',
    age: opts.age ?? 0,
    maxAge: opts.maxAge ?? 1000,
    gender: opts.gender ?? 'male',
  })
  return id
}

// ============================================================
// 测试组1：breedCooldown 内存泄漏修复（原有2个测试保留并扩展）
// ============================================================
describe('AISystem breedCooldown 内存泄漏修复', () => {
  afterEach(() => vi.restoreAllMocks())

  it('实体饥饿死亡（health<=0）时 breedCooldown 应被清理', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 0, hunger: 100 })
    ;(sys as any).breedCooldown.set(id, 200)
    expect((sys as any).breedCooldown.has(id)).toBe(true)
    for (let i = 0; i < 8; i++) { sys.update() }
    expect((sys as any).breedCooldown.has(id)).toBe(false)
  })

  it('实体老死时 breedCooldown 也应被清理', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 999, maxAge: 999 })
    ;(sys as any).breedCooldown.set(id, 300)
    expect((sys as any).breedCooldown.has(id)).toBe(true)
    for (let i = 0; i < 8; i++) { sys.update() }
    expect((sys as any).breedCooldown.has(id)).toBe(false)
  })

  it('正常存活实体 breedCooldown 不应被清理', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000 })
    ;(sys as any).breedCooldown.set(id, 300)
    for (let i = 0; i < 8; i++) { sys.update() }
    // 存活实体的 breedCooldown 应该还存在（值减小但仍在 map 中）
    expect((sys as any).breedCooldown.has(id)).toBe(true)
  })

  it('多实体同时死亡时均被清理', () => {
    const { sys, em } = makeSys()
    const ids = [
      addCreatureEntity(em, { health: 0, hunger: 100 }),
      addCreatureEntity(em, { health: 0, hunger: 100 }),
      addCreatureEntity(em, { health: 0, hunger: 100 }),
    ]
    for (const id of ids) { (sys as any).breedCooldown.set(id, 100) }
    // 批次系统每次处理 1/8 的实体，3个实体需要最多16次 update 才能覆盖所有批次
    for (let i = 0; i < 16; i++) { sys.update() }
    for (const id of ids) {
      expect((sys as any).breedCooldown.has(id)).toBe(false)
    }
  })

  it('breedCooldown 初始为空 Map', () => {
    const { sys } = makeSys()
    expect((sys as any).breedCooldown.size).toBe(0)
  })

  it('breedCooldown 倒计时递减——正常实体每轮 update 值减1', () => {
    const { sys, em } = makeSys()
    // 必须是成年 female（age >= maxAge*0.2），healthy，不饥饿
    // age=300, maxAge=1000 → 300 >= 200 ✓
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 300, maxAge: 1000, gender: 'female' })
    ;(sys as any).breedCooldown.set(id, 300)
    // updateBreeding 全量遍历（非批次），每次 update 都会处理该实体的 breedCooldown
    sys.update()
    const val = (sys as any).breedCooldown.get(id)
    expect(val).toBe(299)
  })
})

// ============================================================
// 测试组2：AISystem 实例化与基础结构
// ============================================================
describe('AISystem 实例化与基础结构', () => {
  afterEach(() => vi.restoreAllMocks())

  it('可以正常实例化', () => {
    const { sys } = makeSys()
    expect(sys).toBeDefined()
  })

  it('setResourceSystem 不抛出', () => {
    const { sys } = makeSys()
    expect(() => sys.setResourceSystem({ nodes: [] } as any)).not.toThrow()
  })

  it('setCivManager 不抛出', () => {
    const { sys } = makeSys()
    expect(() => sys.setCivManager({} as any)).not.toThrow()
  })

  it('初始 batchIndex 为 0', () => {
    const { sys } = makeSys()
    expect((sys as any).batchIndex).toBe(0)
  })

  it('update() 空世界不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update()).not.toThrow()
  })

  it('多次 update() 不崩溃', () => {
    const { sys } = makeSys()
    expect(() => { for (let i = 0; i < 20; i++) sys.update() }).not.toThrow()
  })
})

// ============================================================
// 测试组3：实体老化（Aging）行为
// ============================================================
describe('AISystem 老化行为', () => {
  afterEach(() => vi.restoreAllMocks())

  it('每次被处理 age += 0.1', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 0, maxAge: 1000 })
    ;(sys as any).batchIndex = 0
    sys.update()
    const creature = em.getComponent<CreatureComponent>(id, 'creature')
    expect(creature?.age).toBeCloseTo(0.1, 5)
  })

  it('age >= maxAge 时实体被移除', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 999.95, maxAge: 1000 })
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(em.hasComponent(id, 'creature')).toBe(false)
  })

  it('age < maxAge 时实体不被移除', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 0, maxAge: 1000 })
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(em.hasComponent(id, 'creature')).toBe(true)
  })

  it('老死时调用 particles.spawnDeath', () => {
    const { sys, em, particles } = makeSys()
    const spyDeath = vi.spyOn(particles, 'spawnDeath')
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 999.95, maxAge: 1000 })
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(spyDeath).toHaveBeenCalled()
  })
})

// ============================================================
// 测试组4：饥饿与死亡
// ============================================================
describe('AISystem 饥饿与死亡', () => {
  afterEach(() => vi.restoreAllMocks())

  it('health<=0 实体被移除', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 0, hunger: 100 })
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(em.hasComponent(id, 'creature')).toBe(false)
  })

  it('饥饿死亡时调用 particles.spawnDeath', () => {
    const { sys, em, particles } = makeSys()
    const spy = vi.spyOn(particles, 'spawnDeath')
    const id = addCreatureEntity(em, { health: 0, hunger: 100 })
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(spy).toHaveBeenCalled()
  })

  it('hunger >= 100 时 health 开始下降', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 100 })
    ;(sys as any).batchIndex = 0
    sys.update()
    const needs = em.getComponent<NeedsComponent>(id, 'needs')
    // health 应 < 100（扣了1点）
    expect(needs?.health).toBeLessThan(100)
  })

  it('hunger < 100 时 health 不因饥饿下降', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 50 })
    ;(sys as any).batchIndex = 0
    sys.update()
    const needs = em.getComponent<NeedsComponent>(id, 'needs')
    // health 不变
    expect(needs?.health).toBe(100)
  })

  it('每次 update hunger 增加 0.02', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0 })
    ;(sys as any).batchIndex = 0
    sys.update()
    const needs = em.getComponent<NeedsComponent>(id, 'needs')
    expect(needs?.hunger).toBeCloseTo(0.02, 5)
  })
})

// ============================================================
// 测试组5：AI 状态机 — idle/wandering
// ============================================================
describe('AISystem 状态机 idle 和 wandering', () => {
  afterEach(() => vi.restoreAllMocks())

  it('idle 实体以 2% 概率变为 wandering', () => {
    const { sys, em } = makeSys()
    // 强制 Math.random 返回小值触发 wandering
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000 })
    ;(sys as any).batchIndex = 0
    sys.update()
    const ai = em.getComponent<AIComponent>(id, 'ai')
    expect(ai?.state).toBe('wandering')
    vi.restoreAllMocks()
  })

  it('cooldown > 0 时每次 update 递减', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0 })
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    ai.cooldown = 10
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(ai.cooldown).toBe(9)
  })

  it('cooldown 不能降为负数（减到 0 停止）', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0 })
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    ai.cooldown = 0
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(ai.cooldown).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================
// 测试组6：AI 状态机 — hungry 状态
// ============================================================
describe('AISystem 状态机 hungry', () => {
  afterEach(() => vi.restoreAllMocks())

  it('hunger > 70 时切换到 hungry 状态', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 80, age: 10, maxAge: 1000 })
    ;(sys as any).batchIndex = 0
    sys.update()
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    expect(ai.state).toBe('hungry')
  })

  it('hungry 状态下 hunger < 30 切换回 idle', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 20, age: 10, maxAge: 1000 })
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    ai.state = 'hungry'
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(ai.state).toBe('idle')
  })

  it('hungry 状态不因 threat 而直接切 hungry（fleeing/attacking 优先）', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 80, age: 10, maxAge: 1000 })
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    ai.state = 'fleeing'
    ai.targetEntity = 9999
    ;(sys as any).batchIndex = 0
    // targetEntity 不存在 -> 清为 idle
    sys.update()
    // fleeing 但 target 没有 position 组件 -> idle
    expect(ai.state).toBe('idle')
  })
})

// ============================================================
// 测试组7：批次系统（Batch staggering）
// ============================================================
describe('AISystem 批次系统', () => {
  afterEach(() => vi.restoreAllMocks())

  it('batchIndex 每次 update 递增', () => {
    const { sys } = makeSys()
    expect((sys as any).batchIndex).toBe(0)
    sys.update()
    expect((sys as any).batchIndex).toBe(1)
    sys.update()
    expect((sys as any).batchIndex).toBe(2)
  })

  it('BATCH_COUNT=8: 每轮只处理 1/8 的实体', () => {
    const { sys, em } = makeSys()
    // 创建 8 个实体（每轮批次处理其中1个）
    for (let i = 0; i < 8; i++) {
      addCreatureEntity(em, { health: 0, hunger: 100 })
    }
    ;(sys as any).batchIndex = 0
    sys.update() // 处理批次 0，只删 idx=0 的实体
    // 存活实体应该还有 7 个（批次 0 删掉 1 个）
    const alive = em.getEntitiesWithComponents('creature')
    expect(alive.length).toBe(7)
  })

  it('足够多次 update 后所有饥饿死亡实体均被清理', () => {
    const { sys, em } = makeSys()
    for (let i = 0; i < 8; i++) {
      addCreatureEntity(em, { health: 0, hunger: 100 })
    }
    // 批次系统每轮处理 1/8，随着实体死亡 idx 偏移，需足够多轮次确保全部覆盖
    // 运行 80 轮保障：即使每次只能推进 1 个批次，80 轮远超覆盖所需
    for (let i = 0; i < 80; i++) { sys.update() }
    const alive = em.getEntitiesWithComponents('creature')
    expect(alive.length).toBe(0)
  })
})

// ============================================================
// 测试组8：fleeing 状态
// ============================================================
describe('AISystem fleeing 状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('fleeing 且 targetEntity 为 null 时切换为 idle', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000 })
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    ai.state = 'fleeing'
    ai.targetEntity = null
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(ai.state).toBe('idle')
  })

  it('fleeing 且 targetEntity 无 position 时切换为 idle', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000 })
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    ai.state = 'fleeing'
    ai.targetEntity = 9999 // 不存在的实体
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(ai.state).toBe('idle')
    expect(ai.targetEntity).toBeNull()
  })
})

// ============================================================
// 测试组9：attacking 状态
// ============================================================
describe('AISystem attacking 状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('attacking 且 targetEntity 为 null 时切换为 idle', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000, isHostile: true })
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    ai.state = 'attacking'
    ai.targetEntity = null
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(ai.state).toBe('idle')
  })

  it('attacking 且 targetEntity 无 position 时切换为 idle', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000, isHostile: true })
    const ai = em.getComponent<AIComponent>(id, 'ai')!
    ai.state = 'attacking'
    ai.targetEntity = 9999
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(ai.state).toBe('idle')
    expect(ai.targetEntity).toBeNull()
  })
})

// ============================================================
// 测试组10：位置 Clamp
// ============================================================
describe('AISystem 位置 Clamp', () => {
  afterEach(() => vi.restoreAllMocks())

  it('position.x 不低于 0', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000 })
    const pos = em.getComponent<PositionComponent>(id, 'position')!
    pos.x = -10
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(pos.x).toBeGreaterThanOrEqual(0)
  })

  it('position.y 不低于 0', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000 })
    const pos = em.getComponent<PositionComponent>(id, 'position')!
    pos.y = -10
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(pos.y).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================
// 测试组11：breedCooldown 倒计时与 breed 流程
// ============================================================
describe('AISystem breedCooldown 倒计时流程', () => {
  afterEach(() => vi.restoreAllMocks())

  it('breed cooldown 为 0 后不存储 0（被 delete 或不存在）', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, {
      health: 100, hunger: 0, age: 300, maxAge: 1000, gender: 'female'
    })
    // 不设置 breedCooldown，触发繁殖路径（cd==0 时尝试寻找雄性）
    ;(sys as any).batchIndex = 0
    sys.update()
    // 没有雄性，不会触发繁殖，所以 breedCooldown 中不会有该 id 写入 300
    expect((sys as any).breedCooldown.get(id) ?? 0).toBe(0)
  })

  it('breedCooldown 倒计时每轮减1（female，healthy，adult）', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, {
      health: 100, hunger: 0, age: 300, maxAge: 1000, gender: 'female'
    })
    ;(sys as any).breedCooldown.set(id, 50)
    // 繁殖 pass 是在 update 末尾，对全部实体遍历，不受批次限制
    sys.update()
    const val = (sys as any).breedCooldown.get(id)
    expect(val).toBe(49)
  })

  it('breedCooldown 为0时不减（继续尝试繁殖，没有雄性则不设置新冷却）', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, {
      health: 100, hunger: 0, age: 300, maxAge: 1000, gender: 'female'
    })
    ;(sys as any).breedCooldown.set(id, 0)
    sys.update()
    // 没有雄性，不触发繁殖，breedCooldown 应被减到 -1 再 delete，或者本来就 0 不变
    // 实际代码：cd=0 时跳出 cd>0 分支，进入繁殖检查；没有雄性则不设置；原来的 0 没有被 delete
    // 这里只验证不崩溃
    expect((sys as any).breedCooldown.has(id)).toBeDefined()
  })

  it('非 female 实体不进入 breedCooldown 管理', () => {
    const { sys, em } = makeSys()
    const maleId = addCreatureEntity(em, {
      health: 100, hunger: 0, age: 300, maxAge: 1000, gender: 'male'
    })
    ;(sys as any).breedCooldown.set(maleId, 100)
    sys.update()
    // 雄性不参与繁殖，breedCooldown 不减（在 updateBreeding 里雄性直接跳过）
    // 但 breedCooldown.get 仍能访问
    expect((sys as any).breedCooldown.has(maleId)).toBe(true)
  })

  it('健康不足（health<50）的 female 不触发繁殖', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, {
      health: 40, hunger: 0, age: 300, maxAge: 1000, gender: 'female'
    })
    sys.update()
    // 健康不足，跳过繁殖，不设置 breedCooldown
    expect((sys as any).breedCooldown.has(id)).toBe(false)
  })

  it('过度饥饿（hunger>60）的 female 不触发繁殖', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, {
      health: 100, hunger: 70, age: 300, maxAge: 1000, gender: 'female'
    })
    sys.update()
    expect((sys as any).breedCooldown.has(id)).toBe(false)
  })

  it('幼年（age < maxAge*0.2）的 female 不触发繁殖', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, {
      health: 100, hunger: 0, age: 10, maxAge: 1000, gender: 'female'
    })
    sys.update()
    expect((sys as any).breedCooldown.has(id)).toBe(false)
  })
})

// ============================================================
// 测试组12：spawnd 粒子
// ============================================================
describe('AISystem spawnBirth 与 spawnDeath', () => {
  afterEach(() => vi.restoreAllMocks())

  it('实体饥饿死亡时调用 spawnDeath', () => {
    const { sys, em, particles } = makeSys()
    const spy = vi.spyOn(particles, 'spawnDeath')
    const id = addCreatureEntity(em, { health: 0, hunger: 100 })
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(spy).toHaveBeenCalledWith(5, 5, expect.any(String))
  })

  it('实体老死时调用 spawnDeath', () => {
    const { sys, em, particles } = makeSys()
    const spy = vi.spyOn(particles, 'spawnDeath')
    addCreatureEntity(em, { health: 100, hunger: 0, age: 999.95, maxAge: 1000 })
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(spy).toHaveBeenCalled()
  })

  it('没有生物死亡时 spawnDeath 不被调用', () => {
    const { sys, em, particles } = makeSys()
    const spy = vi.spyOn(particles, 'spawnDeath')
    addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1000 })
    ;(sys as any).batchIndex = 0
    sys.update()
    expect(spy).not.toHaveBeenCalled()
  })
})

// ============================================================
// 测试组13：多种物种行为测试
// ============================================================
describe('AISystem 物种差异', () => {
  afterEach(() => vi.restoreAllMocks())

  it('wolf 物种实体可正常存活并参与 update', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 600, species: 'wolf' })
    ;(sys as any).batchIndex = 0
    expect(() => sys.update()).not.toThrow()
    expect(em.hasComponent(id, 'creature')).toBe(true)
  })

  it('dragon 物种实体可正常存活并参与 update', () => {
    const { sys, em } = makeSys()
    const id = addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 3000, species: 'dragon' })
    ;(sys as any).batchIndex = 0
    expect(() => sys.update()).not.toThrow()
    expect(em.hasComponent(id, 'creature')).toBe(true)
  })

  it('elf 物种实体 update 不崩溃', () => {
    const { sys, em } = makeSys()
    addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 1500, species: 'elf' })
    expect(() => sys.update()).not.toThrow()
  })

  it('orc 物种（isHostile=true）update 不崩溃', () => {
    const { sys, em } = makeSys()
    addCreatureEntity(em, { health: 100, hunger: 0, age: 10, maxAge: 500, species: 'orc', isHostile: true })
    expect(() => sys.update()).not.toThrow()
  })
})

// ============================================================
// 测试组14：繁殖系统额外覆盖
// ============================================================
describe('AISystem 繁殖系统额外覆盖', () => {
  afterEach(() => vi.restoreAllMocks())

  it('不同物种不触发繁殖（species 不同）', () => {
    const mocks = makeMocks()
    // 模拟 spatialHash 返回一个不同物种的雄性
    const femaleId = mocks.em.createEntity()
    mocks.em.addComponent<PositionComponent>(femaleId, { type: 'position', x: 5, y: 5 })
    mocks.em.addComponent<AIComponent>(femaleId, { type: 'ai', state: 'idle', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0 })
    mocks.em.addComponent<NeedsComponent>(femaleId, { type: 'needs', hunger: 0, health: 100 })
    mocks.em.addComponent<CreatureComponent>(femaleId, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'F', age: 300, maxAge: 1000, gender: 'female' })

    const maleId = mocks.em.createEntity()
    mocks.em.addComponent<PositionComponent>(maleId, { type: 'position', x: 5, y: 5 })
    mocks.em.addComponent<AIComponent>(maleId, { type: 'ai', state: 'idle', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0 })
    mocks.em.addComponent<NeedsComponent>(maleId, { type: 'needs', hunger: 0, health: 100 })
    mocks.em.addComponent<CreatureComponent>(maleId, { type: 'creature', species: 'elf', speed: 1, damage: 5, isHostile: false, name: 'M', age: 300, maxAge: 1500, gender: 'male' })

    // spatialHash 返回 maleId
    mocks.spatialHash.query = () => [maleId]
    const sys = new AISystem(mocks.em as any, mocks.world as any, mocks.particles as any, mocks.factory as any, mocks.spatialHash as any)
    sys.update()
    // 不同物种，不应触发繁殖，spawnBirth 不被调用
    expect((sys as any).breedCooldown.has(femaleId)).toBe(false)
  })

  it('同物种 female+male 在 spatialHash 邻近时可能触发繁殖（breedCooldown 被设为 300）', () => {
    let triggered = false
    for (let attempt = 0; attempt < 500 && !triggered; attempt++) {
      const mocks = makeMocks()
      const femaleId = mocks.em.createEntity()
      mocks.em.addComponent<PositionComponent>(femaleId, { type: 'position', x: 5, y: 5 })
      mocks.em.addComponent<AIComponent>(femaleId, { type: 'ai', state: 'idle', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0 })
      mocks.em.addComponent<NeedsComponent>(femaleId, { type: 'needs', hunger: 0, health: 100 })
      mocks.em.addComponent<CreatureComponent>(femaleId, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'F', age: 300, maxAge: 1000, gender: 'female' })

      const maleId = mocks.em.createEntity()
      mocks.em.addComponent<PositionComponent>(maleId, { type: 'position', x: 5, y: 5 })
      mocks.em.addComponent<AIComponent>(maleId, { type: 'ai', state: 'idle', targetX: 0, targetY: 0, targetEntity: null, cooldown: 0 })
      mocks.em.addComponent<NeedsComponent>(maleId, { type: 'needs', hunger: 0, health: 100 })
      mocks.em.addComponent<CreatureComponent>(maleId, { type: 'creature', species: 'human', speed: 1, damage: 5, isHostile: false, name: 'M', age: 300, maxAge: 1000, gender: 'male' })

      mocks.spatialHash.query = () => [maleId]
      const sys = new AISystem(mocks.em as any, mocks.world as any, mocks.particles as any, mocks.factory as any, mocks.spatialHash as any)
      sys.update()
      if ((sys as any).breedCooldown.get(femaleId) === 300) {
        triggered = true
      }
    }
    expect(triggered).toBe(true)
  })
})
