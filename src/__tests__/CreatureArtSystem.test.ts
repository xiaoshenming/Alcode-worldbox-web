import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureArtSystem } from '../systems/CreatureArtSystem'
import type { Artwork, ArtistData, ArtForm } from '../systems/CreatureArtSystem'

// CreatureArtSystem 测试:
// - getArtworks()       → 返回内部数组引用（全部艺术品）
// - getMasterpieces()   → 过滤 quality >= 80 的艺术品
// - getArtistCount()    → 返回 artists Map 的 size
// - getArtworkCount()   → 返回 artworks 数组的 length
// update() 依赖 EntityManager，不在此测试。

let nextArtId = 1

function makeArtSys(): CreatureArtSystem {
  return new CreatureArtSystem()
}

function makeArtwork(quality: number, form: ArtForm = 'painting'): Artwork {
  return {
    id: nextArtId++,
    civId: 1,
    creatorId: 1,
    creatorName: 'Bob',
    form,
    quality,
    fame: 50,
    createdTick: 0,
    title: 'Test Artwork',
  }
}

function makeArtist(eid: number, talent = 50): ArtistData {
  return {
    entityId: eid,
    talent,
    preferredForm: 'painting',
    worksCreated: 0,
    inspiration: 50,
  }
}

describe('CreatureArtSystem.getArtworkCount', () => {
  let sys: CreatureArtSystem

  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })

  it('初始艺术品数量为 0', () => {
    expect(sys.getArtworkCount()).toBe(0)
  })

  it('注入艺术品后数量正确', () => {
    ;(sys as any).artworks.push(makeArtwork(50))
    ;(sys as any).artworks.push(makeArtwork(70))
    expect(sys.getArtworkCount()).toBe(2)
  })
})

describe('CreatureArtSystem.getArtworks', () => {
  let sys: CreatureArtSystem

  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })

  it('初始返回空数组', () => {
    expect(sys.getArtworks()).toHaveLength(0)
  })

  it('返回内部引用', () => {
    ;(sys as any).artworks.push(makeArtwork(60))
    expect(sys.getArtworks()).toBe((sys as any).artworks)
  })

  it('包含所有艺术品数据', () => {
    const forms: ArtForm[] = ['painting', 'sculpture', 'music', 'poetry', 'dance', 'weaving', 'pottery', 'storytelling']
    forms.forEach(f => {
      ;(sys as any).artworks.push(makeArtwork(50, f))
    })
    expect(sys.getArtworks()).toHaveLength(8)
    expect(sys.getArtworks()[0].form).toBe('painting')
    expect(sys.getArtworks()[7].form).toBe('storytelling')
  })
})

describe('CreatureArtSystem.getMasterpieces', () => {
  let sys: CreatureArtSystem

  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })

  it('无艺术品时杰作为空', () => {
    expect(sys.getMasterpieces()).toHaveLength(0)
  })

  it('quality < 80 的不算杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(79))
    expect(sys.getMasterpieces()).toHaveLength(0)
  })

  it('quality === 80 算杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(80))
    expect(sys.getMasterpieces()).toHaveLength(1)
  })

  it('quality > 80 算杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(90))
    ;(sys as any).artworks.push(makeArtwork(100))
    expect(sys.getMasterpieces()).toHaveLength(2)
  })

  it('混合质量只统计杰作', () => {
    ;(sys as any).artworks.push(makeArtwork(50))   // 非杰作
    ;(sys as any).artworks.push(makeArtwork(79))   // 非杰作
    ;(sys as any).artworks.push(makeArtwork(80))   // 杰作
    ;(sys as any).artworks.push(makeArtwork(95))   // 杰作
    ;(sys as any).artworks.push(makeArtwork(100))  // 杰作
    expect(sys.getMasterpieces()).toHaveLength(3)
  })

  it('杰作返回新数组（不影响内部）', () => {
    ;(sys as any).artworks.push(makeArtwork(85))
    expect(sys.getMasterpieces()).not.toBe((sys as any).artworks)
  })
})

describe('CreatureArtSystem.getArtistCount', () => {
  let sys: CreatureArtSystem

  beforeEach(() => { sys = makeArtSys(); nextArtId = 1 })

  it('初始艺术家数量为 0', () => {
    expect(sys.getArtistCount()).toBe(0)
  })

  it('注入艺术家后数量正确', () => {
    ;(sys as any).artists.set(1, makeArtist(1))
    ;(sys as any).artists.set(2, makeArtist(2))
    expect(sys.getArtistCount()).toBe(2)
  })

  it('与 Map.size 一致', () => {
    ;(sys as any).artists.set(1, makeArtist(1))
    ;(sys as any).artists.set(2, makeArtist(2))
    ;(sys as any).artists.set(3, makeArtist(3))
    expect(sys.getArtistCount()).toBe((sys as any).artists.size)
  })
})
