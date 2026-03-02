import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFirewalkerSystem } from '../systems/CreatureFirewalkerSystem'
import type { FirewalkerData, FirewalkerMastery } from '../systems/CreatureFirewalkerSystem'

function makeSys(): CreatureFirewalkerSystem { return new CreatureFirewalkerSystem() }
function makeFirewalker(
  entityId: number,
  mastery: FirewalkerMastery = 'novice',
  active = true,
  walkDistance = 20,
  heatResistance = 20,
): FirewalkerData {
  return { entityId, heatResistance, fireTrail: false, walkDistance, mastery, active, tick: 0 }
}

describe('CreatureFirewalkerSystem', () => {
  let sys: CreatureFirewalkerSystem
  beforeEach(() => { sys = makeSys() })

  // ---- 静态数据测试 ----
  it('初始无火行者', () => {
    expect((sys as any).firewalkers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).firewalkers.push(makeFirewalker(1, 'master'))
    expect((sys as any).firewalkers[0].mastery).toBe('master')
  })

  it('支持所有 4 种火行者精通等级', () => {
    const levels: FirewalkerMastery[] = ['novice', 'adept', 'master', 'grandmaster']
    levels.forEach((l, i) => { ;(sys as any).firewalkers.push(makeFirewalker(i + 1, l)) })
    const all = (sys as any).firewalkers
    levels.forEach((l, i) => { expect(all[i].mastery).toBe(l) })
  })

  it('heatResistance 上限为 100（grandmaster）', () => {
    const f = makeFirewalker(1, 'grandmaster', true, 700, 100)
    ;(sys as any).firewalkers.push(f)
    expect((sys as any).firewalkers[0].heatResistance).toBe(100)
  })

  it('active 字段可设为 false', () => {
    ;(sys as any).firewalkers.push(makeFirewalker(1, 'novice', false))
    expect((sys as any).firewalkers[0].active).toBe(false)
  })

  it('_firewalkersSet 初始为空', () => {
    expect((sys as any)._firewalkersSet.size).toBe(0)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ---- update / tick 控制测试 ----
  it('tick差值 < CHECK_INTERVAL(2600) 时不更新 lastCheck', () => {
    const em = { getEntitiesWithComponent: () => [] } as any
    sys.update(1, em, 100)
    // tick=100, lastCheck=0, 差值100<2600 => 直接返回，lastCheck 保持 0
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 >= CHECK_INTERVAL(2600) 时更新 lastCheck', () => {
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  // ---- mastery 晋升逻辑（基于 walkDistance 阈值） ----
  it('walkDistance > 100 且 mastery=novice 时晋升为 adept', () => {
    // 直接操作内部数组模拟已有 firewalker
    const f = makeFirewalker(1, 'novice', true, 101, 20)
    ;(sys as any).firewalkers.push(f)
    // 调用 update，em 不招募新成员，hasComponent 返回 true 保留存量
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    // 使用 Math.random mock 使概率分支 < 0.03 触发 walkDistance 增加但不影响晋升判断
    // 直接把 walkDistance 提高到阈值后验证晋升
    // 模拟 update 内部 mastery 判断需要 tick>=2600
    ;(sys as any).lastCheck = 0
    // stub random to never trigger walkDistance increment (return 1 always >= 0.03)
    const origRandom = Math.random
    Math.random = () => 1
    sys.update(1, em, 2600)
    Math.random = origRandom
    expect((sys as any).firewalkers[0].mastery).toBe('adept')
    expect((sys as any).firewalkers[0].heatResistance).toBe(50)
    expect((sys as any).firewalkers[0].fireTrail).toBe(true)
  })

  it('walkDistance > 300 且 mastery=adept 时晋升为 master', () => {
    const f = makeFirewalker(1, 'adept', true, 301, 50)
    f.fireTrail = true
    ;(sys as any).firewalkers.push(f)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    const origRandom = Math.random
    Math.random = () => 1
    sys.update(1, em, 2600)
    Math.random = origRandom
    expect((sys as any).firewalkers[0].mastery).toBe('master')
    expect((sys as any).firewalkers[0].heatResistance).toBe(80)
  })

  it('walkDistance > 600 且 mastery=master 时晋升为 grandmaster', () => {
    const f = makeFirewalker(1, 'master', true, 601, 80)
    ;(sys as any).firewalkers.push(f)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: () => true,
    } as any
    ;(sys as any).lastCheck = 0
    const origRandom = Math.random
    Math.random = () => 1
    sys.update(1, em, 2600)
    Math.random = origRandom
    expect((sys as any).firewalkers[0].mastery).toBe('grandmaster')
    expect((sys as any).firewalkers[0].heatResistance).toBe(100)
  })

  it('cleanup: hasComponent=false 时移除火行者', () => {
    const f = makeFirewalker(42, 'novice', true, 10, 20)
    ;(sys as any).firewalkers.push(f)
    const em = {
      getEntitiesWithComponent: () => [],
      hasComponent: (_eid: number, _comp: string) => false,
    } as any
    ;(sys as any).lastCheck = 0
    const origRandom = Math.random
    Math.random = () => 1
    sys.update(1, em, 2600)
    Math.random = origRandom
    expect((sys as any).firewalkers).toHaveLength(0)
  })
})
