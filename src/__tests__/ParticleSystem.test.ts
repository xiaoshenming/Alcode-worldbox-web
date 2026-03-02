import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ParticleSystem } from '../systems/ParticleSystem'
import type { Particle } from '../systems/ParticleSystem'

function makeSys() { return new ParticleSystem() }

afterEach(() => vi.restoreAllMocks())

// ── 初始化状态 ──────────────────────────────────────────────────
describe('初始化状态', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('初始activeCount为0', () => {
    expect(sys.getActiveCount()).toBe(0)
  })

  it('初始pool为空数组', () => {
    expect(sys.getPool()).toHaveLength(0)
  })

  it('getPool()返回数组', () => {
    expect(Array.isArray(sys.getPool())).toBe(true)
  })

  it('getActiveCount()初始为0', () => {
    expect(sys.getActiveCount()).toBe(0)
  })

  it('getPool()返回内部引用（同一对象）', () => {
    expect(sys.getPool()).toBe(sys.getPool())
  })

  it('新系统update()不崩溃', () => {
    expect(() => sys.update()).not.toThrow()
  })

  it('初始update()后activeCount仍为0', () => {
    sys.update()
    expect(sys.getActiveCount()).toBe(0)
  })
})

// ── addParticle 直接添加 ────────────────────────────────────────
describe('addParticle', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('addParticle后activeCount变为1', () => {
    sys.addParticle(0, 0, 0, 0, 30, 60, '#ff0000', 1)
    expect(sys.getActiveCount()).toBe(1)
  })

  it('addParticle后pool长度增加', () => {
    sys.addParticle(0, 0, 0, 0, 30, 60, '#ff0000', 1)
    expect(sys.getPool().length).toBeGreaterThanOrEqual(1)
  })

  it('连续addParticle累加activeCount', () => {
    sys.addParticle(0, 0, 0, 0, 30, 60, '#ff0000', 1)
    sys.addParticle(1, 1, 0, 0, 30, 60, '#00ff00', 1)
    sys.addParticle(2, 2, 0, 0, 30, 60, '#0000ff', 1)
    expect(sys.getActiveCount()).toBe(3)
  })

  it('添加的粒子x坐标正确', () => {
    sys.addParticle(42, 99, 0, 0, 30, 60, '#ffffff', 1)
    const p = sys.getPool()[0]
    expect(p.x).toBe(42)
  })

  it('添加的粒子y坐标正确', () => {
    sys.addParticle(42, 99, 0, 0, 30, 60, '#ffffff', 1)
    const p = sys.getPool()[0]
    expect(p.y).toBe(99)
  })

  it('添加的粒子颜色正确', () => {
    sys.addParticle(0, 0, 0, 0, 30, 60, '#abcdef', 1)
    const p = sys.getPool()[0]
    expect(p.color).toBe('#abcdef')
  })

  it('添加的粒子active为true', () => {
    sys.addParticle(0, 0, 0, 0, 30, 60, '#ffffff', 1)
    const p = sys.getPool()[0]
    expect(p.active).toBe(true)
  })

  it('添加的粒子life等于传入值', () => {
    sys.addParticle(0, 0, 0, 0, 25, 60, '#ffffff', 1)
    const p = sys.getPool()[0]
    expect(p.life).toBe(25)
  })

  it('添加的粒子maxLife等于传入值', () => {
    sys.addParticle(0, 0, 0, 0, 30, 55, '#ffffff', 1)
    const p = sys.getPool()[0]
    expect(p.maxLife).toBe(55)
  })

  it('addParticle不抛出异常', () => {
    expect(() => sys.addParticle(0, 0, 1, -1, 10, 20, '#000', 2)).not.toThrow()
  })
})

// ── spawn 通用粒子生成 ─────────────────────────────────────────
describe('spawn', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('spawn count=0时activeCount仍为0', () => {
    ;(sys as any).spawn(0, 0, 0, '#ff0000')
    expect(sys.getActiveCount()).toBe(0)
  })

  it('spawn count=5时activeCount为5', () => {
    ;(sys as any).spawn(10, 10, 5, '#ff0000')
    expect(sys.getActiveCount()).toBe(5)
  })

  it('spawn后所有粒子active=true', () => {
    ;(sys as any).spawn(0, 0, 3, '#ff0000')
    const active = sys.getPool().slice(0, sys.getActiveCount()).filter(p => p.active)
    expect(active).toHaveLength(3)
  })

  it('spawn后粒子color正确', () => {
    ;(sys as any).spawn(0, 0, 3, '#123456')
    const pool = sys.getPool().slice(0, 3)
    pool.forEach(p => expect(p.color).toBe('#123456'))
  })

  it('spawn后粒子life在合理范围内', () => {
    ;(sys as any).spawn(0, 0, 10, '#ffffff')
    const pool = sys.getPool().slice(0, 10)
    pool.forEach(p => {
      expect(p.life).toBeGreaterThan(0)
      expect(p.life).toBeLessThanOrEqual(60)
    })
  })

  it('spawn多次累加activeCount', () => {
    ;(sys as any).spawn(0, 0, 5, '#ff0000')
    ;(sys as any).spawn(0, 0, 3, '#00ff00')
    expect(sys.getActiveCount()).toBe(8)
  })
})

// ── spawnExplosion ─────────────────────────────────────────────
describe('spawnExplosion', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('spawnExplosion后activeCount增加', () => {
    sys.spawnExplosion(10, 20)
    expect(sys.getActiveCount()).toBeGreaterThan(0)
  })

  it('spawnExplosion生成45个粒子（20+15+10）', () => {
    sys.spawnExplosion(10, 20)
    expect(sys.getActiveCount()).toBe(45)
  })

  it('spawnExplosion不抛出异常', () => {
    expect(() => sys.spawnExplosion(50, 50)).not.toThrow()
  })

  it('spawnExplosion多次累加粒子数', () => {
    sys.spawnExplosion(0, 0)
    sys.spawnExplosion(10, 10)
    expect(sys.getActiveCount()).toBe(90)
  })

  it('spawnExplosion粒子均为active', () => {
    sys.spawnExplosion(0, 0)
    const count = sys.getActiveCount()
    const active = sys.getPool().slice(0, count).filter(p => p.active)
    expect(active.length).toBe(count)
  })

  it('spawnExplosion在任意坐标不崩溃', () => {
    expect(() => sys.spawnExplosion(-999, 9999)).not.toThrow()
    expect(() => sys.spawnExplosion(0, 0)).not.toThrow()
  })
})

// ── spawnDeath ────────────────────────────────────────────────
describe('spawnDeath', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('spawnDeath后activeCount增加', () => {
    sys.spawnDeath(5, 5, '#ff0000')
    expect(sys.getActiveCount()).toBeGreaterThan(0)
  })

  it('spawnDeath生成13个粒子（8+5）', () => {
    sys.spawnDeath(5, 5, '#ff0000')
    expect(sys.getActiveCount()).toBe(13)
  })

  it('spawnDeath不抛出异常', () => {
    expect(() => sys.spawnDeath(0, 0, '#000000')).not.toThrow()
  })

  it('spawnDeath颜色参数被使用', () => {
    sys.spawnDeath(0, 0, '#abcdef')
    const pool = sys.getPool().slice(0, sys.getActiveCount())
    const hasColor = pool.some(p => p.color === '#abcdef')
    expect(hasColor).toBe(true)
  })

  it('spawnDeath包含暗红色粒子', () => {
    sys.spawnDeath(0, 0, '#ffffff')
    const pool = sys.getPool().slice(0, sys.getActiveCount())
    const hasDarkRed = pool.some(p => p.color === '#880000')
    expect(hasDarkRed).toBe(true)
  })
})

// ── spawnBirth ────────────────────────────────────────────────
describe('spawnBirth', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('spawnBirth后activeCount增加', () => {
    sys.spawnBirth(15, 15, '#00ff00')
    expect(sys.getActiveCount()).toBeGreaterThan(0)
  })

  it('spawnBirth生成10个粒子（6+4）', () => {
    sys.spawnBirth(15, 15, '#00ff00')
    expect(sys.getActiveCount()).toBe(10)
  })

  it('spawnBirth不抛出异常', () => {
    expect(() => sys.spawnBirth(0, 0, '#ffffff')).not.toThrow()
  })

  it('spawnBirth包含白色粒子', () => {
    sys.spawnBirth(0, 0, '#aabbcc')
    const pool = sys.getPool().slice(0, sys.getActiveCount())
    const hasWhite = pool.some(p => p.color === '#ffffff')
    expect(hasWhite).toBe(true)
  })

  it('spawnBirth包含传入颜色的粒子', () => {
    sys.spawnBirth(0, 0, '#aabbcc')
    const pool = sys.getPool().slice(0, sys.getActiveCount())
    const hasColor = pool.some(p => p.color === '#aabbcc')
    expect(hasColor).toBe(true)
  })
})

// ── spawnRain ─────────────────────────────────────────────────
describe('spawnRain', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('spawnRain生成3个粒子', () => {
    sys.spawnRain(10, 10)
    expect(sys.getActiveCount()).toBe(3)
  })

  it('spawnRain粒子颜色为蓝色', () => {
    sys.spawnRain(0, 0)
    const pool = sys.getPool().slice(0, 3)
    pool.forEach(p => expect(p.color).toBe('#4488ff'))
  })

  it('spawnRain粒子vy为正（向下）', () => {
    sys.spawnRain(0, 0)
    const pool = sys.getPool().slice(0, 3)
    pool.forEach(p => expect(p.vy).toBeGreaterThan(0))
  })

  it('spawnRain粒子vx为0', () => {
    sys.spawnRain(0, 0)
    const pool = sys.getPool().slice(0, 3)
    pool.forEach(p => expect(p.vx).toBe(0))
  })

  it('spawnRain不抛出异常', () => {
    expect(() => sys.spawnRain(100, 200)).not.toThrow()
  })

  it('spawnRain粒子size为1', () => {
    sys.spawnRain(0, 0)
    const pool = sys.getPool().slice(0, 3)
    pool.forEach(p => expect(p.size).toBe(1))
  })
})

// ── spawnFirework ─────────────────────────────────────────────
describe('spawnFirework', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('spawnFirework生成24个粒子（16+8）', () => {
    sys.spawnFirework(50, 50, '#ff0099')
    expect(sys.getActiveCount()).toBe(24)
  })

  it('spawnFirework包含传入颜色粒子', () => {
    sys.spawnFirework(0, 0, '#ff0099')
    const pool = sys.getPool().slice(0, sys.getActiveCount())
    const hasColor = pool.some(p => p.color === '#ff0099')
    expect(hasColor).toBe(true)
  })

  it('spawnFirework包含白色内圈粒子', () => {
    sys.spawnFirework(0, 0, '#ff0000')
    const pool = sys.getPool().slice(0, sys.getActiveCount())
    const hasWhite = pool.some(p => p.color === '#ffffff')
    expect(hasWhite).toBe(true)
  })

  it('spawnFirework不抛出异常', () => {
    expect(() => sys.spawnFirework(100, 100, '#00ff00')).not.toThrow()
  })
})

// ── spawnTrail ────────────────────────────────────────────────
describe('spawnTrail', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('spawnTrail生成1个粒子', () => {
    sys.spawnTrail(0, 0, '#aaaaaa')
    expect(sys.getActiveCount()).toBe(1)
  })

  it('spawnTrail粒子颜色正确', () => {
    sys.spawnTrail(0, 0, '#aaaaaa')
    const p = sys.getPool()[0]
    expect(p.color).toBe('#aaaaaa')
  })

  it('spawnTrail不抛出异常', () => {
    expect(() => sys.spawnTrail(5, 10, '#ffffff')).not.toThrow()
  })

  it('spawnTrail粒子life > 0', () => {
    sys.spawnTrail(0, 0, '#ffffff')
    const p = sys.getPool()[0]
    expect(p.life).toBeGreaterThan(0)
  })
})

// ── spawnAura ─────────────────────────────────────────────────
describe('spawnAura', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('spawnAura生成3个粒子', () => {
    sys.spawnAura(50, 50, '#8800ff', 5)
    expect(sys.getActiveCount()).toBe(3)
  })

  it('spawnAura粒子颜色正确', () => {
    sys.spawnAura(0, 0, '#8800ff', 5)
    const pool = sys.getPool().slice(0, 3)
    pool.forEach(p => expect(p.color).toBe('#8800ff'))
  })

  it('spawnAura不抛出异常', () => {
    expect(() => sys.spawnAura(0, 0, '#ffffff', 10)).not.toThrow()
  })

  it('spawnAura粒子active为true', () => {
    sys.spawnAura(0, 0, '#ffffff', 10)
    const pool = sys.getPool().slice(0, 3)
    pool.forEach(p => expect(p.active).toBe(true))
  })
})

// ── update 物理和生命周期 ──────────────────────────────────────
describe('update — 物理与生命周期', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('update()不崩溃', () => {
    sys.spawnExplosion(10, 20)
    expect(() => sys.update()).not.toThrow()
  })

  it('update后粒子位置因速度变化', () => {
    sys.addParticle(10, 10, 2, 3, 30, 60, '#ffffff', 1)
    sys.update()
    const p = sys.getPool()[0]
    expect(p.x).toBe(12) // 10 + vx=2
  })

  it('update后粒子vy因gravity增加', () => {
    sys.addParticle(0, 0, 0, 0, 30, 60, '#ffffff', 1)
    sys.update()
    const p = sys.getPool()[0]
    // 顺序: y += vy(0), vy += 0.05 => vy 变为 0.05
    expect(p.vy).toBeCloseTo(0.05, 5)
  })

  it('update后粒子life减少1', () => {
    sys.addParticle(0, 0, 0, 0, 30, 60, '#ffffff', 1)
    sys.update()
    const p = sys.getPool()[0]
    expect(p.life).toBe(29)
  })

  it('life耗尽后粒子从active区移除', () => {
    sys.addParticle(0, 0, 0, 0, 1, 1, '#ffffff', 1)
    expect(sys.getActiveCount()).toBe(1)
    sys.update()
    expect(sys.getActiveCount()).toBe(0)
  })

  it('life耗尽后粒子active变为false', () => {
    sys.addParticle(0, 0, 0, 0, 1, 1, '#ffffff', 1)
    sys.update()
    const pool = sys.getPool()
    // 粒子被移到末尾，active=false
    expect(pool.some(p => !p.active)).toBe(true)
  })

  it('多帧update后所有短命粒子消亡', () => {
    sys.addParticle(0, 0, 0, 0, 2, 2, '#ffffff', 1)
    sys.addParticle(0, 0, 0, 0, 2, 2, '#ffffff', 1)
    sys.update()
    sys.update()
    expect(sys.getActiveCount()).toBe(0)
  })

  it('混合生命期粒子update后分别处理', () => {
    sys.addParticle(0, 0, 0, 0, 1, 1, '#ffffff', 1) // 1帧后死亡
    sys.addParticle(0, 0, 0, 0, 10, 10, '#ffffff', 1) // 继续存活
    sys.update()
    expect(sys.getActiveCount()).toBe(1)
  })

  it('update后pool长度不超过MAX_PARTICLES（500）', () => {
    for (let i = 0; i < 100; i++) sys.spawnExplosion(i, i)
    sys.update()
    expect(sys.getPool().length).toBeLessThanOrEqual(500)
  })

  it('连续多次update不崩溃', () => {
    sys.spawnExplosion(0, 0)
    expect(() => {
      for (let i = 0; i < 200; i++) sys.update()
    }).not.toThrow()
  })

  it('连续update最终activeCount降至0', () => {
    sys.spawnExplosion(0, 0)
    for (let i = 0; i < 100; i++) sys.update()
    expect(sys.getActiveCount()).toBe(0)
  })
})

// ── 对象池复用 ────────────────────────────────────────────────
describe('对象池复用机制', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('粒子死亡后pool不收缩（复用槽位）', () => {
    sys.addParticle(0, 0, 0, 0, 1, 1, '#ff0000', 1)
    sys.update() // 粒子死亡
    expect(sys.getPool().length).toBe(1) // 槽位保留
    expect(sys.getActiveCount()).toBe(0)
  })

  it('死亡后再添加粒子复用旧槽位', () => {
    sys.addParticle(0, 0, 0, 0, 1, 1, '#ff0000', 1)
    const poolRef = sys.getPool()
    sys.update() // 第一个粒子死亡
    sys.addParticle(5, 5, 0, 0, 10, 10, '#00ff00', 1)
    expect(poolRef.length).toBe(1) // pool没有grow
    expect(sys.getActiveCount()).toBe(1)
  })

  it('pool满时（500）覆盖index 0粒子', () => {
    // 填满pool
    for (let i = 0; i < 500; i++) {
      sys.addParticle(i, i, 0, 0, 100, 100, '#ff0000', 1)
    }
    expect(sys.getActiveCount()).toBe(500)
    // 再添加一个
    sys.addParticle(999, 999, 0, 0, 50, 50, '#0000ff', 1)
    // activeCount不变（覆盖了index 0）
    expect(sys.getActiveCount()).toBe(500)
    // index 0被覆盖
    const p = sys.getPool()[0]
    expect(p.x).toBe(999)
  })
})

// ── 粒子接口结构 ──────────────────────────────────────────────
describe('Particle 接口结构完整性', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('粒子含x字段', () => {
    sys.addParticle(1, 2, 0, 0, 10, 10, '#fff', 1)
    expect('x' in sys.getPool()[0]).toBe(true)
  })

  it('粒子含y字段', () => {
    sys.addParticle(1, 2, 0, 0, 10, 10, '#fff', 1)
    expect('y' in sys.getPool()[0]).toBe(true)
  })

  it('粒子含vx字段', () => {
    sys.addParticle(1, 2, 3, 4, 10, 10, '#fff', 1)
    expect(sys.getPool()[0].vx).toBe(3)
  })

  it('粒子含vy字段', () => {
    sys.addParticle(1, 2, 3, 4, 10, 10, '#fff', 1)
    expect(sys.getPool()[0].vy).toBe(4)
  })

  it('粒子含life字段', () => {
    sys.addParticle(0, 0, 0, 0, 25, 60, '#fff', 1)
    expect('life' in sys.getPool()[0]).toBe(true)
  })

  it('粒子含maxLife字段', () => {
    sys.addParticle(0, 0, 0, 0, 25, 60, '#fff', 1)
    expect(sys.getPool()[0].maxLife).toBe(60)
  })

  it('粒子含color字段', () => {
    sys.addParticle(0, 0, 0, 0, 10, 10, '#112233', 1)
    expect(sys.getPool()[0].color).toBe('#112233')
  })

  it('粒子含size字段', () => {
    sys.addParticle(0, 0, 0, 0, 10, 10, '#fff', 2.5)
    expect(sys.getPool()[0].size).toBe(2.5)
  })

  it('粒子含active字段', () => {
    sys.addParticle(0, 0, 0, 0, 10, 10, '#fff', 1)
    expect('active' in sys.getPool()[0]).toBe(true)
  })
})

// ── 边界与极端情况 ────────────────────────────────────────────
describe('边界与极端情况', () => {
  let sys: ParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('负坐标粒子正常添加', () => {
    sys.addParticle(-100, -200, 0, 0, 10, 10, '#fff', 1)
    expect(sys.getActiveCount()).toBe(1)
    expect(sys.getPool()[0].x).toBe(-100)
  })

  it('零速度粒子update后x不变，vy增加0.05', () => {
    sys.addParticle(50, 50, 0, 0, 10, 10, '#fff', 1)
    sys.update()
    const p = sys.getPool()[0]
    expect(p.x).toBe(50)
    // 顺序: y += vy(0)=50, vy += 0.05 => 第一帧y不变，vy变为0.05
    expect(p.y).toBe(50)
    expect(p.vy).toBeCloseTo(0.05, 5)
  })

  it('life=1粒子在第一次update后消亡', () => {
    sys.addParticle(0, 0, 0, 0, 1, 1, '#fff', 1)
    sys.update()
    expect(sys.getActiveCount()).toBe(0)
  })

  it('一次生成大量粒子不崩溃', () => {
    expect(() => {
      for (let i = 0; i < 50; i++) sys.spawnExplosion(i, i)
    }).not.toThrow()
  })

  it('pool超过MAX_PARTICLES后activeCount不超500', () => {
    for (let i = 0; i < 600; i++) {
      sys.addParticle(i, i, 0, 0, 100, 100, '#fff', 1)
    }
    expect(sys.getActiveCount()).toBeLessThanOrEqual(500)
  })
})
