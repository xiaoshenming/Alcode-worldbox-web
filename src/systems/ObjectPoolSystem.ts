/**
 * ObjectPoolSystem - Generic object pooling to reduce GC pressure
 * for frequently created/destroyed objects (particles, vectors, temp arrays, etc.)
 */

// ---------------------------------------------------------------------------
// Pool configuration & statistics
// ---------------------------------------------------------------------------

export interface PoolConfig<T> {
  factory: () => T
  reset: (obj: T) => void
  maxSize?: number
  initialSize?: number
  shrinkThreshold?: number // seconds of idle before auto-shrink
}

// ---------------------------------------------------------------------------
// ObjectPool<T> - generic acquire/release pool
// ---------------------------------------------------------------------------

export class ObjectPool<T> {
  private free: T[] = []
  private active: Set<T> = new Set()
  private factory: () => T
  private resetFn: (obj: T) => void
  private maxSize: number
  private shrinkThreshold: number

  private totalCreated = 0
  private peakUsage = 0
  private acquireCount = 0
  private hitCount = 0
  private lastPeakTime = 0
  private lastPeakValue = 0

  constructor(config: PoolConfig<T>) {
    this.factory = config.factory
    this.resetFn = config.reset
    this.maxSize = config.maxSize ?? 1024
    this.shrinkThreshold = config.shrinkThreshold ?? 30

    const initial = config.initialSize ?? 0
    for (let i = 0; i < initial; i++) {
      this.free.push(this.factory())
      this.totalCreated++
    }
  }

  acquire(): T {
    this.acquireCount++
    let obj: T
    if (this.free.length > 0) {
      obj = this.free.pop()!
      this.hitCount++
    } else {
      obj = this.factory()
      this.totalCreated++
    }
    this.active.add(obj)
    if (this.active.size > this.peakUsage) {
      this.peakUsage = this.active.size
      this.lastPeakTime = Date.now()
      this.lastPeakValue = this.peakUsage
    }
    return obj
  }

  release(obj: T): void {
    if (!this.active.has(obj)) return
    this.active.delete(obj)
    this.resetFn(obj)
    if (this.free.length < this.maxSize) {
      this.free.push(obj)
    }
  }

  releaseAll(): void {
    for (const obj of this.active) {
      this.resetFn(obj)
      if (this.free.length < this.maxSize) {
        this.free.push(obj)
      }
    }
    this.active.clear()
  }

  /** Shrink free list if pool has been oversized for too long. */
  autoShrink(): void {
    const now = Date.now()
    const idleSeconds = (now - this.lastPeakTime) / 1000
    if (idleSeconds < this.shrinkThreshold) return

    // Keep free list at 2x current active or half of last peak, whichever is larger
    const target = Math.max(this.active.size * 2, Math.floor(this.lastPeakValue * 0.5))
    if (this.free.length > target) {
      this.free.length = target
    }
  }

  get size(): number {
    return this.active.size + this.free.length
  }
}

// ---------------------------------------------------------------------------
// Pre-built poolable types
// ---------------------------------------------------------------------------

export interface PooledParticle {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  size: number
  color: string
  alpha: number
}

export interface PooledVec2 {
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// ObjectPoolSystem - manages particle, vec2, and temp array pools
// ---------------------------------------------------------------------------

export class ObjectPoolSystem {
  readonly particles: ObjectPool<PooledParticle>
  readonly vec2s: ObjectPool<PooledVec2>

  private arrayPool: unknown[][] = []
  private arrayActiveCount = 0
  private arrayAcquireCount = 0
  private arrayHitCount = 0
  private readonly ARRAY_MAX = 256

  private pools: ObjectPool<unknown>[] = []
  private shrinkTimer = 0
  private static readonly SHRINK_INTERVAL = 10 // ticks between shrink checks

  constructor() {
    this.particles = this.register(new ObjectPool<PooledParticle>({
      factory: () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#fff', alpha: 1 }),
      reset: (p) => { p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.life = 0; p.maxLife = 1; p.size = 1; p.color = '#fff'; p.alpha = 1 },
      maxSize: 2048,
      initialSize: 64,
    }))

    this.vec2s = this.register(new ObjectPool<PooledVec2>({
      factory: () => ({ x: 0, y: 0 }),
      reset: (v) => { v.x = 0; v.y = 0 },
      maxSize: 512,
      initialSize: 32,
    }))
  }

  private register<T>(pool: ObjectPool<T>): ObjectPool<T> {
    this.pools.push(pool as ObjectPool<unknown>)
    return pool
  }

  // ---- Temp array pool (type-erased, caller casts) ----

  acquireArray<T>(): T[] {
    this.arrayAcquireCount++
    if (this.arrayPool.length > 0) {
      this.arrayHitCount++
      this.arrayActiveCount++
      return this.arrayPool.pop()! as T[]
    }
    this.arrayActiveCount++
    return [] as T[]
  }

  releaseArray(arr: unknown[]): void {
    arr.length = 0
    if (this.arrayPool.length < this.ARRAY_MAX) {
      this.arrayPool.push(arr)
    }
    this.arrayActiveCount = Math.max(0, this.arrayActiveCount - 1)
  }

  // ---- Lifecycle ----

  update(tick: number): void {
    this.shrinkTimer++
    if (this.shrinkTimer >= ObjectPoolSystem.SHRINK_INTERVAL) {
      this.shrinkTimer = 0
      for (let i = 0; i < this.pools.length; i++) {
        this.pools[i].autoShrink()
      }
      // Shrink array pool if oversized
      const arrayTarget = Math.max(16, Math.floor(this.ARRAY_MAX * 0.25))
      if (this.arrayPool.length > arrayTarget && this.arrayActiveCount === 0) {
        this.arrayPool.length = arrayTarget
      }
    }
  }
}
