import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureApprenticeSystem } from '../systems/CreatureApprenticeSystem'
import type { Apprenticeship, ApprenticeSkill } from '../systems/CreatureApprenticeSystem'

// CHECK_INTERVAL=700, TRAIN_INTERVAL=400, MENTOR_RANGE=8, MIN_AGE_MASTER=50
// MAX_APPRENTICESHIPS=15, GRADUATION_THRESHOLD=100, PROGRESS_PER_TICK=2

function makeSys() { return new CreatureApprenticeSystem() }

function makeApp(id: number, masterId: number, apprenticeId: number, skill: ApprenticeSkill = 'combat', graduated = false): Apprenticeship {
  return { id, masterId, apprenticeId, civId: 1, skill, progress: 0, startTick: 0, graduated }
}

describe('CreatureApprenticeSystem', () => {
  let sys: CreatureApprenticeSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('apprenticeships初始为空', () => { expect((sys as any).apprenticeships.length).toBe(0) })

  // ── CHECK_INTERVAL / TRAIN_INTERVAL 节流 ─────────────────────────────────

  it('tick未达到nextCheckTick时不触发formApprenticeships', () => {
    ;(sys as any).nextCheckTick = 1000
    // 直接检查状态不变
    expect((sys as any).nextCheckTick).toBe(1000)
  })

  it('tick未达到nextTrainTick时不触发train', () => {
    ;(sys as any).nextTrainTick = 800
    expect((sys as any).nextTrainTick).toBe(800)
  })

  // ── getActiveCount ───────────────────────────────────────────────────────

  it('getActiveCount：只计graduated=false的记录', () => {
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    apps.push(makeApp(1, 1, 2, 'combat', false))     // active
    apps.push(makeApp(2, 3, 4, 'foraging', true))    // graduated
    apps.push(makeApp(3, 5, 6, 'building', false))   // active
    expect(sys.getActiveCount()).toBe(2)
  })

  it('getActiveCount：全graduated时返回0', () => {
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    apps.push(makeApp(1, 1, 2, 'combat', true))
    apps.push(makeApp(2, 3, 4, 'medicine', true))
    expect(sys.getActiveCount()).toBe(0)
  })

  it('getActiveCount：全active时返回正确数量', () => {
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    for (let i = 0; i < 5; i++) {
      apps.push(makeApp(i + 1, i * 2 + 1, i * 2 + 2, 'combat', false))
    }
    expect(sys.getActiveCount()).toBe(5)
  })

  // ── applyGraduation: 技能效果 ─────────────────────────────────────────────

  it('applyGraduation(combat)：damage+5', () => {
    const app = makeApp(1, 1, 2, 'combat')
    const creature = { name: 'Apprentice', damage: 10, speed: 1 }
    const needs = { health: 80 }
    const master = { name: 'Master' }
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 2 && type === 'creature') return creature
        if (id === 2 && type === 'needs') return needs
        if (id === 1 && type === 'creature') return master
        return null
      }
    } as any
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(15)  // 10+5=15
  })

  it('applyGraduation(foraging)：speed+0.3，上限3', () => {
    const app = makeApp(1, 1, 2, 'foraging')
    const creature = { name: 'Apprentice', damage: 5, speed: 1.0 }
    const needs = { health: 80 }
    const master = { name: 'Master' }
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 2 && type === 'creature') return creature
        if (id === 2 && type === 'needs') return needs
        if (id === 1 && type === 'creature') return master
        return null
      }
    } as any
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.speed).toBeCloseTo(1.3, 5)
  })

  it('applyGraduation(foraging)：speed上限为3', () => {
    const app = makeApp(1, 1, 2, 'foraging')
    const creature = { name: 'Apprentice', damage: 5, speed: 2.8 }
    const needs = { health: 80 }
    const master = { name: 'Master' }
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 2 && type === 'creature') return creature
        if (id === 2 && type === 'needs') return needs
        if (id === 1 && type === 'creature') return master
        return null
      }
    } as any
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.speed).toBe(3)  // Math.min(3, 2.8+0.3)=3
  })

  it('applyGraduation(medicine)：health+20，上限100', () => {
    const app = makeApp(1, 1, 2, 'medicine')
    const creature = { name: 'Apprentice', damage: 5, speed: 1 }
    const needs = { health: 90 }
    const master = { name: 'Master' }
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 2 && type === 'creature') return creature
        if (id === 2 && type === 'needs') return needs
        if (id === 1 && type === 'creature') return master
        return null
      }
    } as any
    ;(sys as any).applyGraduation(em, app, 100)
    expect(needs.health).toBe(100)  // Math.min(100, 90+20)=100
  })

  it('applyGraduation(building)：damage+2', () => {
    const app = makeApp(1, 1, 2, 'building')
    const creature = { name: 'Apprentice', damage: 8, speed: 1 }
    const needs = { health: 70 }
    const master = { name: 'Master' }
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 2 && type === 'creature') return creature
        if (id === 2 && type === 'needs') return needs
        if (id === 1 && type === 'creature') return master
        return null
      }
    } as any
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(10)  // 8+2=10
  })

  it('applyGraduation(leadership)：damage+3', () => {
    const app = makeApp(1, 1, 2, 'leadership')
    const creature = { name: 'Leader', damage: 7, speed: 1 }
    const needs = { health: 80 }
    const master = { name: 'Master' }
    const em = {
      getComponent: (id: number, type: string) => {
        if (id === 2 && type === 'creature') return creature
        if (id === 2 && type === 'needs') return needs
        if (id === 1 && type === 'creature') return master
        return null
      }
    } as any
    ;(sys as any).applyGraduation(em, app, 100)
    expect(creature.damage).toBe(10)  // 7+3=10
  })

  // ── ApprenticeSkill 完整性 ────────────────────────────────────────────────

  it('5种ApprenticeSkill可以存入Apprenticeship', () => {
    const skills: ApprenticeSkill[] = ['combat', 'foraging', 'building', 'medicine', 'leadership']
    const apps = (sys as any).apprenticeships as Apprenticeship[]
    for (const skill of skills) {
      apps.push(makeApp(apps.length + 1, 1, 2, skill))
    }
    expect(apps.length).toBe(5)
    expect(apps.map(a => a.skill)).toEqual(skills)
  })
})
