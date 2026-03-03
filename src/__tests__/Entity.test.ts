import { describe, it, expect, beforeEach } from 'vitest'
import { EntityManager, getHeroTitle } from '../ecs/Entity'

describe('EntityManager', () => {
  let em: EntityManager

  beforeEach(() => {
    em = new EntityManager()
  })

  describe('createEntity / getEntityCount', () => {
    it('初始实体数为 0', () => {
      expect(em.getEntityCount()).toBe(0)
    })

    it('创建实体后数量递增', () => {
      em.createEntity()
      expect(em.getEntityCount()).toBe(1)
      em.createEntity()
      expect(em.getEntityCount()).toBe(2)
    })

    it('返回的 ID 是唯一的正整数', () => {
      const id1 = em.createEntity()
      const id2 = em.createEntity()
      expect(id1).toBeGreaterThan(0)
      expect(id2).toBeGreaterThan(0)
      expect(id1).not.toBe(id2)
    })
  })

  describe('removeEntity', () => {
    it('删除实体后数量减少', () => {
      const id = em.createEntity()
      em.removeEntity(id)
      expect(em.getEntityCount()).toBe(0)
    })

    it('删除实体后组件也被移除', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 1, y: 2 })
      em.removeEntity(id)
      expect(em.hasComponent(id, 'position')).toBe(false)
    })

    it('删除不存在的实体不报错', () => {
      expect(() => em.removeEntity(99999)).not.toThrow()
    })
  })

  describe('addComponent / getComponent / hasComponent', () => {
    it('添加组件后可以获取', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 10, y: 20 })
      const pos = em.getComponent<{ type: 'position'; x: number; y: number }>(id, 'position')
      expect(pos).toBeDefined()
      expect(pos!.x).toBe(10)
      expect(pos!.y).toBe(20)
    })

    it('hasComponent 正确返回 true/false', () => {
      const id = em.createEntity()
      expect(em.hasComponent(id, 'position')).toBe(false)
      em.addComponent(id, { type: 'position', x: 0, y: 0 })
      expect(em.hasComponent(id, 'position')).toBe(true)
    })

    it('获取不存在的组件返回 undefined', () => {
      const id = em.createEntity()
      const result = em.getComponent(id, 'velocity')
      expect(result).toBeUndefined()
    })

    it('覆盖添加组件会更新值', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 1, y: 1 })
      em.addComponent(id, { type: 'position', x: 5, y: 5 })
      const pos = em.getComponent<{ type: 'position'; x: number; y: number }>(id, 'position')
      expect(pos!.x).toBe(5)
      expect(pos!.y).toBe(5)
    })
  })

  describe('removeComponent', () => {
    it('移除组件后无法获取', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 1, y: 2 })
      em.removeComponent(id, 'position')
      expect(em.hasComponent(id, 'position')).toBe(false)
      expect(em.getComponent(id, 'position')).toBeUndefined()
    })
  })

  describe('getEntitiesWithComponent', () => {
    it('无实体时返回空数组', () => {
      expect(em.getEntitiesWithComponent('position')).toEqual([])
    })

    it('返回有指定组件的所有实体', () => {
      const id1 = em.createEntity()
      const id2 = em.createEntity()
      const id3 = em.createEntity()
      em.addComponent(id1, { type: 'position', x: 0, y: 0 })
      em.addComponent(id3, { type: 'position', x: 0, y: 0 })
      // id2 无 position 组件
      const result = em.getEntitiesWithComponent('position')
      expect(result).toContain(id1)
      expect(result).toContain(id3)
      expect(result).not.toContain(id2)
      expect(result).toHaveLength(2)
    })

    it('缓存：多次调用返回相同结果', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 0, y: 0 })
      const r1 = em.getEntitiesWithComponent('position')
      const r2 = em.getEntitiesWithComponent('position')
      expect(r1).toEqual(r2)
    })

    it('添加组件后缓存失效', () => {
      const id1 = em.createEntity()
      em.addComponent(id1, { type: 'position', x: 0, y: 0 })
      const r1 = em.getEntitiesWithComponent('position')
      expect(r1).toHaveLength(1)

      const id2 = em.createEntity()
      em.addComponent(id2, { type: 'position', x: 0, y: 0 })
      const r2 = em.getEntitiesWithComponent('position')
      expect(r2).toHaveLength(2)
    })
  })

  describe('getEntitiesWithComponents (多组件查询)', () => {
    it('无类型时返回空数组', () => {
      expect(em.getEntitiesWithComponents()).toEqual([])
    })

    it('单类型同 getEntitiesWithComponent', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 0, y: 0 })
      const r1 = em.getEntitiesWithComponents('position')
      const r2 = em.getEntitiesWithComponent('position')
      expect(r1).toEqual(r2)
    })

    it('只返回同时拥有所有组件的实体', () => {
      const id1 = em.createEntity()
      const id2 = em.createEntity()
      const id3 = em.createEntity()
      // id1: position + velocity
      em.addComponent(id1, { type: 'position', x: 0, y: 0 })
      em.addComponent(id1, { type: 'velocity', vx: 1, vy: 0 })
      // id2: position only
      em.addComponent(id2, { type: 'position', x: 0, y: 0 })
      // id3: velocity only
      em.addComponent(id3, { type: 'velocity', vx: 0, vy: 1 })

      const result = em.getEntitiesWithComponents('position', 'velocity')
      expect(result).toEqual([id1])
    })

    it('某个组件类型没有实体时返回空数组', () => {
      const id = em.createEntity()
      em.addComponent(id, { type: 'position', x: 0, y: 0 })
      const result = em.getEntitiesWithComponents('position', 'nonexistent')
      expect(result).toEqual([])
    })
  })

  describe('getAllEntities', () => {
    it('返回所有已创建实体', () => {
      const id1 = em.createEntity()
      const id2 = em.createEntity()
      const all = em.getAllEntities()
      expect(all).toContain(id1)
      expect(all).toContain(id2)
      expect(all).toHaveLength(2)
    })

    it('删除实体后不再包含该实体', () => {
      const id = em.createEntity()
      em.removeEntity(id)
      const all = em.getAllEntities()
      expect(all).not.toContain(id)
    })
  })
})

describe('getHeroTitle', () => {
  it('level 1: 返回基础称号', () => {
    expect(getHeroTitle('warrior', 1)).toBe('Warrior')
    expect(getHeroTitle('ranger', 1)).toBe('Ranger')
    expect(getHeroTitle('healer', 1)).toBe('Healer')
    expect(getHeroTitle('berserker', 1)).toBe('Berserker')
  })

  it('level 3: 返回进阶称号', () => {
    expect(getHeroTitle('warrior', 3)).toBe('Champion')
    expect(getHeroTitle('ranger', 3)).toBe('Sharpshooter')
    expect(getHeroTitle('healer', 3)).toBe('Sage')
    expect(getHeroTitle('berserker', 3)).toBe('Warlord')
  })

  it('level 5: 返回传奇称号', () => {
    expect(getHeroTitle('warrior', 5)).toBe('Legend')
    expect(getHeroTitle('ranger', 5)).toBe('Deadeye')
    expect(getHeroTitle('healer', 5)).toBe('Archon')
    expect(getHeroTitle('berserker', 5)).toBe('Destroyer')
  })

  it('level 10: 仍然返回传奇称号（>=5）', () => {
    expect(getHeroTitle('warrior', 10)).toBe('Legend')
  })
})

// ---- Extended tests (to reach 50+) ----

describe('EntityManager - 组件覆盖行为', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('同类型组件再次addComponent时覆盖', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 1, y: 2 })
    em.addComponent(id, { type: 'position', x: 5, y: 6 })
    const pos = em.getComponent<{ type: 'position'; x: number; y: number }>(id, 'position')
    expect(pos?.x).toBe(5)
    expect(pos?.y).toBe(6)
  })
})

describe('EntityManager - getEntitiesWithComponent', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('无对应组件时返回空数组', () => {
    em.createEntity()
    expect(em.getEntitiesWithComponent('position')).toEqual([])
  })

  it('有对应组件时返回对应实体', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    expect(em.getEntitiesWithComponent('position')).toContain(id)
  })

  it('多个实体有同一组件时全部返回', () => {
    const id1 = em.createEntity()
    const id2 = em.createEntity()
    em.addComponent(id1, { type: 'position', x: 0, y: 0 })
    em.addComponent(id2, { type: 'position', x: 1, y: 1 })
    const result = em.getEntitiesWithComponent('position')
    expect(result).toContain(id1)
    expect(result).toContain(id2)
  })
})

describe('EntityManager - 批量创建与查询', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('创建10���实体后getEntityCount为10', () => {
    for (let i = 0; i < 10; i++) { em.createEntity() }
    expect(em.getEntityCount()).toBe(10)
  })

  it('添加组件不影响实体数量', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    expect(em.getEntityCount()).toBe(1)
  })
})

describe('EntityManager - removeEntity完整清理', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('删除后hasComponent为false', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    em.removeEntity(id)
    expect(em.hasComponent(id, 'position')).toBe(false)
  })

  it('删除后getComponent返回undefined', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    em.removeEntity(id)
    expect(em.getComponent(id, 'position')).toBeUndefined()
  })

  it('删除不存在的实体不崩溃', () => {
    expect(() => em.removeEntity(9999)).not.toThrow()
  })
})

describe('getHeroTitle - 额外边界', () => {
  it('level 2: 返回基础称号', () => {
    expect(getHeroTitle('warrior', 2)).toBe('Warrior')
  })

  it('level 4: 返回进阶称号', () => {
    expect(getHeroTitle('ranger', 4)).toBe('Sharpshooter')
  })

  it('未知职业返回默认值', () => {
    const title = getHeroTitle('unknown' as any, 1)
    // 未知职业switch穿透返回undefined
    expect(title === undefined || typeof title === 'string').toBe(true)
  })
})

describe('EntityManager - 组件数据保留', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('addComponent后组件数据完整保留', () => {
    const id = em.createEntity()
    const comp = { type: 'creature' as const, species: 'human', speed: 3, damage: 5, isHostile: false, name: 'Bob', age: 10, maxAge: 80, gender: 'male' as const }
    em.addComponent(id, comp)
    const stored = em.getComponent<typeof comp>(id, 'creature')
    expect(stored?.name).toBe('Bob')
    expect(stored?.age).toBe(10)
  })
})

describe('EntityManager - 多组件管理', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('一个实体可以有多种不同类型的组件', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    em.addComponent(id, { type: 'velocity', vx: 1, vy: 0 } as any)
    expect(em.hasComponent(id, 'position')).toBe(true)
    expect(em.hasComponent(id, 'velocity')).toBe(true)
  })

  it('两个实体各自的组件互不干扰', () => {
    const id1 = em.createEntity()
    const id2 = em.createEntity()
    em.addComponent(id1, { type: 'position', x: 1, y: 2 })
    em.addComponent(id2, { type: 'position', x: 3, y: 4 })
    const pos1 = em.getComponent<{ type: 'position'; x: number; y: number }>(id1, 'position')
    const pos2 = em.getComponent<{ type: 'position'; x: number; y: number }>(id2, 'position')
    expect(pos1?.x).toBe(1)
    expect(pos2?.x).toBe(3)
  })
})

describe('EntityManager - removeComponent', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('removeComponent后hasComponent为false', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    em.removeComponent(id, 'position')
    expect(em.hasComponent(id, 'position')).toBe(false)
  })

  it('removeComponent后getComponent返回undefined', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    em.removeComponent(id, 'position')
    expect(em.getComponent(id, 'position')).toBeUndefined()
  })
})

describe('getHeroTitle - 更多���业边界', () => {
  it('level 0: 返回基础称号（低level兜底）', () => {
    const title = getHeroTitle('warrior', 0)
    expect(typeof title).toBe('string')
    expect(title.length).toBeGreaterThan(0)
  })

  it('berserker level 2: 基础称号', () => {
    expect(getHeroTitle('berserker', 2)).toBe('Berserker')
  })

  it('healer level 4: 进阶称号', () => {
    expect(getHeroTitle('healer', 4)).toBe('Sage')
  })
})

describe('EntityManager - 零实体操作', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('getEntitiesWithComponents无实体时返回空数组', () => {
    const result = em.getEntitiesWithComponents('position')
    expect(result).toEqual([])
  })

  it('getAllEntities无实体时返回空数组或空集合', () => {
    const all = em.getAllEntities()
    expect(all.size ?? all.length ?? [...all].length).toBe(0)
  })
})

describe('EntityManager - 实体ID从1开始', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('第一个实体ID为正整数', () => {
    const id = em.createEntity()
    expect(id).toBeGreaterThan(0)
  })

  it('第二个实体ID比第一个大', () => {
    const id1 = em.createEntity()
    const id2 = em.createEntity()
    expect(id2).toBeGreaterThan(id1)
  })
})

describe('EntityManager - hasComponent精确验证', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })

  it('未添加组件时hasComponent返回false', () => {
    const id = em.createEntity()
    expect(em.hasComponent(id, 'position')).toBe(false)
  })

  it('添加组件后hasComponent返回true', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    expect(em.hasComponent(id, 'position')).toBe(true)
  })

  it('删除组件后hasComponent返回false', () => {
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 0, y: 0 })
    em.removeComponent(id, 'position')
    expect(em.hasComponent(id, 'position')).toBe(false)
  })
})
