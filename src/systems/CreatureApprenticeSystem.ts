// Creature Apprentice System (v2.18) - Master-apprentice relationships
// Experienced creatures mentor younger ones, transferring skills and knowledge

import { EntityManager, EntityId, PositionComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'
import { CivMemberComponent } from '../civilization/Civilization'
import { EventLog } from './EventLog'
const _EMPTY_DASH: number[] = []
const _DASH_3_3: number[] = [3, 3]

export interface Apprenticeship {
  id: number
  masterId: EntityId
  apprenticeId: EntityId
  civId: number
  skill: ApprenticeSkill
  progress: number        // 0 - 100
  startTick: number
  graduated: boolean
}

export type ApprenticeSkill = 'combat' | 'foraging' | 'building' | 'medicine' | 'leadership'

const CHECK_INTERVAL = 700
const TRAIN_INTERVAL = 400
const MENTOR_RANGE = 8
const MIN_AGE_MASTER = 50
const MAX_APPRENTICESHIPS = 15
const GRADUATION_THRESHOLD = 100
const PROGRESS_PER_TICK = 2

const SKILLS: ApprenticeSkill[] = ['combat', 'foraging', 'building', 'medicine', 'leadership']

const SKILL_COLORS: Record<ApprenticeSkill, string> = {
  combat: '#f66',
  foraging: '#6c6',
  building: '#ca6',
  medicine: '#6cf',
  leadership: '#fc6',
}

let nextAppId = 1

export class CreatureApprenticeSystem {
  private apprenticeships: Apprenticeship[] = []
  private nextCheckTick = CHECK_INTERVAL
  private nextTrainTick = TRAIN_INTERVAL
  private _activeBuf: Apprenticeship[] = []
  private _candidatesBuf: Array<{ id: EntityId; age: number; civId: number; x: number; y: number }> = []
  private _mastersBuf: Array<{ id: EntityId; age: number; civId: number; x: number; y: number }> = []
  private _youngBuf: Array<{ id: EntityId; age: number; civId: number; x: number; y: number }> = []

  getApprenticeships(): Apprenticeship[] { return this.apprenticeships }

  getActiveCount(): number {
    let n = 0
    for (const a of this.apprenticeships) { if (!a.graduated) n++ }
    return n
  }

  update(dt: number, em: EntityManager, tick: number): void {
    // Clean up dead entities
    for (let i = this.apprenticeships.length - 1; i >= 0; i--) {
      const a = this.apprenticeships[i]
      if (a.graduated) continue
      const mp = em.getComponent<PositionComponent>(a.masterId, 'position')
      const ap = em.getComponent<PositionComponent>(a.apprenticeId, 'position')
      if (!mp || !ap) {
        this.apprenticeships.splice(i, 1)
      }
    }

    // Form new apprenticeships
    if (tick >= this.nextCheckTick) {
      this.nextCheckTick = tick + CHECK_INTERVAL
      this.formApprenticeships(em, tick)
    }

    // Train
    if (tick >= this.nextTrainTick) {
      this.nextTrainTick = tick + TRAIN_INTERVAL
      this.train(em, tick)
    }
  }

  private formApprenticeships(em: EntityManager, tick: number): void {
    let activeCount = 0
    for (const a of this.apprenticeships) { if (!a.graduated) activeCount++ }
    if (activeCount >= MAX_APPRENTICESHIPS) return

    const entities = em.getEntitiesWithComponents('position', 'creature', 'civMember')
    this._candidatesBuf.length = 0
    this._mastersBuf.length = 0
    this._youngBuf.length = 0

    for (const eid of entities) {
      const cc = em.getComponent<CreatureComponent>(eid, 'creature')
      const pos = em.getComponent<PositionComponent>(eid, 'position')
      const cm = em.getComponent<CivMemberComponent>(eid, 'civMember')

      if (!cc || !pos || !cm) continue
      const cand = { id: eid, age: cc.age, civId: cm.civId, x: pos.x, y: pos.y }
      this._candidatesBuf.push(cand)
      if (cc.age >= MIN_AGE_MASTER) this._mastersBuf.push(cand)
      else if (cc.age < MIN_AGE_MASTER * 0.6) this._youngBuf.push(cand)
    }

    // Find potential masters (old) and apprentices (young)
    const masters = this._mastersBuf
    const young = this._youngBuf

    for (const master of masters) {
      if (activeCount >= MAX_APPRENTICESHIPS) break
      // Already mentoring?
      if (this.apprenticeships.some(a => a.masterId === master.id && !a.graduated)) continue

      // Find nearby young from same civ
      for (const apprentice of young) {
        if (apprentice.civId !== master.civId) continue
        if (this.apprenticeships.some(a => a.apprenticeId === apprentice.id && !a.graduated)) continue

        const dx = master.x - apprentice.x, dy = master.y - apprentice.y
        if (dx * dx + dy * dy > MENTOR_RANGE * MENTOR_RANGE) continue

        const skill = SKILLS[Math.floor(Math.random() * SKILLS.length)]
        const app: Apprenticeship = {
          id: nextAppId++,
          masterId: master.id,
          apprenticeId: apprentice.id,
          civId: master.civId,
          skill,
          progress: 0,
          startTick: tick,
          graduated: false,
        }
        this.apprenticeships.push(app)
        activeCount++

        const mc = em.getComponent<CreatureComponent>(master.id, 'creature')
        const ac = em.getComponent<CreatureComponent>(apprentice.id, 'creature')
        if (mc && ac) {
          EventLog.log('culture', `${mc.name} begins mentoring ${ac.name} in ${skill}`, tick)
        }
        break
      }
    }
  }

  private train(em: EntityManager, tick: number): void {
    for (const app of this.apprenticeships) {
      if (app.graduated) continue

      const mp = em.getComponent<PositionComponent>(app.masterId, 'position')
      const ap = em.getComponent<PositionComponent>(app.apprenticeId, 'position')
      if (!mp || !ap) continue

      const dx = mp.x - ap.x, dy = mp.y - ap.y
      if (dx * dx + dy * dy > MENTOR_RANGE * MENTOR_RANGE) continue

      app.progress += PROGRESS_PER_TICK

      if (app.progress >= GRADUATION_THRESHOLD) {
        app.graduated = true
        this.applyGraduation(em, app, tick)
      }
    }
  }

  private applyGraduation(em: EntityManager, app: Apprenticeship, tick: number): void {
    const cc = em.getComponent<CreatureComponent>(app.apprenticeId, 'creature')
    const needs = em.getComponent<NeedsComponent>(app.apprenticeId, 'needs')
    if (!cc || !needs) return

    switch (app.skill) {
      case 'combat':
        cc.damage += 5
        break
      case 'foraging':
        cc.speed = Math.min(3, cc.speed + 0.3)
        break
      case 'medicine':
        needs.health = Math.min(100, needs.health + 20)
        break
      case 'building':
        cc.damage += 2
        break
      case 'leadership':
        cc.damage += 3
        break
    }

    const mc = em.getComponent<CreatureComponent>(app.masterId, 'creature')
    EventLog.log('culture', `${cc.name} graduated from ${mc?.name ?? 'master'}'s ${app.skill} training!`, tick)
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, em: EntityManager): void {
    const active = this._activeBuf
    active.length = 0
    for (const a of this.apprenticeships) { if (!a.graduated) active.push(a) }
    if (active.length === 0) return

    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 1

    for (const app of active) {
      const mp = em.getComponent<PositionComponent>(app.masterId, 'position')
      const ap = em.getComponent<PositionComponent>(app.apprenticeId, 'position')
      if (!mp || !ap) continue

      const mx = (mp.x * 16 - camX) * zoom
      const my = (mp.y * 16 - camY) * zoom
      const ax = (ap.x * 16 - camX) * zoom
      const ay = (ap.y * 16 - camY) * zoom

      if (mx < -50 && ax < -50) continue
      if (my < -50 && ay < -50) continue
      if (mx > ctx.canvas.width + 50 && ax > ctx.canvas.width + 50) continue

      const color = SKILL_COLORS[app.skill]
      ctx.strokeStyle = color
      ctx.setLineDash(_DASH_3_3)
      ctx.beginPath()
      ctx.moveTo(mx, my)
      ctx.lineTo(ax, ay)
      ctx.stroke()

      // Progress indicator on apprentice
      ctx.setLineDash(_EMPTY_DASH)
      ctx.globalAlpha = 0.7
      ctx.fillStyle = color
      const barW = 12 * zoom
      const barH = 2 * zoom
      ctx.fillRect(ax - barW / 2, ay - 8 * zoom, barW * (app.progress / 100), barH)
      ctx.strokeStyle = '#fff'
      ctx.strokeRect(ax - barW / 2, ay - 8 * zoom, barW, barH)
      ctx.globalAlpha = 0.5
    }
    ctx.restore()
  }
}
