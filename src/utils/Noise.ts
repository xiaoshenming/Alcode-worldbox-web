// Simplex Noise implementation for terrain generation
export class Noise {
  private perm: number[] = []
  private grad3: number[][] = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ]

  constructor(seed: number = Math.random() * 65536) {
    const p: number[] = []
    for (let i = 0; i < 256; i++) p[i] = i

    // Shuffle with seed - ensure seed is a valid positive integer
    let s = Math.abs(Math.floor(seed)) || 1
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647
      const j = Math.abs(s) % (i + 1)
      ;[p[i], p[j]] = [p[j], p[i]]
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]
    }
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1)
    const G2 = (3 - Math.sqrt(3)) / 6

    const s = (xin + yin) * F2
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)

    const t = (i + j) * G2
    const X0 = i - t
    const Y0 = j - t
    const x0 = xin - X0
    const y0 = yin - Y0

    let i1: number, j1: number
    if (x0 > y0) { i1 = 1; j1 = 0 }
    else { i1 = 0; j1 = 1 }

    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2

    const ii = i & 255
    const jj = j & 255
    const gi0 = this.perm[(ii + this.perm[jj]) & 511] % 12
    const gi1 = this.perm[(ii + i1 + this.perm[(jj + j1) & 511]) & 511] % 12
    const gi2 = this.perm[(ii + 1 + this.perm[(jj + 1) & 511]) & 511] % 12

    let n0 = 0, n1 = 0, n2 = 0

    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 >= 0) {
      t0 *= t0
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0)
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 >= 0) {
      t1 *= t1
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1)
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 >= 0) {
      t2 *= t2
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2)
    }

    return 70 * (n0 + n1 + n2)
  }

  // Fractal Brownian Motion for more natural terrain
  fbm(x: number, y: number, octaves: number = 4, lacunarity: number = 2, gain: number = 0.5): number {
    let sum = 0
    let amplitude = 1
    let frequency = 1
    let max = 0

    for (let i = 0; i < octaves; i++) {
      sum += this.noise2D(x * frequency, y * frequency) * amplitude
      max += amplitude
      amplitude *= gain
      frequency *= lacunarity
    }

    return sum / max
  }
}
