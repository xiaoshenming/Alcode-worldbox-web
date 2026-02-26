import { EntityManager, PositionComponent } from '../ecs/Entity'

export class SpatialHashSystem {
  private cellSize: number
  private cells: Map<number, number[]> = new Map()
  /** Reusable bucket pool to avoid allocations in rebuild */
  private bucketPool: number[][] = []
  private activeBuckets: number[][] = []
  /** Reusable result arrays for query/queryRect/getNeighbors to reduce GC */
  private queryResult: number[] = []
  private queryRectResult: number[] = []
  private neighborsResult: number[] = []

  constructor(cellSize: number = 16) {
    this.cellSize = cellSize
  }

  /** Numeric key: cy * 10000 + cx (supports maps up to 10000 cells wide) */
  private key(cx: number, cy: number): number {
    return cy * 10000 + cx
  }

  private toCell(v: number): number {
    return (v / this.cellSize) | 0
  }

  rebuild(em: EntityManager): void {
    // Return active buckets to pool (clear length but keep allocation)
    for (let i = 0; i < this.activeBuckets.length; i++) {
      this.activeBuckets[i].length = 0
      this.bucketPool.push(this.activeBuckets[i])
    }
    this.activeBuckets.length = 0
    this.cells.clear()

    const ids = em.getEntitiesWithComponents('position')
    for (let i = 0; i < ids.length; i++) {
      const pos = em.getComponent<PositionComponent>(ids[i], 'position')
      if (!pos) continue
      const k = this.key(this.toCell(pos.x), this.toCell(pos.y))
      const bucket = this.cells.get(k)
      if (bucket) {
        bucket.push(ids[i])
      } else {
        // Reuse pooled bucket or allocate new one
        const newBucket = this.bucketPool.length > 0 ? this.bucketPool.pop()! : []
        newBucket.push(ids[i])
        this.cells.set(k, newBucket)
        this.activeBuckets.push(newBucket)
      }
    }
  }

  query(x: number, y: number, radius: number): number[] {
    const minCX = this.toCell(x - radius)
    const maxCX = this.toCell(x + radius)
    const minCY = this.toCell(y - radius)
    const maxCY = this.toCell(y + radius)
    const result = this.queryResult
    result.length = 0
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const bucket = this.cells.get(this.key(cx, cy))
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            result.push(bucket[i])
          }
        }
      }
    }
    return result
  }

  queryRect(x1: number, y1: number, x2: number, y2: number): number[] {
    const minCX = this.toCell(Math.min(x1, x2))
    const maxCX = this.toCell(Math.max(x1, x2))
    const minCY = this.toCell(Math.min(y1, y2))
    const maxCY = this.toCell(Math.max(y1, y2))
    const result = this.queryRectResult
    result.length = 0
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const bucket = this.cells.get(this.key(cx, cy))
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            result.push(bucket[i])
          }
        }
      }
    }
    return result
  }

  getNeighbors(entityId: number, radius: number, em: EntityManager): number[] {
    const pos = em.getComponent<PositionComponent>(entityId, 'position')
    if (!pos) return []
    const candidates = this.query(pos.x, pos.y, radius)
    const r2 = radius * radius
    const result = this.neighborsResult
    result.length = 0
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i] === entityId) continue
      const other = em.getComponent<PositionComponent>(candidates[i], 'position')
      if (!other) continue
      const dx = other.x - pos.x
      const dy = other.y - pos.y
      if (dx * dx + dy * dy <= r2) {
        result.push(candidates[i])
      }
    }
    return result
  }

  getCellCount(): number {
    return this.cells.size
  }
}
