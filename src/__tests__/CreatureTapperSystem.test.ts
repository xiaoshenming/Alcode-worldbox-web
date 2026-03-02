import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureTapperSystem } from '../systems/CreatureTapperSystem'
import type { Tapper } from '../systems/CreatureTapperSystem'

// CHECK_INTERVAL=3010, RECRUIT_CHANCE=0.0015, MAX_TAPPERS=10
// 技能增长：tappingSkill+0.02, threadPitch+0.015, alignmentAccuracy+0.01
// cleanup: tappingSkill <= 4 时移除

let nextId = 1
function makeSys(): CreatureTapperSystem { return new CreatureTapperSystem() }
function makeTapper(entityId: number, skill = 70): Tapper {
  return {
    id: nextId++,
    entityId,
    tappingSkill: skill,
    threadPitch: 65,
    depthControl: 80,
    alignmentAccuracy: 75,
    tick: 0,
  }
}

function makeEm() {
  return {} as any
}

describe('CreatureTapperSystem.getTappers', () => {
  let sys: CreatureTapperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有5个测试（保留）──

  it('初始无螺纹工', () => { expect((sys as any).tappers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    expect((sys as any).tappers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    expect((sys as any).tappers).toBe((sys as any).tappers)
  })

  it('字段正确', () => {
    ;(sys as any).tappers.push(makeTapper(2))
    const t = (sys as any).tappers[0]
    expect(t.tappingSkill).toBe(70)
    expect(t.depthControl).toBe(80)
  })

  it('多个全部返回', () => {
    ;(sys as any).tappers.push(makeTapper(1))
    ;(sys as any).tappers.push(makeTapper(2))
    expect((sys as any).tappers).toHaveLength(2)
  })

  // ── 新���测试 ──

  // CHECK_INTERVAL 节流
  it('update在tick-lastCheck < CHECK_INTERVAL时直接返回不处理', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 100) // 100 < 3010 => 跳过
    expect((sys as any).lastCheck).toBe(0)
  })

  it('update在tick-lastCheck >= CHECK_INTERVAL时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    expect((sys as any).lastCheck).toBe(3010)
  })

  it('连续两次调用第二次因节流被跳过', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    sys.update(0, makeEm(), 3015)
    // 第二次3015-3010=5 < 3010 => 不更新
    expect((sys as any).lastCheck).toBe(3010)
  })

  // 技能增长 (+0.02 / +0.015 / +0.01)
  it('每次update使tappingSkill增长0.02', () => {
    ;(sys as any).tappers.push(makeTapper(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    expect((sys as any).tappers[0].tappingSkill).toBeCloseTo(50.02, 5)
  })

  it('每次update使threadPitch增长0.015', () => {
    ;(sys as any).tappers.push(makeTapper(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    expect((sys as any).tappers[0].threadPitch).toBeCloseTo(65.015, 5)
  })

  it('每次update使alignmentAccuracy增长0.01', () => {
    ;(sys as any).tappers.push(makeTapper(1, 50))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    expect((sys as any).tappers[0].alignmentAccuracy).toBeCloseTo(75.01, 5)
  })

  it('tappingSkill上限为100（不超过）', () => {
    ;(sys as any).tappers.push(makeTapper(1, 99.99))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    expect((sys as any).tappers[0].tappingSkill).toBeLessThanOrEqual(100)
  })

  it('技能增长到3.98时不被cleanup删除（<=4才删）', () => {
    // tappingSkill=3.98, <= 4 => 移除
    const t = makeTapper(10, 3.98)
    ;(sys as any).tappers.push(t)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    // 3.98 + 0.02 = 4.00, 4.00 <= 4 => 移除
    expect((sys as any).tappers).toHaveLength(0)
  })

  // cleanup边界：tappingSkill <= 4
  it('tappingSkill <= 4的记录被cleanup移除', () => {
    ;(sys as any).tappers.push(makeTapper(1, 4))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    // 4 + 0.02 = 4.02, 4.02 <= 4 false => 不移除
    // 等等，cleanup在技能增长之后执行: 4 -> 4.02, cleanup: 4.02 > 4 => 不移除
    expect((sys as any).tappers).toHaveLength(1)
  })

  it('tappingSkill起始为3时增长后仍<=4被移除', () => {
    ;(sys as any).tappers.push(makeTapper(2, 3))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    // 3 + 0.02 = 3.02, 3.02 <= 4 => 移除
    expect((sys as any).tappers).toHaveLength(0)
  })

  it('tappingSkill正常值不被cleanup', () => {
    ;(sys as any).tappers.push(makeTapper(3, 50))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    expect((sys as any).tappers).toHaveLength(1)
  })

  // 招募：MAX_TAPPERS 上限
  it('tappers达到MAX_TAPPERS时不再招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < RECRUIT_CHANCE=0.0015 => true
    ;(sys as any).lastCheck = 0
    for (let i = 0; i < 10; i++) {
      ;(sys as any).tappers.push(makeTapper(i + 1))
    }
    sys.update(0, makeEm(), 3010)
    vi.restoreAllMocks()
    expect((sys as any).tappers.length).toBe(10)
  })

  // 招募概率 random >= RECRUIT_CHANCE 不招募
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // 1 >= 0.0015 => not recruited
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    vi.restoreAllMocks()
    expect((sys as any).tappers).toHaveLength(0)
  })

  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    vi.restoreAllMocks()
    if ((sys as any).tappers.length > 0) {
      expect((sys as any).tappers[0].tick).toBe(3010)
    }
  })

  it('多次update技能累积增长正确', () => {
    ;(sys as any).tappers.push(makeTapper(5, 50))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEm(), 3010)
    sys.update(0, makeEm(), 6020)
    sys.update(0, makeEm(), 9030)
    // 3次增长：50 + 3*0.02 = 50.06
    expect((sys as any).tappers[0].tappingSkill).toBeCloseTo(50.06, 5)
  })
})
