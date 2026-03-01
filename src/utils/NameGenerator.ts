import { pickRandom } from './RandomUtils'
const PREFIXES: Record<string, string[]> = {
  human: ['Al', 'Bran', 'Cor', 'Dar', 'Ed', 'Fen', 'Gar', 'Hal', 'Ira', 'Jon', 'Kel', 'Lor', 'Mar', 'Nor', 'Os'],
  elf: ['Ael', 'Cel', 'Ela', 'Fae', 'Gal', 'Ith', 'Lir', 'Nol', 'Syl', 'Thi', 'Val', 'Zep'],
  dwarf: ['Bor', 'Dur', 'Gim', 'Kor', 'Mur', 'Nor', 'Rog', 'Thor', 'Ulf', 'Zar'],
  orc: ['Gra', 'Kru', 'Mog', 'Nar', 'Rog', 'Ska', 'Thr', 'Urg', 'Vok', 'Zug'],
}

const SUFFIXES: Record<string, string[]> = {
  human: ['don', 'ric', 'win', 'ton', 'ley', 'mund', 'bert', 'ard', 'wen', 'lyn'],
  elf: ['wen', 'dil', 'rin', 'las', 'nor', 'iel', 'ara', 'oth', 'wyn', 'mir'],
  dwarf: ['in', 'li', 'din', 'rak', 'grim', 'mund', 'bor', 'dur', 'gar', 'nik'],
  orc: ['ash', 'gor', 'mak', 'nak', 'rok', 'tuk', 'zar', 'gul', 'dak', 'bur'],
}

const ANIMAL_NAMES = ['Shadow', 'Fang', 'Storm', 'Blaze', 'Frost', 'Claw', 'Swift', 'Ember', 'Thorn', 'Dusk', 'Ash', 'Bolt', 'Grim', 'Howl', 'Scar']

export function generateName(species: string): string {
  const prefixes = PREFIXES[species]
  const suffixes = SUFFIXES[species]

  if (prefixes && suffixes) {
    const pre = pickRandom(prefixes)
    const suf = pickRandom(suffixes)
    return pre + suf
  }

  return pickRandom(ANIMAL_NAMES)
}
