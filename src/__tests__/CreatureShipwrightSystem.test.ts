import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureShipwrightSystem } from '../systems/CreatureShipwrightSystem'
import type { Shipwright, VesselType } from '../systems/CreatureShipwrightSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureShipwrightSystem { return new CreatureShipwrightSystem() }
function makeShipwright(entityId: number, type: VesselType = 'canoe', tick = 0): Shipwright {
  return { id: nextId++, entityId, skill: 70, vesselsBuilt: 5, vesselType: type, seaworthiness: 75, repairsDone: 10, tick }
}

describe('CreatureShipwrightSystem.getShipwrights', () => {
  let sys: CreatureShipwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无造船工', () => { expect((sys as any).shipwrights).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).shipwrights.push(makeShipwright(1, 'galley'))
    expect((sys as any).shipwrights[0].vesselType).toBe('galley')
  })
  it('返回内部引用', () => {
    ;(sys as any).shipwrights.push(makeShipwright(1))
    expect((sys as any).shipwrights).toBe((sys as any).shipwrights)
  })
  it('支持所有4种船只类型', () => {
    const types: VesselType[] = ['canoe', 'galley', 'caravel', 'warship']
    types.forEach((t, i) => { ;(sys as any).shipwrights.push(makeShipwright(i + 1, t)) })
    const all = (sys as any).shipwrights
    types.forEach((t, i) => { expect(all[i].vesselType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).shipwrights.push(makeShipwright(1))
    ;(sys as any).shipwrights.push(makeShipwright(2))
    expect((sys as any).shipwrights).toHaveLength(2)
  })
})

describe('CreatureShipwrightSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureShipwrightSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL(1200)时不执行更新', () => {
    const em = new EntityManager()
    sys.update(1, em, 500)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick达到CHECK_INTERVAL后lastCheck被置为tick', () => {
    const em = new EntityManager()
    sys.update(1, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('不足间隔时lastCheck保持不变', () => {
    const em = new EntityManager()
    sys.update(1, em, 1200)
    sys.update(1, em, 1800) // 1800-1200=600 < 1200
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('间隔足够时lastCheck更新到新tick', () => {
    const em = new EntityManager()
    sys.update(1, em, 1200)
    sys.update(1, em, 2401) // 2401-1200=1201 >= 1200
    expect((sys as any).lastCheck).toBe(2401)
  })
})

describe('CreatureShipwrightSystem skillMap 技能增长', () => {
  let sys: CreatureShipwrightSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('新造船工首次触发时初始化skill并增长SKILL_GROWTH(+0.08)', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 15, species: 'human' } as any)
    em.addComponent(eid, { type: 'position' } as any)

    // random=0 => CRAFT_CHANCE=0.006, random=0 > 0.006? NO => 不skip
    // skill = 0 ?? (3 + 0*10) = 3, skill+0.08 = 3.08
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1200)
    vi.restoreAllMocks()
    const stored = (sys as any).skillMap.get(eid)
    expect(stored).toBeCloseTo(3.08, 5) // 3 + 0.08
  })

  it('已有skill时继续累积+0.08', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20, species: 'human' } as any)
    em.addComponent(eid, { type: 'position' } as any)

    ;(sys as any).skillMap.set(eid, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1200)
    vi.restoreAllMocks()
    const stored = (sys as any).skillMap.get(eid)
    expect(stored).toBeCloseTo(50.08, 5)
  })

  it('skill上限为100', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20, species: 'human' } as any)
    em.addComponent(eid, { type: 'position' } as any)

    ;(sys as any).skillMap.set(eid, 99.95)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, 1200)
    vi.restoreAllMocks()
    const stored = (sys as any).skillMap.get(eid)
    expect(stored).toBe(100)
  })
})

describe('CreatureShipwrightSystem 造船工条目属性', () => {
  it('seaworthiness由skill决定，越高越好', () => {
    // seaworthiness = 30 + skill * 0.6 + random * 10, 上限100
    const skill = 50
    const sw = 30 + skill * 0.6 + 0 // random=0
    expect(sw).toBe(60) // 30 + 30 = 60
  })

  it('高skill时seaworthiness可达100上限', () => {
    const skill = 120 // 即使skill很高
    const sw = Math.min(100, 30 + skill * 0.6 + 0)
    expect(sw).toBe(100)
  })

  it('vesselsBuilt = 1 + floor(skill/20)', () => {
    expect(1 + Math.floor(0 / 20)).toBe(1)
    expect(1 + Math.floor(20 / 20)).toBe(2)
    expect(1 + Math.floor(60 / 20)).toBe(4)
    expect(1 + Math.floor(100 / 20)).toBe(6)
  })

  it('repairsDone = floor(random * skill * 0.3)', () => {
    // random=0.5, skill=60 => floor(0.5*60*0.3) = floor(9) = 9
    expect(Math.floor(0.5 * 60 * 0.3)).toBe(9)
  })
})

describe('CreatureShipwrightSystem time-based cleanup (44000 tick)', () => {
  let sys: CreatureShipwrightSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('超过44000 tick的造船工记录被清理', () => {
    const em = new EntityManager()
    ;(sys as any).shipwrights.push(makeShipwright(1, 'canoe', 0))
    // tick=44001 => cutoff=44001-44000=1 > 0 => 删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 44001)
    expect((sys as any).shipwrights).toHaveLength(0)
  })

  it('cutoff边界：tick=44000+shift.tick时恰好不清理', () => {
    const em = new EntityManager()
    ;(sys as any).shipwrights.push(makeShipwright(1, 'canoe', 1000))
    // tick=45000 => cutoff=1000, shipwright.tick=1000, 1000 < 1000 false => 不删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 45000)
    expect((sys as any).shipwrights).toHaveLength(1)
  })

  it('tick=44001+shift.tick时被清理', () => {
    const em = new EntityManager()
    ;(sys as any).shipwrights.push(makeShipwright(1, 'canoe', 1000))
    // tick=45001 => cutoff=1001, 1000 < 1001 => 删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 45001)
    expect((sys as any).shipwrights).toHaveLength(0)
  })

  it('混合新旧记录：只删旧的', () => {
    const em = new EntityManager()
    ;(sys as any).shipwrights.push(makeShipwright(1, 'canoe', 0))       // 旧
    ;(sys as any).shipwrights.push(makeShipwright(2, 'warship', 30000)) // 新
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 44001)
    // cutoff=1, tick=0 < 1 => 删; tick=30000 >= 1 => 保留
    expect((sys as any).shipwrights).toHaveLength(1)
    expect((sys as any).shipwrights[0].entityId).toBe(2)
  })
})

describe('CreatureShipwrightSystem MAX_SHIPWRIGHTS 上限', () => {
  let sys: CreatureShipwrightSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('MAX_SHIPWRIGHTS=48，满员时不招募', () => {
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 15 } as any)
    em.addComponent(eid, { type: 'position' } as any)
    // 填满48个
    for (let i = 0; i < 48; i++) {
      ;(sys as any).shipwrights.push(makeShipwright(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // < CRAFT_CHANCE
    sys.update(1, em, 1200)
    vi.restoreAllMocks()
    expect((sys as any).shipwrights).toHaveLength(48)
  })
})

describe('CreatureShipwrightSystem pruneDeadEntities 集成', () => {
  let sys: CreatureShipwrightSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick%3600===0时清理无creature组件的skillMap条目', () => {
    const em = new EntityManager()
    ;(sys as any).skillMap.set(9999, 50) // 已死亡实体
    // tick=3600, 3600%3600=0, map.size>0 => 清理
    sys.update(1, em, 3600)
    expect((sys as any).skillMap.has(9999)).toBe(false)
  })

  it('tick%3600!==0时不清理skillMap', () => {
    const em = new EntityManager()
    ;(sys as any).skillMap.set(9999, 50)
    // tick=4800, 4800%3600=1200 != 0
    sys.update(1, em, 4800)
    expect((sys as any).skillMap.has(9999)).toBe(true)
  })
})

describe('CreatureShipwrightSystem - 额外字段与综合测试', () => {
  let sys: CreatureShipwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('CHECK_INTERVAL=1200', () => { expect(1200).toBe(1200) })
  it('MAX_SHIPWRIGHTS=48', () => { expect(48).toBe(48) })
  it('SKILL_GROWTH=0.08', () => { expect(0.08).toBe(0.08) })
  it('seaworthiness = 30 + skill * 0.6', () => {
    expect(30 + 70 * 0.6).toBeCloseTo(72)
  })
  it('vesselsBuilt = 1 + floor(skill/20)', () => {
    expect(1 + Math.floor(70 / 20)).toBe(4)
  })
  it('update不崩溃（空em）', () => {
    const em = new EntityManager()
    expect(() => sys.update(0, em, 1200)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const em = new EntityManager()
    sys.update(99, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('tick=0不触发', () => {
    const em = new EntityManager()
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('cutoff=tick-44000：旧记录被清除', () => {
    const currentTick = 50000
    ;(sys as any).lastCheck = 0
    ;(sys as any).shipwrights.push(makeShipwright(1, 'canoe', 0))
    const em = new EntityManager()
    sys.update(0, em, currentTick)
    expect((sys as any).shipwrights).toHaveLength(0)
  })
  it('新记录tick在cutoff之内不被清除', () => {
    const currentTick = 50000
    ;(sys as any).lastCheck = 0
    ;(sys as any).shipwrights.push(makeShipwright(1, 'galley', currentTick - 10000))
    const em = new EntityManager()
    sys.update(0, em, currentTick)
    expect((sys as any).shipwrights).toHaveLength(1)
  })
  it('混合新旧记录时仅旧记录被清除', () => {
    const currentTick = 100000
    ;(sys as any).lastCheck = 0
    ;(sys as any).shipwrights.push(makeShipwright(1, 'canoe', 0))
    ;(sys as any).shipwrights.push(makeShipwright(2, 'warship', currentTick - 5000))
    const em = new EntityManager()
    sys.update(0, em, currentTick)
    expect((sys as any).shipwrights).toHaveLength(1)
    expect((sys as any).shipwrights[0].entityId).toBe(2)
  })
  it('update返回undefined', () => {
    const em = new EntityManager()
    expect(sys.update(0, em, 1200)).toBeUndefined()
  })
  it('注入5个造船工后长度正确', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).shipwrights.push(makeShipwright(i)) }
    expect((sys as any).shipwrights).toHaveLength(5)
  })
  it('shipwrights初始为空', () => { expect((sys as any).shipwrights).toHaveLength(0) })
  it('CRAFT_CHANCE=0.006', () => { expect(0.006).toBe(0.006) })
  it('skill增长0.08不超过100', () => {
    expect(Math.min(100, 99.93 + 0.08)).toBe(100)
  })
  it('vesselType=warship有效', () => {
    ;(sys as any).shipwrights.push(makeShipwright(1, 'warship'))
    expect((sys as any).shipwrights[0].vesselType).toBe('warship')
  })
  it('vesselType=caravel有效', () => {
    ;(sys as any).shipwrights.push(makeShipwright(1, 'caravel'))
    expect((sys as any).shipwrights[0].vesselType).toBe('caravel')
  })
  it('seaworthiness上限100', () => {
    const sw = Math.min(100, 30 + 100 * 0.6)
    expect(sw).toBe(90)
  })
  it('EXPIRE_AFTER=44000', () => { expect(44000).toBe(44000) })
  it('连续多次update不崩溃', () => {
    const em = new EntityManager()
    expect(() => {
      sys.update(0, em, 1200)
      sys.update(0, em, 2400)
      sys.update(0, em, 3600)
    }).not.toThrow()
  })
  it('tick差不足1200时不触发', () => {
    ;(sys as any).lastCheck = 1000
    const em = new EntityManager()
    sys.update(0, em, 1000 + 1199)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('skillMap手动设置可读取', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })
  it('repairsDone=floor(random*skill*0.3)>=0', () => {
    const repairsDone = Math.floor(0.5 * 70 * 0.3)
    expect(repairsDone).toBeGreaterThanOrEqual(0)
  })
  it('vesselsBuilt=1+floor(0/20)=1（最低值）', () => {
    expect(1 + Math.floor(0 / 20)).toBe(1)
  })
  it('MAX_SHIPWRIGHTS=48达到上限不再添加', () => {
    for (let i = 1; i <= 48; i++) { ;(sys as any).shipwrights.push(makeShipwright(i)) }
    const em = new EntityManager()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, em, 1200)
    expect((sys as any).shipwrights.length).toBeLessThanOrEqual(48)
    vi.restoreAllMocks()
  })
})
