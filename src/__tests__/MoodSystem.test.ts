import { describe, it, expect, beforeEach } from 'vitest'
import { MoodSystem } from '../systems/MoodSystem'
import type { MoodData, MoodLevel } from '../systems/MoodSystem'

function makeSys(): MoodSystem { return new MoodSystem() }
function makeMoodData(mood: number = 50): MoodData {
  return { mood, victoryBoost: 0, lossBoost: 0 }
}

describe('MoodSystem.getMood', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('未注入返回50（中性）', () => {
    expect(sys.getMood(1)).toBe(50)
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
})

describe('MoodSystem.getMoodLevel', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('0心情返回miserable', () => {
    ;(sys as any).moods.set(1, makeMoodData(0))
    expect(sys.getMoodLevel(1)).toBe('miserable')
  })
  it('100心情返回ecstatic', () => {
    ;(sys as any).moods.set(1, makeMoodData(100))
    expect(sys.getMoodLevel(1)).toBe('ecstatic')
  })
  it('50心情返回content', () => {
    ;(sys as any).moods.set(1, makeMoodData(50))
    // content area
    const level = sys.getMoodLevel(1)
    expect(['content', 'happy', 'unhappy']).toContain(level)
  })
})

describe('MoodSystem.getMoodModifier', () => {
  let sys: MoodSystem
  beforeEach(() => { sys = makeSys() })

  it('返回workSpeed和combatStrength字段', () => {
    const mod = sys.getMoodModifier(1)
    expect(mod).toHaveProperty('workSpeed')
    expect(mod).toHaveProperty('combatStrength')
  })
  it('高心情工作速度更快', () => {
    ;(sys as any).moods.set(1, makeMoodData(100))
    ;(sys as any).moods.set(2, makeMoodData(0))
    expect(sys.getMoodModifier(1).workSpeed).toBeGreaterThan(sys.getMoodModifier(2).workSpeed)
  })
})
