import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SpatialHashSystem } from '../systems/SpatialHashSystem'
import { EntityManager } from '../ecs/Entity'

// 帮助函数：创建带位置组件的实体
function addEntity(em: EntityManager, x: number, y: number): number {
  const id = em.createEntity()
  em.addComponent(id, { type: 'position', x, y })
  return id
}

afterEach(() => vi.restoreAllMocks())

// ─── rebuild & getCellCount ────────────────────────────────────────────────

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
    addEntity(em, 2, 2)
    addEntity(em, 3, 3)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(1)
  })

  it('两个不同格子内的实体占两个 cell', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)   // cell (0,0)
    addEntity(em, 32, 0)  // cell (2,0)
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
    shs.rebuild(em)
    const count2 = shs.getCellCount()
    expect(count1).toBe(count2)
  })

  it('rebuild 清除旧数据：实体被移除后 count 减少', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id = addEntity(em, 0, 0)
    addEntity(em, 200, 200)
    shs.rebuild(em)
    const before = shs.getCellCount()

    em.removeEntity(id)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBeLessThan(before)
  })

  it('没有 position 组件的实体不影响 cellCount', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    em.createEntity()  // 无 position 组件
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(0)
  })

  it('同一 X 不同 Y 的实体在不同 cell', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 0, 32)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(2)
  })

  it('大量实体 rebuild 后 getCellCount 稳定', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    for (let i = 0; i < 100; i++) {
      addEntity(em, i * 20, i * 20)
    }
    shs.rebuild(em)
    const c1 = shs.getCellCount()
    shs.rebuild(em)
    const c2 = shs.getCellCount()
    expect(c1).toBe(c2)
  })

  it('三次 rebuild 依然无状态污染', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 10, 10)
    shs.rebuild(em)
    shs.rebuild(em)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(1)
  })
})

// ─── query ────────────────────────────────────────────────────────────────

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
    addEntity(em, 200, 200)
    shs.rebuild(em)
    const result = shs.query(10, 10, 20)
    expect(result).toContain(id1)
  })

  it('查询范围外的实体不被返回', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 10, 10)
    const id2 = addEntity(em, 200, 200)
    shs.rebuild(em)
    const result = shs.query(10, 10, 20)
    expect(result).not.toContain(id2)
  })

  it('查询半径为 0 时只返回同格子实体', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 8, 8)
    const id2 = addEntity(em, 32, 0)
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
    addEntity(em, 100, 100)
    shs.rebuild(em)
    const result = shs.query(10, 10, 20)
    expect(result).toContain(id1)
    expect(result).toContain(id2)
    expect(result).toContain(id3)
  })

  it('query 返回的是可复用数组（同一引用）', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    shs.rebuild(em)
    const r1 = shs.query(0, 0, 10)
    const r2 = shs.query(0, 0, 10)
    expect(r1).toBe(r2)
  })

  it('query 大半径包含远处实体', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id = addEntity(em, 500, 500)
    shs.rebuild(em)
    const result = shs.query(500, 500, 1000)
    expect(result).toContain(id)
  })

  it('query 在负坐标中心也能工作', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id = addEntity(em, 5, 5)
    shs.rebuild(em)
    // 负坐标查询：实体 (5,5) 距离 (-100,-100) 超过 50，不应返回
    const result = shs.query(-100, -100, 50)
    expect(result).not.toContain(id)
  })

  it('query 对同一格子中多个实体全部返回', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 1, 1)
    const id2 = addEntity(em, 2, 2)
    const id3 = addEntity(em, 3, 3)
    shs.rebuild(em)
    const result = shs.query(2, 2, 0)
    expect(result).toContain(id1)
    expect(result).toContain(id2)
    expect(result).toContain(id3)
  })

  it('rebuild 后再 query，结果反映新状态', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id = addEntity(em, 50, 50)
    shs.rebuild(em)
    expect(shs.query(50, 50, 5)).toContain(id)

    em.removeEntity(id)
    shs.rebuild(em)
    expect(shs.query(50, 50, 5)).not.toContain(id)
  })
})

// ─── queryRect ────────────────────────────────────────────────────────────

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
    addEntity(em, 200, 200)
    shs.rebuild(em)
    const result = shs.queryRect(0, 0, 50, 50)
    expect(result).toContain(id1)
  })

  it('矩形范围外的实体不被返回', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 20, 20)
    const id2 = addEntity(em, 200, 200)
    shs.rebuild(em)
    const result = shs.queryRect(0, 0, 50, 50)
    expect(result).not.toContain(id2)
  })

  it('x1>x2 或 y1>y2（反向矩形）也能正确工作', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 20, 20)
    shs.rebuild(em)
    const result = shs.queryRect(50, 50, 0, 0)
    expect(result).toContain(id1)
  })

  it('点矩形（x1=x2, y1=y2）只返回该格子实体', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id = addEntity(em, 8, 8)
    addEntity(em, 100, 100)
    shs.rebuild(em)
    const result = shs.queryRect(8, 8, 8, 8)
    expect(result).toContain(id)
  })

  it('queryRect 返回可复用数组（同一引用）', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    shs.rebuild(em)
    const r1 = shs.queryRect(0, 0, 10, 10)
    const r2 = shs.queryRect(0, 0, 10, 10)
    expect(r1).toBe(r2)
  })

  it('大矩形包含多个 cell 的实体', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 10, 10)
    const id2 = addEntity(em, 100, 100)
    const id3 = addEntity(em, 200, 200)
    shs.rebuild(em)
    const result = shs.queryRect(0, 0, 300, 300)
    expect(result).toContain(id1)
    expect(result).toContain(id2)
    expect(result).toContain(id3)
  })

  it('y 范围精确：恰好在边界上的实体被包含', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id = addEntity(em, 0, 16)  // 恰好在 cell y=1 的边界
    shs.rebuild(em)
    const result = shs.queryRect(0, 16, 32, 32)
    expect(result).toContain(id)
  })

  it('queryRect 与 query 不共享结果数组', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    shs.rebuild(em)
    const rq = shs.query(0, 0, 10)
    const rr = shs.queryRect(0, 0, 10, 10)
    expect(rq).not.toBe(rr)
  })
})

// ─── getNeighbors ─────────────────────────────────────────────────────────

describe('SpatialHashSystem - getNeighbors', () => {
  it('没有位置组件的实体返回空数组', () => {
    const shs = new SpatialHashSystem()
    const em = new EntityManager()
    const id = em.createEntity()
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
    const id2 = addEntity(em, 10, 0)
    const id3 = addEntity(em, 30, 0)
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

  it('半径为 0 时只有紧邻同格实体（不包含自身）', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 0, 0)
    const id2 = addEntity(em, 1, 0)  // 同格，距离 1
    const id3 = addEntity(em, 32, 0) // 不同格
    shs.rebuild(em)
    const result = shs.getNeighbors(id1, 0, em)
    // 半径为 0，只有距离恰好为 0 的才被纳入，id2 距离为 1 不在内
    expect(result).not.toContain(id1)
    expect(result).not.toContain(id3)
  })

  it('getNeighbors 返回可复用数组（同一引用）', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id = addEntity(em, 10, 10)
    addEntity(em, 12, 12)
    shs.rebuild(em)
    const r1 = shs.getNeighbors(id, 10, em)
    const r2 = shs.getNeighbors(id, 10, em)
    expect(r1).toBe(r2)
  })

  it('恰好在半径边界上的实体被包含（<=）', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 0, 0)
    const id2 = addEntity(em, 10, 0)  // 距离 = 10 = radius
    shs.rebuild(em)
    const result = shs.getNeighbors(id1, 10, em)
    expect(result).toContain(id2)
  })

  it('对角线方向的邻居距离计算正确', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 0, 0)
    // 对角线距离 = sqrt(8^2 + 6^2) = 10
    const id2 = addEntity(em, 8, 6)
    shs.rebuild(em)
    const result = shs.getNeighbors(id1, 10, em)
    expect(result).toContain(id2)
  })

  it('rebuild 后再 getNeighbors 反映新实体状态', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const center = addEntity(em, 50, 50)
    shs.rebuild(em)
    // 还没有邻居
    expect(shs.getNeighbors(center, 10, em)).toHaveLength(0)

    addEntity(em, 55, 50)
    shs.rebuild(em)
    expect(shs.getNeighbors(center, 10, em)).toHaveLength(1)
  })
})

// ─── 不同 cellSize ────────────────────────────────────────────────────────

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

  it('默认 cellSize=16 时行为与显式 new SpatialHashSystem(16) 一致', () => {
    const shs1 = new SpatialHashSystem()
    const shs2 = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 100, 100)
    shs1.rebuild(em)
    shs2.rebuild(em)
    expect(shs1.getCellCount()).toBe(shs2.getCellCount())
  })

  it('cellSize=32：(0,0) 和 (31,0) 在同一格子', () => {
    const shs = new SpatialHashSystem(32)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 31, 0)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(1)
  })

  it('cellSize=32：(0,0) 和 (32,0) 在不同格子', () => {
    const shs = new SpatialHashSystem(32)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 32, 0)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(2)
  })
})

// ─── bucket pool 复用机制 ─────────────────────────────────────────────────

describe('SpatialHashSystem - bucket pool 复用', () => {
  it('多次 rebuild 不会无限增长 activeBuckets', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    for (let i = 0; i < 20; i++) addEntity(em, i * 20, 0)
    shs.rebuild(em)
    const after1 = (shs as any).activeBuckets.length
    shs.rebuild(em)
    const after2 = (shs as any).activeBuckets.length
    expect(after1).toBe(after2)
  })

  it('rebuild 后 cells.size 等于 activeBuckets.length', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    addEntity(em, 50, 50)
    addEntity(em, 100, 100)
    shs.rebuild(em)
    const cells = (shs as any).cells as Map<number, number[]>
    const active = (shs as any).activeBuckets as number[][]
    expect(cells.size).toBe(active.length)
  })

  it('rebuild 后 bucketPool 或 activeBuckets 持有的 bucket 都已清空旧数据', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 0, 0)
    shs.rebuild(em)
    // 第二次 rebuild 会把之前的 bucket 放回 pool
    shs.rebuild(em)
    const pool = (shs as any).bucketPool as number[][]
    pool.forEach(b => expect(b.length).toBe(0))
  })
})

// ─── key 函数边界 ──────────────────────────────────────────────────────────

describe('SpatialHashSystem - 内部 key 函数', () => {
  it('key(cx, cy) = cy*10000 + cx', () => {
    const shs = new SpatialHashSystem(1)
    const keyFn = (shs as any).key.bind(shs)
    expect(keyFn(3, 5)).toBe(5 * 10000 + 3)
  })

  it('不同 (cx, cy) 产生不同 key', () => {
    const shs = new SpatialHashSystem(1)
    const keyFn = (shs as any).key.bind(shs)
    expect(keyFn(1, 0)).not.toBe(keyFn(0, 1))
  })
})

// ─── 综合场景 ─────────────────────────────────────────────────────────────

describe('SpatialHashSystem - 综合场景', () => {
  it('混合 query 和 queryRect 结果一致（相同区域）', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 10, 10)
    addEntity(em, 20, 20)
    shs.rebuild(em)
    const q = shs.query(15, 15, 15)
    const r = shs.queryRect(0, 0, 30, 30)
    // queryRect 至少包含 query 的结果（queryRect 按格子，query 不精确过滤）
    q.forEach(id => expect(r).toContain(id))
  })

  it('100 个实体随机分布后 query 不抛错', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    for (let i = 0; i < 100; i++) {
      addEntity(em, Math.random() * 1000, Math.random() * 1000)
    }
    shs.rebuild(em)
    expect(() => shs.query(500, 500, 200)).not.toThrow()
  })

  it('实体重叠（同坐标）不报错', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    addEntity(em, 10, 10)
    addEntity(em, 10, 10)
    shs.rebuild(em)
    expect(shs.getCellCount()).toBe(1)
    expect(shs.query(10, 10, 0)).toHaveLength(2)
  })

  it('getNeighbors 大量实体性能不崩溃', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const center = addEntity(em, 500, 500)
    for (let i = 0; i < 200; i++) {
      addEntity(em, 500 + (i % 20) * 5, 500 + Math.floor(i / 20) * 5)
    }
    shs.rebuild(em)
    expect(() => shs.getNeighbors(center, 50, em)).not.toThrow()
  })

  it('先 queryRect 再 query 两个结果互不干扰', () => {
    const shs = new SpatialHashSystem(16)
    const em = new EntityManager()
    const id1 = addEntity(em, 10, 10)
    const id2 = addEntity(em, 500, 500)
    shs.rebuild(em)
    const r1 = Array.from(shs.queryRect(0, 0, 20, 20))
    shs.query(500, 500, 5)
    // queryRect 结果已是可复用数组，但内容在下次 queryRect 调用前稳定
    expect(r1).toContain(id1)
  })
})
