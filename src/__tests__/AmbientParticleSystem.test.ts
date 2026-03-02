import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AmbientParticleSystem } from '../systems/AmbientParticleSystem'
import { TileType } from '../utils/Constants'

// ============================================================
// 辅助工厂
// ============================================================
function makeSys() { return new AmbientParticleSystem() }

type Season = 'spring' | 'summer' | 'autumn' | 'winter'

function makeMockWorld(season: Season = 'spring', isDay = true, tileType: TileType = TileType.GRASS) {
  const tiles: TileType[][] = Array.from({ length: 20 }, () =>
    Array.from({ length: 20 }, () => tileType)
  )
  return {
    season,
    isDay: () => isDay,
    getTile: (_x: number, _y: number) => tileType,
    tiles,
    width: 20,
    height: 20,
  }
}

function makeMixedWorld(season: Season = 'spring', isDay = true) {
  // tiles 中有多种地形
  const tiles: TileType[][] = Array.from({ length: 20 }, (_, y) =>
    Array.from({ length: 20 }, (_, x) => {
      if (x < 5 && y < 5) return TileType.LAVA
      if (x < 10 && y < 10) return TileType.FOREST
      if (x < 15) return TileType.SAND
      return TileType.GRASS
    })
  )
  return {
    season,
    isDay: () => isDay,
    getTile: (x: number, y: number) => tiles[y]?.[x] ?? TileType.GRASS,
    tiles,
    width: 20,
    height: 20,
  }
}

// ============================================================
// 测试组1：实例化
// ============================================================
describe('AmbientParticleSystem 实例化', () => {
  afterEach(() => vi.restoreAllMocks())

  it('可以正常实例化', () => {
    expect(makeSys()).toBeDefined()
  })

  it('update 方法存在', () => {
    expect(typeof makeSys().update).toBe('function')
  })

  it('多次实例化互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    expect(a).not.toBe(b)
  })
})

// ============================================================
// 测试组2：不崩溃基础测试（各季节 + 昼/夜）
// ============================================================
describe('AmbientParticleSystem update 不崩溃测试', () => {
  afterEach(() => vi.restoreAllMocks())

  const mockParticles = { addParticle: () => {} }

  it('spring + 白天 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(makeMockWorld('spring', true) as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('spring + 夜晚 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(makeMockWorld('spring', false) as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('summer + 白天 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(makeMockWorld('summer', true) as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('summer + 夜晚 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(makeMockWorld('summer', false) as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('autumn + 白天 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(makeMockWorld('autumn', true) as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('autumn + 夜晚 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(makeMockWorld('autumn', false) as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('winter + 白天 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(makeMockWorld('winter', true) as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('winter + 夜晚 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(makeMockWorld('winter', false) as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('多次 update 不崩溃', () => {
    const sys = makeSys()
    const w = makeMockWorld()
    expect(() => { for (let i = 0; i < 10; i++) sys.update(w as any, mockParticles as any, i, 0, 0, 20, 20) }).not.toThrow()
  })

  it('LAVA 地形 update 不崩溃', () => {
    const sys = makeSys()
    const w = makeMockWorld('spring', true, TileType.LAVA)
    expect(() => sys.update(w as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('SAND 地形 update 不崩溃', () => {
    const sys = makeSys()
    const w = makeMockWorld('spring', true, TileType.SAND)
    expect(() => sys.update(w as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('FOREST 地形 update 不崩溃', () => {
    const sys = makeSys()
    const w = makeMockWorld('autumn', false, TileType.FOREST)
    expect(() => sys.update(w as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('混合地形 update 不崩溃', () => {
    const sys = makeSys()
    const w = makeMixedWorld('autumn', true)
    expect(() => sys.update(w as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })
})

// ============================================================
// 测试组3：萤火虫（Fireflies）条件测试
// ============================================================
describe('AmbientParticleSystem 萤火虫（Fireflies）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('夜晚 + spring + tick%10===0 + FOREST 地形 → addParticle 被调用', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('spring', false, TileType.FOREST)
    sys.update(w as any, particles as any, 10, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('夜晚 + summer + tick%10===0 + GRASS 地形 → addParticle 被调用', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('summer', false, TileType.GRASS)
    sys.update(w as any, particles as any, 20, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('白天 + spring + tick%10===0 → 萤火虫不生成', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    // 白天且纯草地，tick=10（整除）：只有萤火虫需要夜晚，不生成
    // 但 lava 发光 tick%15=0 时会触发，用 tick=10 排除 lava（10%15!=0）
    const w = makeMockWorld('spring', true, TileType.GRASS)
    sys.update(w as any, particles as any, 10, 0, 0, 20, 20)
    // 无 lava，tick=10 不整除 15，不整除 20 -> addParticle 不应被调用
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('夜晚 + autumn + tick%10===0 → 萤火虫不生成（autumn 不满足条件）', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    // autumn：只有 tick%8===0 触发落叶（需要 FOREST），用无 FOREST 地形排除
    const w = makeMockWorld('autumn', false, TileType.GRASS)
    // tick=10 → 10%8!=0, 10%15!=0, 10%20!=0 → 无粒子
    sys.update(w as any, particles as any, 10, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('tick 不整除 10 时萤火虫不触发（夜晚 spring FOREST）', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('spring', false, TileType.FOREST)
    // tick=11 → 11%10!=0 → 萤火虫不触发；11%8!=0 → 秋叶不触发；11%15!=0; 11%20!=0
    sys.update(w as any, particles as any, 11, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })
})

// ============================================================
// 测试组4：落叶（Falling Leaves）条件测试
// ============================================================
describe('AmbientParticleSystem 落叶（Autumn Leaves）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('autumn + tick%8===0 + FOREST 地形 → addParticle 被调用', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('autumn', true, TileType.FOREST)
    sys.update(w as any, particles as any, 8, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('spring + tick%8===0 + FOREST → 落叶不触发', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    // spring，纯 FOREST，tick=8 → autumn 条件不满足
    // tick=8 → 8%10!=0, 8%15!=0, 8%20!=0 → 萤火虫和 lava、沙尘不触发
    const w = makeMockWorld('spring', false, TileType.FOREST)
    sys.update(w as any, particles as any, 8, 0, 0, 20, 20)
    // 夜晚+spring→萤火虫 8%10!=0 不触发; 只有落叶 8%8=0 但 season!=autumn
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('autumn + tick 不整除 8 → 落叶不触发', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('autumn', true, TileType.FOREST)
    // tick=9 → 9%8!=0, 9%15!=0, 9%20!=0（沙尘用 GRASS 排除了）
    // 换成纯 FOREST 但 tick=9
    sys.update(w as any, particles as any, 9, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('autumn + tick%8===0 + GRASS 地形（非 FOREST）→ 落叶不触发（无 FOREST tile）', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    // 纯 GRASS，没有 FOREST 格子
    const w = makeMockWorld('autumn', true, TileType.GRASS)
    // tick=8: autumn 落叶 8%8=0 但 sampleTile 找不到 FOREST → 不 addParticle
    // tick=8: 8%15!=0 (lava), 8%20!=0 (sand)
    sys.update(w as any, particles as any, 8, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })
})

// ============================================================
// 测试组5：雪花（Snowflakes）条件测试
// ============================================================
describe('AmbientParticleSystem 雪花（Snowflakes）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('winter + tick%5===0 → addParticle 被调用（雪花不需要特定地形）', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('winter', true, TileType.GRASS)
    sys.update(w as any, particles as any, 5, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('spring + tick%5===0 → 雪花不触发', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    // spring，GRASS，tick=5: 5%5=0 但 season!=winter → 雪花不生成
    // 5%10!=0(萤火虫不触发因白天), 5%8!=0(秋叶), 5%15!=0(lava), 5%20!=0(沙尘)
    const w = makeMockWorld('spring', true, TileType.GRASS)
    sys.update(w as any, particles as any, 5, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('winter + tick 不整除 5 → 雪花不触发', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    // tick=6 → 6%5!=0, 6%8!=0, 6%10!=0, 6%15!=0, 6%20!=0 → 全不触发
    const w = makeMockWorld('winter', false, TileType.GRASS)
    sys.update(w as any, particles as any, 6, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('winter + tick=0（整除5且整除其他）→ addParticle 至少被调用一次', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    // tick=0: 整除 5, 8, 10, 15, 20 都不（0%所有=0） → 多个粒子系统触发
    const w = makeMockWorld('winter', true, TileType.GRASS)
    sys.update(w as any, particles as any, 0, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })
})

// ============================================================
// 测试组6：火山灰烬（Volcanic Embers）条件测试
// ============================================================
describe('AmbientParticleSystem 火山灰烬（Volcanic Embers）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('tick%15===0 + LAVA 地形 → addParticle 被调用', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('spring', true, TileType.LAVA)
    sys.update(w as any, particles as any, 15, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('tick%15===0 + GRASS 地形（无 LAVA）→ 火山灰烬不触发', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('spring', true, TileType.GRASS)
    // tick=15: 15%15=0(lava 检查但无 LAVA tile), 15%5=0 但非 winter, 15%20!=0
    sys.update(w as any, particles as any, 15, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('tick 不整除 15 + LAVA 地形 → 火山灰烬不触发', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('spring', true, TileType.LAVA)
    // tick=16: 16%15!=0, 16%8=0 但非 autumn, 16%5!=0, 16%10!=0, 16%20!=0
    sys.update(w as any, particles as any, 16, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('任何季节 tick%15===0 + LAVA → 灰烬触发（季节无关）', () => {
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as Season[]) {
      const sys = makeSys()
      const particles = { addParticle: vi.fn() }
      const w = makeMockWorld(season, true, TileType.LAVA)
      sys.update(w as any, particles as any, 15, 0, 0, 20, 20)
      expect(particles.addParticle).toHaveBeenCalled()
    }
  })
})

// ============================================================
// 测试组7：沙尘（Sand Dust）条件测试
// ============================================================
describe('AmbientParticleSystem 沙尘（Sand Dust）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('非 summer + tick%20===0 + SAND 地形 → addParticle 被调用', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('spring', true, TileType.SAND)
    sys.update(w as any, particles as any, 20, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('summer + tick%10===0 + SAND 地形 → addParticle 被调用（summer 间隔减半）', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('summer', true, TileType.SAND)
    // summer 的 sandInterval=10，tick=10
    sys.update(w as any, particles as any, 10, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('summer + tick%20===0 但非整除 10 不触发（已由 10 覆盖）— tick=20 整除 20 也整除 10', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('summer', true, TileType.SAND)
    sys.update(w as any, particles as any, 20, 0, 0, 20, 20)
    expect(particles.addParticle).toHaveBeenCalled()
  })

  it('非 summer + tick%20!=0 → 沙尘不触发', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    // tick=19: 19%20!=0, 19%10!=0, 19%15!=0, 19%8!=0, 19%5!=0, 19%10!=0
    const w = makeMockWorld('spring', true, TileType.SAND)
    sys.update(w as any, particles as any, 19, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })

  it('tick%20===0 + GRASS（无 SAND）→ 沙尘不触发', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('spring', true, TileType.GRASS)
    // tick=20: 20%20=0(sand) 但无 SAND tile; 20%15!=0, 20%10!=0, 20%8!=0, 20%5=0 非 winter
    sys.update(w as any, particles as any, 20, 0, 0, 20, 20)
    expect(particles.addParticle).not.toHaveBeenCalled()
  })
})

// ============================================================
// 测试组8：addParticle 调用参数验证
// ============================================================
describe('AmbientParticleSystem addParticle 调用参数', () => {
  afterEach(() => vi.restoreAllMocks())

  it('winter 雪花 addParticle 参数数量正确（8个参数）', () => {
    const sys = makeSys()
    let callArgs: any[] = []
    const particles = { addParticle: (...args: any[]) => { callArgs = args } }
    const w = makeMockWorld('winter', true, TileType.GRASS)
    sys.update(w as any, particles as any, 5, 0, 0, 20, 20)
    // addParticle(x, y, vx, vy, life, maxLife, color, size)
    expect(callArgs.length).toBe(8)
  })

  it('winter 雪花颜色为白色 #ffffff', () => {
    const sys = makeSys()
    let snowColor = ''
    const particles = { addParticle: (_x: any, _y: any, _vx: any, _vy: any, _l: any, _ml: any, color: string) => { snowColor = color } }
    const w = makeMockWorld('winter', true, TileType.GRASS)
    sys.update(w as any, particles as any, 5, 0, 0, 20, 20)
    expect(snowColor).toBe('#ffffff')
  })

  it('萤火虫颜色为 #aaff44', () => {
    const sys = makeSys()
    let fireColor = ''
    const particles = { addParticle: (_x: any, _y: any, _vx: any, _vy: any, _l: any, _ml: any, color: string) => { fireColor = color } }
    const w = makeMockWorld('spring', false, TileType.FOREST)
    sys.update(w as any, particles as any, 10, 0, 0, 20, 20)
    // 夜晚spring萤火虫颜色
    if (fireColor !== '') {
      expect(fireColor).toBe('#aaff44')
    }
  })

  it('沙尘颜色为 #d4b896', () => {
    const sys = makeSys()
    let dustColor = ''
    const particles = { addParticle: (_x: any, _y: any, _vx: any, _vy: any, _l: any, _ml: any, color: string) => { dustColor = color } }
    const w = makeMockWorld('spring', true, TileType.SAND)
    sys.update(w as any, particles as any, 20, 0, 0, 20, 20)
    if (dustColor !== '') {
      expect(dustColor).toBe('#d4b896')
    }
  })

  it('落叶颜色为预定义秋色之一', () => {
    const LEAF_COLORS = ['#cc6622', '#dd8833', '#aa4411', '#eebb44']
    const sys = makeSys()
    let leafColor = ''
    const particles = { addParticle: (_x: any, _y: any, _vx: any, _vy: any, _l: any, _ml: any, color: string) => { leafColor = color } }
    const w = makeMockWorld('autumn', true, TileType.FOREST)
    sys.update(w as any, particles as any, 8, 0, 0, 20, 20)
    if (leafColor !== '') {
      expect(LEAF_COLORS).toContain(leafColor)
    }
  })
})

// ============================================================
// 测试组9：viewport 参数影响
// ============================================================
describe('AmbientParticleSystem viewport 参数', () => {
  afterEach(() => vi.restoreAllMocks())

  it('viewport 大小为 0 时不崩溃（空范围）', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('winter', true)
    expect(() => sys.update(w as any, particles as any, 5, 0, 0, 0, 0)).not.toThrow()
  })

  it('viewport 超出世界边界时不崩溃', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('summer', true, TileType.SAND)
    expect(() => sys.update(w as any, particles as any, 10, -50, -50, 200, 200)).not.toThrow()
  })

  it('不同 viewport 偏移不影响稳定性', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('winter', true)
    expect(() => {
      for (let i = 0; i < 5; i++) {
        sys.update(w as any, particles as any, 5, i * 10, i * 10, 20, 20)
      }
    }).not.toThrow()
  })
})

// ============================================================
// 测试组10：tick 参数多样性
// ============================================================
describe('AmbientParticleSystem tick 参数多样性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('tick=0 不崩溃', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('winter', true)
    expect(() => sys.update(w as any, particles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })

  it('tick=100 不崩溃', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('autumn', false)
    expect(() => sys.update(w as any, particles as any, 100, 0, 0, 20, 20)).not.toThrow()
  })

  it('tick=9999 不崩溃', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('summer', true)
    expect(() => sys.update(w as any, particles as any, 9999, 0, 0, 20, 20)).not.toThrow()
  })

  it('连续100个不同 tick 值不崩溃', () => {
    const sys = makeSys()
    const particles = { addParticle: vi.fn() }
    const w = makeMockWorld('autumn', true, TileType.FOREST)
    expect(() => {
      for (let t = 0; t < 100; t++) sys.update(w as any, particles as any, t, 0, 0, 20, 20)
    }).not.toThrow()
  })
})
