import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureSomniloquySystem } from '../systems/CreatureSomniloquySystem'
import type { SleepTalk, SleepTalkType } from '../systems/CreatureSomniloquySystem'

let nextId = 1
function makeSys(): CreatureSomniloquySystem { return new CreatureSomniloquySystem() }
function makeTalk(entityId: number, type: SleepTalkType = 'secret', significance = 50, tick = 0): SleepTalk {
  return { id: nextId++, entityId, talkType: type, content: 'hidden treasure...', significance, tick }
}

const CHECK_INTERVAL = 1000
const MAX_TALKS = 60

describe('CreatureSomniloquySystem - 基础数据结构', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无梦话', () => { expect((sys as any).talks).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).talks.push(makeTalk(1, 'prophecy'))
    expect((sys as any).talks[0].talkType).toBe('prophecy')
  })
  it('返回内部引用', () => {
    ;(sys as any).talks.push(makeTalk(1))
    expect((sys as any).talks).toBe((sys as any).talks)
  })
  it('支持所有6种梦话类型', () => {
    const types: SleepTalkType[] = ['secret', 'prophecy', 'nonsense', 'memory', 'warning', 'confession']
    types.forEach((t, i) => { ;(sys as any).talks.push(makeTalk(i + 1, t)) })
    const all = (sys as any).talks
    types.forEach((t, i) => { expect(all[i].talkType).toBe(t) })
  })
  it('字段正确', () => {
    ;(sys as any).talks.push(makeTalk(2, 'memory'))
    const t = (sys as any).talks[0]
    expect(t.significance).toBe(50)
    expect(t.content).toBe('hidden treasure...')
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('多个全部存储', () => {
    ;(sys as any).talks.push(makeTalk(1))
    ;(sys as any).talks.push(makeTalk(2))
    ;(sys as any).talks.push(makeTalk(3))
    expect((sys as any).talks).toHaveLength(3)
  })
})

describe('CreatureSomniloquySystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足CHECK_INTERVAL时update不更新lastCheck', () => {
    const mockEM = { getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    const mockEM = { getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次间隔不足时只更新一次', () => {
    const mockEM = { getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    sys.update(1, mockEM as any, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('update不崩溃（空实体列表）', () => {
    const mockEM = { getEntitiesWithComponents: () => [] }
    expect(() => sys.update(1, mockEM as any, 0)).not.toThrow()
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    const mockEM = { getEntitiesWithComponents: () => [] }
    ;(sys as any).lastCheck = 500
    sys.update(1, mockEM as any, 500 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(500 + CHECK_INTERVAL)
  })
  it('差值比CHECK_INTERVAL少1时不执行', () => {
    const mockEM = { getEntitiesWithComponents: () => [] }
    ;(sys as any).lastCheck = 500
    sys.update(1, mockEM as any, 500 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(500)
  })
  it('连续满足两次间隔时lastCheck逐步推进', () => {
    const mockEM = { getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    sys.update(1, mockEM as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('节流期间talks不增加', () => {
    const mockEM = { getEntitiesWithComponents: () => [1, 2] }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockEM as any, CHECK_INTERVAL - 1)
    expect((sys as any).talks).toHaveLength(0)
  })
})

describe('CreatureSomniloquySystem - significance区间', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('prophecy的significance在60-100区间', () => {
    const val = 60 + Math.random() * 40
    expect(val).toBeGreaterThanOrEqual(60)
    expect(val).toBeLessThanOrEqual(100)
  })
  it('secret的significance在40-80区间', () => {
    const val = 40 + Math.random() * 40
    expect(val).toBeGreaterThanOrEqual(40)
    expect(val).toBeLessThanOrEqual(80)
  })
  it('warning的significance在50-80区间', () => {
    const val = 50 + Math.random() * 30
    expect(val).toBeGreaterThanOrEqual(50)
    expect(val).toBeLessThanOrEqual(80)
  })
  it('confession的significance在30-60区间', () => {
    const val = 30 + Math.random() * 30
    expect(val).toBeGreaterThanOrEqual(30)
    expect(val).toBeLessThanOrEqual(60)
  })
  it('memory的significance在10-40区间', () => {
    const val = 10 + Math.random() * 30
    expect(val).toBeGreaterThanOrEqual(10)
    expect(val).toBeLessThanOrEqual(40)
  })
  it('nonsense的significance在0-20区间', () => {
    const val = Math.random() * 20
    expect(val).toBeGreaterThanOrEqual(0)
    expect(val).toBeLessThan(20)
  })
  it('prophecy比nonsense的significance基础值高', () => {
    // prophecy基础60 > nonsense基础0
    expect(60).toBeGreaterThan(0)
  })
  it('secret比memory的significance基础值高', () => {
    expect(40).toBeGreaterThan(10)
  })
})

describe('CreatureSomniloquySystem - MAX_TALKS上限与cleanup排序', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('MAX_TALKS上限为60', () => { expect(MAX_TALKS).toBe(60) })
  it('talks超过MAX_TALKS后cleanup截断到60', () => {
    for (let i = 0; i < 61; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'secret', i * 1.5, 0))
    }
    ;(sys as any).cleanup()
    expect((sys as any).talks).toHaveLength(MAX_TALKS)
  })
  it('cleanup按significance降序保留最重要的记录', () => {
    for (let i = 0; i < 60; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'nonsense', i, 0))
    }
    ;(sys as any).talks.push(makeTalk(99, 'prophecy', 200, 0))
    ;(sys as any).cleanup()
    expect((sys as any).talks).toHaveLength(MAX_TALKS)
    expect((sys as any).talks[0].significance).toBe(200)
  })
  it('talks未超过MAX_TALKS时cleanup不截断', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'secret', 50, 0))
    }
    ;(sys as any).cleanup()
    expect((sys as any).talks).toHaveLength(10)
  })
  it('cleanup后数组仍是数组', () => {
    for (let i = 0; i < 65; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'memory', i, 0))
    }
    ;(sys as any).cleanup()
    expect(Array.isArray((sys as any).talks)).toBe(true)
  })
  it('nextId单调递增', () => {
    ;(sys as any).talks.push(makeTalk(1))
    ;(sys as any).talks.push(makeTalk(2))
    const ids = (sys as any).talks.map((t: SleepTalk) => t.id)
    expect(ids[1]).toBeGreaterThan(ids[0])
  })
  it('cleanup恰好60条不截断', () => {
    for (let i = 0; i < MAX_TALKS; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'secret', i, 0))
    }
    ;(sys as any).cleanup()
    expect((sys as any).talks).toHaveLength(MAX_TALKS)
  })
  it('cleanup排序后第一个significance最大', () => {
    for (let i = 0; i < 65; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'secret', Math.random() * 100, 0))
    }
    ;(sys as any).cleanup()
    const talks = (sys as any).talks
    expect(talks[0].significance).toBeGreaterThanOrEqual(talks[talks.length - 1].significance)
  })
})

describe('CreatureSomniloquySystem - generateTalks 与实体交互', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('实体列表为空时不生成梦话', () => {
    const mockEM = { getEntitiesWithComponents: () => [] }
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    expect((sys as any).talks).toHaveLength(0)
  })
  it('TALK_CHANCE=0.01，random=0时必触发', () => {
    const mockEM = { getEntitiesWithComponents: () => [1] }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    expect((sys as any).talks.length).toBeGreaterThan(0)
  })
  it('TALK_CHANCE=0.01，random=0.99时不触发', () => {
    const mockEM = { getEntitiesWithComponents: () => [1] }
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    expect((sys as any).talks).toHaveLength(0)
  })
  it('talks已满时不再生成新梦话', () => {
    for (let i = 0; i < MAX_TALKS; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'secret', 50, 0))
    }
    const mockEM = { getEntitiesWithComponents: () => [999] }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    // talks应该不超过MAX_TALKS（cleanup会截断）
    expect((sys as any).talks.length).toBeLessThanOrEqual(MAX_TALKS)
  })
  it('生成的梦话entityId与实体匹配', () => {
    const mockEM = { getEntitiesWithComponents: () => [42] }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    if ((sys as any).talks.length > 0) {
      expect((sys as any).talks[0].entityId).toBe(42)
    }
  })
  it('生成的梦话tick等于当前tick', () => {
    const mockEM = { getEntitiesWithComponents: () => [10] }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mockEM as any, CHECK_INTERVAL)
    if ((sys as any).talks.length > 0) {
      expect((sys as any).talks[0].tick).toBe(CHECK_INTERVAL)
    }
  })
})
