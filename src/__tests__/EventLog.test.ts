import { describe, it, expect, beforeEach } from 'vitest'
import { EventLog } from '../systems/EventLog'
import type { EventType } from '../systems/EventLog'

describe('EventLog', () => {
  beforeEach(() => {
    EventLog.clear()
  })

  it('初始清空后 events 为空', () => {
    expect(EventLog.events).toHaveLength(0)
  })

  it('log 后 events 包含新事件', () => {
    EventLog.log('birth', 'A creature was born', 100)
    expect(EventLog.events).toHaveLength(1)
    expect(EventLog.events[0].message).toBe('A creature was born')
    expect(EventLog.events[0].tick).toBe(100)
    expect(EventLog.events[0].type).toBe('birth')
  })

  it('log 多次后数量递增', () => {
    EventLog.log('birth', 'A', 1)
    EventLog.log('death', 'B', 2)
    EventLog.log('combat', 'C', 3)
    expect(EventLog.events).toHaveLength(3)
  })

  it('事件有颜色属性（非空字符串）', () => {
    EventLog.log('war', 'War declared', 50)
    const event = EventLog.events[0]
    expect(typeof event.color).toBe('string')
    expect(event.color.startsWith('#')).toBe(true)
  })

  it('超过 maxEvents(200) 时自动裁剪旧事件', () => {
    for (let i = 0; i < 250; i++) {
      EventLog.log('birth', `Event ${i}`, i)
    }
    // 不超过 200 个
    expect(EventLog.events.length).toBeLessThanOrEqual(200)
  })

  it('getRecent 返回最新 N 条事件', () => {
    for (let i = 0; i < 20; i++) {
      EventLog.log('birth', `Event ${i}`, i)
    }
    const recent = EventLog.getRecent(5)
    expect(recent).toHaveLength(5)
    // 最后一条应该是 Event 19
    expect(recent[recent.length - 1].message).toBe('Event 19')
  })

  it('getRecent 默认返回 10 条', () => {
    for (let i = 0; i < 20; i++) {
      EventLog.log('birth', `Event ${i}`, i)
    }
    const recent = EventLog.getRecent()
    expect(recent).toHaveLength(10)
  })

  it('getRecent 在事件不足时返回全部', () => {
    EventLog.log('birth', 'Only one', 1)
    const recent = EventLog.getRecent(10)
    expect(recent).toHaveLength(1)
  })

  it('onEvent 监听器在新事件时被调用', () => {
    let calledWith: string | null = null
    EventLog.onEvent(e => { calledWith = e.message })
    EventLog.log('peace', 'Peace achieved', 99)
    expect(calledWith).toBe('Peace achieved')
  })

  it('支持所有 EventType 而不抛错', () => {
    const types: EventType[] = [
      'birth', 'death', 'combat', 'war', 'peace', 'weather', 'disaster',
      'civ_founded', 'building', 'hero', 'trade', 'tech', 'artifact',
      'world_event', 'disease', 'mutation', 'diplomacy', 'religion', 'era', 'culture'
    ]
    for (const type of types) {
      expect(() => EventLog.log(type, `Test ${type}`, 0)).not.toThrow()
    }
    expect(EventLog.events.length).toBe(types.length)
  })

  it('clear 后 events 为空', () => {
    EventLog.log('birth', 'A', 1)
    EventLog.log('death', 'B', 2)
    EventLog.clear()
    expect(EventLog.events).toHaveLength(0)
  })
})
