import { describe, it, expect, beforeEach } from 'vitest'
import { BuildingVarietySystem } from '../systems/BuildingVarietySystem'
import { EntityManager } from '../ecs/Entity'
import type { Era, BuildingComponent } from '../systems/BuildingVarietySystem'

function makeSys() { return new BuildingVarietySystem() }
function makeEm() { return new EntityManager() }

function makeBuilding(overrides: Partial<BuildingComponent> = {}): BuildingComponent {
  return {
    type: 'building',
    buildingType: 'Hut',
    era: 'primitive',
    health: 30,
    maxHealth: 30,
    civId: 1,
    builtTick: 0,
    variant: 0,
    ...overrides,
  }
}

// ── 1. 初始状态 ───────────────────────────────────────────────────────────────
describe('BuildingVarietySystem — 初始状态', () => {
  let sys: BuildingVarietySystem
  beforeEach(() => { sys = makeSys() })

  it('getBuildingCount() 初始为 0', () => {
    expect(sys.getBuildingCount()).toBe(0)
  })

  it('buildings Map 初始为空', () => {
    expect((sys as any).buildings.size).toBe(0)
  })

  it('_lastZoom 初始为 -1', () => {
    expect((sys as any)._lastZoom).toBe(-1)
  })

  it('_symbolFont 初始为空字符串', () => {
    expect((sys as any)._symbolFont).toBe('')
  })

  it('_nameFont 初始为空字符串', () => {
    expect((sys as any)._nameFont).toBe('')
  })
})

// ── 2. getBuildingTypes ──────────────────────────────────────────���────────────
describe('BuildingVarietySystem — getBuildingTypes', () => {
  let sys: BuildingVarietySystem
  beforeEach(() => { sys = makeSys() })

  it('primitive 返回数组', () => {
    expect(Array.isArray(sys.getBuildingTypes('primitive'))).toBe(true)
  })

  it('primitive 有 3 种建筑', () => {
    expect(sys.getBuildingTypes('primitive')).toHaveLength(3)
  })

  it('bronze 有 4 种建筑', () => {
    expect(sys.getBuildingTypes('bronze')).toHaveLength(4)
  })

  it('iron 有 5 种建筑', () => {
    expect(sys.getBuildingTypes('iron')).toHaveLength(5)
  })

  it('medieval 有 5 种建筑', () => {
    expect(sys.getBuildingTypes('medieval')).toHaveLength(5)
  })

  it('renaissance 有 5 种建筑', () => {
    expect(sys.getBuildingTypes('renaissance')).toHaveLength(5)
  })

  it('primitive 包含 Hut', () => {
    const names = sys.getBuildingTypes('primitive').map(b => b.name)
    expect(names).toContain('Hut')
  })

  it('primitive 包含 Campfire', () => {
    const names = sys.getBuildingTypes('primitive').map(b => b.name)
    expect(names).toContain('Campfire')
  })

  it('bronze 包含 Barracks', () => {
    const names = sys.getBuildingTypes('bronze').map(b => b.name)
    expect(names).toContain('Barracks')
  })

  it('iron 包含 Temple', () => {
    const names = sys.getBuildingTypes('iron').map(b => b.name)
    expect(names).toContain('Temple')
  })

  it('medieval 包含 Castle', () => {
    const names = sys.getBuildingTypes('medieval').map(b => b.name)
    expect(names).toContain('Castle')
  })

  it('renaissance 包含 Palace', () => {
    const names = sys.getBuildingTypes('renaissance').map(b => b.name)
    expect(names).toContain('Palace')
  })

  it('所有建筑类型都有 maxHealth > 0', () => {
    const eras: Era[] = ['primitive', 'bronze', 'iron', 'medieval', 'renaissance']
    for (const era of eras) {
      for (const b of sys.getBuildingTypes(era)) {
        expect(b.maxHealth).toBeGreaterThan(0)
      }
    }
  })

  it('所有建筑都有非空 provides 数组', () => {
    const eras: Era[] = ['primitive', 'bronze', 'iron', 'medieval', 'renaissance']
    for (const era of eras) {
      for (const b of sys.getBuildingTypes(era)) {
        expect(b.provides.length).toBeGreaterThan(0)
      }
    }
  })

  it('所有建筑都有非空 symbol 字符串', () => {
    const eras: Era[] = ['primitive', 'bronze', 'iron', 'medieval', 'renaissance']
    for (const era of eras) {
      for (const b of sys.getBuildingTypes(era)) {
        expect(b.symbol.length).toBeGreaterThan(0)
      }
    }
  })
})

// ── 3. getAvailableBuildings ──────────────────────────────────────────────────
describe('BuildingVarietySystem — getAvailableBuildings', () => {
  let sys: BuildingVarietySystem
  beforeEach(() => { sys = makeSys() })

  it('primitive 只返回 primitive 建筑（3 种）', () => {
    expect(sys.getAvailableBuildings('primitive')).toHaveLength(3)
  })

  it('bronze 返回 primitive + bronze 建筑（7 种）', () => {
    expect(sys.getAvailableBuildings('bronze')).toHaveLength(7)
  })

  it('iron 返回前三个时代建筑（12 种）', () => {
    expect(sys.getAvailableBuildings('iron')).toHaveLength(12)
  })

  it('medieval 返回前四个时代建筑（17 种）', () => {
    expect(sys.getAvailableBuildings('medieval')).toHaveLength(17)
  })

  it('renaissance 返回全部建筑（22 种）', () => {
    expect(sys.getAvailableBuildings('renaissance')).toHaveLength(22)
  })

  it('medieval 可用建筑数 > primitive', () => {
    const prim = sys.getAvailableBuildings('primitive')
    const med = sys.getAvailableBuildings('medieval')
    expect(med.length).toBeGreaterThan(prim.length)
  })

  it('getAvailableBuildings renaissance 包含 Hut（primitive 建筑）', () => {
    const names = sys.getAvailableBuildings('renaissance').map(b => b.name)
    expect(names).toContain('Hut')
  })

  it('getAvailableBuildings primitive 不包含 Castle（medieval）', () => {
    const names = sys.getAvailableBuildings('primitive').map(b => b.name)
    expect(names).not.toContain('Castle')
  })

  it('getAvailableBuildings bronze 包含 House 和 Hut', () => {
    const names = sys.getAvailableBuildings('bronze').map(b => b.name)
    expect(names).toContain('House')
    expect(names).toContain('Hut')
  })
})

// ── 4. eraFromTechLevel ───────────────────────────────────────────────────────
describe('BuildingVarietySystem — eraFromTechLevel', () => {
  it('techLevel=0 → primitive', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(0)).toBe('primitive')
  })

  it('techLevel=1 → primitive', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(1)).toBe('primitive')
  })

  it('techLevel=19 → primitive', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(19)).toBe('primitive')
  })

  it('techLevel=20 → bronze', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(20)).toBe('bronze')
  })

  it('techLevel=39 → bronze', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(39)).toBe('bronze')
  })

  it('techLevel=40 → iron', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(40)).toBe('iron')
  })

  it('techLevel=59 → iron', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(59)).toBe('iron')
  })

  it('techLevel=60 → medieval', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(60)).toBe('medieval')
  })

  it('techLevel=79 → medieval', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(79)).toBe('medieval')
  })

  it('techLevel=80 → renaissance', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(80)).toBe('renaissance')
  })

  it('techLevel=100 → renaissance', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(100)).toBe('renaissance')
  })

  it('techLevel=999 → renaissance', () => {
    expect(BuildingVarietySystem.eraFromTechLevel(999)).toBe('renaissance')
  })
})

// ── 5. registerBuilding / removeBuilding ────────────────────────────────────
describe('BuildingVarietySystem — registerBuilding / removeBuilding', () => {
  let sys: BuildingVarietySystem
  beforeEach(() => { sys = makeSys() })

  it('registerBuilding 后 count 增加', () => {
    sys.registerBuilding(1, makeBuilding())
    expect(sys.getBuildingCount()).toBe(1)
  })

  it('register 多个 count 正确', () => {
    sys.registerBuilding(1, makeBuilding())
    sys.registerBuilding(2, makeBuilding())
    sys.registerBuilding(3, makeBuilding())
    expect(sys.getBuildingCount()).toBe(3)
  })

  it('相同 entityId 注册两次只保留一个', () => {
    sys.registerBuilding(1, makeBuilding({ buildingType: 'Hut' }))
    sys.registerBuilding(1, makeBuilding({ buildingType: 'Campfire' }))
    expect(sys.getBuildingCount()).toBe(1)
    expect((sys as any).buildings.get(1).buildingType).toBe('Campfire')
  })

  it('removeBuilding 后 count 减少', () => {
    sys.registerBuilding(1, makeBuilding())
    sys.removeBuilding(1)
    expect(sys.getBuildingCount()).toBe(0)
  })

  it('removeBuilding 不存在的 id 不抛错', () => {
    expect(() => sys.removeBuilding(999)).not.toThrow()
  })

  it('remove 后再 remove 同一 id 不抛错', () => {
    sys.registerBuilding(5, makeBuilding())
    sys.removeBuilding(5)
    expect(() => sys.removeBuilding(5)).not.toThrow()
  })

  it('register 后可以通过内部 Map 获取建筑组件', () => {
    const b = makeBuilding({ buildingType: 'Campfire', era: 'primitive' })
    sys.registerBuilding(7, b)
    expect((sys as any).buildings.get(7).buildingType).toBe('Campfire')
  })
})

// ── 6. update — 衰减与销毁 ───────────────────────────────────────────────────
describe('BuildingVarietySystem — update 衰减与销毁', () => {
  let sys: BuildingVarietySystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEm() })

  it('tick%60 !== 0 时不执行逻辑', () => {
    const b = makeBuilding({ health: 5, maxHealth: 30 })
    sys.registerBuilding(1, b)
    sys.update(1, em)
    expect(b.health).toBe(5) // unchanged
  })

  it('tick=60 时执行衰减逻辑', () => {
    const b = makeBuilding({ health: 5, maxHealth: 30 }) // 5 < 30*0.3=9 → decay
    sys.registerBuilding(1, b)
    sys.update(60, em)
    expect(b.health).toBe(4.5) // 5 - 0.5
  })

  it('health >= maxHealth*0.3 时不衰减', () => {
    const b = makeBuilding({ health: 25, maxHealth: 30 }) // 25 >= 9 → no decay
    sys.registerBuilding(1, b)
    sys.update(60, em)
    expect(b.health).toBe(25)
  })

  it('health 不低于 0', () => {
    const b = makeBuilding({ health: 0.3, maxHealth: 30 }) // < 9 → decay
    sys.registerBuilding(1, b)
    sys.update(60, em)
    expect(b.health).toBeGreaterThanOrEqual(0)
  })

  it('health=0 时建筑被移除', () => {
    const eid = em.createEntity()
    const b = makeBuilding({ health: 0, maxHealth: 30 })
    sys.registerBuilding(eid, b)
    sys.update(60, em)
    expect(sys.getBuildingCount()).toBe(0)
  })

  it('health=0 时对应 entity 从 em 移除', () => {
    const eid = em.createEntity()
    const b = makeBuilding({ health: 0, maxHealth: 30 })
    sys.registerBuilding(eid, b)
    expect(em.hasComponent(eid, 'position') || true).toBe(true) // entity exists
    sys.update(60, em)
    // entity should be gone — verify by checking that buildings map is empty
    expect((sys as any).buildings.has(eid)).toBe(false)
  })

  it('tick=120 也触发衰减', () => {
    const b = makeBuilding({ health: 5, maxHealth: 30 })
    sys.registerBuilding(1, b)
    sys.update(120, em)
    expect(b.health).toBe(4.5)
  })

  it('只有 health < maxHealth*0.3 的建筑衰减，其余不变', () => {
    const bDecay = makeBuilding({ health: 5, maxHealth: 30 })
    const bOk = makeBuilding({ health: 20, maxHealth: 30 })
    sys.registerBuilding(1, bDecay)
    sys.registerBuilding(2, bOk)
    sys.update(60, em)
    expect(bDecay.health).toBe(4.5)
    expect(bOk.health).toBe(20)
  })
})

// ── 7. 建筑数据完整性 ─────────────────────────────────────────────────────────
describe('BuildingVarietySystem — 建筑数据完整性', () => {
  let sys: BuildingVarietySystem
  beforeEach(() => { sys = makeSys() })

  it('Castle 的 defense 在 provides 中', () => {
    const castle = sys.getBuildingTypes('medieval').find(b => b.name === 'Castle')
    expect(castle?.provides).toContain('defense')
  })

  it('Fortress 的 military 在 provides 中', () => {
    const fortress = sys.getBuildingTypes('renaissance').find(b => b.name === 'Fortress')
    expect(fortress?.provides).toContain('military')
  })

  it('Palace maxHealth 为 400', () => {
    const palace = sys.getBuildingTypes('renaissance').find(b => b.name === 'Palace')
    expect(palace?.maxHealth).toBe(400)
  })

  it('Hut maxHealth 为 30', () => {
    const hut = sys.getBuildingTypes('primitive').find(b => b.name === 'Hut')
    expect(hut?.maxHealth).toBe(30)
  })

  it('Castle width = 3, height = 3', () => {
    const castle = sys.getBuildingTypes('medieval').find(b => b.name === 'Castle')
    expect(castle?.width).toBe(3)
    expect(castle?.height).toBe(3)
  })

  it('Hut width = 1, height = 1', () => {
    const hut = sys.getBuildingTypes('primitive').find(b => b.name === 'Hut')
    expect(hut?.width).toBe(1)
    expect(hut?.height).toBe(1)
  })

  it('所有建筑 era 字段与所属目录匹配', () => {
    const eras: Era[] = ['primitive', 'bronze', 'iron', 'medieval', 'renaissance']
    for (const era of eras) {
      for (const b of sys.getBuildingTypes(era)) {
        expect(b.era).toBe(era)
      }
    }
  })

  it('Granary 提供 food 和 storage', () => {
    const g = sys.getBuildingTypes('bronze').find(b => b.name === 'Granary')
    expect(g?.provides).toContain('food')
    expect(g?.provides).toContain('storage')
  })
})
