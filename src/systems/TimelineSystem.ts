// World Age Timeline - era progression and historical events tracker

import { EventLog } from './EventLog'

export interface HistoricalEvent {
  tick: number
  era: string
  type: 'era_change' | 'war' | 'disaster' | 'achievement' | 'founding' | 'collapse'
  description: string
}

export interface Era {
  name: string
  startTick: number
  minDuration: number  // minimum ticks before next era
  color: string
}

const ERA_DEFINITIONS: { name: string; tickThreshold: number; color: string }[] = [
  { name: 'Dawn Age', tickThreshold: 0, color: '#a0a0a0' },
  { name: 'Tribal Age', tickThreshold: 7200, color: '#c8a060' },
  { name: 'Bronze Age', tickThreshold: 21600, color: '#cd7f32' },
  { name: 'Iron Age', tickThreshold: 43200, color: '#708090' },
  { name: 'Classical Age', tickThreshold: 72000, color: '#daa520' },
  { name: 'Medieval Age', tickThreshold: 108000, color: '#8b4513' },
  { name: 'Renaissance', tickThreshold: 162000, color: '#9370db' },
  { name: 'Modern Age', tickThreshold: 252000, color: '#4682b4' },
]

export class TimelineSystem {
  private history: HistoricalEvent[] = []
  private currentEraIndex: number = 0
  private maxEvents: number = 200
  /** Cached era info object — updated in-place when era changes, avoids per-call {name,color,index} allocation */
  private _eraInfo = { name: ERA_DEFINITIONS[0].name, color: ERA_DEFINITIONS[0].color, index: 0 }

  constructor() {
    this.history.push({
      tick: 0,
      era: ERA_DEFINITIONS[0].name,
      type: 'era_change',
      description: 'The world begins in the Dawn Age'
    })
  }

  update(tick: number): void {
    // Check era progression
    if (this.currentEraIndex < ERA_DEFINITIONS.length - 1) {
      const nextEra = ERA_DEFINITIONS[this.currentEraIndex + 1]
      if (tick >= nextEra.tickThreshold) {
        this.currentEraIndex++
        const event: HistoricalEvent = {
          tick,
          era: nextEra.name,
          type: 'era_change',
          description: `The world enters the ${nextEra.name}`
        }
        this.history.push(event)
        EventLog.log('building', `Era Change: ${nextEra.name} begins!`, tick)
      }
    }
  }

  recordEvent(tick: number, type: HistoricalEvent['type'], description: string): void {
    this.history.push({
      tick,
      era: this.getCurrentEra().name,
      type,
      description
    })
    if (this.history.length > this.maxEvents) {
      this.history.shift()
    }
  }

  getCurrentEra(): { name: string; color: string; index: number } {
    const era = ERA_DEFINITIONS[this.currentEraIndex]
    this._eraInfo.name = era.name
    this._eraInfo.color = era.color
    this._eraInfo.index = this.currentEraIndex
    return this._eraInfo
  }

  getEraProgress(tick: number): number {
    if (this.currentEraIndex >= ERA_DEFINITIONS.length - 1) return 1.0
    const current = ERA_DEFINITIONS[this.currentEraIndex].tickThreshold
    const next = ERA_DEFINITIONS[this.currentEraIndex + 1].tickThreshold
    const diff = next - current
    return diff > 0 ? Math.min(1.0, (tick - current) / diff) : 1.0
  }

  getHistory(): HistoricalEvent[] {
    return this.history
  }

  getEraDefinitions(): typeof ERA_DEFINITIONS {
    return ERA_DEFINITIONS
  }

  getWorldAge(tick: number): string {
    const years = Math.floor(tick / 3600) // 1 day cycle = 1 year
    if (years < 1) return 'Year 0'
    return `Year ${years}`
  }
}
