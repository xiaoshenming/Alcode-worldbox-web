import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ReligionSpreadSystem } from '../systems/ReligionSpreadSystem'
import type { ReligionType, TempleComponent } from '../systems/ReligionSpreadSystem'

function makeRSS(): ReligionSpreadSystem {
  return new ReligionSpreadSystem()
}

function makeTemple(
  civId: number,
  religion: ReligionType = 'sun',
  faithStrength = 80,
  level = 1,
  faithRadius = 5,
): TempleComponent {
  return { type: 'temple', religion, civId, faithRadius, faithStrength, level }
}

// ── registerTemple / removeTemple ─────────────────────────────────────────────

describe('ReligionSpreadSystem.registerTemple / removeTemple', () => {
  let rss: ReligionSpreadSystem

  beforeEach(() => { rss = makeRSS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始神庙数量为 0', () => {
    expect(rss.getTempleCount()).toBe(0)
  })

  it('注册一个神庙后数量为 1', () => {
    rss.registerTemple(1, makeTemple(1, 'sun'))
    expect(rss.getTempleCount()).toBe(1)
  })

  it('注册多个神庙后数量正确', () => {
    rss.registerTemple(1, makeTemple(1, 'sun'))
    rss.registerTemple(2, makeTemple(2, 'moon'))
    rss.registerTemple(3, makeTemple(1, 'war'))
    expect(rss.getTempleCount()).toBe(3)
  })

  it('注销神庙后数量减少', () => {
    rss.registerTemple(1, makeTemple(1))
    rss.registerTemple(2, makeTemple(2))
    rss.removeTemple(1)
    expect(rss.getTempleCount()).toBe(1)
  })

  it('注销不存在的神庙不报错', () => {
    expect(() => rss.removeTemple(999)).not.toThrow()
  })

  it('重新注册同一 id 会覆盖（数量仍为 1）', () => {
    rss.registerTemple(1, makeTemple(1, 'sun'))
    rss.registerTemple(1, makeTemple(1, 'moon'))
    expect(rss.getTempleCount()).toBe(1)
  })

  it('覆盖注册后神庙数据更新为新值', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 50))
    rss.registerTemple(1, makeTemple(1, 'moon', 90))
    const temple = (rss as any).temples.get(1)
    expect(temple.religion).toBe('moon')
    expect(temple.faithStrength).toBe(90)
  })

  it('注销所有神庙后数量为 0', () => {
    rss.registerTemple(1, makeTemple(1))
    rss.registerTemple(2, makeTemple(2))
    rss.removeTemple(1)
    rss.removeTemple(2)
    expect(rss.getTempleCount()).toBe(0)
  })

  it('注册 8 个不同 id 的神庙', () => {
    for (let i = 1; i <= 8; i++) rss.registerTemple(i, makeTemple(i))
    expect(rss.getTempleCount()).toBe(8)
  })

  it('注销不存在 id 后已有神庙数量不变', () => {
    rss.registerTemple(1, makeTemple(1))
    rss.removeTemple(999)
    expect(rss.getTempleCount()).toBe(1)
  })

  it('注册后可以从内部 temples Map 获取到神庙数据', () => {
    const temple = makeTemple(1, 'nature', 70, 2)
    rss.registerTemple(42, temple)
    const stored = (rss as any).temples.get(42)
    expect(stored.religion).toBe('nature')
    expect(stored.faithStrength).toBe(70)
    expect(stored.level).toBe(2)
  })

  it('注销神庙后从内部 temples Map 不再存在', () => {
    rss.registerTemple(10, makeTemple(1))
    rss.removeTemple(10)
    expect((rss as any).temples.has(10)).toBe(false)
  })

  it('支持所有 6 种宗教类型注册', () => {
    const religions: ReligionType[] = ['sun', 'moon', 'nature', 'war', 'sea', 'ancestor']
    religions.forEach((r, i) => rss.registerTemple(i, makeTemple(1, r)))
    expect(rss.getTempleCount()).toBe(6)
  })
})

// ── getParticleCount ──────────────────────────────────────────────────────────

describe('ReligionSpreadSystem.getParticleCount', () => {
  afterEach(() => vi.restoreAllMocks())

  it('初始粒子数量为 0', () => {
    expect(makeRSS().getParticleCount()).toBe(0)
  })

  it('注入 1 个激活粒子后数量为 1', () => {
    const rss = makeRSS()
    ;(rss as any).particles[0].maxLife = 60
    expect(rss.getParticleCount()).toBe(1)
  })

  it('注入 2 个激活粒子后数量为 2', () => {
    const rss = makeRSS()
    ;(rss as any).particles[0].maxLife = 60
    ;(rss as any).particles[1].maxLife = 90
    expect(rss.getParticleCount()).toBe(2)
  })

  it('maxLife=0 的粒子不计入数量（inactive）', () => {
    const rss = makeRSS()
    // 初始全是 maxLife=0，不计入
    const count = rss.getParticleCount()
    expect(count).toBe(0)
  })

  it('push 方式注入不影响固定池计数逻辑', () => {
    const rss = makeRSS()
    // 使用固定池（数组初始化好了），maxLife>0 才算激活
    const particles = (rss as any).particles
    particles[5].maxLife = 30
    particles[10].maxLife = 45
    expect(rss.getParticleCount()).toBe(2)
  })

  it('粒子池容量为 200', () => {
    const rss = makeRSS()
    expect((rss as any).particles.length).toBe(200)
  })

  it('全部激活 200 个粒子时数量为 200', () => {
    const rss = makeRSS()
    for (let i = 0; i < 200; i++) (rss as any).particles[i].maxLife = 60
    expect(rss.getParticleCount()).toBe(200)
  })
})

// ── getDominantReligion ───────────────────────────────────────────────────────

describe('ReligionSpreadSystem.getDominantReligion', () => {
  let rss: ReligionSpreadSystem

  beforeEach(() => { rss = makeRSS() })
  afterEach(() => vi.restoreAllMocks())

  it('无神庙时返回 null', () => {
    expect(rss.getDominantReligion(1)).toBeNull()
  })

  it('只有一个神庙时返回该宗教', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 80, 2))
    expect(rss.getDominantReligion(1)).toBe('sun')
  })

  it('其他文明的神庙不影响结果', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 80, 2))
    rss.registerTemple(2, makeTemple(2, 'moon', 100, 3))
    expect(rss.getDominantReligion(1)).toBe('sun')
    expect(rss.getDominantReligion(2)).toBe('moon')
  })

  it('强度（faithStrength 累加）决定主导宗教', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 50, 1))
    rss.registerTemple(2, makeTemple(1, 'moon', 100, 3))
    expect(rss.getDominantReligion(1)).toBe('moon')
  })

  it('无该文明的神庙时返回 null', () => {
    rss.registerTemple(1, makeTemple(2, 'war'))
    expect(rss.getDominantReligion(1)).toBeNull()
    expect(rss.getDominantReligion(2)).toBe('war')
  })

  it('同一文明多个宗教按 faithStrength 合计选主导', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 50, 1))
    rss.registerTemple(2, makeTemple(1, 'sun', 50, 1))
    rss.registerTemple(3, makeTemple(1, 'moon', 90, 1))
    expect(rss.getDominantReligion(1)).toBe('sun')
  })

  it('移除主导神庙后主导宗教变化', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 100, 1))
    rss.registerTemple(2, makeTemple(1, 'moon', 50, 1))
    expect(rss.getDominantReligion(1)).toBe('sun')
    rss.removeTemple(1)
    expect(rss.getDominantReligion(1)).toBe('moon')
  })

  it('移除所有神庙后返回 null', () => {
    rss.registerTemple(1, makeTemple(1, 'war', 80))
    rss.removeTemple(1)
    expect(rss.getDominantReligion(1)).toBeNull()
  })

  it('同等强度时返回其中一种（不崩溃）', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 50))
    rss.registerTemple(2, makeTemple(1, 'moon', 50))
    const result = rss.getDominantReligion(1)
    expect(['sun', 'moon']).toContain(result)
  })

  it('civId=0 的文明也能查询', () => {
    rss.registerTemple(1, makeTemple(0, 'sea', 60))
    expect(rss.getDominantReligion(0)).toBe('sea')
  })

  it('三种宗教竞争时选最高 faithStrength 之和', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 30))
    rss.registerTemple(2, makeTemple(1, 'moon', 20))
    rss.registerTemple(3, makeTemple(1, 'war', 50))
    expect(rss.getDominantReligion(1)).toBe('war')
  })

  it('ancestor 宗教可以成为主导', () => {
    rss.registerTemple(1, makeTemple(1, 'ancestor', 95))
    expect(rss.getDominantReligion(1)).toBe('ancestor')
  })

  it('sea 宗教可以成为主导', () => {
    rss.registerTemple(1, makeTemple(1, 'sea', 70))
    expect(rss.getDominantReligion(1)).toBe('sea')
  })

  it('nature 宗教可以成为主导', () => {
    rss.registerTemple(1, makeTemple(1, 'nature', 60))
    expect(rss.getDominantReligion(1)).toBe('nature')
  })
})

// ── getFaithAt ────────────────────────────────────────────────────────────────

describe('ReligionSpreadSystem.getFaithAt', () => {
  let rss: ReligionSpreadSystem

  beforeEach(() => { rss = makeRSS() })
  afterEach(() => vi.restoreAllMocks())

  it('无信仰数据时返回 null', () => {
    expect(rss.getFaithAt(0, 0)).toBeNull()
    expect(rss.getFaithAt(10, 20)).toBeNull()
  })

  it('注入 faithMap 后可查询', () => {
    ;(rss as any).faithMap.set(10 * 10000 + 20, { religion: 'nature', strength: 60 })
    const faith = rss.getFaithAt(10, 20)
    expect(faith).not.toBeNull()
    expect(faith!.religion).toBe('nature')
    expect(faith!.strength).toBe(60)
  })

  it('不同坐标独立', () => {
    ;(rss as any).faithMap.set(0 * 10000 + 0, { religion: 'sun', strength: 80 })
    ;(rss as any).faithMap.set(5 * 10000 + 5, { religion: 'war', strength: 40 })
    expect(rss.getFaithAt(0, 0)!.religion).toBe('sun')
    expect(rss.getFaithAt(5, 5)!.religion).toBe('war')
    expect(rss.getFaithAt(1, 1)).toBeNull()
  })

  it('支持所有 6 种宗教类型', () => {
    const types: ReligionType[] = ['sun', 'moon', 'nature', 'war', 'sea', 'ancestor']
    types.forEach((r, i) => { ;(rss as any).faithMap.set(i * 10000 + 0, { religion: r, strength: 50 }) })
    types.forEach((r, i) => { expect(rss.getFaithAt(i, 0)!.religion).toBe(r) })
  })

  it('strength 值正确读取', () => {
    ;(rss as any).faithMap.set(3 * 10000 + 7, { religion: 'moon', strength: 42 })
    expect(rss.getFaithAt(3, 7)!.strength).toBe(42)
  })

  it('未写入坐标返回 null（边界外）', () => {
    ;(rss as any).faithMap.set(1 * 10000 + 1, { religion: 'sun', strength: 10 })
    expect(rss.getFaithAt(1, 2)).toBeNull()
    expect(rss.getFaithAt(2, 1)).toBeNull()
  })

  it('坐标 (0, 0) 可存储和读取', () => {
    ;(rss as any).faithMap.set(0, { religion: 'ancestor', strength: 77 })
    const faith = rss.getFaithAt(0, 0)
    expect(faith).not.toBeNull()
    expect(faith!.religion).toBe('ancestor')
  })

  it('strength 为 0 时仍可读取到条目', () => {
    ;(rss as any).faithMap.set(2 * 10000 + 3, { religion: 'sea', strength: 0 })
    const faith = rss.getFaithAt(2, 3)
    expect(faith).not.toBeNull()
    expect(faith!.strength).toBe(0)
  })

  it('大坐标值不崩溃', () => {
    const wx = 199, wy = 199
    ;(rss as any).faithMap.set(wx * 10000 + wy, { religion: 'war', strength: 55 })
    expect(rss.getFaithAt(wx, wy)!.religion).toBe('war')
  })

  it('删除 faithMap 条目后返回 null', () => {
    const key = 5 * 10000 + 5
    ;(rss as any).faithMap.set(key, { religion: 'moon', strength: 30 })
    expect(rss.getFaithAt(5, 5)).not.toBeNull()
    ;(rss as any).faithMap.delete(key)
    expect(rss.getFaithAt(5, 5)).toBeNull()
  })

  it('多个坐标写入后各自独立读取正确', () => {
    const entries: Array<[number, number, ReligionType, number]> = [
      [0, 0, 'sun', 10],
      [1, 1, 'moon', 20],
      [2, 2, 'nature', 30],
      [3, 3, 'war', 40],
      [4, 4, 'sea', 50],
      [5, 5, 'ancestor', 60],
    ]
    for (const [x, y, r, s] of entries) {
      ;(rss as any).faithMap.set(x * 10000 + y, { religion: r, strength: s })
    }
    for (const [x, y, r, s] of entries) {
      const faith = rss.getFaithAt(x, y)
      expect(faith!.religion).toBe(r)
      expect(faith!.strength).toBe(s)
    }
  })
})

// ── 粒子池结构校验 ────────────────────────────────────────────────────────────

describe('ReligionSpreadSystem 粒子池结构', () => {
  let rss: ReligionSpreadSystem

  beforeEach(() => { rss = makeRSS() })
  afterEach(() => vi.restoreAllMocks())

  it('粒子池初始每个粒子 maxLife=0（inactive）', () => {
    const particles = (rss as any).particles
    for (const p of particles) expect(p.maxLife).toBe(0)
  })

  it('粒子池初始每个粒子 life=0', () => {
    const particles = (rss as any).particles
    for (const p of particles) expect(p.life).toBe(0)
  })

  it('激活一个粒子后 getParticleCount 正确', () => {
    ;(rss as any).particles[0].maxLife = 60
    expect(rss.getParticleCount()).toBe(1)
    ;(rss as any).particles[0].maxLife = 0
    expect(rss.getParticleCount()).toBe(0)
  })

  it('粒子结构包含必要字段', () => {
    const p = (rss as any).particles[0]
    expect('x' in p).toBe(true)
    expect('y' in p).toBe(true)
    expect('tx' in p).toBe(true)
    expect('ty' in p).toBe(true)
    expect('life' in p).toBe(true)
    expect('maxLife' in p).toBe(true)
    expect('color' in p).toBe(true)
    expect('size' in p).toBe(true)
  })
})

// ── 内部字段校验 ──────────────────────────────────────────────────────────────

describe('ReligionSpreadSystem 内部字段', () => {
  let rss: ReligionSpreadSystem

  beforeEach(() => { rss = makeRSS() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 temples 是空 Map', () => {
    expect((rss as any).temples.size).toBe(0)
  })

  it('初始 faithMap 是空 Map', () => {
    expect((rss as any).faithMap.size).toBe(0)
  })

  it('初始 _lastZoom 为 -1', () => {
    expect((rss as any)._lastZoom).toBe(-1)
  })

  it('registerTemple 后 temples Map 存在该 key', () => {
    rss.registerTemple(7, makeTemple(1))
    expect((rss as any).temples.has(7)).toBe(true)
  })

  it('removeTemple 后 temples Map 不存在该 key', () => {
    rss.registerTemple(7, makeTemple(1))
    rss.removeTemple(7)
    expect((rss as any).temples.has(7)).toBe(false)
  })

  it('faithMap 条目数量可直接验证', () => {
    ;(rss as any).faithMap.set(100, { religion: 'sun', strength: 50 })
    ;(rss as any).faithMap.set(200, { religion: 'moon', strength: 30 })
    expect((rss as any).faithMap.size).toBe(2)
  })
})
