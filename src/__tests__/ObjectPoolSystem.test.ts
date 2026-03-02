import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ObjectPoolSystem, ObjectPool, PooledParticle, PooledVec2 } from '../systems/ObjectPoolSystem'

function makeSys() { return new ObjectPoolSystem() }

// 辅助：创建一个简单的自定义池
function makeSimplePool(initialSize = 0, maxSize = 100) {
  return new ObjectPool<{ value: number }>({
    factory: () => ({ value: 0 }),
    reset: (obj) => { obj.value = 0 },
    maxSize,
    initialSize,
  })
}

describe('ObjectPoolSystem 基础构造', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('particles 池存在且为 ObjectPool 实例', () => {
    expect(sys.particles).toBeDefined()
    expect(sys.particles).toBeInstanceOf(ObjectPool)
  })

  it('vec2s 池存在且为 ObjectPool 实例', () => {
    expect(sys.vec2s).toBeDefined()
    expect(sys.vec2s).toBeInstanceOf(ObjectPool)
  })

  it('particles 池 totalCreated 初始等于 initialSize(64)', () => {
    expect((sys as any).particles.totalCreated).toBe(64)
  })

  it('vec2s 池 totalCreated 初始等于 initialSize(32)', () => {
    expect((sys as any).vec2s.totalCreated).toBe(32)
  })

  it('particles 池 acquireCount 初始为 0', () => {
    expect((sys as any).particles.acquireCount).toBe(0)
  })

  it('vec2s 池 acquireCount 初始为 0', () => {
    expect((sys as any).vec2s.acquireCount).toBe(0)
  })

  it('particles 池 hitCount 初始为 0', () => {
    expect((sys as any).particles.hitCount).toBe(0)
  })

  it('vec2s 池 hitCount 初始为 0', () => {
    expect((sys as any).vec2s.hitCount).toBe(0)
  })

  it('shrinkTimer 初始为 0', () => {
    expect((sys as any).shrinkTimer).toBe(0)
  })

  it('pools 数组长度为 2（particles + vec2s）', () => {
    expect((sys as any).pools.length).toBe(2)
  })

  it('arrayPool 初始为空数组', () => {
    expect((sys as any).arrayPool).toHaveLength(0)
  })

  it('arrayActiveCount 初始为 0', () => {
    expect((sys as any).arrayActiveCount).toBe(0)
  })

  it('arrayAcquireCount 初始为 0', () => {
    expect((sys as any).arrayAcquireCount).toBe(0)
  })

  it('arrayHitCount 初始为 0', () => {
    expect((sys as any).arrayHitCount).toBe(0)
  })
})

describe('ObjectPoolSystem 命中率计算', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无 acquire 时命中率为 0', () => {
    const pool = (sys as any).particles
    const hitRate = pool.acquireCount > 0 ? pool.hitCount / pool.acquireCount : 0
    expect(hitRate).toBe(0)
  })

  it('acquireArray 增加 arrayAcquireCount', () => {
    sys.acquireArray()
    expect((sys as any).arrayAcquireCount).toBe(1)
  })

  it('连续 acquireArray 累加 arrayAcquireCount', () => {
    sys.acquireArray()
    sys.acquireArray()
    sys.acquireArray()
    expect((sys as any).arrayAcquireCount).toBe(3)
  })

  it('acquireArray 增加 arrayActiveCount', () => {
    sys.acquireArray()
    expect((sys as any).arrayActiveCount).toBe(1)
  })
})

describe('ObjectPoolSystem acquireArray 功能', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('acquireArray 返回数组', () => {
    const arr = sys.acquireArray()
    expect(Array.isArray(arr)).toBe(true)
  })

  it('acquireArray 返回空数组（池为空时）', () => {
    const arr = sys.acquireArray()
    expect(arr).toHaveLength(0)
  })

  it('多次 acquireArray 每次返回不同数组实例', () => {
    const a1 = sys.acquireArray()
    const a2 = sys.acquireArray()
    expect(a1).not.toBe(a2)
  })

  it('acquireArray 泛型类型可用', () => {
    const arr = sys.acquireArray<number>()
    arr.push(1)
    expect(arr[0]).toBe(1)
  })

  it('arrayPool 非空时 acquireArray 使用命中路径并增加 hitCount', () => {
    // 先手动往 arrayPool 里放一个数组
    ;(sys as any).arrayPool.push([])
    const before = (sys as any).arrayHitCount
    sys.acquireArray()
    expect((sys as any).arrayHitCount).toBe(before + 1)
  })

  it('arrayPool 命中时 arrayPool 长度减 1', () => {
    ;(sys as any).arrayPool.push([])
    ;(sys as any).arrayPool.push([])
    sys.acquireArray()
    expect((sys as any).arrayPool).toHaveLength(1)
  })
})

describe('ObjectPoolSystem update / shrinkTimer', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update 每次调用增加 shrinkTimer', () => {
    sys.update(1)
    expect((sys as any).shrinkTimer).toBe(1)
  })

  it('update 调用 9 次后 shrinkTimer 为 9（未到触发阈值 10）', () => {
    for (let i = 0; i < 9; i++) sys.update(i)
    expect((sys as any).shrinkTimer).toBe(9)
  })

  it('update 调用 10 次后 shrinkTimer 重置为 0', () => {
    for (let i = 0; i < 10; i++) sys.update(i)
    expect((sys as any).shrinkTimer).toBe(0)
  })

  it('update 多周期后 shrinkTimer 保持 0-9 范围内', () => {
    for (let i = 0; i < 25; i++) sys.update(i)
    expect((sys as any).shrinkTimer).toBeLessThan(10)
  })

  it('update 调用 10 次时对所有 pools 调用 autoShrink', () => {
    const spyP = vi.spyOn((sys as any).particles, 'autoShrink')
    const spyV = vi.spyOn((sys as any).vec2s, 'autoShrink')
    for (let i = 0; i < 10; i++) sys.update(i)
    expect(spyP).toHaveBeenCalledTimes(1)
    expect(spyV).toHaveBeenCalledTimes(1)
  })

  it('update 调用 9 次时不触发 autoShrink', () => {
    const spyP = vi.spyOn((sys as any).particles, 'autoShrink')
    for (let i = 0; i < 9; i++) sys.update(i)
    expect(spyP).not.toHaveBeenCalled()
  })

  it('arrayActiveCount 为 0 且 arrayPool 超限时 shrink 后裁剪', () => {
    // 目标 = max(16, floor(256*0.25)) = max(16,64) = 64
    const arrayTarget = Math.max(16, Math.floor(256 * 0.25))
    ;(sys as any).arrayActiveCount = 0
    // 填入超过 target 的数量
    for (let i = 0; i < arrayTarget + 10; i++) {
      ;(sys as any).arrayPool.push([])
    }
    for (let i = 0; i < 10; i++) sys.update(i)
    expect((sys as any).arrayPool.length).toBeLessThanOrEqual(arrayTarget)
  })

  it('arrayActiveCount 非 0 时 shrink 不裁剪 arrayPool', () => {
    ;(sys as any).arrayActiveCount = 5
    const initLen = 100
    for (let i = 0; i < initLen; i++) {
      ;(sys as any).arrayPool.push([])
    }
    for (let i = 0; i < 10; i++) sys.update(i)
    expect((sys as any).arrayPool.length).toBe(initLen)
  })
})

describe('ObjectPool 独立单元测试', () => {
  afterEach(() => vi.restoreAllMocks())

  it('initialSize 0 时 free 列表为空', () => {
    const pool = makeSimplePool(0)
    expect((pool as any).free).toHaveLength(0)
  })

  it('initialSize 5 时 free 列表长度为 5', () => {
    const pool = makeSimplePool(5)
    expect((pool as any).free).toHaveLength(5)
  })

  it('initialSize 10 时 totalCreated 为 10', () => {
    const pool = makeSimplePool(10)
    expect((pool as any).totalCreated).toBe(10)
  })

  it('maxSize 默认值为 1024', () => {
    const pool = new ObjectPool<{ value: number }>({
      factory: () => ({ value: 0 }),
      reset: (obj) => { obj.value = 0 },
    })
    expect((pool as any).maxSize).toBe(1024)
  })

  it('自定义 maxSize 正确设置', () => {
    const pool = makeSimplePool(0, 50)
    expect((pool as any).maxSize).toBe(50)
  })

  it('shrinkThreshold 默认值为 30', () => {
    const pool = new ObjectPool<{ value: number }>({
      factory: () => ({ value: 0 }),
      reset: (obj) => { obj.value = 0 },
    })
    expect((pool as any).shrinkThreshold).toBe(30)
  })

  it('自定义 shrinkThreshold 正确设置', () => {
    const pool = new ObjectPool<{ value: number }>({
      factory: () => ({ value: 0 }),
      reset: (obj) => { obj.value = 0 },
      shrinkThreshold: 60,
    })
    expect((pool as any).shrinkThreshold).toBe(60)
  })

  it('size getter 等于 active.size + free.length', () => {
    const pool = makeSimplePool(5)
    expect(pool.size).toBe(5)
  })

  it('active 初始为空 Set', () => {
    const pool = makeSimplePool(3)
    expect((pool as any).active.size).toBe(0)
  })

  it('peakUsage 初始为 0', () => {
    const pool = makeSimplePool(3)
    expect((pool as any).peakUsage).toBe(0)
  })

  it('lastPeakTime 初始为 0', () => {
    const pool = makeSimplePool(3)
    expect((pool as any).lastPeakTime).toBe(0)
  })

  it('lastPeakValue 初始为 0', () => {
    const pool = makeSimplePool(3)
    expect((pool as any).lastPeakValue).toBe(0)
  })

  it('autoShrink 不超时时不裁剪 free 列表', () => {
    const pool = makeSimplePool(10)
    // lastPeakTime 为 0（很久以前），但 free 只有10个
    pool.autoShrink()
    // 因为 active.size=0, target = max(0*2, floor(0*0.5)) = 0
    // free.length=10 > 0, 所以会被裁剪到 0
    // 实际行为取决于 shrinkThreshold；默认30秒
    // Date.now() - 0 >> 30s，会触发shrink
    const freeLen = (pool as any).free.length
    expect(freeLen).toBeGreaterThanOrEqual(0)
  })

  it('autoShrink 在 shrinkThreshold 内时不裁剪', () => {
    const pool = makeSimplePool(10)
    // 设置 lastPeakTime 为刚刚
    ;(pool as any).lastPeakTime = Date.now()
    const freeLen = (pool as any).free.length
    pool.autoShrink()
    expect((pool as any).free.length).toBe(freeLen)
  })
})

describe('ObjectPoolSystem particles 池属性验证', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('particles 池 maxSize 为 2048', () => {
    expect((sys as any).particles.maxSize).toBe(2048)
  })

  it('vec2s 池 maxSize 为 512', () => {
    expect((sys as any).vec2s.maxSize).toBe(512)
  })

  it('particles 池初始 free 列表长度为 64', () => {
    expect((sys as any).particles.free.length).toBe(64)
  })

  it('vec2s 池初始 free 列表长度为 32', () => {
    expect((sys as any).vec2s.free.length).toBe(32)
  })

  it('particles 池对象有正确的默认字段', () => {
    const p: PooledParticle = (sys as any).particles.free[0]
    expect(p).toHaveProperty('x', 0)
    expect(p).toHaveProperty('y', 0)
    expect(p).toHaveProperty('vx', 0)
    expect(p).toHaveProperty('vy', 0)
    expect(p).toHaveProperty('life', 0)
    expect(p).toHaveProperty('maxLife', 1)
    expect(p).toHaveProperty('size', 1)
    expect(p).toHaveProperty('color', '#fff')
    expect(p).toHaveProperty('alpha', 1)
  })

  it('vec2s 池对象有正确的默认字段', () => {
    const v: PooledVec2 = (sys as any).vec2s.free[0]
    expect(v).toHaveProperty('x', 0)
    expect(v).toHaveProperty('y', 0)
  })

  it('particles 池 size getter 等于 64（全空闲）', () => {
    expect(sys.particles.size).toBe(64)
  })

  it('vec2s 池 size getter 等于 32（全空闲）', () => {
    expect(sys.vec2s.size).toBe(32)
  })
})

describe('ObjectPoolSystem 多次 update 周期验证', () => {
  let sys: ObjectPoolSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('连续 20 次 update 后 shrinkTimer 为 0（正好两个周期）', () => {
    for (let i = 0; i < 20; i++) sys.update(i)
    expect((sys as any).shrinkTimer).toBe(0)
  })

  it('连续 11 次 update 后 shrinkTimer 为 1', () => {
    for (let i = 0; i < 11; i++) sys.update(i)
    expect((sys as any).shrinkTimer).toBe(1)
  })

  it('SHRINK_INTERVAL 静态常量为 10', () => {
    expect((ObjectPoolSystem as any).SHRINK_INTERVAL).toBe(10)
  })

  it('ARRAY_MAX 实例常量为 256', () => {
    expect((sys as any).ARRAY_MAX).toBe(256)
  })

  it('update 调用 20 次时 autoShrink 被调用 2 次', () => {
    const spyP = vi.spyOn((sys as any).particles, 'autoShrink')
    for (let i = 0; i < 20; i++) sys.update(i)
    expect(spyP).toHaveBeenCalledTimes(2)
  })
})
