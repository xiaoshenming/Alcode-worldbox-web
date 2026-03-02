import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MoodSystem } from '../systems/MoodSystem'
import type { MoodData, MoodLevel } from '../systems/MoodSystem'

afterEach(() => vi.restoreAllMocks())

function makeSys(): MoodSystem { return new MoodSystem() }

function makeMoodData(mood: number = 50, victoryBoost = 0, lossBoost = 0): MoodData {
  return { mood, victoryBoost, lossBoost }
}

// ── getMood 基础行为 ─────────────────────────────────────────────────

describe('MoodSystem.getMood — 默认值', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('未注入返回50（中性）', () => {
    expect(sys.getMood(1)).toBe(50)
  })

  it('未注入任意ID均返回50', () => {
    expect(sys.getMood(0)).toBe(50)
    expect(sys.getMood(999)).toBe(50)
    expect(sys.getMood(-1)).toBe(50)
  })

  it('注入后可查询', () => {
    ;(sys as any).moods.set(1, makeMoodData(80))
    expect(sys.getMood(1)).toBe(80)
  })

  it('不同实体心情相互独立', () => {
    ;(sys as any).moods.set(1, makeMoodData(30))
    ;(sys as any).moods.set(2, makeMoodData(70))
    expect(sys.getMood(1)).toBe(30)
    expect(sys.getMood(2)).toBe(70)
  })

  it('注入0心情可读取', () => {
    ;(sys as any).moods.set(5, makeMoodData(0))
    expect(sys.getMood(5)).toBe(0)
  })

  it('注入100心情可读取', () => {
    ;(sys as any).moods.set(6, makeMoodData(100))
    expect(sys.getMood(6)).toBe(100)
  })

  it('注入后可覆盖', () => {
    ;(sys as any).moods.set(3, makeMoodData(40))
    ;(sys as any).moods.set(3, makeMoodData(75))
    expect(sys.getMood(3)).toBe(75)
  })

  it('返回值始终是 number 类型', () => {
    expect(typeof sys.getMood(1)).toBe('number')
    ;(sys as any).moods.set(2, makeMoodData(55))
    expect(typeof sys.getMood(2)).toBe('number')
  })

  it('未注入时调用 getMood 不修改内部 moods Map', () => {
    const before = (sys as any).moods.size
    sys.getMood(42)
    expect((sys as any).moods.size).toBe(before)
  })

  it('注入小数心情值可读取', () => {
    ;(sys as any).moods.set(7, makeMoodData(33.7))
    expect(sys.getMood(7)).toBeCloseTo(33.7)
  })
})

// ── getMood 多实体批量 ───────────────────────────────────────────────

describe('MoodSystem.getMood — 多实体批量验证', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('10个实体各自独立存储', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).moods.set(i, makeMoodData(i * 10))
    }
    for (let i = 1; i <= 10; i++) {
      expect(sys.getMood(i)).toBe(i * 10)
    }
  })

  it('部分已注入部分未注入时各自返回正确值', () => {
    ;(sys as any).moods.set(1, makeMoodData(20))
    ;(sys as any).moods.set(3, makeMoodData(90))
    expect(sys.getMood(1)).toBe(20)
    expect(sys.getMood(2)).toBe(50) // 未注入
    expect(sys.getMood(3)).toBe(90)
    expect(sys.getMood(4)).toBe(50) // 未注入
  })
})

// ── getMoodLevel ─────────────────────────────────────────────────────

describe('MoodSystem.getMoodLevel — 等级阈值', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('0心情返回 miserable', () => {
    ;(sys as any).moods.set(1, makeMoodData(0))
    expect(sys.getMoodLevel(1)).toBe('miserable')
  })

  it('19心情返回 miserable', () => {
    ;(sys as any).moods.set(1, makeMoodData(19))
    expect(sys.getMoodLevel(1)).toBe('miserable')
  })

  it('20心情返回 unhappy', () => {
    ;(sys as any).moods.set(1, makeMoodData(20))
    expect(sys.getMoodLevel(1)).toBe('unhappy')
  })

  it('39心情返回 unhappy', () => {
    ;(sys as any).moods.set(1, makeMoodData(39))
    expect(sys.getMoodLevel(1)).toBe('unhappy')
  })

  it('40心情返回 content', () => {
    ;(sys as any).moods.set(1, makeMoodData(40))
    expect(sys.getMoodLevel(1)).toBe('content')
  })

  it('50心情（默认）返回合法等级', () => {
    ;(sys as any).moods.set(1, makeMoodData(50))
    const level = sys.getMoodLevel(1)
    expect(['content', 'happy', 'unhappy']).toContain(level)
  })

  it('59心情返回 content', () => {
    ;(sys as any).moods.set(1, makeMoodData(59))
    expect(sys.getMoodLevel(1)).toBe('content')
  })

  it('60心情返回 happy', () => {
    ;(sys as any).moods.set(1, makeMoodData(60))
    expect(sys.getMoodLevel(1)).toBe('happy')
  })

  it('79心情返回 happy', () => {
    ;(sys as any).moods.set(1, makeMoodData(79))
    expect(sys.getMoodLevel(1)).toBe('happy')
  })

  it('80心情返回 ecstatic', () => {
    ;(sys as any).moods.set(1, makeMoodData(80))
    expect(sys.getMoodLevel(1)).toBe('ecstatic')
  })

  it('100心情返回 ecstatic', () => {
    ;(sys as any).moods.set(1, makeMoodData(100))
    expect(sys.getMoodLevel(1)).toBe('ecstatic')
  })

  it('未注入（默认50）返回 content', () => {
    expect(sys.getMoodLevel(99)).toBe('content')
  })

  it('5个等级均为合法字符串', () => {
    const allLevels: MoodLevel[] = ['ecstatic', 'happy', 'content', 'unhappy', 'miserable']
    const testMoods = [100, 70, 50, 30, 10]
    testMoods.forEach((m, i) => {
      ;(sys as any).moods.set(i + 1, makeMoodData(m))
      const level = sys.getMoodLevel(i + 1)
      expect(allLevels).toContain(level)
    })
  })

  it('边界值 79→happy, 80→ecstatic 分界精确', () => {
    ;(sys as any).moods.set(1, makeMoodData(79))
    ;(sys as any).moods.set(2, makeMoodData(80))
    expect(sys.getMoodLevel(1)).toBe('happy')
    expect(sys.getMoodLevel(2)).toBe('ecstatic')
  })

  it('边界值 19→miserable, 20→unhappy 分界精确', () => {
    ;(sys as any).moods.set(1, makeMoodData(19))
    ;(sys as any).moods.set(2, makeMoodData(20))
    expect(sys.getMoodLevel(1)).toBe('miserable')
    expect(sys.getMoodLevel(2)).toBe('unhappy')
  })

  it('边界值 39→unhappy, 40→content 分界精确', () => {
    ;(sys as any).moods.set(1, makeMoodData(39))
    ;(sys as any).moods.set(2, makeMoodData(40))
    expect(sys.getMoodLevel(1)).toBe('unhappy')
    expect(sys.getMoodLevel(2)).toBe('content')
  })

  it('边界值 59→content, 60→happy 分界精确', () => {
    ;(sys as any).moods.set(1, makeMoodData(59))
    ;(sys as any).moods.set(2, makeMoodData(60))
    expect(sys.getMoodLevel(1)).toBe('content')
    expect(sys.getMoodLevel(2)).toBe('happy')
  })
})

// ── getMoodModifier ──────────────────────────────────────────────────

describe('MoodSystem.getMoodModifier — 返回结构', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('返回 workSpeed 和 combatStrength 字段', () => {
    const mod = sys.getMoodModifier(1)
    expect(mod).toHaveProperty('workSpeed')
    expect(mod).toHaveProperty('combatStrength')
  })

  it('workSpeed 是正数', () => {
    const mod = sys.getMoodModifier(1)
    expect(mod.workSpeed).toBeGreaterThan(0)
  })

  it('combatStrength 是正数', () => {
    const mod = sys.getMoodModifier(1)
    expect(mod.combatStrength).toBeGreaterThan(0)
  })
})

describe('MoodSystem.getMoodModifier — 高心情加成', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('高心情工作速度更快', () => {
    ;(sys as any).moods.set(1, makeMoodData(100))
    ;(sys as any).moods.set(2, makeMoodData(0))
    expect(sys.getMoodModifier(1).workSpeed).toBeGreaterThan(sys.getMoodModifier(2).workSpeed)
  })

  it('心情>75 返回 workSpeed=1.2', () => {
    ;(sys as any).moods.set(1, makeMoodData(76))
    expect(sys.getMoodModifier(1).workSpeed).toBe(1.2)
  })

  it('心情>75 返回 combatStrength=1.1', () => {
    ;(sys as any).moods.set(1, makeMoodData(100))
    expect(sys.getMoodModifier(1).combatStrength).toBe(1.1)
  })

  it('心情=76 也属于高心情区间', () => {
    ;(sys as any).moods.set(1, makeMoodData(76))
    const mod = sys.getMoodModifier(1)
    expect(mod.workSpeed).toBe(1.2)
    expect(mod.combatStrength).toBe(1.1)
  })
})

describe('MoodSystem.getMoodModifier — 低心情惩罚', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('心情<25 返回 workSpeed=0.7', () => {
    ;(sys as any).moods.set(1, makeMoodData(10))
    expect(sys.getMoodModifier(1).workSpeed).toBe(0.7)
  })

  it('心情<25 返回 combatStrength=0.85', () => {
    ;(sys as any).moods.set(1, makeMoodData(0))
    expect(sys.getMoodModifier(1).combatStrength).toBe(0.85)
  })

  it('心情=24 属于低心情区间', () => {
    ;(sys as any).moods.set(1, makeMoodData(24))
    const mod = sys.getMoodModifier(1)
    expect(mod.workSpeed).toBe(0.7)
    expect(mod.combatStrength).toBe(0.85)
  })

  it('低心情战斗力小于中性心情', () => {
    ;(sys as any).moods.set(1, makeMoodData(0))
    ;(sys as any).moods.set(2, makeMoodData(50))
    expect(sys.getMoodModifier(1).combatStrength).toBeLessThan(
      sys.getMoodModifier(2).combatStrength
    )
  })
})

describe('MoodSystem.getMoodModifier — 中性心情', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('心情=50 返回中性修正 workSpeed=1.0', () => {
    ;(sys as any).moods.set(1, makeMoodData(50))
    expect(sys.getMoodModifier(1).workSpeed).toBe(1.0)
  })

  it('心情=50 返回中性修正 combatStrength=1.0', () => {
    ;(sys as any).moods.set(1, makeMoodData(50))
    expect(sys.getMoodModifier(1).combatStrength).toBe(1.0)
  })

  it('心情=25 也是中性区间', () => {
    ;(sys as any).moods.set(1, makeMoodData(25))
    expect(sys.getMoodModifier(1).workSpeed).toBe(1.0)
  })

  it('心情=75 也是中性区间', () => {
    ;(sys as any).moods.set(1, makeMoodData(75))
    expect(sys.getMoodModifier(1).workSpeed).toBe(1.0)
  })

  it('未注入（默认50）返回中性修正', () => {
    const mod = sys.getMoodModifier(99)
    expect(mod.workSpeed).toBe(1.0)
    expect(mod.combatStrength).toBe(1.0)
  })

  it('三种修正对象是单例', () => {
    ;(sys as any).moods.set(1, makeMoodData(100))
    ;(sys as any).moods.set(2, makeMoodData(100))
    expect(sys.getMoodModifier(1)).toBe(sys.getMoodModifier(2))
  })

  it('高心情修正对象与中性修正对象不同', () => {
    ;(sys as any).moods.set(1, makeMoodData(100))
    ;(sys as any).moods.set(2, makeMoodData(50))
    expect(sys.getMoodModifier(1)).not.toBe(sys.getMoodModifier(2))
  })

  it('低心情修正对象与中性修正对象不同', () => {
    ;(sys as any).moods.set(1, makeMoodData(0))
    ;(sys as any).moods.set(2, makeMoodData(50))
    expect(sys.getMoodModifier(1)).not.toBe(sys.getMoodModifier(2))
  })
})

// ── 内部结构 ─────────────────────────────────────────────────────────

describe('MoodSystem — 内部 moods Map 结构', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('内部 moods 是 Map 实例', () => {
    expect((sys as any).moods).toBeInstanceOf(Map)
  })

  it('初始 moods Map 为空', () => {
    expect((sys as any).moods.size).toBe(0)
  })

  it('注入3个实体后 size 为3', () => {
    ;(sys as any).moods.set(1, makeMoodData(10))
    ;(sys as any).moods.set(2, makeMoodData(50))
    ;(sys as any).moods.set(3, makeMoodData(90))
    expect((sys as any).moods.size).toBe(3)
  })

  it('MoodData 包含 victoryBoost 字段', () => {
    const data = makeMoodData(50, 20, 0)
    ;(sys as any).moods.set(1, data)
    expect((sys as any).moods.get(1).victoryBoost).toBe(20)
  })

  it('MoodData 包含 lossBoost 字段', () => {
    const data = makeMoodData(50, 0, -25)
    ;(sys as any).moods.set(1, data)
    expect((sys as any).moods.get(1).lossBoost).toBe(-25)
  })

  it('delete 后 getMood 恢复默认值 50', () => {
    ;(sys as any).moods.set(1, makeMoodData(80))
    expect(sys.getMood(1)).toBe(80)
    ;(sys as any).moods.delete(1)
    expect(sys.getMood(1)).toBe(50)
  })
})

// ── weatherMoodDelta 私有方法 ────────────────────────────────────────

describe('MoodSystem — 私有 weatherMoodDelta', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('clear 天气返回正值', () => {
    const delta = (sys as any).weatherMoodDelta('clear')
    expect(delta).toBeGreaterThan(0)
  })

  it('storm 天气返回负值', () => {
    const delta = (sys as any).weatherMoodDelta('storm')
    expect(delta).toBeLessThan(0)
  })

  it('tornado 天气返回负值', () => {
    const delta = (sys as any).weatherMoodDelta('tornado')
    expect(delta).toBeLessThan(0)
  })

  it('heatwave 天气返回负值', () => {
    const delta = (sys as any).weatherMoodDelta('heatwave')
    expect(delta).toBeLessThan(0)
  })

  it('rain 天气返回负值', () => {
    const delta = (sys as any).weatherMoodDelta('rain')
    expect(delta).toBeLessThan(0)
  })

  it('snow 天气返回负值', () => {
    const delta = (sys as any).weatherMoodDelta('snow')
    expect(delta).toBeLessThan(0)
  })

  it('fog 天气返回负值', () => {
    const delta = (sys as any).weatherMoodDelta('fog')
    expect(delta).toBeLessThan(0)
  })

  it('drought 天气返回负值', () => {
    const delta = (sys as any).weatherMoodDelta('drought')
    expect(delta).toBeLessThan(0)
  })

  it('clear 天气比 storm 天气 delta 更高', () => {
    const clearDelta = (sys as any).weatherMoodDelta('clear')
    const stormDelta = (sys as any).weatherMoodDelta('storm')
    expect(clearDelta).toBeGreaterThan(stormDelta)
  })

  it('未知天气返回 0', () => {
    const delta = (sys as any).weatherMoodDelta('unknown_weather')
    expect(delta).toBe(0)
  })

  it('storm 和 tornado 返回相同值', () => {
    expect((sys as any).weatherMoodDelta('storm')).toBe(
      (sys as any).weatherMoodDelta('tornado')
    )
  })

  it('rain 和 snow 返回相同值', () => {
    expect((sys as any).weatherMoodDelta('rain')).toBe(
      (sys as any).weatherMoodDelta('snow')
    )
  })
})
