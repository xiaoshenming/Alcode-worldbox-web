// Diplomatic Espionage System (v2.24) - Civilizations send spies to rival civs
// Spies gather intelligence, sabotage, or steal technology

import { EntityManager, EntityId, PositionComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export type SpyMission = 'intel' | 'sabotage' | 'steal_tech' | 'assassinate'

export interface Spy {
  id: number
  entityId: EntityId
  originCivId: number
  targetCivId: number
  mission: SpyMission
  x: number
  y: number
  skill: number           // 1-10
  cover: number           // 0-100, detection threshold
  progress: number        // 0-100
  discovered: boolean
  startTick: number
}

export interface EspionageReport {
  spyId: number
  mission: SpyMission
  success: boolean
  detail: string
  tick: number
}

const CHECK_INTERVAL = 1000
const MISSION_INTERVAL = 500
const DETECT_INTERVAL = 800
const MAX_SPIES = 15
const BASE_COVER = 70
const PROGRESS_PER_TICK = 5
const MISSION_COMPLETE = 100

const MISSION_NAMES: Record<SpyMission, string> = {
  intel: 'Gathering Intel',
  sabotage: 'Sabotaging',
  steal_tech: 'Stealing Tech',
  assassinate: 'Assassination',
}

const MISSION_COLORS: Record<SpyMission, string> = {
  intel: '#4cf',
  sabotage: '#f84',
  steal_tech: '#cf4',
  assassinate: '#f44',
}

let nextSpyId = 1

interface CivLike {
  id: number
  name: string
  villages?: { x: number; y: number }[]
}

export class DiplomaticEspionageSystem {
  private spies: Spy[] = []
  private reports: EspionageReport[] = []
  private nextCheckTick = CHECK_INTERVAL
  private nextMissionTick = MISSION_INTERVAL
  private nextDetectTick = DETECT_INTERVAL
  private _lastZoom = -1
  private _alertFont = ''

  getSpies(): Spy[] { return this.spies }
  getActiveSpies(): Spy[] { return this.spies.filter(s => !s.discovered) }
  getReports(): EspionageReport[] { return this.reports }

  update(dt: number, em: EntityManager, civs: CivLike[], tick: number): void {
    // Clean dead spies
    for (let i = this.spies.length - 1; i >= 0; i--) {
      const spy = this.spies[i]
      const pos = em.getComponent<PositionComponent>(spy.entityId, 'position')
      if (!pos) {
        this.spies.splice(i, 1)
      }
    }

    // Deploy new spies
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + CHECK_INTERVAL
      if (this.spies.length < MAX_SPIES && civs.length >= 2 && Math.random() < 0.25) {
        this.deploySpy(em, civs, tick)
      }
    }

    // Progress missions
    if (tick >= this.nextMissionTick) {
      this.nextMissionTick = tick + MISSION_INTERVAL
      for (const spy of this.spies) {
        if (spy.discovered) continue
        spy.progress += PROGRESS_PER_TICK + Math.floor(spy.skill / 3)
        if (spy.progress >= MISSION_COMPLETE) {
          this.completeMission(spy, tick)
        }
      }
    }

    // Detection checks
    if (tick >= this.nextDetectTick) {
      this.nextDetectTick = tick + DETECT_INTERVAL
      for (const spy of this.spies) {
        if (spy.discovered) continue
        const detectChance = (100 - spy.cover) / 100
        if (Math.random() < detectChance * 0.3) {
          spy.discovered = true
          EventLog.log('diplomacy', `Spy from civ#${spy.originCivId} discovered in civ#${spy.targetCivId}!`, 0)
        }
      }
    }

    // Remove discovered spies after a while
    for (let i = this.spies.length - 1; i >= 0; i--) {
      if (this.spies[i].discovered && tick - this.spies[i].startTick > 5000) {
        this.spies.splice(i, 1)
      }
    }

    // Cap reports
    if (this.reports.length > 50) {
      this.reports.splice(0, this.reports.length - 30)
    }
  }

  private deploySpy(em: EntityManager, civs: CivLike[], tick: number): void {
    const originCiv = civs[Math.floor(Math.random() * civs.length)]
    const targetCiv = civs.filter(c => c.id !== originCiv.id)
    if (targetCiv.length === 0) return
    const target = targetCiv[Math.floor(Math.random() * targetCiv.length)]

    // Pick a creature from origin civ
    const entities = em.getEntitiesWithComponents('position', 'creature')
    let spyEntity: EntityId | null = null
    for (const eid of entities) {
      const alreadySpy = this.spies.some(s => s.entityId === eid)
      if (alreadySpy) continue
      spyEntity = eid
      break
    }
    if (!spyEntity) return

    const pos = em.getComponent<PositionComponent>(spyEntity, 'position')
    if (!pos) return
    const missions: SpyMission[] = ['intel', 'sabotage', 'steal_tech', 'assassinate']
    const mission = missions[Math.floor(Math.random() * missions.length)]

    const spy: Spy = {
      id: nextSpyId++,
      entityId: spyEntity,
      originCivId: originCiv.id,
      targetCivId: target.id,
      mission,
      x: pos.x,
      y: pos.y,
      skill: 1 + Math.floor(Math.random() * 10),
      cover: BASE_COVER + Math.floor(Math.random() * 20),
      progress: 0,
      discovered: false,
      startTick: tick,
    }
    this.spies.push(spy)
    EventLog.log('diplomacy', `Civ#${originCiv.id} deployed spy to civ#${target.id} (${mission})`, 0)
  }

  private completeMission(spy: Spy, tick: number): void {
    const success = Math.random() < (spy.skill / 10) * 0.8
    const report: EspionageReport = {
      spyId: spy.id,
      mission: spy.mission,
      success,
      detail: success
        ? `${MISSION_NAMES[spy.mission]} succeeded against civ#${spy.targetCivId}`
        : `${MISSION_NAMES[spy.mission]} failed against civ#${spy.targetCivId}`,
      tick,
    }
    this.reports.push(report)
    spy.progress = 0
    spy.cover -= 10

    if (success) {
      EventLog.log('diplomacy', `Spy mission "${spy.mission}" succeeded against civ#${spy.targetCivId}`, 0)
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    if (zoom !== this._lastZoom) {
      this._lastZoom = zoom
      this._alertFont = `${Math.max(7, 9 * zoom)}px monospace`
    }
    for (const spy of this.spies) {
      const sx = (spy.x - camX) * zoom
      const sy = (spy.y - camY) * zoom
      if (sx < -20 || sy < -20 || sx > ctx.canvas.width + 20 || sy > ctx.canvas.height + 20) continue

      const color = spy.discovered ? '#f44' : MISSION_COLORS[spy.mission]
      ctx.fillStyle = color
      ctx.globalAlpha = spy.discovered ? 0.9 : 0.5
      ctx.beginPath()
      ctx.arc(sx, sy, 3 * zoom, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      if (spy.discovered) {
        ctx.fillStyle = '#f44'
        ctx.font = this._alertFont
        ctx.textAlign = 'center'
        ctx.fillText('!', sx, sy - 5 * zoom)
      }
    }
  }

  renderPanel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const active = this.getActiveSpies()
    if (active.length === 0 && this.reports.length === 0) return

    const rows = Math.min(active.length, 5)
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(x, y, 220, 20 + rows * 18)
    ctx.fillStyle = '#4cf'
    ctx.font = '12px monospace'
    ctx.fillText(`Espionage (${active.length} active)`, x + 8, y + 14)

    active.slice(0, 5).forEach((s, i) => {
      ctx.fillStyle = MISSION_COLORS[s.mission]
      ctx.fillText(`${s.mission} ${s.progress}% cov:${s.cover}`, x + 8, y + 32 + i * 18)
    })
  }
}
