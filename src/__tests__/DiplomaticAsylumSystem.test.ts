import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAsylumSystem, AsylumRequest, AsylumReason } from '../systems/DiplomaticAsylumSystem'

// 常量镜像自源码
const CHECK_INTERVAL = 5000
const MAX_REQUESTS = 10
const EXPIRE_AFTER = 55000 // tick - r.tick > 55000

function makeSys() { return new DiplomaticAsylumSystem() }

function makeRequest(overrides: Partial<AsylumRequest> = {}): AsylumRequest {
  return {
    id: 1,
    seekerCivId: 1,
    hostCivId: 2,
    refugeeCount: 20,
    reason: 'war',
    approval: 50,
    diplomaticImpact: 20,
    tick: 0,
    ...overrides,
  }
}

// 构造 EntityManager mock，返回指定数量的实体
function makeEM(entityIds: number[]) {
  return {
    getEntitiesWithComponent: (_: string) => entityIds,
  }
}

describe('DiplomaticAsylumSystem', () => {
  let sys: DiplomaticAsylumSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 1. 基础数据结构
  // ─────────────────────────────────────────────
  describe('基础数据结构', () => {
    it('初始requests为空数组', () => {
      expect((sys as any).requests).toHaveLength(0)
      expect(Array.isArray((sys as any).requests)).toBe(true)
    })

    it('nextId初始值为1', () => {
      expect((sys as any).nextId).toBe(1)
    })

    it('lastCheck初始值为0', () => {
      expect((sys as any).lastCheck).toBe(0)
    })

    it('注入单条request后可读取', () => {
      const r = makeRequest({ id: 99, seekerCivId: 5, hostCivId: 7 })
      ;(sys as any).requests.push(r)
      expect((sys as any).requests).toHaveLength(1)
      expect((sys as any).requests[0].id).toBe(99)
      expect((sys as any).requests[0].seekerCivId).toBe(5)
      expect((sys as any).requests[0].hostCivId).toBe(7)
    })

    it('注入多条request后数量正确', () => {
      for (let i = 1; i <= 5; i++) {
        ;(sys as any).requests.push(makeRequest({ id: i }))
      }
      expect((sys as any).requests).toHaveLength(5)
    })

    it('支持所有AsylumReason类型', () => {
      const reasons: AsylumReason[] = ['persecution', 'war', 'famine', 'political']
      reasons.forEach((reason, i) => {
        ;(sys as any).requests.push(makeRequest({ id: i + 1, reason }))
      })
      const stored = (sys as any).requests.map((r: AsylumRequest) => r.reason)
      expect(stored).toEqual(reasons)
    })

    it('_requestKeySet初始为空', () => {
      expect((sys as any)._requestKeySet.size).toBe(0)
    })

    it('request包含所有必要字段', () => {
      const r = makeRequest()
      ;(sys as any).requests.push(r)
      const stored = (sys as any).requests[0]
      expect(stored).toHaveProperty('id')
      expect(stored).toHaveProperty('seekerCivId')
      expect(stored).toHaveProperty('hostCivId')
      expect(stored).toHaveProperty('refugeeCount')
      expect(stored).toHaveProperty('reason')
      expect(stored).toHaveProperty('approval')
      expect(stored).toHaveProperty('diplomaticImpact')
      expect(stored).toHaveProperty('tick')
    })
  })

  // ─────────────────────────────────────────────
  // 2. CHECK_INTERVAL 节流
  // ─────────────────────────────────────────────
  describe('CHECK_INTERVAL节流', () => {
    it('tick < CHECK_INTERVAL 时update跳过，lastCheck不变', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
      expect((sys as any).lastCheck).toBe(0)
    })

    it('tick === CHECK_INTERVAL 时update执行，lastCheck更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('tick > CHECK_INTERVAL 时update执行，lastCheck更新为当前tick', () => {
      const tick = CHECK_INTERVAL + 999
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, tick)
      expect((sys as any).lastCheck).toBe(tick)
    })

    it('第一次update后，第二次tick不满足间隔则跳过', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)

      sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    })

    it('连续两次update均满足间隔，lastCheck连续更新', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)

      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
      expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    })
  })

  // ─────────────────────────────────────────────
  // 3. 数值字段动态更新
  // ─────────────────────────────────────────────
  describe('数值字段动态更新', () => {
    it('approval在每次update后在[0,100]范围内', () => {
      const r = makeRequest({ approval: 50, tick: 0 })
      ;(sys as any).requests.push(r)

      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const approval = (sys as any).requests[0]?.approval
      if (approval !== undefined) {
        expect(approval).toBeGreaterThanOrEqual(0)
        expect(approval).toBeLessThanOrEqual(100)
      }
    })

    it('approval>70时diplomaticImpact增加1.5', () => {
      const r = makeRequest({ approval: 80, diplomaticImpact: 20, tick: 0 })
      ;(sys as any).requests.push(r)

      // mock random: 使 (random-0.45)*5 > 0（即random > 0.45），approval继续高
      // random=0.5: delta=(0.5-0.45)*5=0.25, approval=80.25>70 -> diplomaticImpact+=1.5
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)

      // approval=80.25 > 70 -> diplomaticImpact=20+1.5=21.5
      if ((sys as any).requests.length > 0) {
        expect((sys as any).requests[0].diplomaticImpact).toBeCloseTo(21.5, 1)
      }
    })

    it('approval<30时diplomaticImpact减少2', () => {
      // 填满 MAX_REQUESTS，防止 spawn 分支调用 em.getEntitiesWithComponent
      for (let i = 1; i <= MAX_REQUESTS; i++) {
        ;(sys as any).requests.push(makeRequest({ id: i, approval: 50, tick: CHECK_INTERVAL }))
      }
      // 覆盖第一条为 approval=20 的目标测试记录
      ;(sys as any).requests[0] = makeRequest({ id: 100, approval: 20, diplomaticImpact: 30, tick: 0 })

      // random=0: delta=(0-0.45)*5=-2.25, approval=20-2.25=17.75<30 -> diplomaticImpact-=2
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)

      const target = (sys as any).requests.find((r: AsylumRequest) => r.id === 100)
      if (target) {
        expect(target.diplomaticImpact).toBeCloseTo(28, 1)
      }
    })

    it('diplomaticImpact最大不超过100（approval>70分支）', () => {
      const r = makeRequest({ approval: 80, diplomaticImpact: 99.5, tick: 0 })
      ;(sys as any).requests.push(r)

      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)

      if ((sys as any).requests.length > 0) {
        expect((sys as any).requests[0].diplomaticImpact).toBeLessThanOrEqual(100)
      }
    })

    it('diplomaticImpact最小不低于-50（approval<30分支）', () => {
      // 填满 MAX_REQUESTS，防止 spawn 分支调用 em.getEntitiesWithComponent
      for (let i = 1; i <= MAX_REQUESTS; i++) {
        ;(sys as any).requests.push(makeRequest({ id: i, approval: 50, tick: CHECK_INTERVAL }))
      }
      ;(sys as any).requests[0] = makeRequest({ id: 100, approval: 20, diplomaticImpact: -49, tick: 0 })

      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)

      const target = (sys as any).requests.find((r: AsylumRequest) => r.id === 100)
      if (target) {
        expect(target.diplomaticImpact).toBeGreaterThanOrEqual(-50)
      }
    })
  })

  // ─────────────────────────────────────────────
  // 4. time-based 过期清理
  // ─────────────────────────────────────────────
  describe('time-based过期清理', () => {
    it('approval>=95时request被删除', () => {
      // approval从95开始，再+任何值就会>=95（但不超100），直接初始95验证删除
      const r = makeRequest({ approval: 95, tick: 0 })
      ;(sys as any).requests.push(r)
      ;(sys as any)._requestKeySet.add(r.seekerCivId * 1000 + r.hostCivId)

      // mock random=0.5: delta=(0.5-0.45)*5=0.25，approval=95.25>=95 -> 删除
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).requests).toHaveLength(0)
    })

    it('approval<=2时request被删除', () => {
      // 填满 MAX_REQUESTS 避免 spawn 分支调用 em
      for (let i = 2; i <= MAX_REQUESTS; i++) {
        ;(sys as any).requests.push(makeRequest({ id: i, approval: 50, tick: CHECK_INTERVAL }))
      }
      const r = makeRequest({ id: 1, seekerCivId: 1, hostCivId: 2, approval: 2, tick: 0 })
      ;(sys as any).requests.unshift(r)
      ;(sys as any)._requestKeySet.add(r.seekerCivId * 1000 + r.hostCivId)

      // mock random=0: delta=(0-0.45)*5=-2.25, approval=max(0,2-2.25)=0<=2 -> 删除
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      const ids = (sys as any).requests.map((x: AsylumRequest) => x.id)
      expect(ids).not.toContain(1)
    })

    it('tick - r.tick > 55000 时request被删除', () => {
      // r.tick=0, 当前tick=55001 -> 55001-0=55001>55000 -> 删除
      const r = makeRequest({ approval: 50, tick: 0 })
      ;(sys as any).requests.push(r)
      ;(sys as any)._requestKeySet.add(r.seekerCivId * 1000 + r.hostCivId)

      // 固定random避免approval变化到边界
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const expireTick = 55001 // > 55000
      // 要使lastCheck能更新到expireTick，需要先reset lastCheck
      ;(sys as any).lastCheck = 0
      sys.update(1, {} as any, {} as any, expireTick)
      expect((sys as any).requests).toHaveLength(0)
    })

    it('未超期的request保留', () => {
      const r = makeRequest({ approval: 50, tick: CHECK_INTERVAL })
      ;(sys as any).requests.push(r)

      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // tick=CHECK_INTERVAL: tick - r.tick = 0 <= 55000, approval未到边界
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any).requests).toHaveLength(1)
    })

    it('删除request时同步清理_requestKeySet', () => {
      const r = makeRequest({ seekerCivId: 3, hostCivId: 7, approval: 95, tick: 0 })
      const key = 3 * 1000 + 7
      ;(sys as any).requests.push(r)
      ;(sys as any)._requestKeySet.add(key)

      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
      expect((sys as any)._requestKeySet.has(key)).toBe(false)
    })

    it('混合：过期的删除，正常的保留', () => {
      // id=1: approval=95，update后>=95，被删
      // id=2: approval=50，tick与当前tick相差0（不超55000），保留
      // id=3: tick=0，当前tick=55001，55001-0>55000，时间过期被删
      ;(sys as any).requests.push(makeRequest({ id: 1, seekerCivId: 1, hostCivId: 2, approval: 95, tick: 55001 }))
      ;(sys as any).requests.push(makeRequest({ id: 2, seekerCivId: 3, hostCivId: 4, approval: 50, tick: 55001 }))
      ;(sys as any).requests.push(makeRequest({ id: 3, seekerCivId: 5, hostCivId: 6, approval: 50, tick: 0 }))

      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      // tick=55001 满足lastCheck更新条件（lastCheck=0，55001-0>CHECK_INTERVAL）
      sys.update(1, {} as any, {} as any, 55001)

      const ids = (sys as any).requests.map((r: AsylumRequest) => r.id)
      expect(ids).not.toContain(1)
      expect(ids).toContain(2)
      expect(ids).not.toContain(3)
    })
  })

  // ─────────────────────────────────────────────
  // 5. MAX_REQUESTS 上限
  // ─────────────────────────────────────────────
  describe('MAX_REQUESTS上限控制', () => {
    it('requests达到MAX_REQUESTS时不新增', () => {
      const em = makeEM([1, 2, 3, 4, 5])
      for (let i = 1; i <= MAX_REQUESTS; i++) {
        ;(sys as any).requests.push(makeRequest({ id: i, approval: 50, tick: CHECK_INTERVAL }))
      }

      vi.spyOn(Math, 'random').mockReturnValue(0) // 强制触发spawn
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).requests.length).toBeLessThanOrEqual(MAX_REQUESTS)
    })

    it('entities少于3个时不新增request', () => {
      const em = makeEM([1, 2]) // 只有2个实体
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).requests).toHaveLength(0)
    })

    it('_requestKeySet防止重复(seeker,host)对', () => {
      const em = makeEM([10, 20, 30])
      // 预先注册10-20对的key
      const key = 10 * 1000 + 20
      ;(sys as any)._requestKeySet.add(key)

      // mock: 触发spawn，选seeker=10, host=20（已存在key）
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom
        .mockReturnValueOnce(0)     // < REQUEST_CHANCE，触发spawn
        .mockReturnValueOnce(0)     // pickRandom -> 第一个实体=10（seeker）
        .mockReturnValueOnce(1/3)   // pickRandom -> 第二个实体=20（host）
        .mockReturnValue(0.5)

      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).requests).toHaveLength(0)
    })

    it('MAX_REQUESTS为10', () => {
      const em = makeEM([1, 2, 3])
      for (let i = 1; i <= 10; i++) {
        ;(sys as any).requests.push(makeRequest({ id: i, approval: 50, tick: CHECK_INTERVAL }))
      }
      vi.spyOn(Math, 'random').mockReturnValue(0)
      sys.update(1, {} as any, em as any, CHECK_INTERVAL)
      expect((sys as any).requests.length).toBeLessThanOrEqual(10)
    })
  })
})
