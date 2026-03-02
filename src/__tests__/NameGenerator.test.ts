import { describe, it, expect, afterEach, vi } from 'vitest'
import { generateName } from '../utils/NameGenerator'

// 各种族合法前缀/后缀（与源码保持一致）
const HUMAN_PREFIXES = ['Al', 'Bran', 'Cor', 'Dar', 'Ed', 'Fen', 'Gar', 'Hal', 'Ira', 'Jon', 'Kel', 'Lor', 'Mar', 'Nor', 'Os']
const HUMAN_SUFFIXES = ['don', 'ric', 'win', 'ton', 'ley', 'mund', 'bert', 'ard', 'wen', 'lyn']
const ELF_PREFIXES   = ['Ael', 'Cel', 'Ela', 'Fae', 'Gal', 'Ith', 'Lir', 'Nol', 'Syl', 'Thi', 'Val', 'Zep']
const ELF_SUFFIXES   = ['wen', 'dil', 'rin', 'las', 'nor', 'iel', 'ara', 'oth', 'wyn', 'mir']
const DWARF_PREFIXES = ['Bor', 'Dur', 'Gim', 'Kor', 'Mur', 'Nor', 'Rog', 'Thor', 'Ulf', 'Zar']
const DWARF_SUFFIXES = ['in', 'li', 'din', 'rak', 'grim', 'mund', 'bor', 'dur', 'gar', 'nik']
const ORC_PREFIXES   = ['Gra', 'Kru', 'Mog', 'Nar', 'Rog', 'Ska', 'Thr', 'Urg', 'Vok', 'Zug']
const ORC_SUFFIXES   = ['ash', 'gor', 'mak', 'nak', 'rok', 'tuk', 'zar', 'gul', 'dak', 'bur']
const ANIMAL_NAMES   = ['Shadow', 'Fang', 'Storm', 'Blaze', 'Frost', 'Claw', 'Swift', 'Ember', 'Thorn', 'Dusk', 'Ash', 'Bolt', 'Grim', 'Howl', 'Scar']

afterEach(() => vi.restoreAllMocks())

describe('generateName — 返回类型', () => {
  it('human 返回字符串', () => {
    expect(typeof generateName('human')).toBe('string')
  })
  it('elf 返回字符串', () => {
    expect(typeof generateName('elf')).toBe('string')
  })
  it('dwarf 返回字符串', () => {
    expect(typeof generateName('dwarf')).toBe('string')
  })
  it('orc 返回字符串', () => {
    expect(typeof generateName('orc')).toBe('string')
  })
  it('未知种族返回字符串', () => {
    expect(typeof generateName('dragon')).toBe('string')
  })
  it('空字符串种族返回字符串', () => {
    expect(typeof generateName('')).toBe('string')
  })
  it('大写种族名返回字符串（fallback）', () => {
    expect(typeof generateName('HUMAN')).toBe('string')
  })
})

describe('generateName — 非空性', () => {
  it('human 名字非空', () => {
    expect(generateName('human').length).toBeGreaterThan(0)
  })
  it('elf 名字非空', () => {
    expect(generateName('elf').length).toBeGreaterThan(0)
  })
  it('dwarf 名字非空', () => {
    expect(generateName('dwarf').length).toBeGreaterThan(0)
  })
  it('orc 名字非空', () => {
    expect(generateName('orc').length).toBeGreaterThan(0)
  })
  it('未知种族名字非空', () => {
    expect(generateName('cat').length).toBeGreaterThan(0)
  })
  it('数字字符串种族名字非空', () => {
    expect(generateName('123').length).toBeGreaterThan(0)
  })
})

describe('generateName — human 格式验证', () => {
  it('human 名字由合法前缀开头', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('human')
      const startsWithValidPrefix = HUMAN_PREFIXES.some(p => name.startsWith(p))
      expect(startsWithValidPrefix).toBe(true)
    }
  })
  it('human 名字由合法后缀结尾', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('human')
      const endsWithValidSuffix = HUMAN_SUFFIXES.some(s => name.endsWith(s))
      expect(endsWithValidSuffix).toBe(true)
    }
  })
  it('human 名字长度在 4~12 之间', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('human')
      expect(name.length).toBeGreaterThanOrEqual(4)
      expect(name.length).toBeLessThanOrEqual(12)
    }
  })
  it('human 名字首字母大写', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateName('human')
      expect(name[0]).toBe(name[0].toUpperCase())
    }
  })
})

describe('generateName — elf 格式验证', () => {
  it('elf 名字由合法前缀开头', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('elf')
      const startsWithValidPrefix = ELF_PREFIXES.some(p => name.startsWith(p))
      expect(startsWithValidPrefix).toBe(true)
    }
  })
  it('elf 名字由合法后缀结尾', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('elf')
      const endsWithValidSuffix = ELF_SUFFIXES.some(s => name.endsWith(s))
      expect(endsWithValidSuffix).toBe(true)
    }
  })
  it('elf 名字长度在 4~12 之间', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('elf')
      expect(name.length).toBeGreaterThanOrEqual(4)
      expect(name.length).toBeLessThanOrEqual(12)
    }
  })
  it('elf 名字首字母大写', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateName('elf')
      expect(name[0]).toBe(name[0].toUpperCase())
    }
  })
})

describe('generateName — dwarf 格式验证', () => {
  it('dwarf 名字由合法前缀开头', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('dwarf')
      const valid = DWARF_PREFIXES.some(p => name.startsWith(p))
      expect(valid).toBe(true)
    }
  })
  it('dwarf 名字由合法后缀结尾', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('dwarf')
      const valid = DWARF_SUFFIXES.some(s => name.endsWith(s))
      expect(valid).toBe(true)
    }
  })
  it('dwarf 名字长度在 3~12 之间', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('dwarf')
      expect(name.length).toBeGreaterThanOrEqual(3)
      expect(name.length).toBeLessThanOrEqual(12)
    }
  })
})

describe('generateName — orc 格式验证', () => {
  it('orc 名字由合法前缀开头', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('orc')
      const valid = ORC_PREFIXES.some(p => name.startsWith(p))
      expect(valid).toBe(true)
    }
  })
  it('orc 名字由合法后缀结尾', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('orc')
      const valid = ORC_SUFFIXES.some(s => name.endsWith(s))
      expect(valid).toBe(true)
    }
  })
  it('orc 名字长度在 3~12 之间', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('orc')
      expect(name.length).toBeGreaterThanOrEqual(3)
      expect(name.length).toBeLessThanOrEqual(12)
    }
  })
})

describe('generateName — 未知种族 fallback', () => {
  it('未知种族返回 ANIMAL_NAMES 之一', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateName('dragon')
      expect(ANIMAL_NAMES).toContain(name)
    }
  })
  it('空字符串种族返回 ANIMAL_NAMES 之一', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateName('')
      expect(ANIMAL_NAMES).toContain(name)
    }
  })
  it('数字字符串种族返回 ANIMAL_NAMES 之一', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateName('9999')
      expect(ANIMAL_NAMES).toContain(name)
    }
  })
  it('sheep 种族返回 ANIMAL_NAMES 之一', () => {
    const name = generateName('sheep')
    expect(ANIMAL_NAMES).toContain(name)
  })
  it('wolf 种族返回 ANIMAL_NAMES 之一', () => {
    const name = generateName('wolf')
    expect(ANIMAL_NAMES).toContain(name)
  })
  it('大写 HUMAN 返回 ANIMAL_NAMES 之一（大小写敏感）', () => {
    for (let i = 0; i < 10; i++) {
      const name = generateName('HUMAN')
      expect(ANIMAL_NAMES).toContain(name)
    }
  })
})

describe('generateName — 随机性', () => {
  it('human 50次调用产生 2+ 种不同名字', () => {
    const names = new Set<string>()
    for (let i = 0; i < 50; i++) names.add(generateName('human'))
    expect(names.size).toBeGreaterThan(1)
  })
  it('elf 50次调用产生 2+ 种不同名字', () => {
    const names = new Set<string>()
    for (let i = 0; i < 50; i++) names.add(generateName('elf'))
    expect(names.size).toBeGreaterThan(1)
  })
  it('dwarf 50次调用产生 2+ 种不同名字', () => {
    const names = new Set<string>()
    for (let i = 0; i < 50; i++) names.add(generateName('dwarf'))
    expect(names.size).toBeGreaterThan(1)
  })
  it('orc 50次调用产生 2+ 种不同名字', () => {
    const names = new Set<string>()
    for (let i = 0; i < 50; i++) names.add(generateName('orc'))
    expect(names.size).toBeGreaterThan(1)
  })
  it('未知种族 50次调用产生 2+ 种不同名字', () => {
    const names = new Set<string>()
    for (let i = 0; i < 50; i++) names.add(generateName('dragon'))
    expect(names.size).toBeGreaterThan(1)
  })
  it('human 结果是 prefixes×suffixes 的笛卡尔积之一', () => {
    const allPossible = new Set<string>()
    for (const p of HUMAN_PREFIXES) {
      for (const s of HUMAN_SUFFIXES) allPossible.add(p + s)
    }
    for (let i = 0; i < 50; i++) {
      expect(allPossible.has(generateName('human'))).toBe(true)
    }
  })
  it('elf 结果是 prefixes×suffixes 的笛卡尔积之一', () => {
    const allPossible = new Set<string>()
    for (const p of ELF_PREFIXES) {
      for (const s of ELF_SUFFIXES) allPossible.add(p + s)
    }
    for (let i = 0; i < 50; i++) {
      expect(allPossible.has(generateName('elf'))).toBe(true)
    }
  })
})

describe('generateName — Math.random mock 验证确定性', () => {
  it('Math.random=0时 human 返回第一个前缀+第一个后缀', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const name = generateName('human')
    expect(name).toBe(HUMAN_PREFIXES[0] + HUMAN_SUFFIXES[0])
  })
  it('Math.random=0时 elf 返回第一个前缀+第一个后缀', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const name = generateName('elf')
    expect(name).toBe(ELF_PREFIXES[0] + ELF_SUFFIXES[0])
  })
  it('Math.random=0时 dwarf 返回第一个前缀+第一个后缀', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const name = generateName('dwarf')
    expect(name).toBe(DWARF_PREFIXES[0] + DWARF_SUFFIXES[0])
  })
  it('Math.random=0时 orc 返回第一个前缀+第一个后缀', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const name = generateName('orc')
    expect(name).toBe(ORC_PREFIXES[0] + ORC_SUFFIXES[0])
  })
  it('Math.random=0时未知种族返回 ANIMAL_NAMES[0]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const name = generateName('unknown')
    expect(name).toBe(ANIMAL_NAMES[0])
  })
  it('相同 random 值两次调用返回相同结果', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const a = generateName('human')
    const b = generateName('human')
    expect(a).toBe(b)
  })
})
