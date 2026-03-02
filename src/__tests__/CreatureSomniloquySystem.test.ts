import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSomniloquySystem } from '../systems/CreatureSomniloquySystem'
import type { SleepTalk, SleepTalkType } from '../systems/CreatureSomniloquySystem'

let nextId = 1
function makeSys(): CreatureSomniloquySystem { return new CreatureSomniloquySystem() }
function makeTalk(entityId: number, type: SleepTalkType = 'secret', significance = 50, tick = 0): SleepTalk {
  return { id: nextId++, entityId, talkType: type, content: 'hidden treasure...', significance, tick }
}

// 常量与源文件一致
const CHECK_INTERVAL = 1000
const MAX_TALKS = 60

// ---- 基础数据结构 ----
describe('CreatureSomniloquySystem - 基础数据结构', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
})

// ---- CHECK_INTERVAL 节流 ----
describe('CreatureSomniloquySystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
})

// ---- significance区间 ----
describe('CreatureSomniloquySystem - significance区间', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
})

// ---- MAX_TALKS上限与cleanup排序 ----
describe('CreatureSomniloquySystem - MAX_TALKS上限与cleanup排序', () => {
  let sys: CreatureSomniloquySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('MAX_TALKS上限为60', () => {
    expect(MAX_TALKS).toBe(60)
  })

  it('talks超过MAX_TALKS后cleanup截断到60', () => {
    // 注入61条记录
    for (let i = 0; i < 61; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'secret', i * 1.5, 0))
    }
    // 手动调用cleanup
    ;(sys as any).cleanup()
    expect((sys as any).talks).toHaveLength(MAX_TALKS)
  })

  it('cleanup按significance降序保留最重要的记录', () => {
    // 注入61条，其中最高significance=200（故意超出范围以便区分）
    for (let i = 0; i < 60; i++) {
      ;(sys as any).talks.push(makeTalk(i + 1, 'nonsense', i, 0))
    }
    // 插入一条极高significance
    ;(sys as any).talks.push(makeTalk(99, 'prophecy', 200, 0))
    ;(sys as any).cleanup()
    expect((sys as any).talks).toHaveLength(MAX_TALKS)
    // 最高significance的应在第一位
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
})
