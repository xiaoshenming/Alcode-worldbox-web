import { describe, it, expect } from 'vitest'
import { QUEST_DESCRIPTIONS, BALLAD_TEMPLATES } from '../systems/QuestData'
import type { QuestType } from '../systems/QuestSystem'

describe('QuestData', () => {
  describe('QUEST_DESCRIPTIONS', () => {
    const questTypes: QuestType[] = [
      'slay_dragon',
      'explore_ruins',
      'defend_village',
      'find_artifact',
      'escort_caravan',
      'holy_pilgrimage',
    ]

    it('应包含所有6种任务类型', () => {
      for (const qt of questTypes) {
        expect(QUEST_DESCRIPTIONS[qt]).toBeDefined()
        expect(Array.isArray(QUEST_DESCRIPTIONS[qt])).toBe(true)
      }
    })

    it('每种任务类型至少有一条描述', () => {
      for (const qt of questTypes) {
        expect(QUEST_DESCRIPTIONS[qt].length).toBeGreaterThan(0)
      }
    })

    it('每条描述都是非空字符串', () => {
      for (const qt of questTypes) {
        for (const desc of QUEST_DESCRIPTIONS[qt]) {
          expect(typeof desc).toBe('string')
          expect(desc.trim().length).toBeGreaterThan(0)
        }
      }
    })

    it('slay_dragon应有3条描述', () => {
      expect(QUEST_DESCRIPTIONS.slay_dragon.length).toBe(3)
    })

    it('holy_pilgrimage应有3条描述', () => {
      expect(QUEST_DESCRIPTIONS.holy_pilgrimage.length).toBe(3)
    })
  })

  describe('BALLAD_TEMPLATES', () => {
    it('应是非空数组', () => {
      expect(Array.isArray(BALLAD_TEMPLATES)).toBe(true)
      expect(BALLAD_TEMPLATES.length).toBeGreaterThan(0)
    })

    it('每个模板应包含{name}占位符', () => {
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

    it('应有5个模板', () => {
      expect(BALLAD_TEMPLATES.length).toBe(5)
    })
  })
})
