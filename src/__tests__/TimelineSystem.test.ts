import { describe, it, expect, beforeEach } from 'vitest'
import { TimelineSystem } from '../systems/TimelineSystem'
import type { HistoricalEvent } from '../systems/TimelineSystem'

function makeSys(): TimelineSystem { return new TimelineSystem() }
function makeEvent(type: HistoricalEvent['type'] = 'war'): HistoricalEvent {
  return { tick: 100, era: 'Bronze Age', type, description: 'A war broke out' }
}

describe('TimelineSystem.getHistory', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })

  it('初始有1个预置事件（Dawn Age开始）', () => {
    expect(sys.getHistory()).toHaveLength(1)
    expect(sys.getHistory()[0].type).toBe('era_change')
  })
  it('注入后历史增加', () => {
    const initialLen = sys.getHistory().length
    ;sys.getHistory().push(makeEvent())
    expect(sys.getHistory()).toHaveLength(initialLen + 1)
  })
  it('返回内部引用', () => {
    expect(sys.getHistory()).toBe(sys.getHistory())
  })
  it('支持6种历史事件类型', () => {
    const types: HistoricalEvent['type'][] = ['era_change', 'war', 'disaster', 'achievement', 'founding', 'collapse']
    types.forEach(t => { ;sys.getHistory().push(makeEvent(t)) })
    const all = sys.getHistory()
    // 前1个是预置事件，后6个是我们注入的
    expect(all).toHaveLength(7)
    expect(all[1].type).toBe('era_change')
    expect(all[2].type).toBe('war')
  })
  it('预置事件的era是Dawn Age', () => {
    expect(sys.getHistory()[0].era).toBe('Dawn Age')
  })
})

describe('TimelineSystem.getEraDefinitions', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })

  it('返回时代定义列表（至少5个）', () => {
    const defs = sys.getEraDefinitions()
    expect(defs.length).toBeGreaterThanOrEqual(5)
  })
  it('第一个时代是Dawn Age', () => {
    expect(sys.getEraDefinitions()[0].name).toBe('Dawn Age')
  })
})

describe('TimelineSystem.getEraProgress', () => {
  let sys: TimelineSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0时进度>=0', () => {
    expect(sys.getEraProgress(0)).toBeGreaterThanOrEqual(0)
  })
  it('返回0到1之间的值', () => {
    const p = sys.getEraProgress(5000)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})
