import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CombatSystem } from '../systems/CombatSystem'
import { EntityManager } from '../ecs/Entity'

// ── 通用 mock 工厂 ─────────────────────────────────────────────────────────────
function makeMocks(nearbyOverride: number[] = []) {
  const em = new EntityManager()
  const spatialHash = { query: vi.fn(() => nearbyOverride) }
  const particles = { spawnDeath: vi.fn(), spawn: vi.fn(), spawnBirth: vi.fn() }
  const audio = { playCombat: vi.fn(), playDeath: vi.fn(), isMuted: false }
  const civManager = {
    civilizations: new Map<number, any>(),
    getCultureBonus: vi.fn(() => 1),
  }
  return { em, spatialHash, particles, audio, civManager }
}

function makeSys(nearbyOverride: number[] = []) {
  const mocks = makeMocks(nearbyOverride)
  const sys = new CombatSystem(
    mocks.em as any,
    mocks.civManager as any,
    mocks.particles as any,
    mocks.audio as any,
    mocks.spatialHash as any,
  )
  return { sys, ...mocks }
}

function addCreature(em: EntityManager, opts: {
  x?: number; y?: number; health?: number; damage?: number
  species?: string; isHostile?: boolean; role?: string; civId?: number
} = {}) {
  const id = em.createEntity()
  em.addComponent(id, { type: 'position', x: opts.x ?? 5, y: opts.y ?? 5 })
  em.addComponent(id, {
    type: 'creature',
    species: opts.species ?? 'human',
    speed: 1,
    damage: opts.damage ?? 5,
    isHostile: opts.isHostile ?? false,
    name: `Creature_${id}`,
    age: 0,
    maxAge: 100,
    gender: 'male',
  })
  em.addComponent(id, { type: 'needs', hunger: 0, health: opts.health ?? 100 })
  if (opts.civId !== undefined) {
    em.addComponent(id, { type: 'civMember', civId: opts.civId, role: opts.role ?? 'citizen' })
  }
  return id
}

// ── describe 块 ────────────────────────────────────────────────────────────────

describe('CombatSystem — 构造与基础行为', () => {
  afterEach(() => vi.restoreAllMocks())

  it('模块可以导入', async () => {
    const mod = await import('../systems/CombatSystem')
    expect(mod.CombatSystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    const { sys } = makeSys()
    expect(sys).toBeInstanceOf(CombatSystem)
  })

  it('update() 空实体管理器不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update(0)).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const { sys } = makeSys()
    for (let i = 0; i < 20; i++) expect(() => sys.update(i)).not.toThrow()
  })

  it('setArtifactSystem() 接受 null 后传入有效对象不崩溃', () => {
    const { sys } = makeSys()
    const mockArtifact = { dropAllArtifacts: vi.fn() }
    expect(() => sys.setArtifactSystem(mockArtifact as any)).not.toThrow()
  })

  it('有实体但缺少组件时 update() 不崩溃', () => {
    const { sys, em } = makeSys()
    em.createEntity()
    em.createEntity()
    expect(() => sys.update(0)).not.toThrow()
  })

  it('有完整组件的实体时 update() 不崩溃', () => {
    const { sys, em } = makeSys()
    addCreature(em, { x: 5, y: 5 })
    expect(() => sys.update(0)).not.toThrow()
  })

  it('tick 参数正确传入不报错', () => {
    const { sys } = makeSys()
    expect(() => sys.update(9999)).not.toThrow()
  })

  it('连续调用 update 100 次不累积内存泄漏 (不抛出)', () => {
    const { sys, em } = makeSys()
    addCreature(em)
    for (let i = 0; i < 100; i++) sys.update(i)
    expect(true).toBe(true)
  })
})

describe('CombatSystem — isHostile 逻辑（通过私有访问）', () => {
  afterEach(() => vi.restoreAllMocks())

  function makeCreature(species: string, isHostile: boolean) {
    return { type: 'creature', species, isHostile, name: 'X', speed: 1, damage: 5, age: 0, maxAge: 100, gender: 'male' }
  }

  it('hostile vs 非hostile 同种 → 战斗', () => {
    const { sys } = makeSys()
    const a = makeCreature('orc', true)
    const b = makeCreature('orc', false)
    expect((sys as any).isHostile(a, undefined, b, undefined)).toBe(true)
  })

  it('非hostile vs 非hostile 不战斗', () => {
    const { sys } = makeSys()
    const a = makeCreature('human', false)
    const b = makeCreature('human', false)
    expect((sys as any).isHostile(a, undefined, b, undefined)).toBe(false)
  })

  it('wolf vs sheep → 战斗', () => {
    const { sys } = makeSys()
    const a = makeCreature('wolf', false)
    const b = makeCreature('sheep', false)
    expect((sys as any).isHostile(a, undefined, b, undefined)).toBe(true)
  })

  it('sheep vs wolf → 不战斗', () => {
    const { sys } = makeSys()
    const a = makeCreature('sheep', false)
    const b = makeCreature('wolf', false)
    expect((sys as any).isHostile(a, undefined, b, undefined)).toBe(false)
  })

  it('两个 hostile 同种 → 不战斗', () => {
    const { sys } = makeSys()
    const a = makeCreature('orc', true)
    const b = makeCreature('orc', true)
    expect((sys as any).isHostile(a, undefined, b, undefined)).toBe(false)
  })

  it('两个 hostile 不同种 → 战斗', () => {
    const { sys } = makeSys()
    const a = makeCreature('orc', true)
    const b = makeCreature('dragon', true)
    expect((sys as any).isHostile(a, undefined, b, undefined)).toBe(true)
  })

  it('同文明成员 → 不战斗 (relation = 0)', () => {
    const { sys, civManager } = makeSys()
    const civ = { relations: new Map([[2, 0]]) }
    civManager.civilizations.set(1, civ)
    civManager.civilizations.set(2, civ)
    const a = makeCreature('human', false)
    const b = makeCreature('human', false)
    const aCiv = { civId: 1 }
    const bCiv = { civId: 1 }
    expect((sys as any).isHostile(a, aCiv, b, bCiv)).toBe(false)
  })

  it('不同文明 relation=-50 → 战斗', () => {
    const { sys, civManager } = makeSys()
    const civA = { relations: new Map([[2, -50]]) }
    const civB = { relations: new Map([[1, 0]]) }
    civManager.civilizations.set(1, civA)
    civManager.civilizations.set(2, civB)
    const a = makeCreature('human', false)
    const b = makeCreature('human', false)
    expect((sys as any).isHostile(a, { civId: 1 }, b, { civId: 2 })).toBe(true)
  })

  it('不同文明 relation=-10 → 不战斗', () => {
    const { sys, civManager } = makeSys()
    const civA = { relations: new Map([[2, -10]]) }
    const civB = { relations: new Map([[1, 0]]) }
    civManager.civilizations.set(1, civA)
    civManager.civilizations.set(2, civB)
    const a = makeCreature('human', false)
    const b = makeCreature('human', false)
    expect((sys as any).isHostile(a, { civId: 1 }, b, { civId: 2 })).toBe(false)
  })

  it('一方无 civMember 另一方有 → 不因文明关系战斗', () => {
    const { sys } = makeSys()
    const a = makeCreature('human', false)
    const b = makeCreature('human', false)
    expect((sys as any).isHostile(a, { civId: 1 }, b, undefined)).toBe(false)
  })
})

describe('CombatSystem — 战斗伤害与清理', () => {
  afterEach(() => vi.restoreAllMocks())

  it('health<=0 的实体在 update 后被移除', () => {
    const { sys, em } = makeSys()
    const id = addCreature(em, { health: 0 })
    sys.update(0)
    expect(em.hasComponent(id, 'creature')).toBe(false)
  })

  it('health=1 实体未被攻击时继续存在', () => {
    const { sys, em } = makeSys()
    const id = addCreature(em, { health: 1 })
    // spatialHash 返回空数组 → 无攻击
    sys.update(0)
    // health=1 > 0，不被清理
    expect(em.hasComponent(id, 'creature')).toBe(true)
  })

  it('死亡时 particles.spawnDeath 被调用', () => {
    const { sys, em, particles } = makeSys()
    addCreature(em, { health: 0 })
    sys.update(0)
    expect(particles.spawnDeath).toHaveBeenCalled()
  })

  it('死亡时 artifactSystem.dropAllArtifacts 被调用', () => {
    const { sys, em } = makeSys()
    const dropSpy = vi.fn()
    sys.setArtifactSystem({ dropAllArtifacts: dropSpy } as any)
    addCreature(em, { health: 0 })
    sys.update(0)
    expect(dropSpy).toHaveBeenCalled()
  })

  it('无 render 组件的实体死亡后默认颜色调用 spawnDeath', () => {
    const { sys, em, particles } = makeSys()
    addCreature(em, { health: 0 })
    sys.update(0)
    expect(particles.spawnDeath).toHaveBeenCalledWith(5, 5, '#880000')
  })

  it('有 render 组件的实体死亡使用 render.color', () => {
    const { sys, em, particles } = makeSys()
    const id = addCreature(em, { health: 0 })
    em.addComponent(id, { type: 'render', color: '#ff00ff', size: 1 })
    sys.update(0)
    expect(particles.spawnDeath).toHaveBeenCalledWith(5, 5, '#ff00ff')
  })

  it('多个 health<=0 实体全部被清理', () => {
    const { sys, em } = makeSys()
    const id1 = addCreature(em, { health: 0 })
    const id2 = addCreature(em, { health: 0 })
    sys.update(0)
    expect(em.hasComponent(id1, 'creature')).toBe(false)
    expect(em.hasComponent(id2, 'creature')).toBe(false)
  })
})

describe('CombatSystem — Siege（tick%20===0）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('tick=20 时执行 siege 逻辑不崩溃', () => {
    const { sys, em } = makeSys()
    addCreature(em, { civId: 1, role: 'soldier' })
    expect(() => sys.update(20)).not.toThrow()
  })

  it('tick=40 时再次执行 siege 逻辑不崩溃', () => {
    const { sys, em } = makeSys()
    addCreature(em, { civId: 1, role: 'soldier' })
    expect(() => sys.update(40)).not.toThrow()
  })

  it('tick=0 时执行 siege+tower 不崩溃', () => {
    const { sys, em } = makeSys()
    addCreature(em, { civId: 1, role: 'soldier' })
    expect(() => sys.update(0)).not.toThrow()
  })

  it('soldier 没有对应 civ 时不崩溃', () => {
    const { sys, em } = makeSys()
    // civManager.civilizations 无对应 civId=99
    addCreature(em, { civId: 99, role: 'soldier' })
    expect(() => sys.update(20)).not.toThrow()
  })

  it('tower defense tick=30 不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update(30)).not.toThrow()
  })
})

describe('CombatSystem — batchIndex 批处理', () => {
  afterEach(() => vi.restoreAllMocks())

  it('batchIndex 初始为 0', () => {
    const { sys } = makeSys()
    expect((sys as any).batchIndex).toBe(0)
  })

  it('每次 update 后 batchIndex 递增', () => {
    const { sys } = makeSys()
    sys.update(0)
    expect((sys as any).batchIndex).toBe(1)
    sys.update(1)
    expect((sys as any).batchIndex).toBe(2)
  })

  it('batchIndex 在 10 次 update 后 = 10', () => {
    const { sys } = makeSys()
    for (let i = 0; i < 10; i++) sys.update(i)
    expect((sys as any).batchIndex).toBe(10)
  })
})

describe('CombatSystem — onKill Hero XP 系统', () => {
  afterEach(() => vi.restoreAllMocks())

  it('击杀者有 hero 组件时 kills 增加', () => {
    const { sys, em } = makeSys()
    const killerId = addCreature(em, { x: 5, y: 5 })
    const victimId = addCreature(em, { x: 5, y: 5 })
    em.addComponent(killerId, {
      type: 'hero', ability: 'warrior', level: 1, xp: 0,
      xpToNext: 100, kills: 0, title: 'Rookie',
    })
    ;(sys as any).onKill(killerId, victimId)
    const hero = em.getComponent<any>(killerId, 'hero')
    expect(hero.kills).toBe(1)
  })

  it('击杀普通生物获得 10 XP', () => {
    const { sys, em } = makeSys()
    const killerId = addCreature(em)
    const victimId = addCreature(em)
    em.addComponent(killerId, {
      type: 'hero', ability: 'warrior', level: 1, xp: 0,
      xpToNext: 100, kills: 0, title: 'Rookie',
    })
    ;(sys as any).onKill(killerId, victimId)
    const hero = em.getComponent<any>(killerId, 'hero')
    expect(hero.xp).toBe(10)
  })

  it('击杀 dragon 获得 50 XP', () => {
    const { sys, em } = makeSys()
    const killerId = addCreature(em)
    const victimId = addCreature(em, { species: 'dragon' })
    em.addComponent(killerId, {
      type: 'hero', ability: 'warrior', level: 1, xp: 0,
      xpToNext: 100, kills: 0, title: 'Rookie',
    })
    ;(sys as any).onKill(killerId, victimId)
    const hero = em.getComponent<any>(killerId, 'hero')
    expect(hero.xp).toBe(50)
  })

  it('击杀拥有 hero 的目标获得 25 XP', () => {
    const { sys, em } = makeSys()
    const killerId = addCreature(em)
    const victimId = addCreature(em)
    em.addComponent(killerId, {
      type: 'hero', ability: 'warrior', level: 1, xp: 0,
      xpToNext: 100, kills: 0, title: 'Rookie',
    })
    em.addComponent(victimId, {
      type: 'hero', ability: 'ranger', level: 2, xp: 0,
      xpToNext: 150, kills: 0, title: 'Veteran',
    })
    ;(sys as any).onKill(killerId, victimId)
    const hero = em.getComponent<any>(killerId, 'hero')
    expect(hero.xp).toBe(25)
  })

  it('XP 足够时触发升级，level 增加', () => {
    const { sys, em, particles } = makeSys()
    const killerId = addCreature(em, { x: 0, y: 0 })
    const victimId = addCreature(em)
    em.addComponent(killerId, {
      type: 'hero', ability: 'warrior', level: 1, xp: 95,
      xpToNext: 100, kills: 0, title: 'Rookie',
    })
    ;(sys as any).onKill(killerId, victimId)
    const hero = em.getComponent<any>(killerId, 'hero')
    expect(hero.level).toBe(2)
    expect(particles.spawn).toHaveBeenCalled()
  })

  it('升级后 health 恢复到 100', () => {
    const { sys, em } = makeSys()
    const killerId = addCreature(em, { health: 30 })
    const victimId = addCreature(em)
    em.addComponent(killerId, {
      type: 'hero', ability: 'warrior', level: 1, xp: 95,
      xpToNext: 100, kills: 0, title: 'Rookie',
    })
    ;(sys as any).onKill(killerId, victimId)
    const needs = em.getComponent<any>(killerId, 'needs')
    expect(needs.health).toBe(100)
  })

  it('升级后 damage 增加 3', () => {
    const { sys, em } = makeSys()
    const killerId = addCreature(em, { damage: 10 })
    const victimId = addCreature(em)
    em.addComponent(killerId, {
      type: 'hero', ability: 'warrior', level: 1, xp: 95,
      xpToNext: 100, kills: 0, title: 'Rookie',
    })
    ;(sys as any).onKill(killerId, victimId)
    const creature = em.getComponent<any>(killerId, 'creature')
    expect(creature.damage).toBe(13)
  })

  it('击杀者无 hero 组件时 onKill 不崩溃', () => {
    const { sys, em } = makeSys()
    const killerId = addCreature(em)
    const victimId = addCreature(em)
    expect(() => (sys as any).onKill(killerId, victimId)).not.toThrow()
  })

  it('hostile 击杀者获得饱食度恢复', () => {
    const { sys, em } = makeSys()
    const killerId = addCreature(em, { isHostile: true })
    const victimId = addCreature(em)
    const needs = em.getComponent<any>(killerId, 'needs')
    needs.hunger = 50
    needs.health = 70
    ;(sys as any).onKill(killerId, victimId)
    expect(needs.hunger).toBe(20) // 50-30
    expect(needs.health).toBe(80) // 70+10
  })

  it('onKill 更新被杀文明人口', () => {
    const { sys, em, civManager } = makeSys()
    const killerId = addCreature(em, { civId: 1 })
    const victimId = addCreature(em, { civId: 2 })
    const civ2 = { population: 10, relations: new Map<number, number>(), buildings: [] }
    civManager.civilizations.set(2, civ2)
    ;(sys as any).onKill(killerId, victimId)
    expect(civ2.population).toBe(9)
  })

  it('onKill 恶化关系 (victim civ 对 killer civ)', () => {
    const { sys, em, civManager } = makeSys()
    const killerId = addCreature(em, { civId: 1 })
    const victimId = addCreature(em, { civId: 2 })
    const civ1 = { population: 5, relations: new Map<number, number>([[2, 0]]), buildings: [] }
    const civ2 = { population: 10, relations: new Map<number, number>([[1, 0]]), buildings: [] }
    civManager.civilizations.set(1, civ1)
    civManager.civilizations.set(2, civ2)
    ;(sys as any).onKill(killerId, victimId)
    expect(civ2.relations.get(1)).toBe(-20)
  })
})

describe('CombatSystem — setArtifactSystem', () => {
  afterEach(() => vi.restoreAllMocks())

  it('不设置 artifactSystem 时 update 不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update(0)).not.toThrow()
  })

  it('设置 artifactSystem 后死亡触发 dropAllArtifacts', () => {
    const { sys, em } = makeSys()
    const drop = vi.fn()
    sys.setArtifactSystem({ dropAllArtifacts: drop } as any)
    addCreature(em, { health: 0 })
    sys.update(0)
    expect(drop).toHaveBeenCalled()
  })

  it('setArtifactSystem 多次调用以最后一次为准', () => {
    const { sys, em } = makeSys()
    const drop1 = vi.fn()
    const drop2 = vi.fn()
    sys.setArtifactSystem({ dropAllArtifacts: drop1 } as any)
    sys.setArtifactSystem({ dropAllArtifacts: drop2 } as any)
    addCreature(em, { health: 0 })
    sys.update(0)
    expect(drop2).toHaveBeenCalled()
    expect(drop1).not.toHaveBeenCalled()
  })
})

describe('CombatSystem — audio 回调', () => {
  afterEach(() => vi.restoreAllMocks())

  it('有战斗时 playCombat 不被调用（近邻为空）', () => {
    const { sys, em, audio } = makeSys([])
    addCreature(em)
    sys.update(0)
    expect(audio.playCombat).not.toHaveBeenCalled()
  })
})
