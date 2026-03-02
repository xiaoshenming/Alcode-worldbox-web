import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldLeyLineSystem } from '../systems/WorldLeyLineSystem'

function makeSys(): WorldLeyLineSystem { return new WorldLeyLineSystem() }

// ────────────────────────────────────────────────────────────
// 辅助：构造最小 EntityManager mock
// ────────────────────────────────────────────────────────────
function makeEM(creatures: Array<{ eid: number; x: number; y: number }> = []) {
  const posMap = new Map<number, { x: number; y: number }>()
  const crMap = new Map<number, { speed: number; damage: number }>()
  for (const c of creatures) {
    posMap.set(c.eid, { x: c.x, y: c.y })
    crMap.set(c.eid, { speed: 1, damage: 1 })
  }
  return {
    getEntitiesWithComponents: (_a: string, _b: string) => creatures.map(c => c.eid),
    getComponent: (eid: number, type: string) => {
      if (type === 'position') return posMap.get(eid)
      if (type === 'creature') return crMap.get(eid)
      return undefined
    },
    posMap,
    crMap,
  } as any
}

// ────────────────────────────────────────────────────────────
// 1. 初始状态
// ───────────────────────────────────���────────────────────────
describe('初始状态', () => {
  let sys: WorldLeyLineSystem
  beforeEach(() => { sys = makeSys() })

  it('getLeyLines 初始返回空数组', () => {
    expect(sys.getLeyLines()).toHaveLength(0)
  })

  it('getNexuses 初始返回空数组', () => {
    expect(sys.getNexuses()).toHaveLength(0)
  })

  it('initialized 初始为 false', () => {
    expect((sys as any).initialized).toBe(false)
  })

  it('worldAge 初始为 0', () => {
    expect((sys as any).worldAge).toBe(0)
  })

  it('leyLines 和 nexuses 是独立数组', () => {
    expect((sys as any).leyLines).not.toBe((sys as any).nexuses)
  })
})

// ────────────────────────────────────────────────────────────
// 2. update 触发 initialize
// ────────────────────────────────────────────────────────────
describe('update 触发初始化', () => {
  let sys: WorldLeyLineSystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys() })

  it('第一次 update 后 initialized 变 true', () => {
    sys.update(16, em, 0)
    expect((sys as any).initialized).toBe(true)
  })

  it('第一次 update 后地脉线数量在 [3,6] 之间', () => {
    sys.update(16, em, 0)
    const count = sys.getLeyLines().length
    expect(count).toBeGreaterThanOrEqual(3)
    expect(count).toBeLessThanOrEqual(6)
  })

  it('第二次 update 不重复初始化（地脉线数量不变）', () => {
    sys.update(16, em, 0)
    const count1 = sys.getLeyLines().length
    sys.update(16, em, 1)
    expect(sys.getLeyLines().length).toBe(count1)
  })

  it('update 后 worldAge 增加 dt', () => {
    sys.update(100, em, 0)
    expect((sys as any).worldAge).toBe(100)
  })

  it('多次 update 累加 worldAge', () => {
    sys.update(50, em, 0)
    sys.update(80, em, 1)
    expect((sys as any).worldAge).toBeCloseTo(130)
  })
})

// ────────────────────────────────────────────────────────────
// 3. 地脉线字段验证（initialize 后）
// ────────────────────────────────────────────────────────────
describe('地脉线字段验证', () => {
  let sys: WorldLeyLineSystem
  const em = makeEM()

  beforeEach(() => {
    sys = makeSys()
    sys.update(16, em, 0)
  })

  it('每条地脉线有 4 个控制点', () => {
    for (const line of sys.getLeyLines()) {
      expect(line.points).toHaveLength(4)
    }
  })

  it('地脉线 energy 在 [-1, 1] 范围内（脉动后由 sin 计算）', () => {
    // update 执行后 energy 由 0.5 + 0.5*sin(worldAge*...) 计算，范围 [0, 1]
    for (const line of sys.getLeyLines()) {
      expect(line.energy).toBeGreaterThanOrEqual(0)
      expect(line.energy).toBeLessThanOrEqual(1.0)
    }
  })

  it('地脉线 color 是合法的十六进制颜色字符串', () => {
    const validColors = ['#4fc3f7', '#ab47bc', '#66bb6a', '#ffa726', '#ef5350', '#26c6da']
    for (const line of sys.getLeyLines()) {
      expect(validColors).toContain(line.color)
    }
  })

  it('地脉线 id 从 0 开始递增', () => {
    const ids = sys.getLeyLines().map(l => l.id)
    for (let i = 0; i < ids.length; i++) {
      expect(ids[i]).toBe(i)
    }
  })

  it('控制点坐标在地图范围内', () => {
    for (const line of sys.getLeyLines()) {
      for (const pt of line.points) {
        expect(pt.x).toBeGreaterThanOrEqual(0)
        expect(pt.y).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

// ────────────────────────────────────────────────────────────
// 4. energy 脉动逻辑
// ────────────────────────────────────────────────────────────
describe('energy 脉动逻辑', () => {
  let sys: WorldLeyLineSystem
  const em = makeEM()

  beforeEach(() => {
    sys = makeSys()
    sys.update(16, em, 0)
  })

  it('tick%30!=0 时不执行 buff 逻辑（仍然脉动 energy）', () => {
    const before = sys.getLeyLines().map(l => l.energy)
    sys.update(1000, em, 1) // tick=1, 1%30!=0
    const after = sys.getLeyLines().map(l => l.energy)
    // energy 应该变化（worldAge 改变了 sin 的参数）
    const changed = before.some((v, i) => v !== after[i])
    expect(changed).toBe(true)
  })

  it('update 后 energy 值在 [0, 1] 范围内', () => {
    sys.update(5000, em, 30)
    for (const line of sys.getLeyLines()) {
      expect(line.energy).toBeGreaterThanOrEqual(0)
      expect(line.energy).toBeLessThanOrEqual(1)
    }
  })

  it('nexus energy 值在 [0.2, 1.0] 范围内', () => {
    // 注入一个nexus
    ;(sys as any).nexuses.push({ x: 50, y: 50, energy: 0.8, radius: 18 })
    sys.update(3000, em, 30)
    const nexus = (sys as any).nexuses[0]
    expect(nexus.energy).toBeGreaterThanOrEqual(0.2)
    expect(nexus.energy).toBeLessThanOrEqual(1.0)
  })
})

// ────────────────────────────────────────────────────────────
// 5. buff 应用逻辑（tick%30===0 时）
// ────────────────────────────────────────────────────────────
describe('buff 应用逻辑', () => {
  let sys: WorldLeyLineSystem
  beforeEach(() => { sys = makeSys() })

  it('tick%30!=0 时不执行 buff（生物属性不变）', () => {
    ;(sys as any).initialized = true
    ;(sys as any).leyLines.push({
      id: 0, points: [
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }
      ], energy: 0.8, color: '#4fc3f7'
    })
    const em = makeEM([{ eid: 1, x: 5, y: 5 }])
    sys.update(16, em, 1) // 1%30 != 0
    expect(em.crMap.get(1)!.speed).toBe(1)
    expect(em.crMap.get(1)!.damage).toBe(1)
  })

  it('生物在地脉线附近且 tick%30===0 时获得 speed/damage buff', () => {
    ;(sys as any).initialized = true
    // 注入一条直线，确保生物在附近
    ;(sys as any).leyLines.push({
      id: 0,
      points: [
        { x: 10, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 10 }
      ],
      energy: 0.8, color: '#4fc3f7'
    })
    const em = makeEM([{ eid: 1, x: 10, y: 10 }]) // 完全在地脉线上
    sys.update(16, em, 30) // tick=30, 30%30===0
    expect(em.crMap.get(1)!.speed).toBeGreaterThan(1)
    expect(em.crMap.get(1)!.damage).toBeGreaterThan(1)
  })

  it('生物在能量节点附近且 tick%30===0 时获得更强 buff', () => {
    ;(sys as any).initialized = true
    ;(sys as any).leyLines.push({
      id: 0,
      points: [
        { x: 100, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 100 }
      ],
      energy: 0.8, color: '#4fc3f7'
    })
    ;(sys as any).nexuses.push({ x: 10, y: 10, energy: 0.9, radius: 18 })
    const em = makeEM([{ eid: 1, x: 10, y: 10 }])
    sys.update(16, em, 30)
    // nexus buff = SPEED_BUFF * 1.1 > SPEED_BUFF
    const speed = em.crMap.get(1)!.speed
    expect(speed).toBeGreaterThan(1.2) // > SPEED_BUFF=1.2
  })

  it('生物不在地脉线或节点附近时无 buff', () => {
    ;(sys as any).initialized = true
    ;(sys as any).leyLines.push({
      id: 0,
      points: [
        { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }
      ],
      energy: 0.8, color: '#4fc3f7'
    })
    const em = makeEM([{ eid: 1, x: 200, y: 200 }])
    sys.update(16, em, 30)
    expect(em.crMap.get(1)!.speed).toBe(1)
    expect(em.crMap.get(1)!.damage).toBe(1)
  })
})

// ────────────────────────────────────────────────────────────
// 6. getLeyLines / getNexuses 访问器
// ────────────────────────────────────────────────────────────
describe('访问器行为', () => {
  let sys: WorldLeyLineSystem
  beforeEach(() => { sys = makeSys() })

  it('getLeyLines 多次调用返回同一引用', () => {
    expect(sys.getLeyLines()).toBe(sys.getLeyLines())
  })

  it('getNexuses 多次调用返回同一引用', () => {
    expect(sys.getNexuses()).toBe(sys.getNexuses())
  })

  it('注入地脉线后 getLeyLines 能反映变化', () => {
    ;(sys as any).leyLines.push({ id: 1, points: [], energy: 0.8, color: '#4fc3f7' })
    expect(sys.getLeyLines()).toHaveLength(1)
  })

  it('注入节点后 getNexuses 能反映变化', () => {
    ;(sys as any).nexuses.push({ x: 50, y: 50, energy: 0.9, radius: 18 })
    expect(sys.getNexuses()).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────
// 7. clear() 方法
// ────────────────────────────────────────────────────────────
describe('clear() 方法', () => {
  let sys: WorldLeyLineSystem
  const em = makeEM()

  beforeEach(() => { sys = makeSys() })

  it('clear 后 getLeyLines 为空', () => {
    sys.update(16, em, 0)
    sys.clear()
    expect(sys.getLeyLines()).toHaveLength(0)
  })

  it('clear 后 getNexuses 为空', () => {
    sys.update(16, em, 0)
    sys.clear()
    expect(sys.getNexuses()).toHaveLength(0)
  })

  it('clear 后 initialized 为 false', () => {
    sys.update(16, em, 0)
    sys.clear()
    expect((sys as any).initialized).toBe(false)
  })

  it('clear 后 worldAge 归零', () => {
    sys.update(1000, em, 0)
    sys.clear()
    expect((sys as any).worldAge).toBe(0)
  })

  it('clear 后再次 update 能重新初始化', () => {
    sys.update(16, em, 0)
    sys.clear()
    sys.update(16, em, 0)
    expect((sys as any).initialized).toBe(true)
    expect(sys.getLeyLines().length).toBeGreaterThanOrEqual(3)
  })
})

// ────────────────────────────────────────────────────────────
// 8. computeNexuses 与节点特性
// ────────────────────────────────────────────────────────────
describe('computeNexuses 节点特性', () => {
  let sys: WorldLeyLineSystem

  beforeEach(() => { sys = makeSys() })

  it('注入后节点字段结构正确', () => {
    ;(sys as any).nexuses.push({ x: 50, y: 50, energy: 0.75, radius: 18 })
    const n = sys.getNexuses()[0] as any
    expect(n).toHaveProperty('x')
    expect(n).toHaveProperty('y')
    expect(n).toHaveProperty('energy')
    expect(n).toHaveProperty('radius')
  })

  it('节点 radius 应等于 NEXUS_BUFF_RADIUS=18', () => {
    ;(sys as any).nexuses.push({ x: 50, y: 50, energy: 0.75, radius: 18 })
    expect((sys as any).nexuses[0].radius).toBe(18)
  })
})
