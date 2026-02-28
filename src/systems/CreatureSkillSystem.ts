/**
 * CreatureSkillSystem - 生物技能树系统 (v1.94)
 *
 * 生物通过行为获得经验值，升级后解锁技能。
 * 技能分支：战斗、采集、建造、魔法、领导。
 * 按 Shift+K 打开选中生物的技能面板。
 */

/** 技能分支 */
type SkillBranch = 'combat' | 'gather' | 'build' | 'magic' | 'leader'

/** 单个技能定义 */
interface SkillDef {
  id: string
  name: string
  branch: SkillBranch
  icon: string
  /** 解锁所需等级 */
  levelReq: number
  /** 前置技能 ID */
  prereq: string | null
  desc: string
  /** Pre-computed "Lv.N desc" display string — computed at module init */
  levelDescStr?: string
}

/** 生物技能数据 */
interface CreatureSkillData {
  xp: number
  level: number
  /** 已解锁技能 ID 集合 */
  skills: Set<string>
  /** 各分支经验 */
  branchXP: Record<SkillBranch, number>
  /** pre-computed XP display string — rebuilt after addXP */
  xpStr: string
}

/** 经验值表 */
const XP_PER_LEVEL = 100
const MAX_LEVEL = 20
const BRANCHES: SkillBranch[] = ['combat', 'gather', 'build', 'magic', 'leader']

const BRANCH_LABELS: Record<SkillBranch, string> = {
  combat: '战斗', gather: '采集', build: '建造', magic: '魔法', leader: '领导',
}
const BRANCH_COLORS: Record<SkillBranch, string> = {
  combat: '#ff5544', gather: '#44cc44', build: '#cc9944', magic: '#8844ff', leader: '#44aaff',
}
const BRANCH_ICONS: Record<SkillBranch, string> = {
  combat: '\u{2694}\u{FE0F}', gather: '\u{1F33E}', build: '\u{1F3D7}\u{FE0F}', magic: '\u{2728}', leader: '\u{1F451}',
}

/** Pre-computed branch tab label strings — avoids per-frame template literal in render loop */
const BRANCH_TAB_LABELS: Record<SkillBranch, string> = {
  combat: `${BRANCH_ICONS.combat} ${BRANCH_LABELS.combat}`,
  gather: `${BRANCH_ICONS.gather} ${BRANCH_LABELS.gather}`,
  build: `${BRANCH_ICONS.build} ${BRANCH_LABELS.build}`,
  magic: `${BRANCH_ICONS.magic} ${BRANCH_LABELS.magic}`,
  leader: `${BRANCH_ICONS.leader} ${BRANCH_LABELS.leader}`,
}
/** Pre-computed tab bg colors (color + '44') and node bg colors (color + '33') */
const BRANCH_TAB_BG: Record<SkillBranch, string> = {
  combat: BRANCH_COLORS.combat + '44', gather: BRANCH_COLORS.gather + '44',
  build: BRANCH_COLORS.build + '44', magic: BRANCH_COLORS.magic + '44', leader: BRANCH_COLORS.leader + '44',
}
const BRANCH_NODE_BG: Record<SkillBranch, string> = {
  combat: BRANCH_COLORS.combat + '33', gather: BRANCH_COLORS.gather + '33',
  build: BRANCH_COLORS.build + '33', magic: BRANCH_COLORS.magic + '33', leader: BRANCH_COLORS.leader + '33',
}

/** 技能定义表 */
const SKILL_DEFS: SkillDef[] = [
  // 战斗
  { id: 'c_str', name: '力量强化', branch: 'combat', icon: '\u{1F4AA}', levelReq: 2, prereq: null, desc: '攻击力+20%' },
  { id: 'c_def', name: '铁壁', branch: 'combat', icon: '\u{1F6E1}\u{FE0F}', levelReq: 4, prereq: 'c_str', desc: '防御力+25%' },
  { id: 'c_crit', name: '致命一击', branch: 'combat', icon: '\u{1F5E1}\u{FE0F}', levelReq: 7, prereq: 'c_def', desc: '15%暴击率' },
  { id: 'c_fury', name: '狂暴', branch: 'combat', icon: '\u{1F525}', levelReq: 10, prereq: 'c_crit', desc: '低血量时攻速翻倍' },
  // 采集
  { id: 'g_speed', name: '快速采集', branch: 'gather', icon: '\u{26CF}\u{FE0F}', levelReq: 2, prereq: null, desc: '采集速度+30%' },
  { id: 'g_yield', name: '丰收', branch: 'gather', icon: '\u{1F34E}', levelReq: 5, prereq: 'g_speed', desc: '采集产量+50%' },
  { id: 'g_range', name: '远程感知', branch: 'gather', icon: '\u{1F440}', levelReq: 8, prereq: 'g_yield', desc: '资源探测范围+3' },
  // 建造
  { id: 'b_fast', name: '快速建造', branch: 'build', icon: '\u{1F528}', levelReq: 3, prereq: null, desc: '建造速度+40%' },
  { id: 'b_durable', name: '坚固建筑', branch: 'build', icon: '\u{1F3F0}', levelReq: 6, prereq: 'b_fast', desc: '建筑耐久+50%' },
  { id: 'b_master', name: '大师工匠', branch: 'build', icon: '\u{1F3DB}\u{FE0F}', levelReq: 10, prereq: 'b_durable', desc: '可建造高级建筑' },
  // 魔法
  { id: 'm_spark', name: '火花', branch: 'magic', icon: '\u{1F4A5}', levelReq: 3, prereq: null, desc: '远程火焰攻击' },
  { id: 'm_heal', name: '治愈', branch: 'magic', icon: '\u{1F49A}', levelReq: 6, prereq: 'm_spark', desc: '治愈周围盟友' },
  { id: 'm_shield', name: '魔法护盾', branch: 'magic', icon: '\u{1F48E}', levelReq: 9, prereq: 'm_heal', desc: '短时间无敌' },
  // 领导
  { id: 'l_inspire', name: '鼓舞', branch: 'leader', icon: '\u{1F4E3}', levelReq: 4, prereq: null, desc: '周围盟友攻击+10%' },
  { id: 'l_rally', name: '集结', branch: 'leader', icon: '\u{1F3F3}\u{FE0F}', levelReq: 8, prereq: 'l_inspire', desc: '召集附近盟友' },
  { id: 'l_king', name: '王者之气', branch: 'leader', icon: '\u{1F451}', levelReq: 12, prereq: 'l_rally', desc: '成为文明领袖' },
]

const SKILL_MAP = new Map<string, SkillDef>()
for (const s of SKILL_DEFS) { SKILL_MAP.set(s.id, s); s.levelDescStr = `Lv.${s.levelReq} ${s.desc}` }

const PANEL_W = 460, PANEL_H = 420, HEADER_H = 36, TAB_H = 30

export class CreatureSkillSystem {
  private data = new Map<number, CreatureSkillData>()
  private visible = false
  private selectedEntity = -1
  private activeBranch: SkillBranch = 'combat'
  private panelX = 80
  private panelY = 50
  private dragging = false
  private dragOX = 0
  private dragOY = 0
  private _lastBranch: SkillBranch = '' as SkillBranch
  private _branchSkillCache: SkillDef[] = []
  /** Pre-computed panel header — rebuilt when entity or level changes */
  private _prevSkillEid = -2
  private _prevSkillLvl = -1
  private _skillHeaderStr = '⭐ 技能树 (Lv.0)'

  /* ── 公共 API ── */

  /** 给生物增加经验 */
  addXP(entityId: number, amount: number, branch: SkillBranch): void {
    const d = this.getOrCreate(entityId)
    d.xp += amount
    d.branchXP[branch] += amount
    // 升级检查
    while (d.level < MAX_LEVEL && d.xp >= (d.level + 1) * XP_PER_LEVEL) {
      d.xp -= (d.level + 1) * XP_PER_LEVEL
      d.level++
      this.autoUnlock(d)
    }
    d.xpStr = d.level >= MAX_LEVEL ? 'XP: MAX' : `XP: ${Math.round(d.xp)}/${(d.level + 1) * XP_PER_LEVEL}`
  }

  /** 检查生物是否拥有某技能 */
  hasSkill(entityId: number, skillId: string): boolean {
    return this.data.get(entityId)?.skills.has(skillId) ?? false
  }

  /** 获取生物等级 */
  getLevel(entityId: number): number {
    return this.data.get(entityId)?.level ?? 0
  }

  /** 获取生物技能数据 */
  getSkillData(entityId: number): CreatureSkillData | undefined {
    return this.data.get(entityId)
  }

  /** 清除已死亡实体 */
  removeEntity(entityId: number): void {
    this.data.delete(entityId)
  }

  setSelectedEntity(id: number): void { this.selectedEntity = id }

  /* ── 更新 ── */

  update(): void {
    // 技能系统主要是被动的，由外部事件触发 addXP
  }

  /* ── 输入 ── */

  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.shiftKey && e.key.toUpperCase() === 'K') {
      this.visible = !this.visible
      return true
    }
    return false
  }

  handleMouseDown(mx: number, my: number): boolean {
    if (!this.visible) return false
    const px = this.panelX, py = this.panelY
    // 标题栏拖拽
    if (mx >= px && mx <= px + PANEL_W && my >= py && my <= py + HEADER_H) {
      this.dragging = true
      this.dragOX = mx - px
      this.dragOY = my - py
      return true
    }
    // 分支标签切换
    if (my >= py + HEADER_H && my <= py + HEADER_H + TAB_H) {
      const tabW = PANEL_W / BRANCHES.length
      for (let i = 0; i < BRANCHES.length; i++) {
        if (mx >= px + i * tabW && mx < px + (i + 1) * tabW) {
          this.activeBranch = BRANCHES[i]
          return true
        }
      }
    }
    // 技能点击解锁
    if (mx >= px && mx <= px + PANEL_W && my >= py + HEADER_H + TAB_H && my <= py + PANEL_H) {
      this.handleSkillClick(mx, my)
      return true
    }
    return false
  }

  handleMouseMove(mx: number, my: number): boolean {
    if (this.dragging) { this.panelX = mx - this.dragOX; this.panelY = my - this.dragOY; return true }
    return false
  }

  handleMouseUp(): boolean {
    if (this.dragging) { this.dragging = false; return true }
    return false
  }

  /* ── 渲染 ── */

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const d = this.data.get(this.selectedEntity)
    const px = this.panelX, py = this.panelY

    // 背景
    ctx.fillStyle = 'rgba(12,12,22,0.93)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, PANEL_H, 8); ctx.fill()

    // 标题
    ctx.fillStyle = 'rgba(50,50,80,0.9)'
    ctx.beginPath(); ctx.roundRect(px, py, PANEL_W, HEADER_H, [8, 8, 0, 0]); ctx.fill()
    ctx.fillStyle = '#e0e0ff'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    const lvl = d ? d.level : 0
    if (this.selectedEntity !== this._prevSkillEid || lvl !== this._prevSkillLvl) { this._prevSkillEid = this.selectedEntity; this._prevSkillLvl = lvl; this._skillHeaderStr = `\u{2B50} 技能树 (Lv.${lvl})` }
    ctx.fillText(this._skillHeaderStr, px + 12, py + 24)

    if (!d) {
      ctx.fillStyle = '#888'; ctx.font = '13px monospace'; ctx.textAlign = 'center'
      ctx.fillText('未选中生物', px + PANEL_W / 2, py + PANEL_H / 2)
      ctx.textAlign = 'left'; return
    }

    // XP 条
    const xpForNext = (d.level + 1) * XP_PER_LEVEL
    const xpPct = d.level >= MAX_LEVEL ? 1 : d.xp / xpForNext
    ctx.fillStyle = 'rgba(40,40,60,0.6)'
    ctx.fillRect(px + 200, py + 10, 240, 14)
    ctx.fillStyle = '#ffcc44'
    ctx.fillRect(px + 200, py + 10, 240 * xpPct, 14)
    ctx.fillStyle = '#fff'; ctx.font = '10px monospace'
    ctx.fillText(d.xpStr, px + 205, py + 22)

    // 分支标签
    const tabW = PANEL_W / BRANCHES.length
    for (let i = 0; i < BRANCHES.length; i++) {
      const b = BRANCHES[i]
      const tx = px + i * tabW
      ctx.fillStyle = b === this.activeBranch ? BRANCH_TAB_BG[b] : 'rgba(30,30,50,0.5)'
      ctx.fillRect(tx, py + HEADER_H, tabW, TAB_H)
      ctx.fillStyle = b === this.activeBranch ? BRANCH_COLORS[b] : '#888'
      ctx.font = '12px monospace'; ctx.textAlign = 'center'
      ctx.fillText(BRANCH_TAB_LABELS[b], tx + tabW / 2, py + HEADER_H + 20)
    }

    // 技能节点
    if (this.activeBranch !== this._lastBranch) {
      this._lastBranch = this.activeBranch
      this._branchSkillCache = SKILL_DEFS.filter(s => s.branch === this.activeBranch)
    }
    const branchSkills = this._branchSkillCache
    const startY = py + HEADER_H + TAB_H + 20
    const nodeW = 120, nodeH = 70, gapY = 16
    ctx.textAlign = 'center'

    for (let i = 0; i < branchSkills.length; i++) {
      const sk = branchSkills[i]
      const nx = px + PANEL_W / 2 - nodeW / 2
      const ny = startY + i * (nodeH + gapY)

      const unlocked = d.skills.has(sk.id)
      const canUnlock = !unlocked && d.level >= sk.levelReq && (sk.prereq === null || d.skills.has(sk.prereq))

      // 连线
      if (i > 0) {
        ctx.strokeStyle = unlocked ? BRANCH_COLORS[this.activeBranch] : '#444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(px + PANEL_W / 2, ny - gapY)
        ctx.lineTo(px + PANEL_W / 2, ny)
        ctx.stroke()
      }

      // 节点背景
      ctx.fillStyle = unlocked ? BRANCH_NODE_BG[this.activeBranch] : canUnlock ? 'rgba(60,60,80,0.5)' : 'rgba(30,30,40,0.4)'
      ctx.strokeStyle = unlocked ? BRANCH_COLORS[this.activeBranch] : canUnlock ? '#888' : '#444'
      ctx.lineWidth = unlocked ? 2 : 1
      ctx.beginPath(); ctx.roundRect(nx, ny, nodeW, nodeH, 6); ctx.fill(); ctx.stroke()

      // 图标 + 名称
      ctx.font = '18px sans-serif'
      ctx.fillText(sk.icon, px + PANEL_W / 2, ny + 22)
      ctx.fillStyle = unlocked ? '#fff' : canUnlock ? '#ccc' : '#666'
      ctx.font = 'bold 11px monospace'
      ctx.fillText(sk.name, px + PANEL_W / 2, ny + 42)
      ctx.fillStyle = '#999'; ctx.font = '10px monospace'
      ctx.fillText(sk.levelDescStr ?? `Lv.${sk.levelReq} ${sk.desc}`, px + PANEL_W / 2, ny + 58)
    }

    ctx.textAlign = 'left'
  }

  /* ── 内部 ── */

  private getOrCreate(entityId: number): CreatureSkillData {
    let d = this.data.get(entityId)
    if (!d) {
      d = { xp: 0, level: 0, skills: new Set(), branchXP: { combat: 0, gather: 0, build: 0, magic: 0, leader: 0 }, xpStr: `XP: 0/${XP_PER_LEVEL}` }
      this.data.set(entityId, d)
    }
    return d
  }

  private autoUnlock(d: CreatureSkillData): void {
    // 自动解锁满足条件的技能
    for (const sk of SKILL_DEFS) {
      if (d.skills.has(sk.id)) continue
      if (d.level >= sk.levelReq && (sk.prereq === null || d.skills.has(sk.prereq))) {
        // 只自动解锁第一层技能
        if (sk.prereq === null) d.skills.add(sk.id)
      }
    }
  }

  private handleSkillClick(mx: number, my: number): void {
    const d = this.data.get(this.selectedEntity)
    if (!d) return
    const branchSkills = this._branchSkillCache.length > 0 && this._lastBranch === this.activeBranch
      ? this._branchSkillCache
      : SKILL_DEFS.filter(s => s.branch === this.activeBranch)
    const startY = this.panelY + HEADER_H + TAB_H + 20
    const nodeW = 120, nodeH = 70, gapY = 16
    const nx = this.panelX + PANEL_W / 2 - nodeW / 2

    for (let i = 0; i < branchSkills.length; i++) {
      const ny = startY + i * (nodeH + gapY)
      if (mx >= nx && mx <= nx + nodeW && my >= ny && my <= ny + nodeH) {
        const sk = branchSkills[i]
        if (!d.skills.has(sk.id) && d.level >= sk.levelReq && (sk.prereq === null || d.skills.has(sk.prereq))) {
          d.skills.add(sk.id)
        }
        break
      }
    }
  }
}
