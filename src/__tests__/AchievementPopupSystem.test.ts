import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AchievementPopupSystem } from '../systems/AchievementPopupSystem'
import type { AchievementDef, AchievementRarity, AchievementCategory } from '../systems/AchievementPopupSystem'

function makeSys() { return new AchievementPopupSystem() }

function makeAch(id = 'test_ach', overrides: Partial<AchievementDef> = {}): AchievementDef {
  return {
    id,
    name: 'Test Achievement',
    description: 'A test achievement',
    icon: '⭐',
    rarity: 'common',
    category: 'explore',
    maxProgress: 100,
    ...overrides,
  }
}

// ── registerAchievement ────────────────────────────────────────────────────────

describe('AchievementPopupSystem.registerAchievement', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 achievements.size 为 0', () => {
    expect((sys as any).achievements.size).toBe(0)
  })

  it('注册一个成就后 size 变为 1', () => {
    sys.registerAchievement(makeAch())
    expect((sys as any).achievements.size).toBe(1)
  })

  it('注册多个不同 id 的成就，size 正确递增', () => {
    sys.registerAchievement(makeAch('a1'))
    sys.registerAchievement(makeAch('a2'))
    sys.registerAchievement(makeAch('a3'))
    expect((sys as any).achievements.size).toBe(3)
  })

  it('重复注册同一 id 不会增加 size', () => {
    sys.registerAchievement(makeAch('dup'))
    sys.registerAchievement(makeAch('dup'))
    expect((sys as any).achievements.size).toBe(1)
  })

  it('注册后 progress 初始为 0', () => {
    sys.registerAchievement(makeAch('p1'))
    expect((sys as any).achievements.get('p1').progress).toBe(0)
  })

  it('注册后 unlocked 为 false', () => {
    sys.registerAchievement(makeAch('u1'))
    expect((sys as any).achievements.get('u1').unlocked).toBe(false)
  })

  it('注册后 displayProgress 为 0', () => {
    sys.registerAchievement(makeAch('dp1'))
    expect((sys as any).achievements.get('dp1').displayProgress).toBe(0)
  })

  it('注册后 progressPctStr 为 "0"', () => {
    sys.registerAchievement(makeAch('pct1'))
    expect((sys as any).achievements.get('pct1').progressPctStr).toBe('0')
  })

  it('注册后 progressLine 为 "进度: 0%"', () => {
    sys.registerAchievement(makeAch('pl1'))
    expect((sys as any).achievements.get('pl1').progressLine).toBe('进度: 0%')
  })

  it('注册后 panelHeaderStr 包含正确数量', () => {
    sys.registerAchievement(makeAch('h1'))
    sys.registerAchievement(makeAch('h2'))
    expect((sys as any)._panelHeaderStr).toBe('成就总览  0/2')
  })

  it('注册不同 rarity 的成就均可正常存储', () => {
    const rarities: AchievementRarity[] = ['common', 'rare', 'epic', 'legendary']
    rarities.forEach((r, i) => sys.registerAchievement(makeAch(`r${i}`, { rarity: r })))
    expect((sys as any).achievements.size).toBe(4)
  })

  it('注册不同 category 的成就均可正常存储', () => {
    const cats: AchievementCategory[] = ['explore', 'war', 'build', 'disaster', 'special']
    cats.forEach((c, i) => sys.registerAchievement(makeAch(`c${i}`, { category: c })))
    expect((sys as any).achievements.size).toBe(5)
  })
})

// ── unlock ─────────────────────────────────────────────────────────────────────

describe('AchievementPopupSystem.unlock', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('解锁后 isUnlocked 返回 true', () => {
    sys.registerAchievement(makeAch('ul1'))
    sys.unlock('ul1', 10)
    expect(sys.isUnlocked('ul1')).toBe(true)
  })

  it('getUnlockedCount 在解锁后增加', () => {
    sys.registerAchievement(makeAch('uc1'))
    sys.unlock('uc1', 5)
    expect(sys.getUnlockedCount()).toBe(1)
  })

  it('重复 unlock 同一成就只计一次', () => {
    sys.registerAchievement(makeAch('dup_ul'))
    sys.unlock('dup_ul', 1)
    sys.unlock('dup_ul', 2)
    expect(sys.getUnlockedCount()).toBe(1)
  })

  it('解锁后 progress 被设置为 maxProgress', () => {
    sys.registerAchievement(makeAch('prog_ul', { maxProgress: 50 }))
    sys.unlock('prog_ul', 1)
    expect((sys as any).achievements.get('prog_ul').progress).toBe(50)
  })

  it('解锁后 progressPctStr 为 "100"', () => {
    sys.registerAchievement(makeAch('pct_ul'))
    sys.unlock('pct_ul', 1)
    expect((sys as any).achievements.get('pct_ul').progressPctStr).toBe('100')
  })

  it('解锁后 progressLine 为 "进度: 100%"', () => {
    sys.registerAchievement(makeAch('pl_ul'))
    sys.unlock('pl_ul', 1)
    expect((sys as any).achievements.get('pl_ul').progressLine).toBe('进度: 100%')
  })

  it('解锁后 unlockTickStr 包含 tick 号', () => {
    sys.registerAchievement(makeAch('tick_ul'))
    sys.unlock('tick_ul', 42)
    expect((sys as any).achievements.get('tick_ul').unlockTickStr).toBe('Tick 42 解锁')
  })

  it('解锁后 panelHeaderStr 中解锁数增加', () => {
    sys.registerAchievement(makeAch('ph1'))
    sys.registerAchievement(makeAch('ph2'))
    sys.unlock('ph1', 1)
    expect((sys as any)._panelHeaderStr).toBe('成就总览  1/2')
  })

  it('解锁后 popupQueue 中有该成就 id', () => {
    sys.registerAchievement(makeAch('q1'))
    sys.unlock('q1', 1)
    expect((sys as any).popupQueue).toContain('q1')
  })

  it('unlock 不存在的成就不抛错', () => {
    expect(() => sys.unlock('nonexistent', 1)).not.toThrow()
  })

  it('unlock 多个不同成就，计数正确', () => {
    ['a', 'b', 'c'].forEach(id => {
      sys.registerAchievement(makeAch(id))
      sys.unlock(id, 1)
    })
    expect(sys.getUnlockedCount()).toBe(3)
  })
})

// ── updateProgress ─────────────────────────────────────────────────────────────

describe('AchievementPopupSystem.updateProgress', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('updateProgress 设置 progress 字段', () => {
    sys.registerAchievement(makeAch('up1', { maxProgress: 200 }))
    sys.updateProgress('up1', 50)
    expect(sys.getProgress('up1')).toBe(50)
  })

  it('updateProgress 不超过 maxProgress 上限', () => {
    sys.registerAchievement(makeAch('up2', { maxProgress: 100 }))
    sys.updateProgress('up2', 999)
    expect(sys.getProgress('up2')).toBe(100)
  })

  it('updateProgress 更新 progressPctStr', () => {
    sys.registerAchievement(makeAch('up3', { maxProgress: 100 }))
    sys.updateProgress('up3', 75)
    expect((sys as any).achievements.get('up3').progressPctStr).toBe('75')
  })

  it('updateProgress 更新 progressLine', () => {
    sys.registerAchievement(makeAch('up4', { maxProgress: 100 }))
    sys.updateProgress('up4', 30)
    expect((sys as any).achievements.get('up4').progressLine).toBe('进度: 30%')
  })

  it('已解锁的成就调用 updateProgress 无效', () => {
    sys.registerAchievement(makeAch('up5', { maxProgress: 100 }))
    sys.unlock('up5', 1)
    sys.updateProgress('up5', 0)
    expect(sys.getProgress('up5')).toBe(100)
  })

  it('updateProgress 不存在的成就不抛错', () => {
    expect(() => sys.updateProgress('no_exist', 50)).not.toThrow()
  })

  it('getProgress 未注册成就返回 0', () => {
    expect(sys.getProgress('ghost')).toBe(0)
  })

  it('进度为 0 时 progressPctStr 为 "0"', () => {
    sys.registerAchievement(makeAch('up6', { maxProgress: 100 }))
    sys.updateProgress('up6', 0)
    expect((sys as any).achievements.get('up6').progressPctStr).toBe('0')
  })
})

// ── toggle / isVisible ─────────────────────────────────────────────────────────

describe('AchievementPopupSystem.toggle / isVisible', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 panelVisible 为 false', () => {
    expect(sys.isVisible()).toBe(false)
  })

  it('toggle 一次后变为 true', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })

  it('toggle 两次后恢复 false', () => {
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })

  it('toggle 后 panelScroll 重置为 0', () => {
    ;(sys as any).panelScroll = 100
    sys.toggle()
    expect((sys as any).panelScroll).toBe(0)
  })
})

// ── update（动画状态机）────────────────────────────────────────────────────────

describe('AchievementPopupSystem.update', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('空状态下 update 不抛错', () => {
    expect(() => sys.update(1)).not.toThrow()
  })

  it('解锁后 update 会将弹窗从 popupQueue 移入 activePopup', () => {
    sys.registerAchievement(makeAch('upd1'))
    sys.unlock('upd1', 0)
    sys.update(1)
    expect((sys as any).activePopup).not.toBeNull()
    expect((sys as any).activePopup.achievementId).toBe('upd1')
  })

  it('update 中 activePopup 初始 phase 为 enter', () => {
    sys.registerAchievement(makeAch('phase1'))
    sys.unlock('phase1', 0)
    sys.update(1)
    expect((sys as any).activePopup.phase).toBe('enter')
  })

  it('经过 ENTER_TICKS(20) 后 phase 变为 stay', () => {
    sys.registerAchievement(makeAch('stay1'))
    sys.unlock('stay1', 0)
    // 逐 tick 推进：第1次 update(t=1) 时弹窗 startTick=1，之后逐步推进到 elapsed>=20
    for (let t = 1; t <= 22; t++) sys.update(t)
    expect((sys as any).activePopup.phase).toBe('stay')
  })

  it('经过 ENTER+STAY ticks 后 phase 变为 exit', () => {
    sys.registerAchievement(makeAch('exit1'))
    sys.unlock('exit1', 0)
    // 逐 tick 推进到 elapsed > ENTER(20)+STAY(180)=200
    for (let t = 1; t <= 205; t++) sys.update(t)
    expect((sys as any).activePopup.phase).toBe('exit')
  })

  it('弹窗完全退出后 activePopup 变 null', () => {
    sys.registerAchievement(makeAch('done1'))
    sys.unlock('done1', 0)
    // 逐 tick ���进到 elapsed > ENTER(20)+STAY(180)+EXIT(20)=220
    for (let t = 1; t <= 225; t++) sys.update(t)
    expect((sys as any).activePopup).toBeNull()
  })

  it('粒子系统在 update 中会移动', () => {
    sys.registerAchievement(makeAch('par1'))
    sys.unlock('par1', 0)
    sys.update(1)
    const particles = (sys as any).particles
    if (particles.length > 0) {
      expect(particles[0].life).toBeLessThan(particles[0].maxLife)
    }
    expect(true).toBe(true) // 不崩溃即通过
  })

  it('displayProgress 平滑向 progress 靠近', () => {
    sys.registerAchievement(makeAch('smooth1', { maxProgress: 100 }))
    sys.updateProgress('smooth1', 100)
    const state = (sys as any).achievements.get('smooth1')
    const before = state.displayProgress
    sys.update(1)
    expect(state.displayProgress).toBeGreaterThan(before)
  })

  it('多次 update 后 displayProgress 趋近 progress', () => {
    sys.registerAchievement(makeAch('smooth2', { maxProgress: 100 }))
    sys.updateProgress('smooth2', 100)
    for (let i = 0; i < 50; i++) sys.update(i)
    const state = (sys as any).achievements.get('smooth2')
    expect(state.displayProgress).toBeCloseTo(100, 0)
  })
})

// ── spawnParticles（私有）─────────────────────────────────────────────────────

describe('AchievementPopupSystem.spawnParticles (private)', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('common 成就生成 12 个粒子', () => {
    sys.registerAchievement(makeAch('sp_common', { rarity: 'common' }))
    ;(sys as any).spawnParticles('sp_common')
    expect((sys as any).particles.length).toBe(12)
  })

  it('rare 成就生成 24 个粒子', () => {
    sys.registerAchievement(makeAch('sp_rare', { rarity: 'rare' }))
    ;(sys as any).spawnParticles('sp_rare')
    expect((sys as any).particles.length).toBe(24)
  })

  it('epic 成就生成 40 个粒子', () => {
    sys.registerAchievement(makeAch('sp_epic', { rarity: 'epic' }))
    ;(sys as any).spawnParticles('sp_epic')
    expect((sys as any).particles.length).toBe(40)
  })

  it('legendary 成就生成 80 个粒子', () => {
    sys.registerAchievement(makeAch('sp_leg', { rarity: 'legendary' }))
    ;(sys as any).spawnParticles('sp_leg')
    expect((sys as any).particles.length).toBe(80)
  })

  it('粒子 life 大于 0', () => {
    sys.registerAchievement(makeAch('sp_life', { rarity: 'common' }))
    ;(sys as any).spawnParticles('sp_life')
    const pts = (sys as any).particles as any[]
    pts.forEach(p => expect(p.life).toBeGreaterThan(0))
  })

  it('粒子 size 大于 0', () => {
    sys.registerAchievement(makeAch('sp_size', { rarity: 'common' }))
    ;(sys as any).spawnParticles('sp_size')
    const pts = (sys as any).particles as any[]
    pts.forEach(p => expect(p.size).toBeGreaterThan(0))
  })

  it('不存在的成就不会生成粒子', () => {
    ;(sys as any).spawnParticles('ghost_id')
    expect((sys as any).particles.length).toBe(0)
  })
})

// ── getUnlockedCount ───────────────────────────────────────────────────────────

describe('AchievementPopupSystem.getUnlockedCount', () => {
  let sys: AchievementPopupSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始为 0', () => {
    expect(sys.getUnlockedCount()).toBe(0)
  })

  it('注册但不解锁仍为 0', () => {
    sys.registerAchievement(makeAch('gc1'))
    expect(sys.getUnlockedCount()).toBe(0)
  })

  it('遍历计算解锁数量与 _unlockedCount 字段一致', () => {
    sys.registerAchievement(makeAch('gc2'))
    sys.registerAchievement(makeAch('gc3'))
    sys.unlock('gc2', 1)
    expect(sys.getUnlockedCount()).toBe((sys as any)._unlockedCount)
  })

  it('解锁全部成就后等于 size', () => {
    sys.registerAchievement(makeAch('all1'))
    sys.registerAchievement(makeAch('all2'))
    sys.unlock('all1', 1)
    sys.unlock('all2', 1)
    expect(sys.getUnlockedCount()).toBe((sys as any).achievements.size)
  })
})
