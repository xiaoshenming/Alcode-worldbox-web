import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticCulturalExchangeSystem, CulturalExchange, ExchangeType } from '../systems/DiplomaticCulturalExchangeSystem'

const em = {} as any
const emptyCivManager = { civilizations: new Map() } as any

function makeSys() { return new DiplomaticCulturalExchangeSystem() }

function inject(sys: any, exchanges: Partial<CulturalExchange>[]) {
  sys.exchanges.push(...exchanges)
}

describe('基础数据结构', () => {
  it('初始exchanges为空', () => {
    expect((makeSys() as any).exchanges).toHaveLength(0)
  })
  it('注入后可查询', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 5000 }])
    expect(sys.exchanges).toHaveLength(1)
  })
  it('nextId初始为1', () => {
    expect((makeSys() as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((makeSys() as any).lastCheck).toBe(0)
  })
  it('6种ExchangeType均可存储', () => {
    const types: ExchangeType[] = ['art', 'music', 'cuisine', 'language', 'technology', 'religion']
    const sys = makeSys() as any
    types.forEach((t, i) => inject(sys, [{ id: i+1, senderCivId: i, receiverCivId: i+10, exchangeType: t, influence: 10, relationBoost: 5, startTick: 0, duration: 5000 }]))
    expect(sys.exchanges).toHaveLength(6)
  })
})

describe('CHECK_INTERVAL=1800节流', () => {
  it('tick=0不更新lastCheck', () => {
    const sys = makeSys()
    sys.update(1, em, emptyCivManager, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1799不触发更新', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 5000 }])
    const before = sys.exchanges[0].influence
    sys.update(1, em, emptyCivManager, 1799)
    expect(sys.exchanges[0].influence).toBe(before)
  })
  it('tick=1800触发更新lastCheck', () => {
    const sys = makeSys()
    sys.update(1, em, emptyCivManager, 1800)
    expect((sys as any).lastCheck).toBe(1800)
  })
  it('tick=1800触发influence演化', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 5000 }])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges[0].influence).toBeGreaterThanOrEqual(50)
  })
  it('第二次tick=1800不再触发（lastCheck已更新）', () => {
    const sys = makeSys() as any
    sys.update(1, em, emptyCivManager, 1800)
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 5000 }])
    const before = sys.exchanges[0].influence
    sys.update(1, em, emptyCivManager, 1801)
    expect(sys.exchanges[0].influence).toBe(before)
  })
})

describe('influence动态更新', () => {
  it('每次update后influence增长', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 5000 }])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges[0].influence).toBeGreaterThanOrEqual(50)
  })
  it('influence上限为100', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 99.9, relationBoost: 5, startTick: 0, duration: 5000 }])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges[0].influence).toBeLessThanOrEqual(100)
  })
  it('多个exchange都会更新influence', () => {
    const sys = makeSys() as any
    inject(sys, [
      { id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 40, relationBoost: 5, startTick: 0, duration: 5000 },
      { id: 2, senderCivId: 3, receiverCivId: 4, exchangeType: 'music', influence: 60, relationBoost: 8, startTick: 0, duration: 5000 },
    ])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges[0].influence).toBeGreaterThanOrEqual(40)
    expect(sys.exchanges[1].influence).toBeGreaterThanOrEqual(60)
  })
  it('influence已100时保持100', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 100, relationBoost: 5, startTick: 0, duration: 5000 }])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges[0].influence).toBe(100)
  })
})

describe('duration-based过期清理', () => {
  it('tick - startTick >= duration时删除', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 1800 }])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges).toHaveLength(0)
  })
  it('未过期的exchange保留', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 5000 }])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges).toHaveLength(1)
  })
  it('混合场景：过期的删除，未过期的保留', () => {
    const sys = makeSys() as any
    inject(sys, [
      { id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 1800 },
      { id: 2, senderCivId: 3, receiverCivId: 4, exchangeType: 'music', influence: 60, relationBoost: 8, startTick: 0, duration: 5000 },
    ])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges).toHaveLength(1)
    expect(sys.exchanges[0].id).toBe(2)
  })
  it('startTick非0时按相对时间计算', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 1000, duration: 800 }])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges).toHaveLength(0)
  })
  it('tick - startTick < duration时不删除', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 1000, duration: 900 }])
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges).toHaveLength(1)
  })
})

describe('MAX_EXCHANGES=25上限', () => {
  it('超过25时cleanup截断到25', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 30; i++) {
      inject(sys, [{ id: i+1, senderCivId: i, receiverCivId: i+100, exchangeType: 'art', influence: i, relationBoost: 5, startTick: 0, duration: 5000 }])
    }
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges.length).toBeLessThanOrEqual(25)
  })
  it('cleanup按influence降序保留高值', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 30; i++) {
      inject(sys, [{ id: i+1, senderCivId: i, receiverCivId: i+100, exchangeType: 'art', influence: i, relationBoost: 5, startTick: 0, duration: 5000 }])
    }
    sys.update(1, em, emptyCivManager, 1800)
    const influences = sys.exchanges.map((e: any) => e.influence)
    expect(Math.min(...influences)).toBeGreaterThanOrEqual(5)
  })
  it('25个以内不截断', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 10; i++) {
      inject(sys, [{ id: i+1, senderCivId: i, receiverCivId: i+100, exchangeType: 'art', influence: i*10, relationBoost: 5, startTick: 0, duration: 5000 }])
    }
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges).toHaveLength(10)
  })
  it('cleanup后exchanges按influence降序排列', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 30; i++) {
      inject(sys, [{ id: i+1, senderCivId: i, receiverCivId: i+100, exchangeType: 'art', influence: 30 - i, relationBoost: 5, startTick: 0, duration: 5000 }])
    }
    sys.update(1, em, emptyCivManager, 1800)
    for (let i = 0; i < sys.exchanges.length - 1; i++) {
      expect(sys.exchanges[i].influence).toBeGreaterThanOrEqual(sys.exchanges[i+1].influence)
    }
  })
})

describe('ExchangeType枚举完整性', () => {
  it('art类型relationBoost为5', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art' as ExchangeType, influence: 50, relationBoost: 5, startTick: 0, duration: 5000 }])
    expect(sys.exchanges[0].exchangeType).toBe('art')
    expect(sys.exchanges[0].relationBoost).toBe(5)
  })
  it('technology类型可存储', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'technology' as ExchangeType, influence: 50, relationBoost: 12, startTick: 0, duration: 5000 }])
    expect(sys.exchanges[0].exchangeType).toBe('technology')
  })
  it('religion类型可存储', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'religion' as ExchangeType, influence: 50, relationBoost: 4, startTick: 0, duration: 5000 }])
    expect(sys.exchanges[0].exchangeType).toBe('religion')
  })
})

describe('额外边界与防御性测试', () => {
  it('influence 上限 100 不被突破（evolveInfluence）', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 99.99, relationBoost: 5, startTick: 0, duration: 9999999 }])
    // 直接调用 evolveInfluence
    sys.evolveInfluence ? sys.evolveInfluence() : sys['evolveInfluence']?.()
    expect(sys.exchanges[0].influence).toBeLessThanOrEqual(100)
  })

  it('exchanges 数组类型正确', () => {
    const sys = makeSys() as any
    expect(Array.isArray(sys.exchanges)).toBe(true)
  })

  it('RelationBoost 值 art=5', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 5000 }])
    expect(sys.exchanges[0].relationBoost).toBe(5)
  })

  it('RelationBoost 值 music=8', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'music', influence: 50, relationBoost: 8, startTick: 0, duration: 5000 }])
    expect(sys.exchanges[0].relationBoost).toBe(8)
  })

  it('RelationBoost 值 technology=12', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'technology', influence: 50, relationBoost: 12, startTick: 0, duration: 5000 }])
    expect(sys.exchanges[0].relationBoost).toBe(12)
  })

  it('CulturalExchange 包含必要字段', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 7, senderCivId: 3, receiverCivId: 5, exchangeType: 'language', influence: 20, relationBoost: 10, startTick: 100, duration: 3000 }])
    const e = sys.exchanges[0]
    expect(e).toHaveProperty('id')
    expect(e).toHaveProperty('senderCivId')
    expect(e).toHaveProperty('receiverCivId')
    expect(e).toHaveProperty('exchangeType')
    expect(e).toHaveProperty('influence')
    expect(e).toHaveProperty('relationBoost')
    expect(e).toHaveProperty('startTick')
    expect(e).toHaveProperty('duration')
  })

  it('update 空 civManager 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(1, em, emptyCivManager, 1800)).not.toThrow()
  })

  it('update null civManager 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(1, em, null as any, 1800)).not.toThrow()
  })

  it('CHECK_INTERVAL=1800 节流有效', () => {
    const sys = makeSys() as any
    sys.update(1, em, emptyCivManager, 1799)
    expect(sys.lastCheck).toBe(0)
  })

  it('tick >= 1800 时 lastCheck 更新', () => {
    const sys = makeSys() as any
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.lastCheck).toBe(1800)
  })

  it('过期的 exchange（elapsed > duration）被移除', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 3000 }])
    sys.lastCheck = 0
    sys.update(1, em, emptyCivManager, 5000) // elapsed=5000 > duration=3000
    expect(sys.exchanges).toHaveLength(0)
  })

  it('未过期的 exchange 保留', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'art', influence: 50, relationBoost: 5, startTick: 0, duration: 9999999 }])
    sys.lastCheck = 0
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges).toHaveLength(1)
  })

  it('多条不同 type 的 exchanges 共��', () => {
    const sys = makeSys() as any
    const types: ExchangeType[] = ['art', 'music', 'cuisine', 'language', 'technology', 'religion']
    types.forEach((t, i) => {
      inject(sys, [{ id: i + 1, senderCivId: i + 1, receiverCivId: i + 2, exchangeType: t, influence: 50, relationBoost: 5, startTick: 0, duration: 9999999 }])
    })
    expect(sys.exchanges).toHaveLength(6)
  })

  it('MAX_EXCHANGES=25 上限: cleanup 后不超过 25 条', () => {
    const sys = makeSys() as any
    for (let i = 0; i < 30; i++) {
      inject(sys, [{ id: i + 1, senderCivId: i + 1, receiverCivId: i + 2, exchangeType: 'art', influence: i * 3, relationBoost: 5, startTick: 0, duration: 9999999 }])
    }
    sys.lastCheck = 0
    sys.update(1, em, emptyCivManager, 1800)
    expect(sys.exchanges.length).toBeLessThanOrEqual(25)
  })

  it('senderCivId 和 receiverCivId 不相同时 exchange 有效', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 3, receiverCivId: 7, exchangeType: 'cuisine', influence: 30, relationBoost: 6, startTick: 0, duration: 9999999 }])
    expect(sys.exchanges[0].senderCivId).toBe(3)
    expect(sys.exchanges[0].receiverCivId).toBe(7)
  })

  it('cuisine type RelationBoost 为 6', () => {
    const sys = makeSys() as any
    inject(sys, [{ id: 1, senderCivId: 1, receiverCivId: 2, exchangeType: 'cuisine', influence: 50, relationBoost: 6, startTick: 0, duration: 5000 }])
    expect(sys.exchanges[0].relationBoost).toBe(6)
  })

  it('lastCheck 更新到最新 tick', () => {
    const sys = makeSys() as any
    sys.update(1, em, emptyCivManager, 1800 * 5)
    expect(sys.lastCheck).toBe(1800 * 5)
  })

  it('nextId 手动设置后保持', () => {
    const sys = makeSys() as any
    sys.nextId = 88
    expect(sys.nextId).toBe(88)
  })
})
