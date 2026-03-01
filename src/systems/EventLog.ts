// Global event log for tracking world events

export type EventType = 'birth' | 'death' | 'combat' | 'war' | 'peace' | 'weather' | 'disaster' | 'civ_founded' | 'building' | 'hero' | 'trade' | 'tech' | 'artifact' | 'world_event' | 'disease' | 'mutation' | 'diplomacy' | 'religion' | 'era' | 'culture'

export interface WorldEvent {
  type: EventType
  message: string
  tick: number
  color: string
}

const EVENT_COLORS: Record<EventType, string> = {
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

const MAX_EVENTS = 200

class EventLogSingleton {
  // Ring buffer replaces shifting array — O(1) insert, O(1) oldest-eviction
  private _buf: WorldEvent[] = Array.from({ length: MAX_EVENTS }, () => ({ type: 'birth' as EventType, message: '', tick: 0, color: '' }))
  private _head = 0  // write pointer
  private _count = 0
  private listeners: Array<(e: WorldEvent) => void> = []

  get events(): WorldEvent[] {
    // Reconstruct ordered snapshot for backwards-compat (rare external access)
    const result: WorldEvent[] = []
    const n = this._count
    for (let i = 0; i < n; i++) {
      result.push(this._buf[(this._head - n + i + MAX_EVENTS) % MAX_EVENTS])
    }
    return result
  }

  log(type: EventType, message: string, tick: number): void {
    const event = this._buf[this._head]
    event.type = type
    event.message = message
    event.tick = tick
    event.color = EVENT_COLORS[type]
    this._head = (this._head + 1) % MAX_EVENTS
    if (this._count < MAX_EVENTS) this._count++
    for (const fn of this.listeners) {
      fn(event)
    }
  }

  onEvent(fn: (e: WorldEvent) => void): void {
    this.listeners.push(fn)
  }

  getRecent(count: number = 10): WorldEvent[] {
    const n = Math.min(count, this._count)
    const result: WorldEvent[] = []
    // Return oldest-first (ascending) so result[last] is the newest
    for (let i = n - 1; i >= 0; i--) {
      result.push(this._buf[(this._head - 1 - i + MAX_EVENTS) % MAX_EVENTS])
    }
    return result
  }

  clear(): void {
    this._head = 0
    this._count = 0
  }
}

export const EventLog = new EventLogSingleton()
