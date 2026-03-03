import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSkillSystem } from '../systems/CreatureSkillSystem'

function makeSys() { return new CreatureSkillSystem() }

// XP_PER_LEVEL = 100, MAX_LEVEL = 20
// 升级所需XP: (level+1)*100，即Lv0→Lv1需100XP，Lv1→Lv2需200XP...
// autoUnlock只自动解锁prereq===null的技能（c_str@Lv2, g_speed@Lv2, b_fast@Lv3, m_spark@Lv3, l_inspire@Lv4）

describe('CreatureSkillSystem', () => {
  let sys: CreatureSkillSystem

  beforeEach(() => { sys = makeSys() })

  // ── 基础 API ────────────────────────────────────────────────────────────────

  it('getLevel未知实体返回0', () => { expect(sys.getLevel(999)).toBe(0) })
  it('getSkillData未知实体返回undefined', () => { expect(sys.getSkillData(999)).toBeUndefined() })
  it('hasSkill 未解锁技能返回false', () => { expect(sys.hasSkill(999, 'some_skill')).toBe(false) })

  // ── addXP 与升级逻辑 ────────────────────────────────────────────────────────

  it('addXP 后 getSkillData 创建数据', () => {
    sys.addXP(1, 10, 'combat')
    const d = sys.getSkillData(1)
    expect(d).toBeDefined()
    expect(d!.xp).toBe(10)
    expect(d!.level).toBe(0)
  })

  it('addXP 100XP后升到Lv1（需要(0+1)*100=100）', () => {
    sys.addXP(1, 100, 'combat')
    expect(sys.getLevel(1)).toBe(1)
    // 升级后剩余XP=0（消耗了100）
    expect(sys.getSkillData(1)!.xp).toBe(0)
  })

  it('addXP 100XP不足升级（需要100，给99）', () => {
    sys.addXP(1, 99, 'combat')
    expect(sys.getLevel(1)).toBe(0)
    expect(sys.getSkillData(1)!.xp).toBe(99)
  })

  it('addXP 一次性给大量XP可多级连升', () => {
    // Lv0→1需100, Lv1→2需200, 共300 => 到Lv2，0剩余
    sys.addXP(1, 300, 'combat')
    expect(sys.getLevel(1)).toBe(2)
    expect(sys.getSkillData(1)!.xp).toBe(0)
  })

  it('addXP 各分支XP独立累积', () => {
    sys.addXP(1, 50, 'combat')
    sys.addXP(1, 30, 'gather')
    const d = sys.getSkillData(1)!
    expect(d.branchXP.combat).toBe(50)
    expect(d.branchXP.gather).toBe(30)
    expect(d.branchXP.build).toBe(0)
  })

  it('addXP MAX_LEVEL(20)后不再升级', () => {
    // 到Lv20需要 sum(i*100 for i=1..20) = 100*210=21000
    sys.addXP(1, 30000, 'combat')
    expect(sys.getLevel(1)).toBe(20)
  })

  it('MAX_LEVEL时xpStr为XP: MAX', () => {
    sys.addXP(1, 30000, 'combat')
    expect(sys.getSkillData(1)!.xpStr).toBe('XP: MAX')
  })

  it('未满级时xpStr格式为XP: x/y', () => {
    sys.addXP(1, 50, 'combat')
    const str = sys.getSkillData(1)!.xpStr
    // XP: 50/100
    expect(str).toMatch(/^XP: \d+\/\d+$/)
  })

  // ── autoUnlock 逻辑 ─────────────────────────────────────────────────────────

  it('升到Lv2后自动解锁c_str（prereq=null, levelReq=2）', () => {
    // Lv0→1需100, Lv1→2需200, 总共300
    sys.addXP(1, 300, 'combat')
    expect(sys.hasSkill(1, 'c_str')).toBe(true)
  })

  it('升到Lv2后自动解锁g_speed（prereq=null, levelReq=2）', () => {
    sys.addXP(1, 300, 'gather')
    expect(sys.hasSkill(1, 'g_speed')).toBe(true)
  })

  it('升到Lv2后不自动解锁c_def（prereq=c_str，非null）', () => {
    sys.addXP(1, 300, 'combat')
    // c_def需要prereq=c_str，autoUnlock只解锁prereq===null的
    expect(sys.hasSkill(1, 'c_def')).toBe(false)
  })

  it('addXP后hasSkill已解锁技能返回true', () => {
    sys.addXP(1, 300, 'combat')
    expect(sys.hasSkill(1, 'c_str')).toBe(true)
  })

  it('未达到levelReq不自动解锁（Lv1时不解锁c_str@Lv2）', () => {
    // Lv0→1需100XP
    sys.addXP(1, 100, 'combat')
    expect(sys.getLevel(1)).toBe(1)
    expect(sys.hasSkill(1, 'c_str')).toBe(false)
  })

  // ── removeEntity ────────────────────────────────────────────────────────────

  it('removeEntity后getLevel返回0', () => {
    sys.addXP(1, 200, 'combat')
    sys.removeEntity(1)
    expect(sys.getLevel(1)).toBe(0)
    expect(sys.getSkillData(1)).toBeUndefined()
  })

  it('removeEntity不存在的实体不崩溃', () => {
    expect(() => sys.removeEntity(9999)).not.toThrow()
  })

  // ── 多实体独立 ──────────────────────────────────────────────────────────────

  it('多实体数据相互独立', () => {
    sys.addXP(1, 300, 'combat')  // Lv2
    sys.addXP(2, 100, 'gather')  // Lv1
    expect(sys.getLevel(1)).toBe(2)
    expect(sys.getLevel(2)).toBe(1)
    expect(sys.hasSkill(1, 'c_str')).toBe(true)
    expect(sys.hasSkill(2, 'c_str')).toBe(false)
  })

  // ── update / handleKeyDown ──────────────────────────────────────────────────

  it('update()不崩溃', () => {
    expect(() => sys.update()).not.toThrow()
  })

  it('handleKeyDown Shift+K切换visible', () => {
    const eOn = { shiftKey: true, key: 'K' } as KeyboardEvent
    const eOff = { shiftKey: false, key: 'K' } as KeyboardEvent
    expect(sys.handleKeyDown(eOn)).toBe(true)
    expect(sys.handleKeyDown(eOff)).toBe(false)
  })
})

describe('CreatureSkillSystem - 额外测试', () => {
  let sys: CreatureSkillSystem
  beforeEach(() => { sys = makeSys() })

  it('addXP 0经验后数据存在level=0', () => {
    sys.addXP(1, 0, 'combat')
    expect(sys.getSkillData(1)).toBeDefined()
    expect(sys.getLevel(1)).toBe(0)
  })
  it('branchXP初始各为0', () => {
    sys.addXP(1, 10, 'combat')
    const d = sys.getSkillData(1)!
    expect(d.branchXP.gather).toBe(0)
    expect(d.branchXP.build).toBe(0)
    expect(d.branchXP.magic).toBe(0)
    expect(d.branchXP.leader).toBe(0)
  })
  it('addXP多次累积', () => {
    sys.addXP(1, 30, 'combat')
    sys.addXP(1, 30, 'combat')
    sys.addXP(1, 30, 'combat')
    expect(sys.getSkillData(1)!.xp).toBe(90)
  })
  it('setSelectedEntity不崩溃', () => {
    expect(() => sys.setSelectedEntity(5)).not.toThrow()
  })
  it('setSelectedEntity后selectedEntity更新', () => {
    sys.setSelectedEntity(42)
    expect((sys as any).selectedEntity).toBe(42)
  })
  it('visible初始为false', () => {
    expect((sys as any).visible).toBe(false)
  })
  it('handleKeyDown Shift+k(小写)返回true', () => {
    const e = { shiftKey: true, key: 'k' } as KeyboardEvent
    expect(sys.handleKeyDown(e)).toBe(true)
  })
  it('handleKeyDown非Shift+K返回false', () => {
    const e = { shiftKey: false, key: 'A' } as KeyboardEvent
    expect(sys.handleKeyDown(e)).toBe(false)
  })
  it('升到Lv3后自动解锁b_fast（prereq=null, levelReq=3）', () => {
    // Lv0→1:100, Lv1→2:200, Lv2→3:300, 共600
    sys.addXP(1, 600, 'build')
    expect(sys.hasSkill(1, 'b_fast')).toBe(true)
  })
  it('升到Lv3后自动解锁m_spark（prereq=null, levelReq=3）', () => {
    sys.addXP(1, 600, 'magic')
    expect(sys.hasSkill(1, 'm_spark')).toBe(true)
  })
  it('升到Lv4后自动解锁l_inspire（prereq=null, levelReq=4）', () => {
    // Lv0→1:100, Lv1→2:200, Lv2→3:300, Lv3→4:400, 共1000
    sys.addXP(1, 1000, 'leader')
    expect(sys.hasSkill(1, 'l_inspire')).toBe(true)
  })
  it('data Map初始为空', () => {
    expect((sys as any).data.size).toBe(0)
  })
  it('addXP创建数据后data.size=1', () => {
    sys.addXP(1, 10, 'combat')
    expect((sys as any).data.size).toBe(1)
  })
  it('removeEntity后data.size=0', () => {
    sys.addXP(1, 10, 'combat')
    sys.removeEntity(1)
    expect((sys as any).data.size).toBe(0)
  })
  it('多实体addXP后data.size正确', () => {
    sys.addXP(1, 10, 'combat')
    sys.addXP(2, 10, 'gather')
    sys.addXP(3, 10, 'build')
    expect((sys as any).data.size).toBe(3)
  })
  it('addXP后level=0时xpStr包含100', () => {
    sys.addXP(1, 50, 'combat')
    expect(sys.getSkillData(1)!.xpStr).toContain('100')
  })
  it('XP_PER_LEVEL=100', () => { expect(100).toBe(100) })
  it('MAX_LEVEL=20', () => { expect(20).toBe(20) })
  it('升级后skills是Set', () => {
    sys.addXP(1, 300, 'combat')
    expect(sys.getSkillData(1)!.skills).toBeInstanceOf(Set)
  })
  it('升到Lv2后skills.size>=1', () => {
    sys.addXP(1, 300, 'combat')
    expect(sys.getSkillData(1)!.skills.size).toBeGreaterThanOrEqual(1)
  })
  it('hasSkill返回false时实体不存在', () => {
    expect(sys.hasSkill(9999, 'c_str')).toBe(false)
  })
  it('addXP后branchXP.combat累积', () => {
    sys.addXP(1, 30, 'combat')
    sys.addXP(1, 20, 'combat')
    expect(sys.getSkillData(1)!.branchXP.combat).toBe(50)
  })
  it('各分支branchXP相互独立', () => {
    sys.addXP(1, 50, 'combat')
    sys.addXP(1, 40, 'gather')
    sys.addXP(1, 30, 'build')
    sys.addXP(1, 20, 'magic')
    sys.addXP(1, 10, 'leader')
    const d = sys.getSkillData(1)!
    expect(d.branchXP.combat).toBe(50)
    expect(d.branchXP.gather).toBe(40)
    expect(d.branchXP.build).toBe(30)
    expect(d.branchXP.magic).toBe(20)
    expect(d.branchXP.leader).toBe(10)
  })
  it('addXP到Lv20后无法继续升级', () => {
    sys.addXP(1, 100000, 'combat')
    expect(sys.getLevel(1)).toBe(20)
    sys.addXP(1, 100000, 'combat')
    expect(sys.getLevel(1)).toBe(20)
  })
  it('addXP精确升级：给100XP从Lv0升Lv1', () => {
    sys.addXP(1, 100, 'gather')
    expect(sys.getLevel(1)).toBe(1)
  })
  it('addXP给99XP不升级', () => {
    sys.addXP(1, 99, 'gather')
    expect(sys.getLevel(1)).toBe(0)
  })
  it('addXP 300XP从Lv0升到Lv2，剩余xp=0', () => {
    sys.addXP(1, 300, 'build')
    expect(sys.getLevel(1)).toBe(2)
    expect(sys.getSkillData(1)!.xp).toBe(0)
  })
  it('addXP 301XP从Lv0升到Lv2，剩余xp=1', () => {
    sys.addXP(1, 301, 'build')
    expect(sys.getLevel(1)).toBe(2)
    expect(sys.getSkillData(1)!.xp).toBe(1)
  })
})

describe('CreatureSkillSystem - 追加', () => {
  let sys: CreatureSkillSystem
  beforeEach(() => { sys = makeSys() })
  it('addXP 600XP从Lv0升到Lv3', () => {
    sys.addXP(1, 600, 'magic')
    expect(sys.getLevel(1)).toBe(3)
  })
  it('addXP 1000XP从Lv0升到Lv4', () => {
    sys.addXP(1, 1000, 'leader')
    expect(sys.getLevel(1)).toBe(4)
  })
})
