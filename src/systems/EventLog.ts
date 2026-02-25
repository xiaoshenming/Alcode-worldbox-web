// Global event log for tracking world events

export type EventType = 'birth' | 'death' | 'combat' | 'war' | 'peace' | 'weather' | 'disaster' | 'civ_founded' | 'building' | 'hero' | 'trade' | 'tech' | 'artifact'

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
  artifact: '#ffaa00'
}

class EventLogSingleton {
  events: WorldEvent[] = []
  private maxEvents: number = 200
  private listeners: Array<(e: WorldEvent) => void> = []

  log(type: EventType, message: string, tick: number): void {
    const event: WorldEvent = {
      type,
      message,
      tick,
      color: EVENT_COLORS[type]
    }
    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }
    for (const fn of this.listeners) {
      fn(event)
    }
  }

  onEvent(fn: (e: WorldEvent) => void): void {
    this.listeners.push(fn)
  }

  getRecent(count: number = 10): WorldEvent[] {
    return this.events.slice(-count)
  }

  clear(): void {
    this.events = []
  }
}

export const EventLog = new EventLogSingleton()
