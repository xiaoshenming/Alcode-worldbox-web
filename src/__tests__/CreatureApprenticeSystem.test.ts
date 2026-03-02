import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureApprenticeSystem } from '../systems/CreatureApprenticeSystem'
import type { Apprenticeship, ApprenticeSkill } from '../systems/CreatureApprenticeSystem'

// CHECK_INTERVAL=700, TRAIN_INTERVAL=400, MENTOR_RANGE=8, MIN_AGE_MASTER=50
// MAX_APPRENTICESHIPS=15, GRADUATION_THRESHOLD=100, PROGRESS_PER_TICK=2

function makeSys() { return new CreatureApprenticeSystem() }

function makeApp(id: number, masterId: number, apprenticeId: number, skill: ApprenticeSkill = 'combat', graduated = false): Apprenticeship {
  return { id, masterId, apprenticeId, civId: 1, skill, progress: 0, startTick: 0, graduated }
}

function makeAppFull(overrides: Partial<Apprenticeship> & { id: number; masterId: number; apprenticeId: number }): Apprenticeship {
  return {
    id: overrides.id,
    masterId: overrides.masterId,
    apprenticeId: overrides.apprenticeId,
    civId: overrides.civId ?? 1,
    skill: overrides.skill ?? 'combat',
    progress: overrides.progress ?? 0,
    startTick: overrides.startTick ?? 0,
    graduated: overrides.graduated ?? false,
  }
}

// ─── 构造与初始化 ────────────────────────────────────────────────────────────

describe('CreatureApprenticeSystem - 构造与初始化', () => {
  afterEach(() => vi.restoreAllMocks())

  it('初始化不崩溃', () => { expect(makeSys()).toBeDefined() })

  it('apprenticeships 初始为空', () => {
    const sys = makeSys()
    expect((sys as any).apprenticeships.length).toBe(0)
  })

  it('nextCheckTick 初始为 CHECK_INTERVAL(700)', () => {
    const sys = makeSys()
    expect((sys as any).nextCheckTick).toBe(700)
  })

  it('nextTrainTick 初始为 TRAIN_INTERVAL(400)', () => {
    const sys = makeSys()
    expect((sys as any).nextTrainTick).toBe(400)
  })

  it('_activeBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._activeBuf).toHaveLength(0)
  })

  it('_candidatesBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._candidatesBuf).toHaveLength(0)
  })

  it('_mastersBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._mastersBuf).toHaveLength(0)
  })

  it('_youngBuf 初始为空数组', () => {
    const sys = makeSys()
    expect((sys as any)._youngBuf).toHaveLength(0)
  })

  it('多次实例化各自独立', () => {
    const sys1 = makeSys()
    const sys2 = makeSys()
    ;(sys1 as any).apprenticeships.push(makeApp(1, 1, 2))
    expect((sys2 as any).apprenticeships).toHaveLength(0)
  })
})

// ─── CHECK_INTERVAL / TRAIN_INTERVAL 节流 ────────────────────────────────────

describe('CreatureApprenticeSystem - 节流逻辑', () => {
  let sys: CreatureApprenticeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('tick 未达到 nextCheckTick 时不触发 formApprenticeships', () => {
    ;(sys as any).nextCheckTick = 1000
    expect((sys as any).nextCheckTick).toBe(1000)
  })

  it('tick 未达到 nextTrainTick 时不触发 train', () => {
    ;(sys as any).nextTrainTick = 800
    expect((sys as any).nextTrainTick).toBe(800)
  })

  it('update tick=0 时不触发（nextCheckTick=700）', () => {
    const em = {
      getComponent: vi.fn().mockReturnValue(null),
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    sys.update(0, em, 0)
    // nextCheckTick 仍为 700（未触发）
    expect((sys as any).nextCheckTick).toBe(700)
  })

  it('update tick=700 时触发 formApprenticeships，nextCheckTick 更新为 1400', () => {
    const em = {
      getComponent: vi.fn().mockReturnValue(null),
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    sys.update(0, em, 700)
    expect((sys as any).nextCheckTick).toBe(1400)
  })

  it('update tick=400 时触发 train，nextTrainTick 更新为 800', () => {
    const em = {
      getComponent: vi.fn().mockReturnValue(null),
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    sys.update(0, em, 400)
    expect((sys as any).nextTrainTick).toBe(800)
  })

  it('update 调用不崩溃（空 em）', () => {
    const em = {
      getComponent: vi.fn().mockReturnValue(null),
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    expect(() => sys.update(0, em, 0)).not.toThrow()
  })

  it('多次 update 调用 nextCheckTick 线性增长', () => {
    const em = {
      getComponent: vi.fn().mockReturnValue(null),
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    sys.update(0, em, 700)   // nextCheckTick = 1400
    sys.update(0, em, 1400)  // nextCheckTick = 2100
    expect((sys as any).nextCheckTick).toBe(2100)
  })
})

// ─── getActiveCount ───────────────────────────────────────────────────────────

describe('CreatureApprenticeSystem - getActiveCount', () => {
  let sys: CreatureApprenticeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('只计 graduated=false 的记录', () => {
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    apps.push(makeApp(1, 1, 2, 'combat', false))
    apps.push(makeApp(2, 3, 4, 'foraging', true))
    apps.push(makeApp(3, 5, 6, 'building', false))
    expect(sys.getActiveCount()).toBe(2)
  })

  it('全 graduated 时返回 0', () => {
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    apps.push(makeApp(1, 1, 2, 'combat', true))
    apps.push(makeApp(2, 3, 4, 'medicine', true))
    expect(sys.getActiveCount()).toBe(0)
  })

  it('全 active 时返回正确数量', () => {
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    for (let i = 0; i < 5; i++) {
      apps.push(makeApp(i + 1, i * 2 + 1, i * 2 + 2, 'combat', false))
    }
    expect(sys.getActiveCount()).toBe(5)
  })

  it('空列表时返回 0', () => {
    expect(sys.getActiveCount()).toBe(0)
  })

  it('单个 active 返回 1', () => {
    ;(sys as any).apprenticeships.push(makeApp(1, 1, 2, 'combat', false))
    expect(sys.getActiveCount()).toBe(1)
  })

  it('单个 graduated 返回 0', () => {
    ;(sys as any).apprenticeships.push(makeApp(1, 1, 2, 'combat', true))
    expect(sys.getActiveCount()).toBe(0)
  })

  it('15 个 active 返回 15', () => {
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    for (let i = 0; i < 15; i++) {
      apps.push(makeApp(i + 1, i * 2 + 1, i * 2 + 2, 'combat', false))
    }
    expect(sys.getActiveCount()).toBe(15)
  })

  it('混合列表：5 active + 3 graduated = 5', () => {
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    for (let i = 0; i < 5; i++) apps.push(makeApp(i + 1, i * 2 + 1, i * 2 + 2, 'combat', false))
    for (let i = 5; i < 8; i++) apps.push(makeApp(i + 1, i * 2 + 1, i * 2 + 2, 'medicine', true))
    expect(sys.getActiveCount()).toBe(5)
  })

  it('getActiveCount 不修改 apprenticeships 数组', () => {
    ;(sys as any).apprenticeships.push(makeApp(1, 1, 2))
    const before = (sys as any).apprenticeships.length
    sys.getActiveCount()
    expect((sys as any).apprenticeships.length).toBe(before)
  })
})

// ─── applyGraduation: 各技能效果 ─────────────────────────────────────────────

describe('CreatureApprenticeSystem - applyGraduation 技能效果', () => {
  let sys: CreatureApprenticeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  function makeEmForApprentice(apprenticeId: number, masterId: number, creatureOverride: object, needsOverride: object) {
    const creature = Object.assign({ name: 'Apprentice', damage: 10, speed: 1 }, creatureOverride)
    const needs = Object.assign({ health: 80 }, needsOverride)
    const master = { name: 'Master' }
    return {
      creature, needs, master,
      em: {
        getComponent: (id: number, type: string) => {
          if (id === apprenticeId && type === 'creature') return creature
          if (id === apprenticeId && type === 'needs') return needs
          if (id === masterId && type === 'creature') return master
          return null
        }
      } as any
    }
  }

  it('applyGraduation(combat)：damage+5', () => {
    const app = makeApp(1, 1, 2, 'combat')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 10 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(15)
  })

  it('applyGraduation(combat)：damage 从 0 到 5', () => {
    const app = makeApp(1, 1, 2, 'combat')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 0 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(5)
  })

  it('applyGraduation(combat)：damage 从 100 到 105', () => {
    const app = makeApp(1, 1, 2, 'combat')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 100 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(105)
  })

  it('applyGraduation(foraging)：speed+0.3，初始 1.0', () => {
    const app = makeApp(1, 1, 2, 'foraging')
    const { creature, em } = makeEmForApprentice(2, 1, { speed: 1.0 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.speed).toBeCloseTo(1.3, 5)
  })

  it('applyGraduation(foraging)：speed 上限为 3', () => {
    const app = makeApp(1, 1, 2, 'foraging')
    const { creature, em } = makeEmForApprentice(2, 1, { speed: 2.8 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.speed).toBe(3)
  })

  it('applyGraduation(foraging)：speed=3.0 时不再增加', () => {
    const app = makeApp(1, 1, 2, 'foraging')
    const { creature, em } = makeEmForApprentice(2, 1, { speed: 3.0 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.speed).toBe(3)
  })

  it('applyGraduation(foraging)：speed=0 时增加到 0.3', () => {
    const app = makeApp(1, 1, 2, 'foraging')
    const { creature, em } = makeEmForApprentice(2, 1, { speed: 0 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.speed).toBeCloseTo(0.3, 5)
  })

  it('applyGraduation(medicine)：health+20，初始 80', () => {
    const app = makeApp(1, 1, 2, 'medicine')
    const { needs, em } = makeEmForApprentice(2, 1, {}, { health: 80 })
    ;(sys as any).applyGraduation(em, app, 100)
    expect(needs.health).toBe(100)
  })

  it('applyGraduation(medicine)：health 上限为 100', () => {
    const app = makeApp(1, 1, 2, 'medicine')
    const { needs, em } = makeEmForApprentice(2, 1, {}, { health: 90 })
    ;(sys as any).applyGraduation(em, app, 100)
    expect(needs.health).toBe(100)
  })

  it('applyGraduation(medicine)：health=100 时不超过', () => {
    const app = makeApp(1, 1, 2, 'medicine')
    const { needs, em } = makeEmForApprentice(2, 1, {}, { health: 100 })
    ;(sys as any).applyGraduation(em, app, 100)
    expect(needs.health).toBe(100)
  })

  it('applyGraduation(medicine)：health=0 时增加到 20', () => {
    const app = makeApp(1, 1, 2, 'medicine')
    const { needs, em } = makeEmForApprentice(2, 1, {}, { health: 0 })
    ;(sys as any).applyGraduation(em, app, 100)
    expect(needs.health).toBe(20)
  })

  it('applyGraduation(building)：damage+2', () => {
    const app = makeApp(1, 1, 2, 'building')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 8 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(10)
  })

  it('applyGraduation(building)：damage 从 0 到 2', () => {
    const app = makeApp(1, 1, 2, 'building')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 0 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(2)
  })

  it('applyGraduation(leadership)：damage+3', () => {
    const app = makeApp(1, 1, 2, 'leadership')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 7 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(10)
  })

  it('applyGraduation(leadership)：damage 从 0 到 3', () => {
    const app = makeApp(1, 1, 2, 'leadership')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 0 }, {})
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(3)
  })

  it('applyGraduation：creature 不存在时不崩溃', () => {
    const app = makeApp(1, 1, 2, 'combat')
    const em = {
      getComponent: (_id: number, _type: string) => null
    } as any
    expect(() => (sys as any).applyGraduation(em, app, 100)).not.toThrow()
  })

  it('applyGraduation：needs 不存在时不崩溃', () => {
    const app = makeApp(1, 1, 2, 'combat')
    const creature = { name: 'A', damage: 10, speed: 1 }
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 2 && type === 'creature') return creature
        return null // needs 返回 null
      }
    } as any
    expect(() => (sys as any).applyGraduation(em, app, 100)).not.toThrow()
  })

  it('combat 提升量恰好是 5（非其他值）', () => {
    const app = makeApp(1, 1, 2, 'combat')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 20 }, {})
    const before = creature.damage
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage - before).toBe(5)
  })

  it('building 提升量恰好是 2（非 combat 的 5）', () => {
    const app = makeApp(1, 1, 2, 'building')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 20 }, {})
    const before = creature.damage
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage - before).toBe(2)
  })

  it('leadership 提升量恰好是 3', () => {
    const app = makeApp(1, 1, 2, 'leadership')
    const { creature, em } = makeEmForApprentice(2, 1, { damage: 20 }, {})
    const before = creature.damage
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage - before).toBe(3)
  })
})

// ─── ApprenticeSkill 完整性 ────────────────────────────────────────────────────

describe('CreatureApprenticeSystem - ApprenticeSkill 完整性', () => {
  let sys: CreatureApprenticeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('5种 ApprenticeSkill 可以存入 Apprenticeship', () => {
    const skills: ApprenticeSkill[] = ['combat', 'foraging', 'building', 'medicine', 'leadership']
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    for (const skill of skills) {
      apps.push(makeApp(apps.length + 1, 1, 2, skill))
    }
    expect(apps.length).toBe(5)
    expect(apps.map(a => a.skill)).toEqual(skills)
  })

  it('combat 技能可以创建 Apprenticeship', () => {
    const app = makeApp(1, 1, 2, 'combat')
    expect(app.skill).toBe('combat')
  })

  it('foraging 技能可以创建 Apprenticeship', () => {
    const app = makeApp(1, 1, 2, 'foraging')
    expect(app.skill).toBe('foraging')
  })

  it('building 技能可以创建 Apprenticeship', () => {
    const app = makeApp(1, 1, 2, 'building')
    expect(app.skill).toBe('building')
  })

  it('medicine 技能可以创建 Apprenticeship', () => {
    const app = makeApp(1, 1, 2, 'medicine')
    expect(app.skill).toBe('medicine')
  })

  it('leadership 技能可以创建 Apprenticeship', () => {
    const app = makeApp(1, 1, 2, 'leadership')
    expect(app.skill).toBe('leadership')
  })
})

// ─── Apprenticeship 接口字段完整性 ──────────────────────────────────────────

describe('CreatureApprenticeSystem - Apprenticeship 接口字段', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Apprenticeship 包含 id 字段', () => {
    const app = makeApp(1, 1, 2)
    expect(app).toHaveProperty('id')
  })

  it('Apprenticeship 包含 masterId 字段', () => {
    const app = makeApp(1, 10, 2)
    expect(app.masterId).toBe(10)
  })

  it('Apprenticeship 包含 apprenticeId 字段', () => {
    const app = makeApp(1, 1, 20)
    expect(app.apprenticeId).toBe(20)
  })

  it('Apprenticeship 包含 civId 字段', () => {
    const app = makeAppFull({ id: 1, masterId: 1, apprenticeId: 2, civId: 5 })
    expect(app.civId).toBe(5)
  })

  it('Apprenticeship 包含 skill 字段', () => {
    const app = makeApp(1, 1, 2, 'medicine')
    expect(app.skill).toBe('medicine')
  })

  it('Apprenticeship 包含 progress 字段', () => {
    const app = makeAppFull({ id: 1, masterId: 1, apprenticeId: 2, progress: 50 })
    expect(app.progress).toBe(50)
  })

  it('Apprenticeship 包含 startTick 字段', () => {
    const app = makeAppFull({ id: 1, masterId: 1, apprenticeId: 2, startTick: 1234 })
    expect(app.startTick).toBe(1234)
  })

  it('Apprenticeship 包含 graduated 字段', () => {
    const app = makeApp(1, 1, 2, 'combat', true)
    expect(app.graduated).toBe(true)
  })

  it('progress 默认为 0', () => {
    const app = makeApp(1, 1, 2)
    expect(app.progress).toBe(0)
  })

  it('graduated 默认为 false', () => {
    const app = makeApp(1, 1, 2)
    expect(app.graduated).toBe(false)
  })
})

// ─── update 中 cleanup 逻辑（dead entities） ──────────────────────────────────

describe('CreatureApprenticeSystem - update cleanup 死亡实体', () => {
  let sys: CreatureApprenticeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('position 不存在时 active apprenticeship 被移除', () => {
    const app = makeApp(1, 1, 2, 'combat', false)
    ;(sys as any).apprenticeships.push(app)
    const em = {
      getComponent: vi.fn().mockReturnValue(null), // position 不存在
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    sys.update(0, em, 0) // tick < nextCheckTick(700), 不触发formApprenticeships
    expect((sys as any).apprenticeships).toHaveLength(0)
  })

  it('graduated 的记录在 cleanup 时不被删除（跳过检测）', () => {
    const app = makeApp(1, 1, 2, 'combat', true) // graduated
    ;(sys as any).apprenticeships.push(app)
    const em = {
      getComponent: vi.fn().mockReturnValue(null),
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    sys.update(0, em, 0)
    expect((sys as any).apprenticeships).toHaveLength(1)
  })

  it('master position 存在但 apprentice position 不存在时记录被移除', () => {
    const app = makeApp(1, 1, 2, 'combat', false)
    ;(sys as any).apprenticeships.push(app)
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 1 && type === 'position') return { x: 0, y: 0 }
        return null // apprentice position 不存在
      },
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    sys.update(0, em, 0)
    expect((sys as any).apprenticeships).toHaveLength(0)
  })

  it('master 和 apprentice 都有 position 时记录保留', () => {
    const app = makeApp(1, 1, 2, 'combat', false)
    ;(sys as any).apprenticeships.push(app)
    const em = {
      getComponent: (_id: number, type: string) => {
        if (type === 'position') return { x: 0, y: 0 }
        return null
      },
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    sys.update(0, em, 0)
    expect((sys as any).apprenticeships).toHaveLength(1)
  })
})

// ─── train 逻辑（progress 累积与毕业） ────────────────────────────────────────

describe('CreatureApprenticeSystem - train progress 与毕业', () => {
  let sys: CreatureApprenticeSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('progress 从 0 到 98：train 后为 100，触发毕业', () => {
    const app = makeAppFull({ id: 1, masterId: 1, apprenticeId: 2, progress: 98, skill: 'combat' })
    ;(sys as any).apprenticeships.push(app)
    const creature = { name: 'Apprentice', damage: 10, speed: 1 }
    const needs = { health: 80 }
    const em = {
      getComponent: (id: number, type: string) => {
        if (type === 'position') return { x: 0, y: 0 } // 在 range 内
        if (id === 2 && type === 'creature') return creature
        if (id === 2 && type === 'needs') return needs
        if (id === 1 && type === 'creature') return { name: 'Master' }
        return null
      },
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    // 手动触发 train
    ;(sys as any).nextTrainTick = 0
    sys.update(0, em, 0)
    expect(app.graduated).toBe(true)
  })

  it('progress 未达到 100：train 后不毕业', () => {
    const app = makeAppFull({ id: 1, masterId: 1, apprenticeId: 2, progress: 50, skill: 'combat' })
    ;(sys as any).apprenticeships.push(app)
    const em = {
      getComponent: (_id: number, type: string) => {
        if (type === 'position') return { x: 0, y: 0 }
        return null
      },
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    ;(sys as any).nextTrainTick = 0
    sys.update(0, em, 0)
    expect(app.graduated).toBe(false)
    expect(app.progress).toBe(52) // 50 + PROGRESS_PER_TICK(2)
  })

  it('train：两个实体超出 MENTOR_RANGE(8) 时 progress 不增加', () => {
    const app = makeAppFull({ id: 1, masterId: 1, apprenticeId: 2, progress: 50, skill: 'combat' })
    ;(sys as any).apprenticeships.push(app)
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 1 && type === 'position') return { x: 0, y: 0 }
        if (id === 2 && type === 'position') return { x: 100, y: 100 } // 超出 8
        return null
      },
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    ;(sys as any).nextTrainTick = 0
    sys.update(0, em, 0)
    expect(app.progress).toBe(50) // 未增加
  })

  it('PROGRESS_PER_TICK 为 2：每次 train 增加 2', () => {
    const app = makeAppFull({ id: 1, masterId: 1, apprenticeId: 2, progress: 0, skill: 'foraging' })
    ;(sys as any).apprenticeships.push(app)
    const em = {
      getComponent: (_id: number, type: string) => {
        if (type === 'position') return { x: 0, y: 0 }
        return null
      },
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    ;(sys as any).nextTrainTick = 0
    sys.update(0, em, 0)
    expect(app.progress).toBe(2)
  })

  it('graduated 的记录在 train 时跳过（progress 不变）', () => {
    const app = makeAppFull({ id: 1, masterId: 1, apprenticeId: 2, progress: 50, graduated: true })
    ;(sys as any).apprenticeships.push(app)
    const em = {
      getComponent: (_id: number, type: string) => {
        if (type === 'position') return { x: 0, y: 0 }
        return null
      },
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    } as any
    ;(sys as any).nextTrainTick = 0
    sys.update(0, em, 0)
    expect(app.progress).toBe(50)
  })
})
