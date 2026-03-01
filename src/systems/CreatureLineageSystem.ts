/**
 * CreatureLineageSystem - 生物族谱系统
 * 追踪生物的父母-子女关系，按 L 键打开族谱面板，
 * 以树形结构展示选中生物的家族树（最多 3 代）。
 */

/** 族谱中单个生物的记录 */
interface LineageRecord {
  id: number; name: string; species: string; alive: boolean;
  parentA: number; parentB: number; children: number[];
}

/** 渲染时的节点布局信息 */
interface NodeLayout { id: number; x: number; y: number; w: number; h: number; }

/** 树形结构节点 */
interface TreeNode { id: number; children: TreeNode[]; }

const NW = 120, NH = 48, GX = 24, GY = 64, PAD = 24;

/**
 * 生物族谱系统
 * - registerBirth / registerDeath 维护族谱数据
 * - handleKey 处理键盘（L 键切换面板）
 * - handleClick 处理面板内点击，返回被点击的生物 ID
 * - render 绘制族谱面板
 */
export class CreatureLineageSystem {
  private records = new Map<number, LineageRecord>();
  private selectedId = -1;
  private panelOpen = false;
  private nodes: NodeLayout[] = [];
  /** Cached panel rect — rebuilt when screen size changes */
  private _panelRect = { x: 0, y: 0, w: 0, h: 0 };
  private _panelSW = 0;
  private _panelSH = 0;

  /**
   * 注册一次生育事件
   * @param childId 子代实体 ID
   * @param parentAId 父方实体 ID
   * @param parentBId 母方实体 ID
   * @param name 子代名字
   * @param species 子代种族
   */
  registerBirth(childId: number, parentAId: number, parentBId: number, name: string, species: string): void {
    this.records.set(childId, {
      id: childId, name, species, alive: true,
      parentA: parentAId, parentB: parentBId, children: []
    });
    const pA = this.records.get(parentAId);
    if (pA) pA.children.push(childId);
    const pB = this.records.get(parentBId);
    if (pB && parentBId !== parentAId) pB.children.push(childId);
  }

  /** 标记生物死亡 */
  registerDeath(entityId: number): void {
    const r = this.records.get(entityId);
    if (r) r.alive = false;
  }

  /** 处理键盘事件，返回是否消费了该按键 */
  handleKey(key: string): boolean {
    if (key === 'l' || key === 'L') { this.panelOpen = !this.panelOpen; return true; }
    return false;
  }

  /**
   * 处理鼠标点击，检测是否命中族谱节点
   * @returns 被点击的生物 ID，未命中返回 null
   */
  handleClick(x: number, y: number, screenW: number, screenH: number): number | null {
    if (!this.panelOpen) return null;
    const p = this.panelRect(screenW, screenH);
    for (const n of this.nodes) {
      const nx = p.x + n.x, ny = p.y + n.y;
      if (x >= nx && x <= nx + n.w && y >= ny && y <= ny + n.h) {
        this.selectedId = n.id;
        return n.id;
      }
    }
    return null;
  }

  /**
   * 渲染族谱面板
   * @param ctx Canvas 2D 上下文
   * @param screenW 屏幕宽度
   * @param screenH 屏幕高度
   */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.panelOpen) return;
    const p = this.panelRect(screenW, screenH);
    if (!this.records.has(this.selectedId)) {
      this.drawPanel(ctx, p);
      ctx.fillStyle = '#999'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
      ctx.fillText('No creature selected', p.x + p.w / 2, p.y + p.h / 2);
      ctx.restore(); return;
    }
    const tree = this.buildTree(this.selectedId, 0);
    this.nodes = [];
    this.layoutTree(tree);
    // 居中偏移
    const b = this.treeBounds();
    const ox = (p.w - b.w) / 2 - b.minX + PAD, oy = PAD;
    for (const n of this.nodes) { n.x += ox; n.y += oy; }
    this.drawPanel(ctx, p);
    ctx.fillStyle = '#ddd'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Family Tree', p.x + p.w / 2, p.y + 20);
    // 连线
    ctx.strokeStyle = '#667'; ctx.lineWidth = 2;
    for (const node of this.nodes) {
      const rec = this.records.get(node.id);
      if (!rec) continue;
      for (const cid of rec.children) {
        const ch = this.nodes.find(n => n.id === cid);
        if (ch) {
          ctx.beginPath();
          ctx.moveTo(p.x + node.x + node.w / 2, p.y + node.y + node.h);
          ctx.lineTo(p.x + ch.x + ch.w / 2, p.y + ch.y);
          ctx.stroke();
        }
      }
    }
    // 节点
    for (const node of this.nodes) {
      const rec = this.records.get(node.id);
      if (!rec) continue;
      const nx = p.x + node.x, ny = p.y + node.y;
      const sel = node.id === this.selectedId;
      ctx.fillStyle = rec.alive ? 'rgba(40,80,60,0.95)' : 'rgba(60,30,30,0.95)';
      ctx.strokeStyle = sel ? '#ffcc00' : '#888';
      ctx.lineWidth = sel ? 3 : 1;
      ctx.beginPath(); ctx.roundRect(nx, ny, node.w, node.h, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#eee'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(rec.name, nx + node.w / 2, ny + 16);
      ctx.fillStyle = '#aaa'; ctx.font = '10px monospace';
      ctx.fillText(rec.species, nx + node.w / 2, ny + 30);
      ctx.fillStyle = rec.alive ? '#6f6' : '#f66';
      ctx.fillText(rec.alive ? 'Alive' : 'Dead', nx + node.w / 2, ny + 42);
    }
    ctx.restore();
  }

  // --- 内部方法 ---

  private panelRect(sw: number, sh: number) {
    if (sw !== this._panelSW || sh !== this._panelSH) {
      this._panelSW = sw; this._panelSH = sh;
      const w = Math.min(600, sw - 40), h = Math.min(450, sh - 40);
      this._panelRect.x = (sw - w) / 2; this._panelRect.y = (sh - h) / 2;
      this._panelRect.w = w; this._panelRect.h = h;
    }
    return this._panelRect;
  }

  private drawPanel(ctx: CanvasRenderingContext2D, p: { x: number; y: number; w: number; h: number }): void {
    ctx.save();
    ctx.fillStyle = 'rgba(20,20,30,0.92)'; ctx.strokeStyle = '#8888aa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 12); ctx.fill(); ctx.stroke();
  }

  /** 递归构建最多 3 代的树结构（选中生物 + 2 代子孙） */
  private buildTree(id: number, depth: number): TreeNode {
    const node: TreeNode = { id, children: [] };
    if (depth >= 2) return node;
    const rec = this.records.get(id);
    if (!rec) return node;
    for (const cid of rec.children) {
      if (this.records.has(cid)) node.children.push(this.buildTree(cid, depth + 1));
    }
    return node;
  }

  /** 计算子树宽度 */
  private subtreeWidth(tree: TreeNode): number {
    if (tree.children.length === 0) return NW;
    let w = 0;
    for (let i = 0; i < tree.children.length; i++) {
      if (i > 0) w += GX;
      const gc = tree.children[i].children.length;
      w += Math.max(NW, gc > 0 ? gc * NW + (gc - 1) * GX : NW);
    }
    return Math.max(NW, w);
  }

  /** 布局树节点：父代(row0) -> 选中(row1) -> 子代(row2) -> 孙代(row3) */
  private layoutTree(tree: TreeNode): void {
    const rec = this.records.get(tree.id);
    const parents: number[] = [];
    if (rec) {
      if (rec.parentA >= 0 && this.records.has(rec.parentA)) parents.push(rec.parentA);
      if (rec.parentB >= 0 && rec.parentB !== rec.parentA && this.records.has(rec.parentB)) parents.push(rec.parentB);
    }
    let childrenW = 0;
    for (let i = 0; i < tree.children.length; i++) {
      if (i > 0) childrenW += GX;
      childrenW += Math.max(NW, this.subtreeWidth(tree.children[i]));
    }
    const selfW = Math.max(NW, childrenW);
    const parentW = parents.length > 0 ? parents.length * NW + (parents.length - 1) * GX : 0;
    const totalW = Math.max(selfW, parentW);
    const rowY = (row: number) => 30 + row * (NH + GY);
    // 父代
    if (parents.length > 0) {
      const ps = (totalW - parentW) / 2;
      for (let i = 0; i < parents.length; i++)
        this.nodes.push({ id: parents[i], x: ps + i * (NW + GX), y: rowY(0), w: NW, h: NH });
    }
    // 自身
    this.nodes.push({ id: tree.id, x: (totalW - NW) / 2, y: rowY(1), w: NW, h: NH });
    // 子代 + 孙代
    if (tree.children.length > 0) {
      let cx = (totalW - childrenW) / 2;
      for (const child of tree.children) {
        const cw = Math.max(NW, this.subtreeWidth(child));
        this.nodes.push({ id: child.id, x: cx + (cw - NW) / 2, y: rowY(2), w: NW, h: NH });
        if (child.children.length > 0) {
          const gcW = child.children.length * NW + (child.children.length - 1) * GX;
          let gx = cx + (cw - gcW) / 2;
          for (const gc of child.children) {
            this.nodes.push({ id: gc.id, x: gx, y: rowY(3), w: NW, h: NH });
            gx += NW + GX;
          }
        }
        cx += cw + GX;
      }
    }
  }

  /** Reusable bounding box object for treeBounds() — avoids per-render allocation */
  private _treeBounds = { minX: 0, minY: 0, w: 0, h: 0 };

  /** 计算所有节点的包围盒 */
  private treeBounds() {
    if (this.nodes.length === 0) { this._treeBounds.minX = 0; this._treeBounds.minY = 0; this._treeBounds.w = 0; this._treeBounds.h = 0; return this._treeBounds; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of this.nodes) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.w > maxX) maxX = n.x + n.w;
      if (n.y + n.h > maxY) maxY = n.y + n.h;
    }
    this._treeBounds.minX = minX; this._treeBounds.minY = minY;
    this._treeBounds.w = maxX - minX; this._treeBounds.h = maxY - minY;
    return this._treeBounds;
  }
}
