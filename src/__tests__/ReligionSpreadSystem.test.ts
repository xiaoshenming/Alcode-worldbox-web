import { describe, it, expect, beforeEach } from 'vitest'
import { ReligionSpreadSystem } from '../systems/ReligionSpreadSystem'
import type { ReligionType, TempleComponent } from '../systems/ReligionSpreadSystem'

// ReligionSpreadSystem 测试：
// - registerTemple / removeTemple       → 注册/注销神庙
// - getTempleCount()                    → 神庙数量
// - getParticleCount()                  → 粒子数量
// - getDominantReligion(civId)          → 文明主导宗教
// - getFaithAt(wx, wy)                  → 指定位置的信仰数据

function makeRSS(): ReligionSpreadSystem {
  return new ReligionSpreadSystem()
}

function makeTemple(civId: number, religion: ReligionType = 'sun', faithStrength = 80, level = 1): TempleComponent {
  return { type: 'temple', religion, civId, faithRadius: 5, faithStrength, level }
}

describe('ReligionSpreadSystem.registerTemple / removeTemple', () => {
  let rss: ReligionSpreadSystem

  beforeEach(() => { rss = makeRSS() })

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

  it('重新注册同一 id 会覆盖', () => {
    rss.registerTemple(1, makeTemple(1, 'sun'))
    rss.registerTemple(1, makeTemple(1, 'moon'))
    expect(rss.getTempleCount()).toBe(1)
  })
})

describe('ReligionSpreadSystem.getParticleCount', () => {
  it('初始粒子数量为 0', () => {
    expect(makeRSS().getParticleCount()).toBe(0)
  })

  it('注入粒子后数量正确', () => {
    const rss = makeRSS()
    ;(rss as any).particles.push({ x: 0, y: 0, tx: 1, ty: 1, life: 0, maxLife: 60, color: '#fff', size: 1 })
    ;(rss as any).particles.push({ x: 5, y: 5, tx: 6, ty: 6, life: 10, maxLife: 60, color: '#f00', size: 2 })
    expect(rss.getParticleCount()).toBe(2)
  })
})

describe('ReligionSpreadSystem.getDominantReligion', () => {
  let rss: ReligionSpreadSystem

  beforeEach(() => { rss = makeRSS() })

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

  it('强度（faithStrength * level）决定主导宗教', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 50, 1))
    rss.registerTemple(2, makeTemple(1, 'moon', 100, 3))
    expect(rss.getDominantReligion(1)).toBe('moon')
  })

  it('无该文明的神庙时返回 null', () => {
    rss.registerTemple(1, makeTemple(2, 'war'))
    expect(rss.getDominantReligion(1)).toBeNull()
    expect(rss.getDominantReligion(2)).toBe('war')
  })

  it('同一文明多个宗教按强度合计选主导', () => {
    rss.registerTemple(1, makeTemple(1, 'sun', 50, 1))
    rss.registerTemple(2, makeTemple(1, 'sun', 50, 1))
    rss.registerTemple(3, makeTemple(1, 'moon', 90, 1))
    expect(rss.getDominantReligion(1)).toBe('sun')
  })
})

describe('ReligionSpreadSystem.getFaithAt', () => {
  let rss: ReligionSpreadSystem

  beforeEach(() => { rss = makeRSS() })

  it('无信仰数据时返回 null', () => {
    expect(rss.getFaithAt(0, 0)).toBeNull()
    expect(rss.getFaithAt(10, 20)).toBeNull()
  })

  it('注入 faithMap 后可查询', () => {
    ;(rss as any).faithMap.set('10,20', { religion: 'nature', strength: 60 })
    const faith = rss.getFaithAt(10, 20)
    expect(faith).not.toBeNull()
    expect(faith!.religion).toBe('nature')
    expect(faith!.strength).toBe(60)
  })

  it('不同坐标独立', () => {
    ;(rss as any).faithMap.set('0,0', { religion: 'sun', strength: 80 })
    ;(rss as any).faithMap.set('5,5', { religion: 'war', strength: 40 })
    expect(rss.getFaithAt(0, 0)!.religion).toBe('sun')
    expect(rss.getFaithAt(5, 5)!.religion).toBe('war')
    expect(rss.getFaithAt(1, 1)).toBeNull()
  })

  it('支持所有 6 种宗教类型', () => {
    const types: ReligionType[] = ['sun', 'moon', 'nature', 'war', 'sea', 'ancestor']
    types.forEach((r, i) => { ;(rss as any).faithMap.set(`${i},0`, { religion: r, strength: 50 }) })
    types.forEach((r, i) => { expect(rss.getFaithAt(i, 0)!.religion).toBe(r) })
  })
})
