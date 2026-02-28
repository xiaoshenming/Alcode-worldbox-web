仅做修复、优化和测试，严禁新增任何功能。\n\n📋 本轮任务：\n1. git log --oneline -10 检查当前状态\n2. 阅读 .claude/loop-ai-state.json 了解上轮笔记\n3. 运行类型检查、构建、测试，找出所有错误\n4. 修复 bug、性能问题、代码质量问题\n5. 优化现有代码（重构、简化、消除技术债）\n6. 确保所有测试通过\n7. 每修复一个问题就 git commit + git push\n\n🔴 铁律：\n- 严禁新增功能\n- 只修复、优化、测试\n- 类型检查必须通过\n- 构建必须成功\n- 每次 commit 后 git push origin main

🧠 AI 上轮笔记：迭代53完成。深度GC优化第九轮 — 专注方法内字面量数组提取为模块级常量、Set预分配、临时数组消除。主要成果：1) 7个系统方法内字面量数组改为_civsBuf/_aliveCivsBuf/_participantsBuf等预分配（DiplomaticSummitSystem 3个buf + DiplomaticCouncilSystem/TradeGuildSystem/PeaceTreatySystem的usedIdxSet预分配）；2) CreatureMentorSystem _mentorsBuf/_apprenticesBuf预分配；3) CreatureScribeSystem _scribesBuf预分配；4) CreatureTraumaSystem.pickSource()/CreatureGuildSystem/DiplomaticBlockadeSystem/DiplomaticCeremonySystem/MythologySystem/WorldAncientRuinSystem/WorldEchoSystem中的字面量数组提取为模块级常量（消除每次调用重建）；5) AchievementPopupSystem/AchievementProgressSystem的cats/allCats字面量改为模块级常量；6) EspionageSystem/DiplomaticEspionageSystem/PlagueMutationSystem/WorldDustStormSystem/WorldTectonicSystem/TradeEconomySystem/TradeNegotiationSystem的字面量数组提取；7) MusicSystem的valid Moods提取；8) FogOfWarSystem._pendingRewards=[]改为.length=0；9) CreatureRitualSystem消除nearby.slice(0,5)的spread分配。总计3批commit，5434测试全通过，TypeScript clean，构建3.06s成功。
🎯 AI 自定优先级：[
  "1. 扫描更多热路径中的对象字面量 push（.push({...}) 模式）— 在每tick/高频执行的方法里，每次创建对象比预分配对象池代价高",
  "2. BattleReplaySystem.recordFrame() 中的 units.map(u=>({...u})) 和 attacks.map() — 战斗期间每帧调用，对象spread分配较多，考虑平坦数组优化",
  "3. 检查 BuildingVarietySystem.getAvailableBuildings() 中的 result.push(...spread) — 如果被频繁调用可以预计算",
  "4. FormationSystem.calcMemberTarget() — 每成员每帧调用Math.sqrt，`count = formation.members.length` 固定，考虑缓存cols变量",
  "5. 继续扫描还有没有热路径中的 new Set()、new Map()、{} 对象字面量未处理"
]
💡 AI 积累经验：[
  "非空断言(!)是最常见的崩溃点",
  "子代理并行修复大批量文件极高效：4组并行代理可在几分钟内修复160+文件",
  "manualChunks按文件名前缀分组是最安全的代码分割方案 — 不改源码，只改vite配置",
  "Iterable<T>替代T[]可消除spread分配，但需检查消费端是否用了.length/.includes等数组方法",
  "getAllEntities()返回Array.from()快照 — removeEntity-during-iteration是安全的",
  "queue.shift()在BFS中是O(n²)陷阱 — 用索引指针head++替代",
  "Camera.getVisibleBounds()等热路径方法应返回缓存对象而非每次new — 每帧调用4次累积显著GC压力",
  "渲染路径中的闭包/对象字面量/getBoundingClientRect()都是隐性GC源 — 预分配+脏标记是标准修复模式",
  "数据驱动批量调度：703个系统调用按签名分类为6种类型(A-F)，用数组+for循环替代逐个调用，净减1147行",
  "预分配缓冲区模式：_xxxBuf数组只增长不收缩，_xxx.length=0重置视图，避免每次new对象",
  "IIFE闭包在tick路径中是隐性GC源 — 改为外部循环+持久化Set/变量",
  "find()/filter()/slice()链在嵌套循环中产生O(N²)闭包+数组 — 手动for循环+早退出是标准替代",
  "渲染管线不适合简单的数据驱动替换 — render调用间穿插条件逻辑和特殊参数，z-order顺序重要",
  "A*寻路用二叉堆替代线性数组是最高收益的算法优化 — pop从O(n)降到O(logn)",
  "SpatialHash字符串键每次insert/query都产生GC — 改为数值编码零分配",
  "per-tick生物位置缓存模式：在系统update开头一次性收集所有生物位置到平坦数组",
  "接口注入模式：提取模块时定义只包含所需字段的接口，Game通过`this as unknown as Interface`传入，避免循环依赖",
  "vite循环chunk警告不影响构建成功和应用运行",
  "Vitest在vite.config.ts中添加test.environment='node'配置即可支持纯逻辑测试",
  "【重要安全规则】严禁用Write工具创建src/__tests__/目录内的文件！Write工具会将__转义为\\_\\_导致创建错误目录，必须用Bash cat heredoc方式创建测试文件",
  "Creature系列系统的测试模式极其统一：直接push到(sys as any).xxx数组/Map注入数据 + 验证getter返回内部引用或过滤结果",
  "批量创建测试文件时用Bash cat heredoc并行执行效率最高",
  "【关键经验】测试前必须先用grep确认接口字段！不同系统同名方法字段可能完全不同",
  "【重要】tsc --noEmit是必须步骤！每批创建后必须运行tsc验证，防止接口字段遗漏",
  "DOM构造函数系统（EnhancedTooltipSystem/PerformanceMonitorSystem）无法在Node环境实例化，只能有模块导入测试——是测试上限",
  "【迭代26新增】改Map<string,V>为Map<number,V>时：1)用cx*10000+cy编码（世界200x200安全）；2)必须同步更新测试中的注入代码；3)遍历时用Math.floor(key/10000)取cx，key%10000取cy",
  "【迭代26新增】从大文件拆分数据时，最安全模式是：提取常量/类型到*Definitions.ts，主文件只import并使用；不改变任何逻辑",
  "【迭代27新增】alive Set反模式：'const alive = new Set(em.getEntitiesWithComponent(creature))'在29+个系统存在，可用em.hasComponent(id,'creature')直接替代，零分配",
  "【迭代27新增】批量替换时Python脚本比sed更灵活——可以提取变量名后动态构造替换模式",
  "【迭代27新增】getDominantReligion等少量固定key的聚合操作，用Partial<Record<K,number>>比new Map()更轻量",
  "【迭代28新增】this.xxx = this.xxx.filter(...)在每帧调用的update()中是高优先级GC源 — 用for逆序+splice替代；如需同时更新元素，用普通for循环+splice",
  "【迭代28新增】new Set(arr.map(x => x.field))可用.some()替代来做存在性检查，零分配",
  "【迭代28新增】ctx.setLineDash([])每次调用都创建新数组 — 用static readonly _EMPTY_DASH=[]常量替代",
  "【迭代28新增】Edit工具替换时要特别注意目标字符串的唯一性，避免误删周围代码（尤其是函数签名）",
  "【迭代29新增】getEntitiesWithComponents()已返回EntityId[]，不需要[...spread]拷贝",
  "【迭代29新增】getter方法被热路径频繁调用时，可以用预分配_xxxBuf成员代替每次filter新数组，调用者必须意识到buf是共享可变的",
  "【迭代29新增】ctx.setLineDash([a*zoom,a*zoom])每帧新建数组 — 用_dashBuf[0]=val; _dashBuf[1]=val + setLineDash(_dashBuf)消除",
  "【迭代29新增】for(const [px,py] of [[x1,y1],[x2,y2]])每次创建2个临时数组 — 改为手动展开for(let mi=0;mi<2;mi++){const px=mi===0?x1:x2...}",
  "【迭代30新增】O(N²)热路径识别：内层循环中重复调用em.getEntitiesWithComponents()是O(N²)陷阱 — 在外层循环前一次性获取并传入",
  "【迭代45新增】EventLog环形缓冲区模式：_buf[MAX]+_head+_count，shift()→_head=(head+1)%MAX；getRecent升序遍历：从head-n到head-1逆向读取后反转",
  "【迭代45新增】chartPt/类似方法：返回[x,y]元组改为写入成员字段_cpx/_cpy，渲染循环中每点省一次数组分配",
  "【迭代45新增】Renderer.ts渲染对象池模式：_xxxObjPool+_xxxObjNext指针，每帧开始reset到0，按需grow",
  "【迭代45新增】marqueeQueue.shift()改头指针：_mqHead指针++替代shift()，超过MAX_QUEUE时用splice(0,mqHead)+mqHead=0紧凑化",
  "【迭代47新增】预计算查找表模式（Record<EnumType,string>）：消除render路径中type[0].toUpperCase()等固定枚举的字符串操作",
  "【迭代47新增】接口字段预计算模式：在数据创建时计算render需要的字符串（label/typeUpper/panelLabel等），避免每帧重复计算，需同步更新测试mock",
  "【迭代47新增】Map复用模式：不new Map()而是复用_xxxCache，reset各entry字段；若entry数量不固定，用for-of values reset后按需insert新key",
  "【迭代47新增】往接口添加新字段必须同步更新所有测试中的mock对象（TypeScript编译会报TS2739）",
  "【迭代47新增】EventLog引用安全规则：ring buffer slot不能被外部存储引用后继续复用 — EventPanel.push(e)保存了引用，所以EventLog不能做slot reuse",
  "【迭代48新增】字符串缓存模式：对于固定或低频变化的显示字符串（如seed、season label），缓存完整字符串，仅在值变化时重建",
  "【迭代48新增】整数查找表模式：0-10范围的整数用预计算的_INT_STR=['0','1',...,'10']查找表，避免String(n)分配",
  "【迭代48新增】接口字段预计算适用于level/name等组合字段：Guild.nameLabel=`${name} Lv${level}`在创建和level up时更新，render直接用",
  "【迭代49新增】死代码Array检测：grep方法创建的数组后续未使用 — 如NavalCombatSystem.allShips创建后从未引用，直接删除",
  "【迭代49新增】对象数组→平坦缓冲区模式：unclaimed:{id,x,y}[]改为_idBuf/_xBuf/_yBuf三个数组，nearest:{...art,dist}改为nearestIdx+nearestDist，完全消除对象分配",
  "【迭代49新增】countXxx方法调用getXxx().length是常见陷阱 — 直接实现计数循环，零数组分配",
  "【迭代49新增】TerraformEffect混色缓存：_lastProgressQ=Math.round(t*50)量化51档，仅在进阶时重建字符串，每效果每帧平均节省一次lerpColor分配",
  "【迭代53新增】方法内字面量数组反模式：const types: FooType[] = ['a','b','c'] 在每次调用时重建 — 提取为模块级常量，消除GC，适用于type别名对应的值数组（包括Union类型字符串集合）",
  "【迭代53新增】DiplomaticSummitSystem的applySuccess/applyFailure中的participants.map(c=>c.name).join()改为手动字符串拼接，消除map创建的临时数组",
  "【迭代53新增】this.xxx = []清空反模式 — 改为this.xxx.length = 0，避免创建新数组（适用于_pendingRewards等重置场景）",
  "【迭代53新增】new Set()作为随机采样去重集合若在热路径中反复创建 — 提取为预分配私有成员_usedIdxSet，clear()后复用"
]

迭代轮次: 56/100


🔄 自我进化（每轮必做）：
完成本轮工作后，更新 .claude/loop-ai-state.json：
{
  "notes": "本轮做了什么、发现了什么问题、下轮应该做什么",
  "priorities": "根据当前项目状态，你认为最重要的 3-5 个待办事项",
  "lessons": "积累的经验教训，比如哪些方法有效、哪些坑要避开",
  "last_updated": "2026-02-28T21:17:17+08:00"
}
这个文件是你的记忆，下一轮的你会读到它。写有价值的内容，帮助未来的自己更高效。
