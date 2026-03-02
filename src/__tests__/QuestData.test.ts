import { describe, it, expect, afterEach, vi } from 'vitest'
import { QUEST_DESCRIPTIONS, BALLAD_TEMPLATES } from '../systems/QuestData'
import type { QuestType } from '../systems/QuestSystem'

afterEach(() => vi.restoreAllMocks())

const ALL_QUEST_TYPES: QuestType[] = [
  'slay_dragon',
  'explore_ruins',
  'defend_village',
  'find_artifact',
  'escort_caravan',
  'holy_pilgrimage',
]

// ── QUEST_DESCRIPTIONS 基础结构 ────────────────────────────────────────────
describe('QUEST_DESCRIPTIONS 基础结构', () => {
  it('应包含所有6种任务类型', () => {
    for (const qt of ALL_QUEST_TYPES) {
      expect(QUEST_DESCRIPTIONS[qt]).toBeDefined()
      expect(Array.isArray(QUEST_DESCRIPTIONS[qt])).toBe(true)
    }
  })

  it('每种任务类型至少有一条描述', () => {
    for (const qt of ALL_QUEST_TYPES) {
      expect(QUEST_DESCRIPTIONS[qt].length).toBeGreaterThan(0)
    }
  })

  it('每条描述都是非空字符串', () => {
    for (const qt of ALL_QUEST_TYPES) {
      for (const desc of QUEST_DESCRIPTIONS[qt]) {
        expect(typeof desc).toBe('string')
        expect(desc.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('QUEST_DESCRIPTIONS 是一个普通对象（Record）', () => {
    expect(typeof QUEST_DESCRIPTIONS).toBe('object')
    expect(QUEST_DESCRIPTIONS).not.toBeNull()
    expect(Array.isArray(QUEST_DESCRIPTIONS)).toBe(false)
  })

  it('QUEST_DESCRIPTIONS 包含且仅包含6个键', () => {
    const keys = Object.keys(QUEST_DESCRIPTIONS)
    expect(keys).toHaveLength(6)
  })

  it('所有键都是合法的 QuestType 字符串', () => {
    const keys = Object.keys(QUEST_DESCRIPTIONS) as QuestType[]
    for (const k of keys) {
      expect(ALL_QUEST_TYPES).toContain(k)
    }
  })
})

// ── slay_dragon 描述 ────────────────────────────────────────────────────────
describe('QUEST_DESCRIPTIONS.slay_dragon', () => {
  it('应有3条描述', () => {
    expect(QUEST_DESCRIPTIONS.slay_dragon.length).toBe(3)
  })

  it('第一条描述提及 dragon 或 beast 相关词汇', () => {
    const descs = QUEST_DESCRIPTIONS.slay_dragon
    const hasDragonTheme = descs.some(d =>
      d.toLowerCase().includes('dragon') ||
      d.toLowerCase().includes('beast') ||
      d.toLowerCase().includes('menace') ||
      d.toLowerCase().includes('hunt')
    )
    expect(hasDragonTheme).toBe(true)
  })

  it('包含 "Hunt the dragon terrorizing the lands"', () => {
    expect(QUEST_DESCRIPTIONS.slay_dragon).toContain('Hunt the dragon terrorizing the lands')
  })

  it('包含 "Slay the beast that burns our fields"', () => {
    expect(QUEST_DESCRIPTIONS.slay_dragon).toContain('Slay the beast that burns our fields')
  })

  it('包含 "Bring down the winged menace"', () => {
    expect(QUEST_DESCRIPTIONS.slay_dragon).toContain('Bring down the winged menace')
  })

  it('所有描述都不包含换行符', () => {
    for (const d of QUEST_DESCRIPTIONS.slay_dragon) {
      expect(d).not.toMatch(/\n/)
    }
  })
})

// ── explore_ruins 描述 ──────────────────────────────────────────────────────
describe('QUEST_DESCRIPTIONS.explore_ruins', () => {
  it('应有3条描述', () => {
    expect(QUEST_DESCRIPTIONS.explore_ruins.length).toBe(3)
  })

  it('包含 "Explore the ancient ruins"', () => {
    expect(QUEST_DESCRIPTIONS.explore_ruins).toContain('Explore the ancient ruins')
  })

  it('包含 "Uncover secrets of the old world"', () => {
    expect(QUEST_DESCRIPTIONS.explore_ruins).toContain('Uncover secrets of the old world')
  })

  it('包含 "Venture into forgotten depths"', () => {
    expect(QUEST_DESCRIPTIONS.explore_ruins).toContain('Venture into forgotten depths')
  })

  it('描述主题与探索相关', () => {
    const descs = QUEST_DESCRIPTIONS.explore_ruins
    const hasExploreTheme = descs.some(d =>
      d.toLowerCase().includes('explore') ||
      d.toLowerCase().includes('venture') ||
      d.toLowerCase().includes('uncover')
    )
    expect(hasExploreTheme).toBe(true)
  })
})

// ── defend_village 描述 ─────────────────────────────────────────────────────
describe('QUEST_DESCRIPTIONS.defend_village', () => {
  it('应有3条描述', () => {
    expect(QUEST_DESCRIPTIONS.defend_village.length).toBe(3)
  })

  it('包含 "Defend the village from raiders"', () => {
    expect(QUEST_DESCRIPTIONS.defend_village).toContain('Defend the village from raiders')
  })

  it('包含 "Protect our people from harm"', () => {
    expect(QUEST_DESCRIPTIONS.defend_village).toContain('Protect our people from harm')
  })

  it('包含 "Stand guard against the enemy"', () => {
    expect(QUEST_DESCRIPTIONS.defend_village).toContain('Stand guard against the enemy')
  })

  it('所有描述都是英文字符串', () => {
    for (const d of QUEST_DESCRIPTIONS.defend_village) {
      expect(d).toMatch(/^[A-Za-z\s,.'!]+$/)
    }
  })
})

// ── find_artifact 描述 ──────────────────────────────────────────────────────
describe('QUEST_DESCRIPTIONS.find_artifact', () => {
  it('应有3条描述', () => {
    expect(QUEST_DESCRIPTIONS.find_artifact.length).toBe(3)
  })

  it('包含 "Seek a lost relic of power"', () => {
    expect(QUEST_DESCRIPTIONS.find_artifact).toContain('Seek a lost relic of power')
  })

  it('包含 "Recover the ancient treasure"', () => {
    expect(QUEST_DESCRIPTIONS.find_artifact).toContain('Recover the ancient treasure')
  })

  it('包含 "Find the legendary artifact"', () => {
    expect(QUEST_DESCRIPTIONS.find_artifact).toContain('Find the legendary artifact')
  })

  it('每条描述长度在5~60字符之间', () => {
    for (const d of QUEST_DESCRIPTIONS.find_artifact) {
      expect(d.length).toBeGreaterThan(5)
      expect(d.length).toBeLessThan(60)
    }
  })
})

// ── escort_caravan 描述 ─────────────────────────────────────────────────────
describe('QUEST_DESCRIPTIONS.escort_caravan', () => {
  it('应有3条描述', () => {
    expect(QUEST_DESCRIPTIONS.escort_caravan.length).toBe(3)
  })

  it('包含 "Escort the trade caravan safely"', () => {
    expect(QUEST_DESCRIPTIONS.escort_caravan).toContain('Escort the trade caravan safely')
  })

  it('包含 "Guard the merchants on their journey"', () => {
    expect(QUEST_DESCRIPTIONS.escort_caravan).toContain('Guard the merchants on their journey')
  })

  it('包含 "Protect the supply convoy"', () => {
    expect(QUEST_DESCRIPTIONS.escort_caravan).toContain('Protect the supply convoy')
  })

  it('所有描述都不为纯空格', () => {
    for (const d of QUEST_DESCRIPTIONS.escort_caravan) {
      expect(d.trim()).not.toBe('')
    }
  })
})

// ── holy_pilgrimage 描述 ────────────────────────────────────────────────────
describe('QUEST_DESCRIPTIONS.holy_pilgrimage', () => {
  it('应有3条描述', () => {
    expect(QUEST_DESCRIPTIONS.holy_pilgrimage.length).toBe(3)
  })

  it('包含 "Undertake a sacred pilgrimage"', () => {
    expect(QUEST_DESCRIPTIONS.holy_pilgrimage).toContain('Undertake a sacred pilgrimage')
  })

  it('包含 "Journey to the holy site"', () => {
    expect(QUEST_DESCRIPTIONS.holy_pilgrimage).toContain('Journey to the holy site')
  })

  it('包含 "Complete the spiritual quest"', () => {
    expect(QUEST_DESCRIPTIONS.holy_pilgrimage).toContain('Complete the spiritual quest')
  })

  it('宗教主题词汇（holy/sacred/spiritual/pilgrimage）至少出现一次', () => {
    const descs = QUEST_DESCRIPTIONS.holy_pilgrimage
    const hasReligionTheme = descs.some(d =>
      d.toLowerCase().includes('holy') ||
      d.toLowerCase().includes('sacred') ||
      d.toLowerCase().includes('spiritual') ||
      d.toLowerCase().includes('pilgrimage')
    )
    expect(hasReligionTheme).toBe(true)
  })
})

// ── QUEST_DESCRIPTIONS 总量与一致性 ───────────────────────────────────────
describe('QUEST_DESCRIPTIONS 总量与一致性', () => {
  it('所有任务类型各有3条描述（共18条）', () => {
    let total = 0
    for (const qt of ALL_QUEST_TYPES) {
      total += QUEST_DESCRIPTIONS[qt].length
    }
    expect(total).toBe(18)
  })

  it('不同任务类型的描述互不重复', () => {
    const allDescs: string[] = []
    for (const qt of ALL_QUEST_TYPES) {
      allDescs.push(...QUEST_DESCRIPTIONS[qt])
    }
    const unique = new Set(allDescs)
    expect(unique.size).toBe(allDescs.length)
  })

  it('同一任务类型内描述互不重复', () => {
    for (const qt of ALL_QUEST_TYPES) {
      const descs = QUEST_DESCRIPTIONS[qt]
      const unique = new Set(descs)
      expect(unique.size).toBe(descs.length)
    }
  })

  it('所有描述首字母大写', () => {
    for (const qt of ALL_QUEST_TYPES) {
      for (const d of QUEST_DESCRIPTIONS[qt]) {
        const firstChar = d.charAt(0)
        expect(firstChar).toBe(firstChar.toUpperCase())
      }
    }
  })
})

// ── BALLAD_TEMPLATES 基础结构 ──────────────────────────────────────────────
describe('BALLAD_TEMPLATES 基础结构', () => {
  it('应是非空数组', () => {
    expect(Array.isArray(BALLAD_TEMPLATES)).toBe(true)
    expect(BALLAD_TEMPLATES.length).toBeGreaterThan(0)
  })

  it('应有5个模板', () => {
    expect(BALLAD_TEMPLATES.length).toBe(5)
  })

  it('每个模板应包含 {name} 占位符', () => {
    for (const template of BALLAD_TEMPLATES) {
      expect(template).toContain('{name}')
    }
  })

  it('每个模板都是非空字符串', () => {
    for (const template of BALLAD_TEMPLATES) {
      expect(typeof template).toBe('string')
      expect(template.trim().length).toBeGreaterThan(0)
    }
  })
})

// ── BALLAD_TEMPLATES 内容验证 ──────────────────────────────────────────────
describe('BALLAD_TEMPLATES 内容验证', () => {
  it('包含 "{name} the {title}, slayer of beasts"', () => {
    expect(BALLAD_TEMPLATES).toContain('{name} the {title}, slayer of beasts')
  })

  it('包含 "The ballad of {name}, hero of {civ}"', () => {
    expect(BALLAD_TEMPLATES).toContain('The ballad of {name}, hero of {civ}')
  })

  it('包含 "{name} who walked through fire and shadow"', () => {
    expect(BALLAD_TEMPLATES).toContain('{name} who walked through fire and shadow')
  })

  it('包含 "Songs of {name} the Undaunted"', () => {
    expect(BALLAD_TEMPLATES).toContain('Songs of {name} the Undaunted')
  })

  it('包含 "The legend of {name}, champion of {civ}"', () => {
    expect(BALLAD_TEMPLATES).toContain('The legend of {name}, champion of {civ}')
  })

  it('至少有2个模板包含 {civ} 占位符', () => {
    const withCiv = BALLAD_TEMPLATES.filter(t => t.includes('{civ}'))
    expect(withCiv.length).toBeGreaterThanOrEqual(2)
  })

  it('至少有1个模板包含 {title} 占位符', () => {
    const withTitle = BALLAD_TEMPLATES.filter(t => t.includes('{title}'))
    expect(withTitle.length).toBeGreaterThanOrEqual(1)
  })

  it('所有模板都不包含换行符', () => {
    for (const template of BALLAD_TEMPLATES) {
      expect(template).not.toMatch(/\n/)
    }
  })

  it('模板替换 {name} 后字符串有意义', () => {
    for (const template of BALLAD_TEMPLATES) {
      const replaced = template.replace('{name}', 'Arthas')
      expect(replaced).toContain('Arthas')
      expect(replaced).not.toContain('{name}')
    }
  })

  it('所有模板互不重复', () => {
    const unique = new Set(BALLAD_TEMPLATES)
    expect(unique.size).toBe(BALLAD_TEMPLATES.length)
  })

  it('每个模板长度在10~80字符之间', () => {
    for (const template of BALLAD_TEMPLATES) {
      expect(template.length).toBeGreaterThan(10)
      expect(template.length).toBeLessThan(80)
    }
  })

  it('模板首字母大写', () => {
    for (const template of BALLAD_TEMPLATES) {
      const firstChar = template.charAt(0)
      expect(firstChar).toBe(firstChar.toUpperCase())
    }
  })
})
