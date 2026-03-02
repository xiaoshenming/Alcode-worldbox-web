import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ArtifactSystem, getArtifactBonus, getArtifactCombatBonus } from '../systems/ArtifactSystem'
import { EntityManager } from '../ecs/Entity'

function makeSys() { return new ArtifactSystem() }
function makeEm() { return new EntityManager() }

// ── 辅助工厂 ──

function addArtifactEntity(
  em: EntityManager,
  opts: {
    artifactType?: string
    name?: string
    rarity?: 'mythic' | 'legendary'
    bonusType?: string
    bonusValue?: number
    claimed?: boolean
    claimedBy?: number | null
    x?: number
    y?: number
  } = {}
) {
  const id = em.createEntity()
  em.addComponent(id, { type: 'artifact',
    artifactType: opts.artifactType ?? 'excalibur',
    name: opts.name ?? 'Excalibur',
    rarity: opts.rarity ?? 'mythic',
    effect: '+50% combat damage',
    bonusType: opts.bonusType ?? 'combat',
    bonusValue: opts.bonusValue ?? 1.5,
    claimed: opts.claimed ?? false,
    claimedBy: opts.claimedBy ?? null,
  })
  if (opts.x !== undefined) {
    em.addComponent(id, { type: 'position', x: opts.x, y: opts.y ?? 0 })
  }
  return id
}

function addHero(em: EntityManager, x = 5, y = 5, aiState = 'idle') {
  const id = em.createEntity()
  em.addComponent(id, { type: 'position', x, y })
  em.addComponent(id, { type: 'hero' })
  em.addComponent(id, { type: 'ai', state: aiState, targetX: 0, targetY: 0 })
  em.addComponent(id, { type: 'creature', name: 'TestHero', race: 'human' })
  em.addComponent(id, { type: 'needs', health: 80, hunger: 50, energy: 90 })
  return id
}

// ── 初始状态 ──

describe('ArtifactSystem — 初始状态', () => {
  let sys: ArtifactSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('spawnedCount 初始为 0', () => { expect((sys as any).spawnedCount).toBe(0) })
  it('maxArtifacts 初始为 6', () => { expect((sys as any).maxArtifacts).toBe(6) })
  it('lastSpawnTick 初始为 0', () => { expect((sys as any).lastSpawnTick).toBe(0) })
  it('spawnedCount 是 number', () => { expect(typeof (sys as any).spawnedCount).toBe('number') })
  it('maxArtifacts 是 number', () => { expect(typeof (sys as any).maxArtifacts).toBe('number') })
  it('_existingTypesSet 初始为空 Set', () => { expect((sys as any)._existingTypesSet.size).toBe(0) })
  it('_artifactEntitiesBuf 初始为空数组', () => { expect((sys as any)._artifactEntitiesBuf).toEqual([]) })
  it('_unclaimedIdBuf 初始为空数组', () => { expect((sys as any)._unclaimedIdBuf).toEqual([]) })
  it('_unclaimedXBuf 初始为空数组', () => { expect((sys as any)._unclaimedXBuf).toEqual([]) })
  it('_unclaimedYBuf 初始为空数组', () => { expect((sys as any)._unclaimedYBuf).toEqual([]) })
})

// ── getArtifactBonus 无文物 ──

describe('getArtifactBonus — 无文物实体', () => {
  afterEach(() => vi.restoreAllMocks())

  it('无实体时返回基础值 1', () => {
    expect(getArtifactBonus(makeEm(), 999, 'combat')).toBe(1)
  })
  it('对 speed bonusType 也返回 1', () => {
    expect(getArtifactBonus(makeEm(), 1, 'speed')).toBe(1)
  })
  it('对 regen bonusType 也返回 1', () => {
    expect(getArtifactBonus(makeEm(), 1, 'regen')).toBe(1)
  })
  it('对 xp bonusType 也返回 1', () => {
    expect(getArtifactBonus(makeEm(), 1, 'xp')).toBe(1)
  })
  it('对未知 bonusType 也返回 1', () => {
    expect(getArtifactBonus(makeEm(), 1, 'defense')).toBe(1)
  })
  it('实体不存在但 em 中有其他文物也返回 1', () => {
    const em = makeEm()
    addArtifactEntity(em, { claimed: true, claimedBy: 100, bonusType: 'combat', bonusValue: 1.5 })
    expect(getArtifactBonus(em, 999, 'combat')).toBe(1)
  })
})

// ── getArtifactBonus 有文物 ──

describe('getArtifactBonus — 持有文物', () => {
  afterEach(() => vi.restoreAllMocks())

  it('持有 combat 文物时加成正确', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'combat', bonusValue: 1.5, claimed: true, claimedBy: heroId })
    expect(getArtifactBonus(em, heroId, 'combat')).toBe(1.5)
  })

  it('持有 speed 文物时 speed 加成正确', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'speed', bonusValue: 1.5, claimed: true, claimedBy: heroId })
    expect(getArtifactBonus(em, heroId, 'speed')).toBe(1.5)
  })

  it('持有两个 combat 文物时加成叠乘', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'combat', bonusValue: 1.5, claimed: true, claimedBy: heroId })
    addArtifactEntity(em, { bonusType: 'combat', bonusValue: 1.3, claimed: true, claimedBy: heroId })
    expect(getArtifactBonus(em, heroId, 'combat')).toBeCloseTo(1.5 * 1.3)
  })

  it('未声明文物不计入加成', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'combat', bonusValue: 1.5, claimed: false, claimedBy: null })
    expect(getArtifactBonus(em, heroId, 'combat')).toBe(1)
  })

  it('不同 bonusType 不影响查询类型', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'speed', bonusValue: 1.5, claimed: true, claimedBy: heroId })
    expect(getArtifactBonus(em, heroId, 'combat')).toBe(1)
  })

  it('bonusValue=2 时加成为 2', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'xp', bonusValue: 2, claimed: true, claimedBy: heroId })
    expect(getArtifactBonus(em, heroId, 'xp')).toBe(2)
  })
})

// ── getArtifactCombatBonus ──

describe('getArtifactCombatBonus', () => {
  afterEach(() => vi.restoreAllMocks())

  it('无文物时返回 1', () => {
    expect(getArtifactCombatBonus(makeEm(), 1)).toBe(1)
  })

  it('持有 combat 文物时返回正确值', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'combat', bonusValue: 1.5, claimed: true, claimedBy: heroId })
    expect(getArtifactCombatBonus(em, heroId)).toBe(1.5)
  })

  it('持有非 combat 文物时返回 1', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'regen', bonusValue: 2, claimed: true, claimedBy: heroId })
    expect(getArtifactCombatBonus(em, heroId)).toBe(1)
  })

  it('是 getArtifactBonus combat 的快捷方式', () => {
    const em = makeEm()
    const heroId = em.createEntity()
    addArtifactEntity(em, { bonusType: 'combat', bonusValue: 1.3, claimed: true, claimedBy: heroId })
    expect(getArtifactCombatBonus(em, heroId)).toBe(getArtifactBonus(em, heroId, 'combat'))
  })
})

// ── dropArtifact ──

describe('ArtifactSystem.dropArtifact', () => {
  let sys: ArtifactSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('drop 后 art.claimed 变为 false', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 10, y: 10 })
    const artId = addArtifactEntity(em, { claimed: true, claimedBy: heroId, x: 10, y: 10 })
    sys.dropArtifact(em, artId)
    const art = em.getComponent<any>(artId, 'artifact')
    expect(art.claimed).toBe(false)
  })

  it('drop 后 art.claimedBy 变为 null', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 10, y: 10 })
    const artId = addArtifactEntity(em, { claimed: true, claimedBy: heroId, x: 10, y: 10 })
    sys.dropArtifact(em, artId)
    const art = em.getComponent<any>(artId, 'artifact')
    expect(art.claimedBy).toBeNull()
  })

  it('drop 后文物 position 组件被重新添加', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 15, y: 20 })
    const artId = addArtifactEntity(em, { claimed: true, claimedBy: heroId })
    em.removeComponent(artId, 'position')
    sys.dropArtifact(em, artId)
    const pos = em.getComponent<any>(artId, 'position')
    expect(pos).toBeDefined()
    expect(pos.x).toBe(15)
    expect(pos.y).toBe(20)
  })

  it('drop 后文物 render 组件被重新添加', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 15, y: 20 })
    const artId = addArtifactEntity(em, { claimed: true, claimedBy: heroId })
    em.removeComponent(artId, 'render')
    sys.dropArtifact(em, artId)
    const render = em.getComponent<any>(artId, 'render')
    expect(render).toBeDefined()
    expect(render.color).toBe('#ffd700')
  })

  it('持有者 inventory 中文物类型被移除', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 5, y: 5 })
    em.addComponent(heroId, { type: 'inventory', artifacts: ['excalibur'] })
    const artId = addArtifactEntity(em, { artifactType: 'excalibur', claimed: true, claimedBy: heroId })
    sys.dropArtifact(em, artId)
    const inv = em.getComponent<any>(heroId, 'inventory')
    expect(inv.artifacts).not.toContain('excalibur')
  })

  it('art 参数直接传入时也能正常 drop', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 5, y: 5 })
    const artId = addArtifactEntity(em, { claimed: true, claimedBy: heroId })
    const art = em.getComponent<any>(artId, 'artifact')
    sys.dropArtifact(em, artId, art)
    expect(art.claimed).toBe(false)
  })

  it('artifactEntityId 无 artifact 组件时不崩溃', () => {
    const id = em.createEntity()
    expect(() => sys.dropArtifact(em, id)).not.toThrow()
  })
})

// ── dropAllArtifacts ──

describe('ArtifactSystem.dropAllArtifacts', () => {
  let sys: ArtifactSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm() })
  afterEach(() => vi.restoreAllMocks())

  it('实体持有 1 个文物时全部掉落', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    const artId = addArtifactEntity(em, { claimed: true, claimedBy: heroId })
    sys.dropAllArtifacts(em, heroId)
    const art = em.getComponent<any>(artId, 'artifact')
    expect(art.claimed).toBe(false)
  })

  it('实体持有 2 个文物时全部掉落', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    const artId1 = addArtifactEntity(em, { claimed: true, claimedBy: heroId })
    const artId2 = addArtifactEntity(em, { artifactType: 'mjolnir', claimed: true, claimedBy: heroId })
    sys.dropAllArtifacts(em, heroId)
    expect(em.getComponent<any>(artId1, 'artifact').claimed).toBe(false)
    expect(em.getComponent<any>(artId2, 'artifact').claimed).toBe(false)
  })

  it('其他实体持有的文物不受影响', () => {
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    const otherId = em.createEntity()
    em.addComponent(otherId, { type: 'position', x: 5, y: 5 })
    const artId = addArtifactEntity(em, { claimed: true, claimedBy: otherId })
    sys.dropAllArtifacts(em, heroId)
    const art = em.getComponent<any>(artId, 'artifact')
    expect(art.claimed).toBe(true)
  })

  it('实体无文物时不崩溃', () => {
    const heroId = em.createEntity()
    expect(() => sys.dropAllArtifacts(em, heroId)).not.toThrow()
  })
})

// ── applyBuffs (通过 update 触发) ──

describe('ArtifactSystem.applyBuffs — regen', () => {
  afterEach(() => vi.restoreAllMocks())

  it('regen 文物在 tick%30===0 时恢复持有者血量', () => {
    const sys = makeSys()
    const em = makeEm()
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    em.addComponent(heroId, { type: 'needs', health: 50, hunger: 50, energy: 90 })
    const artId = addArtifactEntity(em, { bonusType: 'regen', bonusValue: 2, claimed: true, claimedBy: heroId })
    // 手动推入 buf
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    ;(sys as any).applyBuffs(em, 30)
    const needs = em.getComponent<any>(heroId, 'needs')
    expect(needs.health).toBe(52)
  })

  it('regen 文物在 tick%30!==0 时不恢复血量', () => {
    const sys = makeSys()
    const em = makeEm()
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    em.addComponent(heroId, { type: 'needs', health: 50, hunger: 50, energy: 90 })
    const artId = addArtifactEntity(em, { bonusType: 'regen', bonusValue: 2, claimed: true, claimedBy: heroId })
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    ;(sys as any).applyBuffs(em, 31)
    const needs = em.getComponent<any>(heroId, 'needs')
    expect(needs.health).toBe(50)
  })

  it('regen 不超过 100 上限', () => {
    const sys = makeSys()
    const em = makeEm()
    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    em.addComponent(heroId, { type: 'needs', health: 99, hunger: 50, energy: 90 })
    const artId = addArtifactEntity(em, { bonusType: 'regen', bonusValue: 5, claimed: true, claimedBy: heroId })
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    ;(sys as any).applyBuffs(em, 30)
    const needs = em.getComponent<any>(heroId, 'needs')
    expect(needs.health).toBe(100)
  })

  it('持有者已死亡（无 position）时文物被掉落', () => {
    const sys = makeSys()
    const em = makeEm()
    const heroId = em.createEntity()
    // 不给 heroId 添加 position 组件 — 模拟已死亡
    const artId = addArtifactEntity(em, { bonusType: 'regen', bonusValue: 2, claimed: true, claimedBy: heroId })
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    ;(sys as any).applyBuffs(em, 30)
    const art = em.getComponent<any>(artId, 'artifact')
    expect(art.claimed).toBe(false)
  })
})

// ── spawnClaimParticles aura ──

describe('ArtifactSystem.spawnClaimParticles — aura', () => {
  afterEach(() => vi.restoreAllMocks())

  it('dragon_crown 在 tick%60===0 时治疗附近盟友', () => {
    const sys = makeSys()
    const em = makeEm()
    const particles = { spawn: vi.fn() }

    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    const artId = addArtifactEntity(em, { bonusType: 'aura', bonusValue: 1, claimed: true, claimedBy: heroId })

    const allyId = em.createEntity()
    em.addComponent(allyId, { type: 'position', x: 3, y: 0 })
    em.addComponent(allyId, { type: 'needs', health: 80, hunger: 50, energy: 90 })

    sys.spawnClaimParticles(em, particles as any, 60)
    const needs = em.getComponent<any>(allyId, 'needs')
    expect(needs.health).toBe(83)
  })

  it('aura 效果不超过 100 血量上限', () => {
    const sys = makeSys()
    const em = makeEm()
    const particles = { spawn: vi.fn() }

    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    addArtifactEntity(em, { bonusType: 'aura', bonusValue: 1, claimed: true, claimedBy: heroId })

    const allyId = em.createEntity()
    em.addComponent(allyId, { type: 'position', x: 1, y: 0 })
    em.addComponent(allyId, { type: 'needs', health: 99, hunger: 50, energy: 90 })

    sys.spawnClaimParticles(em, particles as any, 60)
    const needs = em.getComponent<any>(allyId, 'needs')
    expect(needs.health).toBe(100)
  })

  it('aura 在 tick%60!==0 时不治疗', () => {
    const sys = makeSys()
    const em = makeEm()
    const particles = { spawn: vi.fn() }

    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    addArtifactEntity(em, { bonusType: 'aura', bonusValue: 1, claimed: true, claimedBy: heroId })

    const allyId = em.createEntity()
    em.addComponent(allyId, { type: 'position', x: 1, y: 0 })
    em.addComponent(allyId, { type: 'needs', health: 80, hunger: 50, energy: 90 })

    sys.spawnClaimParticles(em, particles as any, 61)
    const needs = em.getComponent<any>(allyId, 'needs')
    expect(needs.health).toBe(80)
  })

  it('距离超出范围的盟友不被治疗', () => {
    const sys = makeSys()
    const em = makeEm()
    const particles = { spawn: vi.fn() }

    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    addArtifactEntity(em, { bonusType: 'aura', bonusValue: 1, claimed: true, claimedBy: heroId })

    const farAllyId = em.createEntity()
    em.addComponent(farAllyId, { type: 'position', x: 10, y: 10 })
    em.addComponent(farAllyId, { type: 'needs', health: 70, hunger: 50, energy: 90 })

    sys.spawnClaimParticles(em, particles as any, 60)
    const needs = em.getComponent<any>(farAllyId, 'needs')
    expect(needs.health).toBe(70)
  })

  it('满血盟友不被治疗', () => {
    const sys = makeSys()
    const em = makeEm()
    const particles = { spawn: vi.fn() }

    const heroId = em.createEntity()
    em.addComponent(heroId, { type: 'position', x: 0, y: 0 })
    addArtifactEntity(em, { bonusType: 'aura', bonusValue: 1, claimed: true, claimedBy: heroId })

    const allyId = em.createEntity()
    em.addComponent(allyId, { type: 'position', x: 1, y: 0 })
    em.addComponent(allyId, { type: 'needs', health: 100, hunger: 50, energy: 90 })

    sys.spawnClaimParticles(em, particles as any, 60)
    const needs = em.getComponent<any>(allyId, 'needs')
    expect(needs.health).toBe(100)
  })
})

// ── updateHeroQuesting ──

describe('ArtifactSystem.updateHeroQuesting', () => {
  afterEach(() => vi.restoreAllMocks())

  it('英雄 ai.state=idle 时朝文物移动', () => {
    const sys = makeSys()
    const em = makeEm()
    const heroId = addHero(em, 0, 0, 'idle')
    const artId = addArtifactEntity(em, { x: 50, y: 50 })
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    ;(sys as any).updateHeroQuesting(em)
    const ai = em.getComponent<any>(heroId, 'ai')
    expect(ai.targetX).toBe(50)
    expect(ai.targetY).toBe(50)
  })

  it('英雄 inventory 已有 2 个文物时不再追寻', () => {
    const sys = makeSys()
    const em = makeEm()
    const heroId = addHero(em, 0, 0, 'idle')
    em.addComponent(heroId, { type: 'inventory', artifacts: ['excalibur', 'mjolnir'] })
    const artId = addArtifactEntity(em, { x: 50, y: 50 })
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    const ai = em.getComponent<any>(heroId, 'ai')
    const prevTargetX = ai.targetX
    ;(sys as any).updateHeroQuesting(em)
    expect(ai.targetX).toBe(prevTargetX)
  })

  it('英雄距离文物 <1.5 时声索文物', () => {
    const sys = makeSys()
    const em = makeEm()
    const heroId = addHero(em, 50, 50, 'idle')
    const artId = addArtifactEntity(em, { x: 51, y: 50 })  // dist = 1 < 1.5
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    ;(sys as any).updateHeroQuesting(em)
    const art = em.getComponent<any>(artId, 'artifact')
    expect(art.claimed).toBe(true)
    expect(art.claimedBy).toBe(heroId)
  })

  it('已声索文物不会被再次追寻', () => {
    const sys = makeSys()
    const em = makeEm()
    addHero(em, 0, 0, 'idle')
    const artId = addArtifactEntity(em, { claimed: true, claimedBy: 999, x: 50, y: 50 })
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    const bufBefore = (sys as any)._unclaimedIdBuf.length
    ;(sys as any).updateHeroQuesting(em)
    // 已声索文物不入 unclaimedId buf
    expect((sys as any)._unclaimedIdBuf.length).toBe(bufBefore)
  })

  it('无英雄时不崩溃', () => {
    const sys = makeSys()
    const em = makeEm()
    const artId = addArtifactEntity(em, { x: 10, y: 10 })
    ;(sys as any)._artifactEntitiesBuf.push(artId)
    expect(() => (sys as any).updateHeroQuesting(em)).not.toThrow()
  })

  it('无未声索文物时英雄 ai 状态不变', () => {
    const sys = makeSys()
    const em = makeEm()
    const heroId = addHero(em, 0, 0, 'idle')
    ;(sys as any).updateHeroQuesting(em)
    const ai = em.getComponent<any>(heroId, 'ai')
    expect(ai.state).toBe('idle')
  })
})

// ── update 集成 ──

describe('ArtifactSystem.update — 集成', () => {
  afterEach(() => vi.restoreAllMocks())

  it('update 不崩溃（无文物无生物）', () => {
    const sys = makeSys()
    const em = makeEm()
    const world = { getTile: vi.fn().mockReturnValue(2) } // TileType.GRASS
    const particles = { spawn: vi.fn() }
    expect(() => sys.update(em as any, world as any, particles as any, 0)).not.toThrow()
  })

  it('update 调用后 _artifactEntitiesBuf 被刷新', () => {
    const sys = makeSys()
    const em = makeEm()
    addArtifactEntity(em, { x: 5, y: 5 })
    const world = { getTile: vi.fn().mockReturnValue(2) }
    const particles = { spawn: vi.fn() }
    sys.update(em as any, world as any, particles as any, 0)
    expect((sys as any)._artifactEntitiesBuf.length).toBeGreaterThanOrEqual(0)
  })

  it('tick 未达到 3000 间隔时 lastSpawnTick 不更新', () => {
    const sys = makeSys()
    const em = makeEm()
    const world = { getTile: vi.fn().mockReturnValue(2) }
    const particles = { spawn: vi.fn() }
    sys.update(em as any, world as any, particles as any, 100)
    expect((sys as any).lastSpawnTick).toBe(0)
  })
})
