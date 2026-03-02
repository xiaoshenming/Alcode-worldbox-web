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
