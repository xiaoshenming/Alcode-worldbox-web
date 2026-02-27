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
