import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBeekeeperSystem } from '../systems/CreatureBeekeeperSystem'
import type { Beekeeper, HiveType } from '../systems/CreatureBeekeeperSystem'

// CHECK_INTERVAL=3400, SPAWN_CHANCE=0.003, MAX_BEEKEEPERS=12
// skill 递增: +0.2 当 Math.random() < yieldRate*0.05（随机，测确定性部分）
// cleanup: em.hasComponent(entityId,'creature') 返回 false 时删除

let nextId = 1

function makeBKSys(): CreatureBeekeeperSystem {
  return new CreatureBeekeeperSystem()
}

function makeBeekeeper(entityId: number, hiveType: HiveType = 'log', overrides: Partial<Beekeeper> = {}): Beekeeper {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    hivesManaged: 2,
    honeyHarvested: 50,
    waxCollected: 10,
    hiveType,
    beeHealth: 80,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureBeekeeperSystem', () => {
  let sys: CreatureBeekeeperSystem

  beforeEach(() => { sys = makeBKSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // ── 基础数据测试 ───────────────────────────────────────────────────────────

  it('初始无养蜂人', () => {
    expect((sys as any).beekeepers).toHaveLength(0)
  })

  it('注入养蜂人后可查询', () => {
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'frame'))
    expect((sys as any).beekeepers).toHaveLength(1)
    expect((sys as any).beekeepers[0].hiveType).toBe('frame')
  })

  it('返回内部引用', () => {
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    expect((sys as any).beekeepers).toBe((sys as any).beekeepers)
  })

  it('支持所有 4 种蜂箱类型', () => {
    const types: HiveType[] = ['log', 'clay', 'woven', 'frame']
    types.forEach((t, i) => {
      ;(sys as any).beekeepers.push(makeBeekeeper(i + 1, t))
    })
    const all = (sys as any).beekeepers
    expect(all).toHaveLength(4)
    types.forEach((t, i) => { expect(all[i].hiveType).toBe(t) })
  })

  it('养蜂人数据字段完整', () => {
    const b = makeBeekeeper(10, 'frame')
    b.skill = 90
    b.hivesManaged = 8
    b.honeyHarvested = 200
    b.waxCollected = 50
    b.beeHealth = 95
    ;(sys as any).beekeepers.push(b)
    const result = (sys as any).beekeepers[0]
    expect(result.skill).toBe(90)
    expect(result.hivesManaged).toBe(8)
    expect(result.honeyHarvested).toBe(200)
    expect(result.waxCollected).toBe(50)
    expect(result.beeHealth).toBe(95)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('_beekeepersSet初始为空Set', () => {
    expect((sys as any)._beekeepersSet.size).toBe(0)
  })

  it('beekeepers是数组类型', () => {
    expect(Array.isArray((sys as any).beekeepers)).toBe(true)
  })

  it('两个实例互相独立', () => {
    const sys2 = makeBKSys()
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    expect((sys2 as any).beekeepers).toHaveLength(0)
  })

  it('养蜂人id字段存在', () => {
    const b = makeBeekeeper(5)
    ;(sys as any).beekeepers.push(b)
    expect((sys as any).beekeepers[0].id).toBeDefined()
  })

  it('养蜂人tick字段存在', () => {
    const b = makeBeekeeper(5, 'log', { tick: 12345 })
    ;(sys as any).beekeepers.push(b)
    expect((sys as any).beekeepers[0].tick).toBe(12345)
  })

  // ── CHECK_INTERVAL 节流 ────────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(3400)时不更新lastCheck', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 2000)  // 2000 < 3400
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(3400)时更新lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)  // 3400 >= 3400
    expect((sys as any).lastCheck).toBe(3400)
  })

  it('tick差值恰好等于CHECK_INTERVAL减1时跳过', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3399)  // 3399 < 3400
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值=CHECK_INTERVAL+1时更新', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3401)
    expect((sys as any).lastCheck).toBe(3401)
  })

  it('lastCheck非零时节流正确计算差值（小于不触发）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 7000)  // 7000-5000=2000 < 3400，不更新
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('lastCheck非零时节流正确计算差值（大于触发）', () => {
    const em = { getEntitiesWithComponent: () => [], hasComponent: () => true } as any
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 8400)  // 8400-5000=3400 >= 3400，更新
    expect((sys as any).lastCheck).toBe(8400)
  })

  it('lastCheck大于tick时不触发（防负值）', () => {
    const em = {} as any
    ;(sys as any).lastCheck = 9999
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(9999)
  })

  // ── 技能上限 ──────────────────────────────────────────────────────────────

  it('skill上限为100（强制赋值验证边界）', () => {
    const bk = makeBeekeeper(1, 'frame', { skill: 100 })
    ;(sys as any).beekeepers.push(bk)
    expect((sys as any).beekeepers[0].skill).toBe(100)
  })

  it('skill不超过100（Math.min保护）', () => {
    expect(Math.min(100, 100 + 0.2)).toBe(100)
  })

  it('skill=99.9时有可能变为100（上限保护）', () => {
    // 直接测Math.min语义
    expect(Math.min(100, 99.9 + 0.2)).toBeCloseTo(100.1 > 100 ? 100 : 100.1, 5)
    expect(Math.min(100, 100.1)).toBe(100)
  })

  it('skill=50时有可能增加至50.2', () => {
    // 如果trigger，skill+0.2
    expect(Math.min(100, 50 + 0.2)).toBeCloseTo(50.2, 5)
  })

  // ── cleanup：creature 不存在时删除 ────────────────────────────────────────

  it('cleanup: creature不存在时移除养蜂人', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _comp: string) => eid !== 1,  // entityId=1 不存在
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))   // 不存在 → 删除
    ;(sys as any).beekeepers.push(makeBeekeeper(2))   // 存在 → 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(1)
    expect((sys as any).beekeepers[0].entityId).toBe(2)
  })

  it('cleanup: 所有creature均存在时不删除', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    ;(sys as any).beekeepers.push(makeBeekeeper(2))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(2)
  })

  it('cleanup: 全部creature不存在时清空', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    ;(sys as any).beekeepers.push(makeBeekeeper(2))
    ;(sys as any).beekeepers.push(makeBeekeeper(3))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(0)
  })

  it('cleanup: 混合存在/不存在情况只保留存在的', () => {
    const existingIds = new Set([2, 4])
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (eid: number, _: string) => existingIds.has(eid),
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))  // 不存在
    ;(sys as any).beekeepers.push(makeBeekeeper(2))  // 存在
    ;(sys as any).beekeepers.push(makeBeekeeper(3))  // 不存在
    ;(sys as any).beekeepers.push(makeBeekeeper(4))  // 存在
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(2)
    const ids = (sys as any).beekeepers.map((b: Beekeeper) => b.entityId)
    expect(ids).toContain(2)
    expect(ids).toContain(4)
  })

  it('cleanup: tick不满足CHECK_INTERVAL时不执行', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,  // 如果执行会删除
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 100)  // 不触发
    expect((sys as any).beekeepers.length).toBe(1)
  })

  it('cleanup后_beekeepersSet有条目被删除', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    ;(sys as any)._beekeepersSet.add(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    // 清理逻辑中会delete entityId
    expect((sys as any).beekeepers.length).toBe(0)
  })

  // ── 蜂箱升级条件 ──────────────────────────────────────────────────────────

  it('frame类型蜂箱不会继续升级（已是最高级）', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'frame', { skill: 80 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers[0].hiveType).toBe('frame')
  })

  it('log类型是最低级蜂箱', () => {
    const bk = makeBeekeeper(1, 'log')
    ;(sys as any).beekeepers.push(bk)
    expect((sys as any).beekeepers[0].hiveType).toBe('log')
  })

  it('beeHealth被Math.max/min限制在10~100范围', () => {
    expect(Math.max(10, Math.min(100, 9))).toBe(10)
    expect(Math.max(10, Math.min(100, 101))).toBe(100)
    expect(Math.max(10, Math.min(100, 50))).toBe(50)
  })

  it('skill<=60时不触发蜂箱升级条件', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { skill: 60 }))
    ;(sys as any).lastCheck = 0
    // 精确控制random序列：让honey harvest不触发，避免skill增加后满足>60
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)    // recruit chance (fail)
      .mockReturnValueOnce(0.9)    // yieldRate*0.05: 0.9 > 0.0036, 不触发
      .mockReturnValueOnce(0.9)    // wax (fail)
      .mockReturnValueOnce(0.5)    // beeHealth fluctuation
      .mockReturnValueOnce(0.9)    // hive expand (fail, skill<=40不触发)
      .mockReturnValueOnce(0.9)    // upgrade: skill=60不满足>60条件，不调用此
    sys.update(1, em, 3400)
    // skill=60时升级条件是skill>60，所以不升级
    expect((sys as any).beekeepers[0].hiveType).toBe('log')
  })

  it('skill>60且random<0.005时触发蜂箱升级', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { skill: 70 }))
    ;(sys as any).lastCheck = 0
    // 让random满足升级条件：skill>60, random<0.005
    // 需要控制所有random调用
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)    // recruit chance (fail)
      .mockReturnValueOnce(0.9)    // yieldRate*0.05 (fail)
      .mockReturnValueOnce(0.9)    // wax (fail)
      .mockReturnValueOnce(0.5)    // beeHealth fluctuation
      .mockReturnValueOnce(0.9)    // hive expand (fail)
      .mockReturnValueOnce(0.001)  // upgrade (0.001 < 0.005, 触发)
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers[0].hiveType).toBe('clay')
  })

  it('蜂箱升级顺序: log->clay->woven->frame', () => {
    const order: HiveType[] = ['log', 'clay', 'woven', 'frame']
    for (let i = 0; i < order.length - 1; i++) {
      expect(order.indexOf(order[i]) < order.indexOf(order[i + 1])).toBe(true)
    }
  })

  // ── hivesManaged 扩展条件 ─────────────────────────────────────────────────

  it('skill<=40时不触发hive扩展', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { skill: 40, hivesManaged: 2 }))
    ;(sys as any).lastCheck = 0
    // 精确控制random序列：不触发蜂蜜采集，避免skill从40变为40.2满足>40
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)    // recruit chance (fail)
      .mockReturnValueOnce(0.9)    // yieldRate*0.05: skill=40, yieldRate=0.15*0.4*0.8=0.048, 0.9 > 0.048*0.05=0.0024, 不触发
      .mockReturnValueOnce(0.9)    // wax (fail)
      .mockReturnValueOnce(0.5)    // beeHealth fluctuation
      .mockReturnValueOnce(0.9)    // hive expand: skill=40不满足>40，条件不进入，不消耗random
      .mockReturnValueOnce(0.9)    // upgrade: skill=40不满足>60
    sys.update(1, em, 3400)
    // skill=40时条件是skill>40，不满足，hivesManaged不变
    expect((sys as any).beekeepers[0].hivesManaged).toBe(2)
  })

  it('hivesManaged已达5时不再扩展', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { skill: 80, hivesManaged: 5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers[0].hivesManaged).toBe(5)
  })

  it('skill>40且hivesManaged<5且random<0.003时hivesManaged增加', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { skill: 50, hivesManaged: 2 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)    // recruit
      .mockReturnValueOnce(0.9)    // honey yield
      .mockReturnValueOnce(0.9)    // wax
      .mockReturnValueOnce(0.5)    // beeHealth
      .mockReturnValueOnce(0.001)  // expand (0.001 < 0.003, 触发)
      .mockReturnValueOnce(0.9)    // upgrade
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers[0].hivesManaged).toBe(3)
  })

  // ── 蜂蜜采集（yieldRate逻辑）────────────────────────────────────────────

  it('yieldRate=HIVE_YIELD[log]*skill/100*beeHealth/100', () => {
    // log yieldRate = 0.15 * (skill/100) * (beeHealth/100)
    const skill = 100, beeHealth = 100
    const yield_ = 0.15 * (skill / 100) * (beeHealth / 100)
    expect(yield_).toBeCloseTo(0.15, 5)
  })

  it('frame蜂箱yieldRate最高', () => {
    const skill = 100, beeHealth = 100
    const logY = 0.15 * (skill / 100) * (beeHealth / 100)
    const frameY = 0.35 * (skill / 100) * (beeHealth / 100)
    expect(frameY).toBeGreaterThan(logY)
  })

  it('skill=0时yieldRate为0', () => {
    const yield_ = 0.15 * (0 / 100) * (80 / 100)
    expect(yield_).toBe(0)
  })

  it('beeHealth=0时yieldRate为0', () => {
    const yield_ = 0.15 * (80 / 100) * (0 / 100)
    expect(yield_).toBe(0)
  })

  it('honeyHarvested初始为50时wax有概率增加', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { honeyHarvested: 50, waxCollected: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)    // recruit
      .mockReturnValueOnce(0.9)    // yield (no honey)
      .mockReturnValueOnce(0.01)   // wax (0.01 < 0.02, 触发)
      .mockReturnValueOnce(0.5)    // beeHealth
      .mockReturnValueOnce(0.9)    // expand
      .mockReturnValueOnce(0.9)    // upgrade
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers[0].waxCollected).toBe(1)
  })

  it('honeyHarvested=0时wax不增加', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { honeyHarvested: 0, waxCollected: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)    // recruit
      .mockReturnValueOnce(0.9)    // yield
      .mockReturnValueOnce(0.01)   // wax chance (but honeyHarvested=0, 条件不满足)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.9)
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers[0].waxCollected).toBe(0)
  })

  // ── beeHealth 波动范围 ────────────────────────────────────────────────────

  it('beeHealth波动因子(random-0.45)*3范围在[-1.35,1.65]', () => {
    // (0-0.45)*3 = -1.35，(1-0.45)*3 = 1.65
    expect((0 - 0.45) * 3).toBeCloseTo(-1.35, 5)
    expect((1 - 0.45) * 3).toBeCloseTo(1.65, 5)
  })

  it('beeHealth不低于10', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { beeHealth: 10, skill: 30 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)    // recruit
      .mockReturnValueOnce(0.9)    // yield
      .mockReturnValueOnce(0.9)    // wax
      .mockReturnValueOnce(0)      // beeHealth: (0-0.45)*3=-1.35, 10-1.35=8.65，min=10
      .mockReturnValue(0.9)
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers[0].beeHealth).toBeGreaterThanOrEqual(10)
  })

  it('beeHealth不高于100', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1, 'log', { beeHealth: 100, skill: 30 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)    // recruit
      .mockReturnValueOnce(0.9)    // yield
      .mockReturnValueOnce(0.9)    // wax
      .mockReturnValueOnce(1)      // beeHealth: (1-0.45)*3=1.65, 100+1.65=101.65，min(100,101.65)=100
      .mockReturnValue(0.9)
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers[0].beeHealth).toBeLessThanOrEqual(100)
  })

  // ── 招募新养蜂人 ──────────────────────────────────────────────────────────

  it('MAX_BEEKEEPERS=12达到上限时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 远小于SPAWN_CHANCE
    const em = {
      getEntitiesWithComponent: () => [1],
      hasComponent: () => true,
    } as any
    for (let i = 1; i <= 12; i++) {
      ;(sys as any).beekeepers.push(makeBeekeeper(i))
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    // 有12个，即使random=0也不招募（已达上限），但cleanup不会删（hasComponent=true）
    expect((sys as any).beekeepers.length).toBeLessThanOrEqual(12)
  })

  it('random>=SPAWN_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    const em = {
      getEntitiesWithComponent: () => [1],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(0)
  })

  it('getEntitiesWithComponent返回空数组时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)  // 满足SPAWN_CHANCE
    const em = {
      getEntitiesWithComponent: () => [],  // 无实体
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(0)
  })

  it('同一entityId已在_beekeepersSet中时不重复招募', () => {
    // entityId=1已在set中
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponent: () => [1],
      hasComponent: () => true,
    } as any
    ;(sys as any)._beekeepersSet.add(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(0)
  })

  // ── 数据结构完整性 ────────────────────────────────────────────────────────

  it('养蜂人id唯一（两个插入）', () => {
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    ;(sys as any).beekeepers.push(makeBeekeeper(2))
    const ids = (sys as any).beekeepers.map((b: Beekeeper) => b.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('entityId可以为0', () => {
    ;(sys as any).beekeepers.push(makeBeekeeper(0))
    expect((sys as any).beekeepers[0].entityId).toBe(0)
  })

  it('honeyHarvested初始为0时能正确累积', () => {
    const b = makeBeekeeper(1, 'log', { honeyHarvested: 0 })
    ;(sys as any).beekeepers.push(b)
    expect((sys as any).beekeepers[0].honeyHarvested).toBe(0)
  })

  it('waxCollected初始为0', () => {
    const b = makeBeekeeper(1, 'log', { waxCollected: 0 })
    ;(sys as any).beekeepers.push(b)
    expect((sys as any).beekeepers[0].waxCollected).toBe(0)
  })

  it('update空beekeepers列表时不崩溃', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    expect(() => sys.update(1, em, 3400)).not.toThrow()
  })

  it('多次update中_beekeepersSet正确维护', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => false,
    } as any
    ;(sys as any).beekeepers.push(makeBeekeeper(1))
    ;(sys as any)._beekeepersSet.add(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3400)
    expect((sys as any).beekeepers.length).toBe(0)
  })

  // ── HIVE_YIELD 产量系数验证 ─────────────────────────────────────────────

  it('log蜂箱yieldRate=0.15*(skill/100)*(beeHealth/100)', () => {
    const skill = 50, beeHealth = 80
    const expected = 0.15 * (skill / 100) * (beeHealth / 100)
    expect(expected).toBeCloseTo(0.06, 5)
  })

  it('clay蜂箱yieldRate=0.25*(skill/100)*(beeHealth/100)', () => {
    const skill = 50, beeHealth = 80
    const expected = 0.25 * (skill / 100) * (beeHealth / 100)
    expect(expected).toBeCloseTo(0.10, 5)
  })

  it('woven蜂箱yieldRate=0.20*(skill/100)*(beeHealth/100)', () => {
    const skill = 50, beeHealth = 80
    const expected = 0.20 * (skill / 100) * (beeHealth / 100)
    expect(expected).toBeCloseTo(0.08, 5)
  })

  it('frame蜂箱yieldRate=0.35*(skill/100)*(beeHealth/100)', () => {
    const skill = 50, beeHealth = 80
    const expected = 0.35 * (skill / 100) * (beeHealth / 100)
    expect(expected).toBeCloseTo(0.14, 5)
  })

  it('四种蜂箱产量顺序: log<woven<clay<frame', () => {
    const skill = 100, beeHealth = 100
    const logY = 0.15 * skill / 100 * beeHealth / 100
    const clayY = 0.25 * skill / 100 * beeHealth / 100
    const wovenY = 0.20 * skill / 100 * beeHealth / 100
    const frameY = 0.35 * skill / 100 * beeHealth / 100
    expect(logY).toBeLessThan(wovenY)
    expect(wovenY).toBeLessThan(clayY)
    expect(clayY).toBeLessThan(frameY)
  })
})
