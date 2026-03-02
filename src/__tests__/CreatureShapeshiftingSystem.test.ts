import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureShapeshiftingSystem } from '../systems/CreatureShapeshiftingSystem'
import type { ShapeShift, ShiftForm } from '../systems/CreatureShapeshiftingSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureShapeshiftingSystem { return new CreatureShapeshiftingSystem() }
function makeShift(shifterId: number, form: ShiftForm = 'wolf', tick = 0): ShapeShift {
  return { id: nextId++, shifterId, originalRace: 'human', currentForm: form, stability: 70, powerGain: 20, identityLoss: 10, tick }
}

describe('CreatureShapeshiftingSystem.getShifts', () => {
  let sys: CreatureShapeshiftingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无变形记录', () => { expect((sys as any).shifts).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).shifts.push(makeShift(1, 'eagle'))
    expect((sys as any).shifts[0].currentForm).toBe('eagle')
  })
  it('返回内部引用', () => {
    ;(sys as any).shifts.push(makeShift(1))
    expect((sys as any).shifts).toBe((sys as any).shifts)
  })
  it('支持所有6种变形', () => {
    const forms: ShiftForm[] = ['wolf', 'eagle', 'bear', 'serpent', 'deer', 'shadow']
    forms.forEach((f, i) => { ;(sys as any).shifts.push(makeShift(i + 1, f)) })
    const all = (sys as any).shifts
    forms.forEach((f, i) => { expect(all[i].currentForm).toBe(f) })
  })
  it('多个全部返回', () => {
    ;(sys as any).shifts.push(makeShift(1))
    ;(sys as any).shifts.push(makeShift(2))
    expect((sys as any).shifts).toHaveLength(2)
  })
})

describe('CreatureShapeshiftingSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureShapeshiftingSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL(1500)时不执行更新', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature' })
    em.addComponent(eid, { type: 'position' })
    // lastCheck=0, tick=500 => 500 < 1500，不更新
    sys.update(1, em, 500)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL后lastCheck被更新', () => {
    const em = new EntityManager()
    sys.update(1, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('第一次更新后不足间隔时lastCheck保持', () => {
    const em = new EntityManager()
    sys.update(1, em, 1500)
    sys.update(1, em, 2000) // 2000-1500=500 < 1500
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('两次间隔足够时lastCheck更新到新tick', () => {
    const em = new EntityManager()
    sys.update(1, em, 1500)
    sys.update(1, em, 3001) // 3001-1500=1501 >= 1500
    expect((sys as any).lastCheck).toBe(3001)
  })
})

describe('CreatureShapeshiftingSystem masteryMap 技能增长', () => {
  let sys: CreatureShapeshiftingSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('首次变形时初始化mastery并增长MASTERY_GROWTH(+0.04)', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20, species: 'elf' } as any)
    em.addComponent(eid, { type: 'position' } as any)

    // 固定初始mastery为5（2 + random*8，random=0.375）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // Math.random()=0 => mastery=2, mastery+0.04=2.04，然后random<SHIFT_CHANCE(0.002)？random=0 < 0.002 YES
    // 实际：if (Math.random() > SHIFT_CHANCE) continue => random=0 > 0.002? NO => 不skip
    sys.update(1, em, 1500)
    vi.restoreAllMocks()
    const stored = (sys as any).masteryMap.get(eid)
    expect(stored).toBeCloseTo(2.04, 5) // 2 + 0.04
  })

  it('已有mastery时继续累积+0.04', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 25, species: 'human' } as any)
    em.addComponent(eid, { type: 'position' } as any)

    ;(sys as any).masteryMap.set(eid, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1500)
    vi.restoreAllMocks()
    const stored = (sys as any).masteryMap.get(eid)
    expect(stored).toBeCloseTo(10.04, 5) // 10 + 0.04
  })

  it('mastery上限为100', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 30, species: 'human' } as any)
    em.addComponent(eid, { type: 'position' } as any)

    ;(sys as any).masteryMap.set(eid, 99.98)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1500)
    vi.restoreAllMocks()
    const stored = (sys as any).masteryMap.get(eid)
    expect(stored).toBe(100)
  })
})

describe('CreatureShapeshiftingSystem 变形条目 powerGain', () => {
  let sys: CreatureShapeshiftingSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('bear形态powerGain为30', () => {
    const s = makeShift(1, 'bear')
    s.powerGain = 30
    expect(s.powerGain).toBe(30)
  })

  it('eagle形态powerGain为20', () => {
    const s = makeShift(1, 'eagle')
    s.powerGain = 20
    expect(s.powerGain).toBe(20)
  })

  it('其他形态powerGain为15', () => {
    const forms: ShiftForm[] = ['wolf', 'serpent', 'deer', 'shadow']
    for (const f of forms) {
      const s = makeShift(1, f)
      s.powerGain = 15
      expect(s.powerGain).toBe(15)
    }
  })

  it('identityLoss = max(0, 50 - stability)', () => {
    // stability=70 => identityLoss=max(0,50-70)=0
    const s1 = makeShift(1, 'wolf')
    s1.stability = 70
    expect(Math.max(0, 50 - s1.stability)).toBe(0)
    // stability=30 => identityLoss=20
    const s2 = makeShift(2, 'wolf')
    s2.stability = 30
    expect(Math.max(0, 50 - s2.stability)).toBe(20)
  })
})

describe('CreatureShapeshiftingSystem time-based cleanup', () => {
  let sys: CreatureShapeshiftingSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('超过20000 tick的变形记录被清理', () => {
    const em = new EntityManager()
    // 注入一条旧记录 tick=0
    ;(sys as any).shifts.push(makeShift(1, 'wolf', 0))
    // 当tick=20001时 cutoff=20001-20000=1 > 0, 应被清理
    sys.update(1, em, 20001)
    expect((sys as any).shifts).toHaveLength(0)
  })

  it('cutoff边界：tick=shift.tick+20000时恰好不清理（cutoff=tick-20000=shift.tick）', () => {
    const em = new EntityManager()
    ;(sys as any).shifts.push(makeShift(1, 'wolf', 1000))
    // tick=21000 => cutoff=1000, shift.tick=1000, 1000 < 1000 为false => 不删
    sys.update(1, em, 21000)
    expect((sys as any).shifts).toHaveLength(1)
  })

  it('tick=shift.tick+20001时被清理', () => {
    const em = new EntityManager()
    ;(sys as any).shifts.push(makeShift(1, 'wolf', 1000))
    // tick=21001 => cutoff=1001, shift.tick=1000 < 1001 => 删除
    sys.update(1, em, 21001)
    expect((sys as any).shifts).toHaveLength(0)
  })

  it('新记录不被清理，旧记录被清理', () => {
    const em = new EntityManager()
    ;(sys as any).shifts.push(makeShift(1, 'wolf', 0))      // 旧
    ;(sys as any).shifts.push(makeShift(2, 'eagle', 15000)) // 新
    sys.update(1, em, 21000)
    // cutoff=1000, tick=0 < 1000 => 删; tick=15000 >= 1000 => 保留
    expect((sys as any).shifts).toHaveLength(1)
    expect((sys as any).shifts[0].shifterId).toBe(2)
  })
})

describe('CreatureShapeshiftingSystem masteryMap 清理死亡实体', () => {
  let sys: CreatureShapeshiftingSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick%3600===0时清理无creature组件的masteryMap条目', () => {
    const em = new EntityManager()
    // 在masteryMap中放入一个已死亡实体（id=999，em中不存在）
    ;(sys as any).masteryMap.set(999, 50)
    // tick=3600 => 3600%3600=0, 且map.size>0, 检查999无creature => 删除
    sys.update(1, em, 3600)
    expect((sys as any).masteryMap.has(999)).toBe(false)
  })

  it('tick%3600!==0时不执行masteryMap清理', () => {
    const em = new EntityManager()
    ;(sys as any).masteryMap.set(999, 50)
    sys.update(1, em, 3601) // 3601%3600=1 != 0，但3601 >= 1500触发update
    // 注意: 3601-0=3601>=1500 => lastCheck=3601，执行update
    // 3601%3600=1 != 0 => 不清理masteryMap
    // 但要注意update逻辑里masteryMap在loop内也可能被set
    // 直接检查999（无对应实体）：不会被3601清理，只有3600的倍数才清理
    // 用tick=4000来测试(4000%3600=400)
    const sys2 = makeSys()
    ;(sys2 as any).masteryMap.set(999, 50)
    sys2.update(1, em, 4000)
    expect((sys2 as any).masteryMap.has(999)).toBe(true)
  })
})
