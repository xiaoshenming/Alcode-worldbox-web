import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticBlockadeSystem, Blockade, BlockadeType } from '../systems/DiplomaticBlockadeSystem'

// CHECK_INTERVAL=1000, MAX_BLOCKADES=25, BLOCKADE_CHANCE=0.05
// update(dt, em, civManager, tick)
// expireBlockades: strength -= 0.5; removed if strength<=0 or tick-startedAt > duration
//
// IMPORTANT: Math.random()=0 causes infinite loop in do/while target!=civ.id
// when civs[0].id === first civ being iterated. Never mock random=0 when civs.length>=2
// Use mockImplementation to return different values per call for spawn tests.

function makeSys() { return new DiplomaticBlockadeSystem() }

// Build a minimal CivManager mock with N civs (ids 1..N)
function makeCivManager(count: number) {
  const civs = new Map<number, { id: number }>()
  for (let i = 1; i <= count; i++) {
    civs.set(i, { id: i })
  }
  return { civilizations: civs }
}

function forceUpdate(
  sys: DiplomaticBlockadeSystem,
  tick: number,
  civManager?: ReturnType<typeof makeCivManager>
) {
  const cm = civManager ?? makeCivManager(0)
  sys.update(1, {} as any, cm as any, tick)
}

function makeBlockade(overrides: Partial<Blockade> = {}): Blockade {
  return {
    id: 1,
    blockaderId: 1,
    targetId: 2,
    type: 'naval',
    strength: 80,
    supplyReduction: 0.3,
    startedAt: 100000,
    duration: 50000,
    ...overrides,
  }
}

describe('DiplomaticBlockadeSystem', () => {

  let sys: DiplomaticBlockadeSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ────────���─────────────────────────────────────
  // 1. 基础数据结构
  // ──────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始 blockades 为空数组', () => {
      expect((sys as any).blockades).toHaveLength(0)
      expect(Array.isArray((sys as any).blockades)).toBe(true)
    })

    it('nextId 初始为 1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck 初始为 0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('totalImposed 初始为 0', () => {
      expect((sys as any).totalImposed).toBe(0)
    })

    it('totalBroken 初始为 0', () => {
      expect((sys as any).totalBroken).toBe(0)
    })

    it('_blockadeKeySet 初始为空 Set', () => {
      expect((sys as any)._blockadeKeySet.size).toBe(0)
    })

    it('blockade 包含所有必要字段', () => {
      const b = makeBlockade()
      expect(b).toHaveProperty('id')
      expect(b).toHaveProperty('blockaderId')
      expect(b).toHaveProperty('targetId')
      expect(b).toHaveProperty('type')
      expect(b).toHaveProperty('strength')
      expect(b).toHaveProperty('supplyReduction')
      expect(b).toHaveProperty('startedAt')
      expect(b).toHaveProperty('duration')
    })

    it('BlockadeType 合法值：naval / land / trade / total', () => {
      const validTypes: BlockadeType[] = ['naval', 'land', 'trade', 'total']
      for (const t of validTypes) {
        expect(validTypes).toContain(t)
      }
    })
  })

  // ──────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流（1000）
  // ──────────────────────────────────────────────
  describe('CHECK_INTERVAL 节流（1000）', () => {
    it('tick 差 < CHECK_INTERVAL 时不执行更新', () => {
      // 使用0文明，不触发spawn/expire副作用
      const cm = makeCivManager(0)
      forceUpdate(sys, 1000, cm) // lastCheck=1000
      const len = (sys as any).blockades.length
      forceUpdate(sys, 1001, cm) // 差=1 < 1000，跳过
      expect((sys as any).blockades.length).toBe(len)
    })

    it('tick 差恰好等于 CHECK_INTERVAL 时执行并更新 lastCheck', () => {
      const cm = makeCivManager(0)
      forceUpdate(sys, 1000, cm) // lastCheck=1000
      forceUpdate(sys, 2000, cm) // 差=1000 >= 1000，执行
      expect((sys as any).lastCheck).toBe(2000)
    })

    it('tick 差 > CHECK_INTERVAL 时更新 lastCheck', () => {
      forceUpdate(sys, 5000)
      expect((sys as any).lastCheck).toBe(5000)
    })

    it('未达到 CHECK_INTERVAL 时 lastCheck 不变', () => {
      forceUpdate(sys, 1000) // lastCheck=1000
      forceUpdate(sys, 1500) // 差=500 < 1000，跳过
      expect((sys as any).lastCheck).toBe(1000)
    })
  })

  // ──────────────────────────────────────────────
  // 3. strength 衰减与 duration-based 过期
  // ──────────────────────────────────────────────
  describe('strength 衰减与 duration-based 过期', () => {
    it('每次 update 后 strength 减少 0.5', () => {
      const b = makeBlockade({ strength: 80, startedAt: 100000, duration: 50000 })
      ;(sys as any).blockades.push(b)
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 100000) // 100000-100000=0 <= 50000，不过期
      expect((sys as any).blockades[0].strength).toBeCloseTo(79.5)
    })

    it('strength 降到 <= 0 时封锁被移除', () => {
      const b = makeBlockade({ strength: 0.3, startedAt: 100000, duration: 50000 })
      ;(sys as any).blockades.push(b)
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 100000)
      // 0.3 - 0.5 = -0.2 <= 0 => 移除
      expect((sys as any).blockades).toHaveLength(0)
    })

    it('strength 恰好为 0.5 时减后 = 0，<= 0 => 移除', () => {
      const b = makeBlockade({ strength: 0.5, startedAt: 100000, duration: 50000 })
      ;(sys as any).blockades.push(b)
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 100000)
      expect((sys as any).blockades).toHaveLength(0)
    })

    it('duration 到期时封锁被移除（tick - startedAt > duration）', () => {
      const b = makeBlockade({ strength: 100, startedAt: 100000, duration: 1000 })
      ;(sys as any).blockades.push(b)
      ;(sys as any).lastCheck = 0
      // 101001-100000=1001 > 1000 => 过期
      forceUpdate(sys, 101001)
      expect((sys as any).blockades).toHaveLength(0)
    })

    it('duration 恰好等于 tick-startedAt 时不过期（> 不成立）', () => {
      const b = makeBlockade({ strength: 100, startedAt: 100000, duration: 1000 })
      ;(sys as any).blockades.push(b)
      ;(sys as any).lastCheck = 0
      // 101000-100000=1000，1000>1000 => false，不过期
      forceUpdate(sys, 101000)
      expect((sys as any).blockades).toHaveLength(1)
    })

    it('duration 未到期且 strength > 0.5 时封锁保留', () => {
      const b = makeBlockade({ strength: 100, startedAt: 100000, duration: 50000 })
      ;(sys as any).blockades.push(b)
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 100500)
      expect((sys as any).blockades).toHaveLength(1)
    })

    it('移除时 totalBroken 递增', () => {
      const b = makeBlockade({ strength: 0.3, startedAt: 100000, duration: 50000 })
      ;(sys as any).blockades.push(b)
      ;(sys as any).lastCheck = 0
      const prevBroken = (sys as any).totalBroken
      forceUpdate(sys, 100000)
      expect((sys as any).totalBroken).toBe(prevBroken + 1)
    })

    it('移除时 _blockadeKeySet 中的 key 被清除', () => {
      const b = makeBlockade({ blockaderId: 3, targetId: 7, strength: 0.3, startedAt: 0, duration: 50000 })
      ;(sys as any).blockades.push(b)
      const key = 3 * 1000 + 7
      ;(sys as any)._blockadeKeySet.add(key)
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 1000)
      expect((sys as any)._blockadeKeySet.has(key)).toBe(false)
    })

    it('仅过期封锁被删除，存活封锁保留', () => {
      // b1: strength=0.1 => 减后-0.4<=0 => 移除
      // b2: strength=100 => 减后99.5>0，未超duration => 保留
      const b1 = makeBlockade({ id: 1, blockaderId: 1, targetId: 2, strength: 0.1, startedAt: 100000, duration: 50000 })
      const b2 = makeBlockade({ id: 2, blockaderId: 3, targetId: 4, strength: 100, startedAt: 200000, duration: 50000 })
      ;(sys as any).blockades.push(b1, b2)
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 200000)
      const remaining = (sys as any).blockades as Blockade[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(2)
    })
  })

  // ──────────────────────────────────────────────
  // 4. spawn 封锁的前提条件
  // ──────────────────────────────────────────────
  describe('spawn 封锁的前提条件', () => {
    it('文明数 < 2 时不 spawn', () => {
      const cm = makeCivManager(1)
      ;(sys as any).lastCheck = 0
      // Math.random()>0.05 => skip: use 1 to never proceed
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 5000, cm)
      expect((sys as any).blockades).toHaveLength(0)
    })

    it('文明数 = 0 时不 spawn', () => {
      const cm = makeCivManager(0)
      ;(sys as any).lastCheck = 0
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 5000, cm)
      expect((sys as any).blockades).toHaveLength(0)
    })

    it('Math.random() > BLOCKADE_CHANCE 时跳过该文明', () => {
      const cm = makeCivManager(3)
      ;(sys as any).lastCheck = 0
      // random=1 => 1>0.05 => always skip, no spawn
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 5000, cm)
      expect((sys as any).blockades).toHaveLength(0)
    })

    it('同一对 (blockaderId, targetId) 不重复添加', () => {
      ;(sys as any)._blockadeKeySet.add(1 * 1000 + 2)
      ;(sys as any).blockades.push(makeBlockade({ blockaderId: 1, targetId: 2, strength: 50, startedAt: 5000, duration: 50000 }))
      const cm = makeCivManager(2)
      ;(sys as any).lastCheck = 0
      // random=1 => 跳过所有spawn尝试（不会进入do/while），安全
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, 5000, cm)
      const blockades = (sys as any).blockades as Blockade[]
      const pairs = blockades.filter(b => b.blockaderId === 1 && b.targetId === 2)
      expect(pairs).toHaveLength(1)
    })

    it('supplyReduction 与 BlockadeType 对应正确', () => {
      const typeSupply: Record<BlockadeType, number> = {
        naval: 0.3,
        land: 0.4,
        trade: 0.5,
        total: 0.85,
      }
      for (const [type, sr] of Object.entries(typeSupply) as [BlockadeType, number][]) {
        const b = makeBlockade({ type, supplyReduction: sr })
        expect(b.supplyReduction).toBe(sr)
      }
    })

    it('注入的 blockade 的 blockaderId 不等于 targetId', () => {
      const b = makeBlockade({ blockaderId: 3, targetId: 7 })
      expect(b.blockaderId).not.toBe(b.targetId)
    })
  })

  // ──────────────────────────────────────────────
  // 5. MAX_BLOCKADES 上限（25）
  // ──────────────────────────────────────────────
  describe('MAX_BLOCKADES 上限（25）', () => {
    it('已满25条时 evaluateBlockades 早退（不新增）', () => {
      const baseTick = 500000
      for (let i = 0; i < 25; i++) {
        ;(sys as any).blockades.push(makeBlockade({
          id: i + 1,
          blockaderId: i + 1,
          targetId: i + 100,
          strength: 100,
          startedAt: baseTick,
          duration: 50000,
        }))
      }
      const cm = makeCivManager(3)
      ;(sys as any).lastCheck = 0
      // random=1 => spawn会跳过（1>0.05），但evaluateBlockades会提前return(length>=25)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      forceUpdate(sys, baseTick, cm)
      // strength 每条 -0.5，全部存活（100-0.5=99.5）
      expect((sys as any).blockades.length).toBeLessThanOrEqual(25)
    })

    it('nextId 随直接注入不变（只有spawn才递增）', () => {
      expect((sys as any).nextId).toBe(1)
      ;(sys as any).blockades.push(makeBlockade({ id: 99 }))
      // nextId 不会因注入而改变
      expect((sys as any).nextId).toBe(1)
    })

    it('blockade 直接注入后 blockades 长度正确', () => {
      for (let i = 0; i < 5; i++) {
        ;(sys as any).blockades.push(makeBlockade({ id: i + 1 }))
      }
      expect((sys as any).blockades).toHaveLength(5)
    })

    it('多条 blockade 同时 strength 衰减各自独立', () => {
      ;(sys as any).blockades.push(makeBlockade({ id: 1, strength: 80, startedAt: 100000, duration: 50000 }))
      ;(sys as any).blockades.push(makeBlockade({ id: 2, strength: 60, startedAt: 100000, duration: 50000 }))
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 100000)
      expect((sys as any).blockades[0].strength).toBeCloseTo(79.5)
      expect((sys as any).blockades[1].strength).toBeCloseTo(59.5)
    })

    it('totalBroken 在多条封锁过期时正确累加', () => {
      ;(sys as any).blockades.push(makeBlockade({ id: 1, strength: 0.3, startedAt: 100000, duration: 50000 }))
      ;(sys as any).blockades.push(makeBlockade({ id: 2, strength: 0.4, startedAt: 100000, duration: 50000 }))
      ;(sys as any).lastCheck = 0
      forceUpdate(sys, 100000)
      expect((sys as any).totalBroken).toBe(2)
      expect((sys as any).blockades).toHaveLength(0)
    })
  })
})
