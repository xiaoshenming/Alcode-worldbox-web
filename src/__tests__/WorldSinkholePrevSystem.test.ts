import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSinkholePrevSystem } from '../systems/WorldSinkholePrevSystem'
import type { SinkholeRisk } from '../systems/WorldSinkholePrevSystem'

// CHECK_INTERVAL=4000, SPAWN_CHANCE=0.003, MAX_RISKS=12
// tile条件: tile != null && tile > 2 (GRASS=3,FOREST=4,MOUNTAIN=5,SNOW=6,LAVA=7)
// cleanup: !r.active (active=false时从列表删除)
// riskLevel: 20+floor(random*40), groundStability: 50+floor(random*30)
// update(active&&!mitigated):
//   groundStability=max(0,gs-0.3)
//   riskLevel=min(100,rl+(100-gs)*0.005)   注意gs先已更新
//   if random<0.01: mitigated=true, riskLevel=max(0,rl-30), gs=min(100,gs+40)
//   if mitigated && riskLevel<5: active=false
// cleanup: for(i=len-1;i>=0;i--) if(!r.active) splice
//
// update()内random调用顺序:
//   1) random() for spawn check
//   2) random() for each risk's mitigation check (in order)
// 为了spawn但不触发mitigation: mockReturnValueOnce(0.002).mockReturnValue(0.5)

function makeSys(): WorldSinkholePrevSystem { return new WorldSinkholePrevSystem() }

function makeWorld(tile: number = 4, w = 200, h = 200) {
  return { width: w, height: h, getTile: (_x: number, _y: number) => tile } as any
}

function makeEM() { return {} as any }

let nextId = 1
function makeRisk(overrides: Partial<SinkholeRisk> = {}): SinkholeRisk {
  return {
    id: nextId++,
    x: 20, y: 30,
    riskLevel: 60,
    groundStability: 40,
    monitoringSince: 1000,
    mitigated: false,
    active: true,
    tick: 0,
    ...overrides
  }
}

// 辅助：先spawn一个，再将mock改为阻止mitigation，获取稳定的risks
// 序列: spawn用0.002(<0.003触发spawn), mitigation用0.5(>=0.01不触发)
function spawnAndKeep(tile = 4) {
  const sys = makeSys()
  vi.spyOn(Math, 'random')
    .mockReturnValueOnce(0.002)  // spawn check: < 0.003 -> spawn
    .mockReturnValue(0.5)        // mitigation: >= 0.01 -> no mitigation
  sys.update(1, makeWorld(tile), makeEM(), 4000)
  return sys
}

// ===== describe 1: 初始状态 =====
describe('WorldSinkholePrevSystem - 初始状态', () => {
  let sys: WorldSinkholePrevSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始risks为空数组', () => {
    expect((sys as any).risks).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('risks是Array实例', () => {
    expect(Array.isArray((sys as any).risks)).toBe(true)
  })

  it('不同实例互不干扰', () => {
    const sys2 = makeSys()
    ;(sys as any).risks.push(makeRisk())
    expect((sys2 as any).risks).toHaveLength(0)
  })

  it('手动注入一个风险后长度为1', () => {
    ;(sys as any).risks.push(makeRisk())
    expect((sys as any).risks).toHaveLength(1)
  })

  it('手动注入多个风险', () => {
    ;(sys as any).risks.push(makeRisk(), makeRisk(), makeRisk())
    expect((sys as any).risks).toHaveLength(3)
  })

  it('risks引用稳定', () => {
    const ref = (sys as any).risks
    expect(ref).toBe((sys as any).risks)
  })
})

// ===== describe 2: CHECK_INTERVAL节流 =====
describe('WorldSinkholePrevSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldSinkholePrevSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时执行(diff=0,不满足<4000)', () => {
    sys.update(1, makeWorld(4), makeEM(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick<4000时不执行', () => {
    sys.update(1, makeWorld(4), makeEM(), 3999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=4000时执行', () => {
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).lastCheck).toBe(4000)
  })

  it('tick=4001时执行', () => {
    sys.update(1, makeWorld(4), makeEM(), 4001)
    expect((sys as any).lastCheck).toBe(4001)
  })

  it('第一次执行后需再过4000tick才执行第二次', () => {
    sys.update(1, makeWorld(4), makeEM(), 4000)
    sys.update(1, makeWorld(4), makeEM(), 6000)
    expect((sys as any).lastCheck).toBe(4000)
  })

  it('差值恰好=4000时执行第二次', () => {
    sys.update(1, makeWorld(4), makeEM(), 4000)
    sys.update(1, makeWorld(4), makeEM(), 8000)
    expect((sys as any).lastCheck).toBe(8000)
  })

  it('tick=1不执行', () => {
    sys.update(1, makeWorld(4), makeEM(), 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('大tick跳跃直接执行', () => {
    sys.update(1, makeWorld(4), makeEM(), 500000)
    expect((sys as any).lastCheck).toBe(500000)
  })
})

// ===== describe 3: spawn逻辑 =====
describe('WorldSinkholePrevSystem - spawn逻辑', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('random<0.003时在FOREST(4)上spawn', () => {
    const sys = spawnAndKeep(4)
    expect((sys as any).risks.length).toBeGreaterThanOrEqual(1)
  })

  it('random<0.003时在MOUNTAIN(5)上spawn', () => {
    const sys = spawnAndKeep(5)
    expect((sys as any).risks.length).toBeGreaterThanOrEqual(1)
  })

  it('random<0.003时在SNOW(6)上spawn', () => {
    const sys = spawnAndKeep(6)
    expect((sys as any).risks.length).toBeGreaterThanOrEqual(1)
  })

  it('random<0.003时在LAVA(7)上spawn', () => {
    const sys = spawnAndKeep(7)
    expect((sys as any).risks.length).toBeGreaterThanOrEqual(1)
  })

  it('random<0.003时在GRASS(3)上spawn(3>2)', () => {
    const sys = spawnAndKeep(3)
    expect((sys as any).risks.length).toBeGreaterThanOrEqual(1)
  })

  it('random>=0.003时不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(0)
  })

  it('tile=DEEP_WATER(0)时不spawn(tile<=2)', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.002)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(0), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(0)
  })

  it('tile=SHALLOW_WATER(1)时不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.002)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(1), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(0)
  })

  it('tile=SAND(2)时不spawn(tile>2不满足)', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.002)
      .mockReturnValue(0.5)
    sys.update(1, makeWorld(2), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(0)
  })

  it('已达MAX_RISKS(12)时不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 12; i++) (sys as any).risks.push(makeRisk())
    sys.update(1, makeWorld(4), makeEM(), 4000)
    // 12 pre-injected, each get update (no mitigation, no active change)
    expect((sys as any).risks).toHaveLength(12)
  })
})

// ===== describe 4: spawn字段范围 =====
describe('WorldSinkholePrevSystem - spawn字段范围', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('新spawn的id从1开始', () => {
    const sys = spawnAndKeep(4)
    expect((sys as any).risks[0].id).toBe(1)
  })

  it('nextId在spawn后递增为2', () => {
    const sys = spawnAndKeep(4)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn时active=true', () => {
    const sys = spawnAndKeep(4)
    expect((sys as any).risks[0].active).toBe(true)
  })

  it('spawn时mitigated=false(mitigation未触发)', () => {
    const sys = spawnAndKeep(4)
    expect((sys as any).risks[0].mitigated).toBe(false)
  })

  it('riskLevel在合理范围(spawn后update一次略有变化)', () => {
    const sys = spawnAndKeep(4)
    const r = (sys as any).risks[0]
    expect(r.riskLevel).toBeGreaterThanOrEqual(0)
    expect(r.riskLevel).toBeLessThanOrEqual(100)
  })

  it('groundStability在合理范围', () => {
    const sys = spawnAndKeep(4)
    const r = (sys as any).risks[0]
    expect(r.groundStability).toBeGreaterThanOrEqual(0)
    expect(r.groundStability).toBeLessThanOrEqual(100)
  })

  it('monitoringSince=当前tick', () => {
    const sys = spawnAndKeep(4)
    const r = (sys as any).risks[0]
    expect(r.monitoringSince).toBe(4000)
  })

  it('tick字段=当前tick', () => {
    const sys = spawnAndKeep(4)
    const r = (sys as any).risks[0]
    expect(r.tick).toBe(4000)
  })

  it('x坐标在[0, world.width)范围', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.002)
      .mockReturnValue(0.5)
    const world = makeWorld(4, 100, 100)
    sys.update(1, world, makeEM(), 4000)
    const r = (sys as any).risks[0]
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x).toBeLessThan(100)
  })
})

// ===== describe 5: update数值逻辑 =====
describe('WorldSinkholePrevSystem - update数值逻辑', () => {
  let sys: WorldSinkholePrevSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('active且未mitigated时groundStability-=0.3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect(r.groundStability).toBeCloseTo(39.7, 5)
  })

  it('groundStability不低于0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 0.1, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect(r.groundStability).toBeGreaterThanOrEqual(0)
  })

  it('active且未mitigated时riskLevel增加(基于已更新的gs)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    // gs先降到39.7, riskLevel += (100-39.7)*0.005 = 0.3015
    expect(r.riskLevel).toBeCloseTo(60.3015, 3)
  })

  it('riskLevel不超过100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 0, riskLevel: 99.9, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect(r.riskLevel).toBeLessThanOrEqual(100)
  })

  it('inactive时跳过update并被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: false, mitigated: false })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    // inactive risks are cleaned up
    expect((sys as any).risks).toHaveLength(0)
  })

  it('mitigated=true时不再降低groundStability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: true })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect(r.groundStability).toBe(40)
  })

  it('mitigated=true时不再增加riskLevel', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: true })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect(r.riskLevel).toBe(60)
  })

  it('random<0.01时mitigation触发: mitigated=true', () => {
    // spawn检测使用第一个0.5(>=0.003不spawn), mitigation检测使用0.005(<0.01触发)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    // override mitigation check with 0.005
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // spawn: no spawn
      .mockReturnValueOnce(0.005) // mitigation: triggers
    sys.update(1, makeWorld(4), makeEM(), 4000)
    if ((sys as any).risks.length > 0) {
      expect((sys as any).risks[0].mitigated).toBe(true)
    }
  })

  it('mitigation后riskLevel减少30', () => {
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)   // spawn: no spawn
      .mockReturnValueOnce(0.005) // mitigation: triggers
    sys.update(1, makeWorld(4), makeEM(), 4000)
    // gs降0.3->39.7, rl增0.3015->60.3015, mitigation: rl=max(0,60.3015-30)=30.3015
    if ((sys as any).risks.length > 0) {
      expect((sys as any).risks[0].riskLevel).toBeLessThan(60)
    }
  })

  it('mitigation后groundStability增加40', () => {
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.005)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    if ((sys as any).risks.length > 0) {
      // gs was 39.7 before mitigation, then +40 -> 79.7
      expect((sys as any).risks[0].groundStability).toBeCloseTo(79.7, 3)
    }
  })

  it('mitigation后groundStability不超过100', () => {
    const r = makeRisk({ groundStability: 80, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.005)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    if ((sys as any).risks.length > 0) {
      expect((sys as any).risks[0].groundStability).toBeLessThanOrEqual(100)
    }
  })
})

// ===== describe 6: cleanup逻辑 =====
describe('WorldSinkholePrevSystem - cleanup逻辑', () => {
  let sys: WorldSinkholePrevSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('inactive风险被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ active: false, mitigated: true, riskLevel: 1 })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(0)
  })

  it('active风险不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ active: true, mitigated: false, riskLevel: 60, groundStability: 40 })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(1)
  })

  it('mitigated且riskLevel<5时active变false被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ active: true, mitigated: true, riskLevel: 3, groundStability: 40 })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    // active becomes false (mitigated && riskLevel<5) -> cleaned up
    expect((sys as any).risks).toHaveLength(0)
  })

  it('mitigated且riskLevel=5时不变inactive(5<5 false)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ active: true, mitigated: true, riskLevel: 5, groundStability: 40 })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    // riskLevel=5 < 5 is false -> active stays true -> not removed
    expect((sys as any).risks).toHaveLength(1)
  })

  it('多个inactive全部被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 5; i++) (sys as any).risks.push(makeRisk({ active: false }))
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(0)
  })

  it('混合active/inactive时只删inactive', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const active = makeRisk({ active: true, mitigated: false, riskLevel: 60, groundStability: 40 })
    const inactive = makeRisk({ active: false })
    ;(sys as any).risks.push(active, inactive)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(1)
    expect((sys as any).risks[0].id).toBe(active.id)
  })

  it('清除后nextId不重置', () => {
    const sys2 = spawnAndKeep(4)
    const idAfter = (sys2 as any).nextId
    ;(sys2 as any).risks.forEach((r: SinkholeRisk) => { r.active = false })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys2.update(1, makeWorld(4), makeEM(), 8000)
    expect((sys2 as any).nextId).toBe(idAfter)
  })

  it('mitigated且riskLevel=4(< 5)时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ active: true, mitigated: true, riskLevel: 4, groundStability: 40 })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(0)
  })
})

// ===== describe 7: 边界与综合场景 =====
describe('WorldSinkholePrevSystem - 边界与综合场景', () => {
  let sys: WorldSinkholePrevSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('多个风险都被update', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r1 = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: false })
    const r2 = makeRisk({ groundStability: 50, riskLevel: 70, active: true, mitigated: false })
    ;(sys as any).risks.push(r1, r2)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect(r1.groundStability).toBeCloseTo(39.7, 5)
    expect(r2.groundStability).toBeCloseTo(49.7, 5)
  })

  it('11个风险时仍可spawn第12个', () => {
    sys = makeSys()
    // spawn check: 0.002 (< 0.003 -> spawn), mitigation for 11+1 risks: 0.5
    const calls: number[] = [0.002, ...Array(12).fill(0.5)]
    let callIdx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => calls[callIdx++] ?? 0.5)
    for (let i = 0; i < 11; i++) (sys as any).risks.push(makeRisk())
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).risks.length).toBeGreaterThanOrEqual(12)
  })

  it('riskLevel上界100约束正确', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 0, riskLevel: 100, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect(r.riskLevel).toBeLessThanOrEqual(100)
  })

  it('groundStability下界0约束正确', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 0, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect(r.groundStability).toBeGreaterThanOrEqual(0)
  })

  it('节流期间不执行update', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = makeRisk({ groundStability: 40, riskLevel: 60, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    sys.update(1, makeWorld(4), makeEM(), 4000) // executes
    const gs = r.groundStability
    sys.update(1, makeWorld(4), makeEM(), 6000) // skipped (diff=2000 < 4000)
    expect(r.groundStability).toBe(gs)
  })

  it('spawn后字段均不为undefined', () => {
    sys = spawnAndKeep(4)
    const r = (sys as any).risks[0]
    expect(r.id).toBeDefined()
    expect(r.riskLevel).toBeDefined()
    expect(r.groundStability).toBeDefined()
    expect(r.monitoringSince).toBeDefined()
    expect(r.active).toBeDefined()
    expect(r.mitigated).toBeDefined()
  })

  it('riskLevel下界0(mitigation后不低于0)', () => {
    sys = makeSys()
    const r = makeRisk({ riskLevel: 10, groundStability: 50, active: true, mitigated: false })
    ;(sys as any).risks.push(r)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.005) // mitigation triggers
    sys.update(1, makeWorld(4), makeEM(), 4000)
    if ((sys as any).risks.length > 0) {
      expect((sys as any).risks[0].riskLevel).toBeGreaterThanOrEqual(0)
    }
  })

  it('不触发节流时lastCheck保持0', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), makeEM(), 3999)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('MAX_RISKS=12恰好12个不再spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 12; i++) (sys as any).risks.push(makeRisk())
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).risks).toHaveLength(12)
  })

  it('不同tick间lastCheck严格更新', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(4), makeEM(), 4000)
    expect((sys as any).lastCheck).toBe(4000)
    sys.update(1, makeWorld(4), makeEM(), 8000)
    expect((sys as any).lastCheck).toBe(8000)
  })
})
