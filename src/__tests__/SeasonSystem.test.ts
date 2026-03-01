import { describe, it, expect, beforeEach } from 'vitest'
import { SeasonSystem, Season } from '../systems/SeasonSystem'

// SeasonSystem 测试：
// 所有查询方法均基于内部 currentSeason/seasonTick/yearCount/transitionProgress 状态。
// 通过 as any 直接注入私有字段测试各季节配置和过渡插值。
//
// 四季配置（来自 SEASON_CONFIGS）：
//   spring: growth=1.5, temp=5, rain=0.4, snow=0, day=0.55, animal=1.3
//   summer: growth=1.2, temp=15, rain=0.2, snow=0, day=0.7,  animal=1.0
//   autumn: growth=0.6, temp=-5, rain=0.3, snow=0.05, day=0.5, animal=0.8
//   winter: growth=0.1, temp=-20, rain=0.15, snow=0.5, day=0.3, animal=0.4

function makeSS(): SeasonSystem {
  return new SeasonSystem()
}

function setSeason(ss: SeasonSystem, season: Season, transitionProgress = 1, seasonTick = 0, year = 0): void {
  ;(ss as any).currentSeason = season
  ;(ss as any).transitionProgress = transitionProgress
  ;(ss as any).seasonTick = seasonTick
  ;(ss as any).yearCount = year
}

// ── getCurrentSeason / getYear / getSeasonProgress ────────────────────────────

describe('SeasonSystem basic getters', () => {
  let ss: SeasonSystem

  beforeEach(() => {
    ss = makeSS()
  })

  it('初始季节为 Spring', () => {
    expect(ss.getCurrentSeason()).toBe(Season.Spring)
  })

  it('注入 winter 后返回 winter', () => {
    setSeason(ss, Season.Winter)
    expect(ss.getCurrentSeason()).toBe(Season.Winter)
  })

  it('初始年份为 0', () => {
    expect(ss.getYear()).toBe(0)
  })

  it('注入 year=5 后返回 5', () => {
    setSeason(ss, Season.Spring, 1, 0, 5)
    expect(ss.getYear()).toBe(5)
  })

  it('初始季节进度为 0', () => {
    expect(ss.getSeasonProgress()).toBe(0)
  })

  it('seasonTick=1800 时进度约为 0.5（TICKS_PER_SEASON=3600）', () => {
    setSeason(ss, Season.Spring, 1, 1800)
    expect(ss.getSeasonProgress()).toBeCloseTo(0.5)
  })

  it('getTransitionProgress 初始为 0', () => {
    // 初始时 transitionProgress=0（spring 开始）
    expect(ss.getTransitionProgress()).toBe(0)
  })

  it('注入 transitionProgress=0.7 后返回 0.7', () => {
    setSeason(ss, Season.Summer, 0.7)
    expect(ss.getTransitionProgress()).toBeCloseTo(0.7)
  })
})

// ── getConfig ─────────────────────────────────────────────────────────────────

describe('SeasonSystem.getConfig', () => {
  it('spring 配置正确', () => {
    const ss = makeSS()
    setSeason(ss, Season.Spring)
    const cfg = ss.getConfig()
    expect(cfg.growthMultiplier).toBe(1.5)
    expect(cfg.temperatureOffset).toBe(5)
    expect(cfg.rainChance).toBe(0.4)
    expect(cfg.snowChance).toBe(0)
    expect(cfg.dayLengthRatio).toBe(0.55)
    expect(cfg.animalActivityMultiplier).toBe(1.3)
  })

  it('summer 配置正确', () => {
    const ss = makeSS()
    setSeason(ss, Season.Summer)
    const cfg = ss.getConfig()
    expect(cfg.growthMultiplier).toBe(1.2)
    expect(cfg.temperatureOffset).toBe(15)
    expect(cfg.dayLengthRatio).toBe(0.7)
  })

  it('autumn 配置正确', () => {
    const ss = makeSS()
    setSeason(ss, Season.Autumn)
    const cfg = ss.getConfig()
    expect(cfg.growthMultiplier).toBe(0.6)
    expect(cfg.temperatureOffset).toBe(-5)
    expect(cfg.snowChance).toBe(0.05)
  })

  it('winter 配置正确', () => {
    const ss = makeSS()
    setSeason(ss, Season.Winter)
    const cfg = ss.getConfig()
    expect(cfg.growthMultiplier).toBe(0.1)
    expect(cfg.temperatureOffset).toBe(-20)
    expect(cfg.snowChance).toBe(0.5)
    expect(cfg.dayLengthRatio).toBe(0.3)
  })
})

// ── getRainChance / getSnowChance / getDayLengthRatio ─────────────────────────

describe('SeasonSystem season-specific values', () => {
  it('spring rain=0.4, snow=0', () => {
    const ss = makeSS()
    setSeason(ss, Season.Spring)
    expect(ss.getRainChance()).toBe(0.4)
    expect(ss.getSnowChance()).toBe(0)
  })

  it('winter snow=0.5', () => {
    const ss = makeSS()
    setSeason(ss, Season.Winter)
    expect(ss.getSnowChance()).toBe(0.5)
  })

  it('summer dayLengthRatio=0.7（最长）', () => {
    const ss = makeSS()
    setSeason(ss, Season.Summer)
    expect(ss.getDayLengthRatio()).toBe(0.7)
  })

  it('winter dayLengthRatio=0.3（最短）', () => {
    const ss = makeSS()
    setSeason(ss, Season.Winter)
    expect(ss.getDayLengthRatio()).toBe(0.3)
  })
})

// ── getGrowthMultiplier（transitionProgress 插值） ────────────────────────────

describe('SeasonSystem.getGrowthMultiplier', () => {
  it('无过渡时直接返回当前季节配置', () => {
    const ss = makeSS()
    setSeason(ss, Season.Spring, 1)  // transitionProgress=1，无插值
    expect(ss.getGrowthMultiplier()).toBe(1.5)
  })

  it('winter 无过渡时为 0.1', () => {
    const ss = makeSS()
    setSeason(ss, Season.Winter, 1)
    expect(ss.getGrowthMultiplier()).toBe(0.1)
  })

  it('过渡 0.5 时为前季和当前季节的中间值（summer→autumn）', () => {
    const ss = makeSS()
    // autumn 的前季是 summer（getPreviousSeason）
    setSeason(ss, Season.Autumn, 0.5)
    // summer.growth=1.2, autumn.growth=0.6 → 中间值=0.9
    expect(ss.getGrowthMultiplier()).toBeCloseTo(0.9)
  })
})

// ── getTemperatureOffset（transitionProgress 插值） ───────────────────────────

describe('SeasonSystem.getTemperatureOffset', () => {
  it('summer 无过渡时 temp=15', () => {
    const ss = makeSS()
    setSeason(ss, Season.Summer, 1)
    expect(ss.getTemperatureOffset()).toBe(15)
  })

  it('winter 无过渡时 temp=-20', () => {
    const ss = makeSS()
    setSeason(ss, Season.Winter, 1)
    expect(ss.getTemperatureOffset()).toBe(-20)
  })
})

// ── getAnimalActivityMultiplier ───────────────────────────────────────────────

describe('SeasonSystem.getAnimalActivityMultiplier', () => {
  it('spring 无过渡时 animal=1.3', () => {
    const ss = makeSS()
    setSeason(ss, Season.Spring, 1)
    expect(ss.getAnimalActivityMultiplier()).toBe(1.3)
  })

  it('winter 无过渡时 animal=0.4（最低活跃）', () => {
    const ss = makeSS()
    setSeason(ss, Season.Winter, 1)
    expect(ss.getAnimalActivityMultiplier()).toBe(0.4)
  })
})

// ── tileColorShift (via SEASON_CONFIGS私有字段) ──────────────────────────────

describe('SeasonSystem tileColorShift config', () => {
  it('spring tileColorShift.g > 0（绿意盎然）', () => {
    const ss = makeSS()
    setSeason(ss, Season.Spring, 1)
    const cfg = (ss as any).getConfig()
    expect(cfg.tileColorShift.g).toBeGreaterThan(0)
  })

  it('winter tileColorShift.b > 0（蓝白冰雪）', () => {
    const ss = makeSS()
    setSeason(ss, Season.Winter, 1)
    const cfg = (ss as any).getConfig()
    expect(cfg.tileColorShift.b).toBeGreaterThan(0)
  })

  it('autumn tileColorShift.r > 0（暖色秋叶）', () => {
    const ss = makeSS()
    setSeason(ss, Season.Autumn, 1)
    const cfg = (ss as any).getConfig()
    expect(cfg.tileColorShift.r).toBeGreaterThan(0)
  })

  it('tileColorShift有r/g/b三个字段', () => {
    const ss = makeSS()
    setSeason(ss, Season.Summer, 1)
    const cfg = (ss as any).getConfig()
    expect(typeof cfg.tileColorShift.r).toBe('number')
    expect(typeof cfg.tileColorShift.g).toBe('number')
    expect(typeof cfg.tileColorShift.b).toBe('number')
  })
})
