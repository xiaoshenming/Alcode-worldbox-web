import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBountySystem } from '../systems/CreatureBountySystem'
import type { Bounty } from '../systems/CreatureBountySystem'

// ==================== Helpers ====================

let nextId = 1

function makeSys(): CreatureBountySystem {
  return new CreatureBountySystem()
}

function makeBounty(
  targetId: number,
  claimed = false,
  reward = 100,
  expiresAt = 9999,
  posterId = 1
): Bounty {
  const id = nextId++
  return {
    id,
    targetId,
    posterId,
    reward,
    reason: 'raiding villages',
    postedTick: 0,
    claimed,
    claimedBy: null,
    expiresAt,
    displayStr: `#${id} - ${reward}g - raiding villages`,
  }
}

// ==================== getActiveBounties ====================

describe('getActiveBounties — 基础行为', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无悬赏时返回空结果', () => {
    expect(sys.getActiveBounties()).toHaveLength(0)
  })

  it('一条未认领悬赏时返回长度为1', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    expect(sys.getActiveBounties()).toHaveLength(1)
  })

  it('一条已认领悬赏时返回长度为0', () => {
    ;(sys as any).bounties.push(makeBounty(1, true))
    expect(sys.getActiveBounties()).toHaveLength(0)
  })

  it('混合时只返回未认领数量正确', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    ;(sys as any).bounties.push(makeBounty(2, true))
    ;(sys as any).bounties.push(makeBounty(3, false))
    expect(sys.getActiveBounties()).toHaveLength(2)
  })

  it('全部已认领时返回空结果', () => {
    ;(sys as any).bounties.push(makeBounty(1, true))
    ;(sys as any).bounties.push(makeBounty(2, true))
    expect(sys.getActiveBounties()).toHaveLength(0)
  })

  it('全部未认领时全部返回', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).bounties.push(makeBounty(i, false))
    }
    expect(sys.getActiveBounties()).toHaveLength(5)
  })

  it('返回值是数组类型', () => {
    expect(Array.isArray(sys.getActiveBounties())).toBe(true)
  })

  it('多次调用结果长度一致', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    expect(sys.getActiveBounties()).toHaveLength(1)
    expect(sys.getActiveBounties()).toHaveLength(1)
  })
})

describe('getActiveBounties — 悬赏字段校验', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('返回的悬赏包含正确 targetId', () => {
    ;(sys as any).bounties.push(makeBounty(42, false))
    const active = sys.getActiveBounties()
    expect(active[0].targetId).toBe(42)
  })

  it('返回的悬赏包含正确 reward', () => {
    ;(sys as any).bounties.push(makeBounty(1, false, 150))
    const active = sys.getActiveBounties()
    expect(active[0].reward).toBe(150)
  })

  it('返回的悬赏 claimed 字段为 false', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    const active = sys.getActiveBounties()
    expect(active[0].claimed).toBe(false)
  })

  it('返回的悬赏包含 displayStr', () => {
    ;(sys as any).bounties.push(makeBounty(1, false, 80))
    const active = sys.getActiveBounties()
    expect(typeof active[0].displayStr).toBe('string')
    expect(active[0].displayStr.length).toBeGreaterThan(0)
  })

  it('返回的悬赏 claimedBy 为 null', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    expect(sys.getActiveBounties()[0].claimedBy).toBeNull()
  })

  it('返回的悬赏 reason 字段存在且非空', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    const active = sys.getActiveBounties()
    expect(active[0].reason.length).toBeGreaterThan(0)
  })

  it('返回的悬赏 posterId 正确', () => {
    ;(sys as any).bounties.push(makeBounty(1, false, 100, 9999, 99))
    expect(sys.getActiveBounties()[0].posterId).toBe(99)
  })

  it('返回的悬赏 postedTick 为 0', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    expect(sys.getActiveBounties()[0].postedTick).toBe(0)
  })
})

describe('getActiveBounties — 内部缓冲区', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('_activeBountiesBuf 复用（长度会被重置）', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    const r1 = sys.getActiveBounties()
    ;(sys as any).bounties.length = 0
    const r2 = sys.getActiveBounties()
    // 第二次调用后缓冲区被清空
    expect(r2).toHaveLength(0)
  })

  it('12条未认领悬赏全部返回（MAX_ACTIVE_BOUNTIES）', () => {
    for (let i = 1; i <= 12; i++) {
      ;(sys as any).bounties.push(makeBounty(i, false))
    }
    expect(sys.getActiveBounties()).toHaveLength(12)
  })
})

// ==================== getBountyOn ====================

describe('getBountyOn — 基础行为', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无悬赏时返回 null', () => {
    expect(sys.getBountyOn(999)).toBeNull()
  })

  it('存在未认领悬赏时返回该悬赏', () => {
    ;(sys as any).bounties.push(makeBounty(42, false))
    const b = sys.getBountyOn(42)
    expect(b).not.toBeNull()
  })

  it('存在未认领悬赏时 targetId 正确', () => {
    ;(sys as any).bounties.push(makeBounty(42, false))
    expect(sys.getBountyOn(42)!.targetId).toBe(42)
  })

  it('已认领悬赏返回 null', () => {
    ;(sys as any).bounties.push(makeBounty(42, true))
    expect(sys.getBountyOn(42)).toBeNull()
  })

  it('不存在的 targetId 返回 null', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    expect(sys.getBountyOn(999)).toBeNull()
  })

  it('多个目标时只返回匹配的', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    ;(sys as any).bounties.push(makeBounty(2, false))
    expect(sys.getBountyOn(2)!.targetId).toBe(2)
  })

  it('匹配返回的 claimed 为 false', () => {
    ;(sys as any).bounties.push(makeBounty(5, false))
    expect(sys.getBountyOn(5)!.claimed).toBe(false)
  })

  it('同 targetId 一认领一未认领时返回未认领', () => {
    ;(sys as any).bounties.push(makeBounty(10, true))
    ;(sys as any).bounties.push(makeBounty(10, false))
    const b = sys.getBountyOn(10)
    expect(b).not.toBeNull()
    expect(b!.claimed).toBe(false)
  })
})

describe('getBountyOn — _activeBountyByTarget 缓存', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('通过 _activeBountyByTarget 缓存查询成功', () => {
    const b = makeBounty(77, false)
    ;(sys as any)._activeBountyByTarget.set(77, b)
    const result = sys.getBountyOn(77)
    expect(result).not.toBeNull()
    expect(result!.targetId).toBe(77)
  })

  it('缓存命中时不查 bounties 数组', () => {
    const b = makeBounty(88, false)
    ;(sys as any)._activeBountyByTarget.set(88, b)
    // bounties 数组为空，但缓存有
    expect((sys as any).bounties).toHaveLength(0)
    expect(sys.getBountyOn(88)).not.toBeNull()
  })

  it('缓存无且 bounties 无时返回 null', () => {
    expect(sys.getBountyOn(55)).toBeNull()
  })

  it('缓存无时降级到 bounties 数组查找', () => {
    ;(sys as any).bounties.push(makeBounty(33, false))
    // 不设 _activeBountyByTarget
    expect(sys.getBountyOn(33)).not.toBeNull()
  })
})

describe('getBountyOn — reward 字段', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('reward 为 20（MIN_REWARD）正确返回', () => {
    ;(sys as any).bounties.push(makeBounty(1, false, 20))
    expect(sys.getBountyOn(1)!.reward).toBe(20)
  })

  it('reward 为 200（MAX_REWARD）正确返回', () => {
    ;(sys as any).bounties.push(makeBounty(2, false, 200))
    expect(sys.getBountyOn(2)!.reward).toBe(200)
  })

  it('reward 为中间值正确返回', () => {
    ;(sys as any).bounties.push(makeBounty(3, false, 110))
    expect(sys.getBountyOn(3)!.reward).toBe(110)
  })
})

// ==================== togglePanel ====================

describe('togglePanel — 面板开关', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 showPanel 为 false', () => {
    expect((sys as any).showPanel).toBe(false)
  })

  it('调用一次 togglePanel 后 showPanel 为 true', () => {
    sys.togglePanel()
    expect((sys as any).showPanel).toBe(true)
  })

  it('调用两次 togglePanel 后 showPanel 恢复为 false', () => {
    sys.togglePanel()
    sys.togglePanel()
    expect((sys as any).showPanel).toBe(false)
  })

  it('调用三次 togglePanel 后 showPanel 为 true', () => {
    sys.togglePanel()
    sys.togglePanel()
    sys.togglePanel()
    expect((sys as any).showPanel).toBe(true)
  })
})

// ==================== Bounty 结构完整性 ====================

describe('Bounty — 结构完整性', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Bounty 对象包含所有必要字段', () => {
    const b = makeBounty(1, false)
    expect(b).toHaveProperty('id')
    expect(b).toHaveProperty('targetId')
    expect(b).toHaveProperty('posterId')
    expect(b).toHaveProperty('reward')
    expect(b).toHaveProperty('reason')
    expect(b).toHaveProperty('postedTick')
    expect(b).toHaveProperty('claimed')
    expect(b).toHaveProperty('claimedBy')
    expect(b).toHaveProperty('expiresAt')
    expect(b).toHaveProperty('displayStr')
  })

  it('displayStr 包含 reward 数字', () => {
    const b = makeBounty(1, false, 150)
    expect(b.displayStr).toContain('150')
  })

  it('displayStr 包含 id 编号', () => {
    nextId = 7
    const b = makeBounty(1, false)
    expect(b.displayStr).toContain('7')
  })

  it('expiresAt 大于 postedTick', () => {
    const b = makeBounty(1, false, 100, 5000)
    expect(b.expiresAt).toBeGreaterThan(b.postedTick)
  })
})

// ==================== 私有字段初始状态 ====================

describe('CreatureBountySystem — 私有字段初始状态', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('bounties 初始为空', () => {
    expect((sys as any).bounties).toHaveLength(0)
  })

  it('_activeBountyByTarget 初始为空 Map', () => {
    expect((sys as any)._activeBountyByTarget.size).toBe(0)
  })

  it('_activeBountiesBuf 初始为空', () => {
    expect((sys as any)._activeBountiesBuf).toHaveLength(0)
  })

  it('showPanel 初始为 false', () => {
    expect((sys as any).showPanel).toBe(false)
  })

  it('nextCheckTick 初始为 BOUNTY_CHECK_INTERVAL（600）', () => {
    expect((sys as any).nextCheckTick).toBe(600)
  })
})

// ==================== 边界与极端情况 ====================

describe('CreatureBountySystem — 边界与极端情况', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('targetId 为 0 也能正确查询', () => {
    ;(sys as any).bounties.push(makeBounty(0, false))
    expect(sys.getBountyOn(0)).not.toBeNull()
  })

  it('大量悬赏中精确匹配正确 targetId', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).bounties.push(makeBounty(i, false))
    }
    expect(sys.getBountyOn(7)!.targetId).toBe(7)
  })

  it('getActiveBounties 和 getBountyOn 结果一致性', () => {
    ;(sys as any).bounties.push(makeBounty(5, false))
    const fromActive = sys.getActiveBounties().find(b => b.targetId === 5)
    const fromGet = sys.getBountyOn(5)
    expect(fromActive?.targetId).toBe(fromGet?.targetId)
  })

  it('claimed 改为 true 后 getActiveBounties 排除该条', () => {
    const b = makeBounty(99, false)
    ;(sys as any).bounties.push(b)
    expect(sys.getActiveBounties()).toHaveLength(1)
    b.claimed = true
    expect(sys.getActiveBounties()).toHaveLength(0)
  })

  it('claimed 改为 true 后 getBountyOn 返回 null（无缓存时）', () => {
    const b = makeBounty(88, false)
    ;(sys as any).bounties.push(b)
    b.claimed = true
    expect(sys.getBountyOn(88)).toBeNull()
  })
})
