import { describe, it, expect, beforeEach } from 'vitest'
import { SpatialHashSystem } from '../systems/SpatialHashSystem'
import { EntityManager } from '../ecs/Entity'

// 帮助函数：创建带位置组件的实体
function addEntity(em: EntityManager, x: number, y: number): number {
  const id = em.createEntity()
  em.addComponent(id, { type: 'position', x, y })
  return id
}

describe('SpatialHashSystem - rebuild & getCellCount', () => {
  it('空 EntityManager rebuild 后 cellCount 为 0', () => {
    const shs = new SpatialHashSystem()
    const em = new EntityManager()
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(0)
  })

  it('rebuild 后 cellCount 大于 0（有实体）', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 100, 100)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBeGreaterThan(0)
  })

  it('同一格子内的多个实体只占一个 cell', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 1, 1)
    addEntity(em, 2, 2)  // 同一个 16x16 cell
    addEntity(em, 3, 3)  // 同一个 16x16 cell
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(1)
  })

  it('两个不同格子内的实体占两个 cell', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)    // cell (0,0)
    addEntity(em, 32, 0)   // cell (2,0)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(2)
  })

  it('多次 rebuild 后结果正确（无状态污染）', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 200, 200)
    shs.rebuild(em)
    const count1 = shs.getCellCount()

    // 第二次 rebuild 同一个 em
    shs.rebuild(em)
    const count2 = shs.getCellCount()
    expect(count1).toBe(count2)
  })
})

describe('SpatialHashSystem - query', () => {
  it('查询空哈希返回空数组', () => {
    const shs = new SpatialHashSystem()
    const em = new EntityManager()
    shs.rebuild(em)
    expect(shs.query(0, 0, 100)).toHaveLength(0)
  })

  it('查询范围内的实体被返回', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 10, 10)
    addEntity(em, 200, 200)  // 超出范围
    shs.rebuild(em)
    const result = shs.query(10, 10, 20)
    expect(result).toContain(id1)
    expect(result).not.toContain(200)
  })

  it('查询半径为 0 时只返回同格子实体', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 8, 8)  // cell (0,0)
    const id2 = addEntity(em, 32, 0) // cell (2,0)
    shs.rebuild(em)
    const result = shs.query(8, 8, 0)
    expect(result).toContain(id1)
    expect(result).not.toContain(id2)
  })

  it('多个实体在范围内都被返回', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 5, 5)
    const id2 = addEntity(em, 10, 10)
    const id3 = addEntity(em, 15, 15)
    addEntity(em, 100, 100)  // 超出范围
    shs.rebuild(em)
    const result = shs.query(10, 10, 20)
    expect(result).toContain(id1)
    expect(result).toContain(id2)
    expect(result).toContain(id3)
  })
})

describe('SpatialHashSystem - queryRect', () => {
  it('查询空哈希返回空数组', () => {
    const shs = new SpatialHashSystem()
    const em = new EntityManager()
    shs.rebuild(em)
    expect(shs.queryRect(0, 0, 100, 100)).toHaveLength(0)
  })

  it('矩形范围内的实体被返回', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 20, 20)
    const id2 = addEntity(em, 200, 200)  // 超出矩形
    shs.rebuild(em)
    const result = shs.queryRect(0, 0, 50, 50)
    expect(result).toContain(id1)
    expect(result).not.toContain(id2)
  })

  it('x1>x2 或 y1>y2（反向矩形）也能正确工作', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 20, 20)
    shs.rebuild(em)
    // 反向坐标
    const result = shs.queryRect(50, 50, 0, 0)
    expect(result).toContain(id1)
  })
})

describe('SpatialHashSystem - getNeighbors', () => {
  it('没有位置组件的实体返回空数组', () => {
    const shs = new SpatialHashSystem()
    const em = new EntityManager()
    const id = em.createEntity()  // 无 position 组件
    shs.rebuild(em)
    expect(shs.getNeighbors(id, 100, em)).toHaveLength(0)
  })

  it('不包含自身', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id = addEntity(em, 10, 10)
    shs.rebuild(em)
    const result = shs.getNeighbors(id, 100, em)
    expect(result).not.toContain(id)
  })

  it('圆形半径过滤：距离超出 radius 的不返回', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 0, 0)
    const id2 = addEntity(em, 10, 0)  // 距离 10，在半径 15 内
    const id3 = addEntity(em, 30, 0)  // 距离 30，超出半径 15
    shs.rebuild(em)
    const result = shs.getNeighbors(id1, 15, em)
    expect(result).toContain(id2)
    expect(result).not.toContain(id3)
  })

  it('多实体时返回所有在半径内的邻居', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const center = addEntity(em, 50, 50)
    const near1 = addEntity(em, 52, 50)
    const near2 = addEntity(em, 50, 52)
    const far = addEntity(em, 200, 200)
    shs.rebuild(em)
    const result = shs.getNeighbors(center, 10, em)
    expect(result).toContain(near1)
    expect(result).toContain(near2)
    expect(result).not.toContain(far)
    expect(result).not.toContain(center)
  })
})

describe('SpatialHashSystem - 不同 cellSize', () => {
  it('cellSize=1 时每个坐标占独立 cell', () => {
    const shs = new SpatialHashSystem(1)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 1, 0)
    addEntity(em, 0, 1)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(3)
  })

  it('cellSize=100 时所有接近原点的实体在同一 cell', () => {
    const shs = new SpatialHashSystem(100)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 50, 50)
    addEntity(em, 99, 99)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(1)
  })
})
