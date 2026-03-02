import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventLog } from '../systems/EventLog'
import type { EventType, WorldEvent } from '../systems/EventLog'

// 所有已知 EventType
const ALL_TYPES: EventType[] = [
  'birth', 'death', 'combat', 'war', 'peace', 'weather', 'disaster',
  'civ_founded', 'building', 'hero', 'trade', 'tech', 'artifact',
  'world_event', 'disease', 'mutation', 'diplomacy', 'religion', 'era', 'culture'
]

// 每个类型对应的颜色（与源码同步）
const EXPECTED_COLORS: Record<EventType, string> = {
  birth: '#8f8',
  death: '#f88',
  combat: '#f84',
  war: '#f44',
  peace: '#4af',
  weather: '#aaf',
  disaster: '#f4f',
  civ_founded: '#ff4',
  building: '#ca8',
  hero: '#ff0',
  trade: '#ffd700',
  tech: '#00e5ff',
  artifact: '#ffaa00',
  world_event: '#ff44ff',
  disease: '#4a4',
  mutation: '#d4f',
  diplomacy: '#4af',
  religion: '#daa0f0',
  era: '#ffa500',
  culture: '#e090d0'
}

describe('EventLog', () => {
  beforeEach(() => {
    // 重置单例：清空事件 + 清空监听器（防止跨测试污染）
    EventLog.clear()
    ;(EventLog as any).listeners = []
  })
  afterEach(() => vi.restoreAllMocks())

  // ═══════════════════════════════════════════════════════════
  // 1. 初始状态与 clear
  // ══════════════════════════════════════════��════════════════
  describe('初始状态与 clear', () => {
    it('初始清空后 events 为空', () => {
      expect(EventLog.events).toHaveLength(0)
    })

    it('clear 后 events 为空', () => {
      EventLog.log('birth', 'A', 1)
      EventLog.log('death', 'B', 2)
      EventLog.clear()
      expect(EventLog.events).toHaveLength(0)
    })

    it('clear 后 getRecent 返回空数组', () => {
      EventLog.log('birth', 'Test', 1)
      EventLog.clear()
      expect(EventLog.getRecent(10)).toHaveLength(0)
    })

    it('clear 后再 log 能正常工作', () => {
      EventLog.log('birth', 'First', 1)
      EventLog.clear()
      EventLog.log('death', 'After clear', 5)
      expect(EventLog.events).toHaveLength(1)
      expect(EventLog.events[0].message).toBe('After clear')
    })

    it('多次 clear 不崩溃', () => {
      EventLog.clear()
      EventLog.clear()
      expect(EventLog.events).toHaveLength(0)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 2. log 基本行为
  // ═══════════════════════════════════════════════════════════
  describe('log 基本行为', () => {
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

    it('log 保存 type 字段', () => {
      EventLog.log('war', 'War!', 10)
      expect(EventLog.events[0].type).toBe('war')
    })

    it('log 保存 message 字段', () => {
      EventLog.log('peace', 'Peace!', 20)
      expect(EventLog.events[0].message).toBe('Peace!')
    })

    it('log 保存 tick 字段', () => {
      EventLog.log('combat', 'Fight!', 999)
      expect(EventLog.events[0].tick).toBe(999)
    })

    it('log 保存 color 字段（非空字符串）', () => {
      EventLog.log('war', 'War declared', 50)
      const event = EventLog.events[0]
      expect(typeof event.color).toBe('string')
      expect(event.color.length).toBeGreaterThan(0)
    })

    it('color 以 # 开头', () => {
      EventLog.log('war', 'War declared', 50)
      expect(EventLog.events[0].color.startsWith('#')).toBe(true)
    })

    it('tick 为 0 时正常保存', () => {
      EventLog.log('birth', 'Zero tick', 0)
      expect(EventLog.events[0].tick).toBe(0)
    })

    it('tick 为大数时正常保存', () => {
      EventLog.log('era', 'New era', 999999)
      expect(EventLog.events[0].tick).toBe(999999)
    })

    it('message 为空字符串时正常保存', () => {
      EventLog.log('birth', '', 1)
      expect(EventLog.events[0].message).toBe('')
    })

    it('message 为长字符串时正常保存', () => {
      const longMsg = 'A'.repeat(1000)
      EventLog.log('birth', longMsg, 1)
      expect(EventLog.events[0].message).toBe(longMsg)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 3. 颜色映射
  // ═══════════════════════════════════════════════════════════
  describe('颜色映射', () => {
    it('birth 颜色为 #8f8', () => {
      EventLog.log('birth', '', 0)
      expect(EventLog.events[0].color).toBe('#8f8')
    })

    it('death 颜色为 #f88', () => {
      EventLog.log('death', '', 0)
      expect(EventLog.events[0].color).toBe('#f88')
    })

    it('combat 颜色为 #f84', () => {
      EventLog.log('combat', '', 0)
      expect(EventLog.events[0].color).toBe('#f84')
    })

    it('war 颜色为 #f44', () => {
      EventLog.log('war', '', 0)
      expect(EventLog.events[0].color).toBe('#f44')
    })

    it('peace 颜色为 #4af', () => {
      EventLog.log('peace', '', 0)
      expect(EventLog.events[0].color).toBe('#4af')
    })

    it('weather 颜色为 #aaf', () => {
      EventLog.log('weather', '', 0)
      expect(EventLog.events[0].color).toBe('#aaf')
    })

    it('disaster 颜色为 #f4f', () => {
      EventLog.log('disaster', '', 0)
      expect(EventLog.events[0].color).toBe('#f4f')
    })

    it('civ_founded 颜色为 #ff4', () => {
      EventLog.log('civ_founded', '', 0)
      expect(EventLog.events[0].color).toBe('#ff4')
    })

    it('building 颜色为 #ca8', () => {
      EventLog.log('building', '', 0)
      expect(EventLog.events[0].color).toBe('#ca8')
    })

    it('hero 颜色为 #ff0', () => {
      EventLog.log('hero', '', 0)
      expect(EventLog.events[0].color).toBe('#ff0')
    })

    it('trade 颜色为 #ffd700', () => {
      EventLog.log('trade', '', 0)
      expect(EventLog.events[0].color).toBe('#ffd700')
    })

    it('tech 颜色为 #00e5ff', () => {
      EventLog.log('tech', '', 0)
      expect(EventLog.events[0].color).toBe('#00e5ff')
    })

    it('artifact 颜色为 #ffaa00', () => {
      EventLog.log('artifact', '', 0)
      expect(EventLog.events[0].color).toBe('#ffaa00')
    })

    it('world_event 颜色为 #ff44ff', () => {
      EventLog.log('world_event', '', 0)
      expect(EventLog.events[0].color).toBe('#ff44ff')
    })

    it('disease 颜色为 #4a4', () => {
      EventLog.log('disease', '', 0)
      expect(EventLog.events[0].color).toBe('#4a4')
    })

    it('mutation 颜色为 #d4f', () => {
      EventLog.log('mutation', '', 0)
      expect(EventLog.events[0].color).toBe('#d4f')
    })

    it('diplomacy 颜色为 #4af', () => {
      EventLog.log('diplomacy', '', 0)
      expect(EventLog.events[0].color).toBe('#4af')
    })

    it('religion 颜色为 #daa0f0', () => {
      EventLog.log('religion', '', 0)
      expect(EventLog.events[0].color).toBe('#daa0f0')
    })

    it('era 颜色为 #ffa500', () => {
      EventLog.log('era', '', 0)
      expect(EventLog.events[0].color).toBe('#ffa500')
    })

    it('culture 颜色为 #e090d0', () => {
      EventLog.log('culture', '', 0)
      expect(EventLog.events[0].color).toBe('#e090d0')
    })

    it('所有 EventType 均有对应颜色', () => {
      for (const type of ALL_TYPES) {
        EventLog.clear()
        EventLog.log(type, `Test ${type}`, 0)
        expect(EventLog.events[0].color).toBe(EXPECTED_COLORS[type])
      }
    })

    it('支持所有 EventType 而不抛错', () => {
      for (const type of ALL_TYPES) {
        expect(() => EventLog.log(type, `Test ${type}`, 0)).not.toThrow()
      }
      expect(EventLog.events.length).toBe(ALL_TYPES.length)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 4. Ring Buffer（容量上限）
  // ═══════════════════════════════════════════════════════════
  describe('Ring Buffer 容量限制', () => {
    it('超过 maxEvents(200) 时自动裁剪旧事件', () => {
      for (let i = 0; i < 250; i++) {
        EventLog.log('birth', `Event ${i}`, i)
      }
      expect(EventLog.events.length).toBeLessThanOrEqual(200)
    })

    it('写入恰好 200 条时 length 为 200', () => {
      for (let i = 0; i < 200; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      expect(EventLog.events.length).toBe(200)
    })

    it('写入 201 条后仍为 200 条', () => {
      for (let i = 0; i < 201; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      expect(EventLog.events.length).toBe(200)
    })

    it('写入 400 条后仍为 200 条（双倍容量）', () => {
      for (let i = 0; i < 400; i++) {
        EventLog.log('death', `E${i}`, i)
      }
      expect(EventLog.events.length).toBe(200)
    })

    it('写入 201 条后最旧事���被覆盖，最新可读取', () => {
      for (let i = 0; i < 200; i++) {
        EventLog.log('birth', `Old ${i}`, i)
      }
      EventLog.log('death', 'Newest', 200)
      const events = EventLog.events
      // 最后一个应是 Newest
      expect(events[events.length - 1].message).toBe('Newest')
    })

    it('Ring buffer 写满后顺序保持从旧到新', () => {
      for (let i = 0; i < 200; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      const events = EventLog.events
      // 应从旧到新，tick 递增
      for (let i = 0; i < events.length - 1; i++) {
        expect(events[i].tick).toBeLessThan(events[i + 1].tick)
      }
    })

    it('写入 201 条后第一个是 E1（E0 被覆盖）', () => {
      for (let i = 0; i < 201; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      const events = EventLog.events
      expect(events[0].message).toBe('E1')
    })

    it('写入 210 条后第一个是 E10', () => {
      for (let i = 0; i < 210; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      const events = EventLog.events
      expect(events[0].message).toBe('E10')
    })

    it('clear 后 ring buffer 重新从 0 开始计数', () => {
      for (let i = 0; i < 100; i++) {
        EventLog.log('birth', `Old${i}`, i)
      }
      EventLog.clear()
      EventLog.log('death', 'Fresh', 0)
      expect(EventLog.events).toHaveLength(1)
      expect(EventLog.events[0].message).toBe('Fresh')
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 5. getRecent
  // ═══════════════════════════════════════════════════════════
  describe('getRecent', () => {
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

    it('getRecent 返回 0 条时为空数组', () => {
      EventLog.log('birth', 'Test', 1)
      const recent = EventLog.getRecent(0)
      expect(recent).toHaveLength(0)
    })

    it('getRecent 结果为从旧到新排序', () => {
      for (let i = 0; i < 10; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      const recent = EventLog.getRecent(5)
      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i].tick).toBeLessThan(recent[i + 1].tick)
      }
    })

    it('getRecent 最后一个是最新事件', () => {
      for (let i = 0; i < 15; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      const recent = EventLog.getRecent(3)
      expect(recent[2].message).toBe('E14')
    })

    it('getRecent 超出总数时返回全部', () => {
      EventLog.log('birth', 'A', 1)
      EventLog.log('birth', 'B', 2)
      const recent = EventLog.getRecent(100)
      expect(recent).toHaveLength(2)
    })

    it('getRecent 在 ring buffer 满了之后正确返回最新 5 条', () => {
      for (let i = 0; i < 210; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      const recent = EventLog.getRecent(5)
      expect(recent).toHaveLength(5)
      expect(recent[4].message).toBe('E209')
      expect(recent[3].message).toBe('E208')
    })

    it('getRecent(1) 返回最新一条', () => {
      EventLog.log('birth', 'First', 1)
      EventLog.log('death', 'Second', 2)
      EventLog.log('combat', 'Third', 3)
      const recent = EventLog.getRecent(1)
      expect(recent).toHaveLength(1)
      expect(recent[0].message).toBe('Third')
    })

    it('getRecent 在空时返回空数组', () => {
      expect(EventLog.getRecent(5)).toHaveLength(0)
    })

    it('getRecent(200) 写入 200 条时返回全部', () => {
      for (let i = 0; i < 200; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      expect(EventLog.getRecent(200)).toHaveLength(200)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 6. onEvent 监听器
  // ═══════════════════════════════════════════════════════════
  describe('onEvent 监听器', () => {
    it('onEvent 监听器在新事件时被调用', () => {
      let calledWith: string | null = null
      EventLog.onEvent(e => { calledWith = e.message })
      EventLog.log('peace', 'Peace achieved', 99)
      expect(calledWith).toBe('Peace achieved')
    })

    it('监听器接收到正确的 type', () => {
      let receivedType: EventType | null = null
      EventLog.onEvent(e => { receivedType = e.type })
      EventLog.log('war', 'War', 1)
      expect(receivedType).toBe('war')
    })

    it('监听器接收到正确的 tick', () => {
      let receivedTick: number | null = null
      EventLog.onEvent(e => { receivedTick = e.tick })
      EventLog.log('birth', 'Born', 555)
      expect(receivedTick).toBe(555)
    })

    it('监听器接收到正确的 color', () => {
      let receivedColor: string | null = null
      EventLog.onEvent(e => { receivedColor = e.color })
      EventLog.log('death', 'Died', 1)
      expect(receivedColor).toBe('#f88')
    })

    it('注册多个监听器时均被调用', () => {
      const calls: string[] = []
      EventLog.onEvent(() => calls.push('listener1'))
      EventLog.onEvent(() => calls.push('listener2'))
      EventLog.log('birth', 'Born', 1)
      expect(calls).toContain('listener1')
      expect(calls).toContain('listener2')
    })

    it('监听器调用顺序按注册顺序', () => {
      const order: number[] = []
      EventLog.onEvent(() => order.push(1))
      EventLog.onEvent(() => order.push(2))
      EventLog.onEvent(() => order.push(3))
      EventLog.log('birth', '', 0)
      expect(order).toEqual([1, 2, 3])
    })

    it('监听器在 clear 后仍存在（clear 不清理 listeners）', () => {
      let called = false
      EventLog.onEvent(() => { called = true })
      EventLog.clear()
      EventLog.log('birth', '', 0)
      expect(called).toBe(true)
    })

    it('监听器被调用时事件内容与 events[0] 一致', () => {
      let received: WorldEvent | null = null
      EventLog.onEvent(e => { received = { ...e } })
      EventLog.log('combat', 'Fight', 77)
      expect(received).not.toBeNull()
      expect(received!.type).toBe('combat')
      expect(received!.message).toBe('Fight')
      expect(received!.tick).toBe(77)
      expect(received!.color).toBe('#f84')
    })

    it('vi.fn mock 监听器可验证调用次数', () => {
      const fn = vi.fn()
      EventLog.onEvent(fn)
      EventLog.log('birth', 'A', 1)
      EventLog.log('death', 'B', 2)
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('vi.fn mock 监听器第二次调用参数正确', () => {
      const fn = vi.fn()
      EventLog.onEvent(fn)
      EventLog.log('birth', 'First', 1)
      EventLog.log('war', 'Second', 2)
      const secondCall = fn.mock.calls[1][0] as WorldEvent
      expect(secondCall.type).toBe('war')
      expect(secondCall.message).toBe('Second')
    })
  })

  // ���══════════════════════════════════════════════════════════
  // 7. events 顺序验证
  // ═══════════════════════════════════════════════════════════
  describe('events 顺序验证', () => {
    it('events 按插入顺序（从旧到新）返回', () => {
      EventLog.log('birth', 'First', 1)
      EventLog.log('death', 'Second', 2)
      EventLog.log('combat', 'Third', 3)
      const events = EventLog.events
      expect(events[0].message).toBe('First')
      expect(events[1].message).toBe('Second')
      expect(events[2].message).toBe('Third')
    })

    it('events 属性每次调用返回独立快照', () => {
      EventLog.log('birth', 'A', 1)
      const snapshot1 = EventLog.events
      EventLog.log('death', 'B', 2)
      const snapshot2 = EventLog.events
      expect(snapshot1).toHaveLength(1)
      expect(snapshot2).toHaveLength(2)
    })

    it('多种类型混合时顺序正确', () => {
      EventLog.log('birth', 'B', 10)
      EventLog.log('war', 'W', 20)
      EventLog.log('peace', 'P', 30)
      const events = EventLog.events
      expect(events[0].type).toBe('birth')
      expect(events[1].type).toBe('war')
      expect(events[2].type).toBe('peace')
    })

    it('events 返回数组长度与 log 调用次数一致', () => {
      for (let i = 0; i < 50; i++) {
        EventLog.log('birth', `E${i}`, i)
      }
      expect(EventLog.events).toHaveLength(50)
    })
  })

  // ═══════════════════════════════════════════════════════════
  // 8. WorldEvent 接口完整性
  // ═══════════════════════════════════════════════════════════
  describe('WorldEvent 接口完整性', () => {
    it('返回的事件包含 type、message、tick、color 四个字段', () => {
      EventLog.log('birth', 'Test', 42)
      const event = EventLog.events[0]
      expect(event).toHaveProperty('type')
      expect(event).toHaveProperty('message')
      expect(event).toHaveProperty('tick')
      expect(event).toHaveProperty('color')
    })

    it('getRecent 返回的事件同样包含四个完整字段', () => {
      EventLog.log('death', 'Test', 42)
      const event = EventLog.getRecent(1)[0]
      expect(event).toHaveProperty('type')
      expect(event).toHaveProperty('message')
      expect(event).toHaveProperty('tick')
      expect(event).toHaveProperty('color')
    })

    it('监听器接收到的事件包含四个字段', () => {
      let receivedEvent: WorldEvent | null = null
      EventLog.onEvent(e => { receivedEvent = { ...e } })
      EventLog.log('combat', 'Fight', 77)
      expect(receivedEvent).not.toBeNull()
      expect(receivedEvent!.type).toBe('combat')
      expect(receivedEvent!.message).toBe('Fight')
      expect(receivedEvent!.tick).toBe(77)
      expect(receivedEvent!.color).toBe('#f84')
    })

    it('所有字段类型正确：type=string, message=string, tick=number, color=string', () => {
      EventLog.log('hero', 'Hero born', 100)
      const event = EventLog.events[0]
      expect(typeof event.type).toBe('string')
      expect(typeof event.message).toBe('string')
      expect(typeof event.tick).toBe('number')
      expect(typeof event.color).toBe('string')
    })
  })
})
