仅做修复、优化和测试，严禁新增任何功能。\n\n📋 本轮任务：\n1. git log --oneline -10 检查当前状态\n2. 阅读 .claude/loop-ai-state.json 了解上轮笔记\n3. 运行类型检查、构建、测试，找出所有错误\n4. 修复 bug、性能问题、代码质量问题\n5. 优化现有代码（重构、简化、消除技术债）\n6. 确保所有测试通过\n7. 每修复一个问题就 git commit + git push\n\n🔴 铁律：\n- 严禁新增功能\n- 只修复、优化、测试\n- 类型检查必须通过\n- 构建必须成功\n- 每次 commit 后 git push origin main

🧠 AI 上轮笔记：迭代134（循环40/100）。本轮主要成就：批量处理9个World系统测试（YYY/ZZZ/AAA2组），测试从13263增至13487，+224个测试。

本轮处理的系统（分3批Agent并行）：
YYY组(+102): WorldFumaroleFieldSystem(28) WorldFumaroleSystem(34) WorldFumarolicFieldSystem(40)
ZZZ组(+83): WorldFungalNetworkSystem(42) WorldGadoliniumSpringSystem(23) WorldGalliumSpringSystem(28)
AAA2组(+84): WorldGeoglyphSystem(27) WorldGeothermalPoolSystem(29) WorldGeothermalSpringSystem(28)

关键发现：
- WorldFumaroleFieldSystem: CHECK_INTERVAL=2720, MAX_FIELDS=6，cleanup条件age>=95（先+0.004后判断），gasEmission递减-0.008下界5，sulfurDeposit递增+0.012上界90
- WorldFumaroleSystem: CHECK_INTERVAL=2700, MAX_FUMAROLES=11，cleanup条件temperature<=50（先Math.max(50,temp-0.01)后判断），steamIntensity用正弦波更新：20+15*sin(activityCycle)
- WorldFumarolicFieldSystem: CHECK_INTERVAL=3050, MAX_FIELDS=12，tick-based cleanup：field.tick<tick-82000，gasIntensity随机浮动±0.25，sulfurDeposit递增+0.008上界70
- WorldFungalNetworkSystem: CHECK_INTERVAL=2800, MAX_NETWORKS=30，内部数组名networks，有_networkKeySet:Set<number>去重，cleanup条件!(connectivity>1&&nodeCount>0)，connectivity每次+0.05上限100
- WorldGadoliniumSpringSystem: CHECK_INTERVAL=2960, MAX_ZONES=32，cutoff=tick-54000，spawn需nearWater(SHALLOW_WATER/DEEP_WATER)||nearMountain(MOUNTAIN=5)，无字段更新逻辑
- WorldGalliumSpringSystem: CHECK_INTERVAL=2890, MAX_ZONES=32，与Gadolinium同结构，cutoff=tick-54000，字段：galliumContent/springFlow/bauxiteLeaching/mineralLiquidity
- WorldGeoglyphSystem: CHECK_INTERVAL=4000, MAX_GEOGLYPHS=10，cleanup条件visibility<=10（非时间，是侵蚀阈值），age=tick-g.tick>100000时visibility-=0.03，spawn需SAND/GRASS
- WorldGeothermalPoolSystem: CHECK_INTERVAL=3100, MAX_POOLS=14，无tile检查（任意地形可生成），cutoff=tick-85000，temperature[30,98]，mineralContent每次+0.005上限80
- WorldGeothermalSpringSystem: CHECK_INTERVAL=2600, MAX_SPRINGS=22，spawn需MOUNTAIN/GRASS/SNOW，cutoff=tick-92000，4个字段同时更新
- 测试总数从13263→13487，+224
- tsc+vitest+build三重验证保持全绿（当前13487/13487通过）

下轮优先方向：
1. 继续处理World系统（剩余169个文件，全部5测试待改善）
2. 使用同样的并行Agent策略（3 Agent × 3文件/批）
3. tsc+vitest+build三重验��保持全绿
🎯 AI 自定优先级：[
  "1. 【持续目标】继续处理World系统（剩余169个文件，全部只有5测试），用并行Agent批量处理",
  "2. 【持续监控】tsc+vitest+build三重验证保持全绿（当前13487/13487通过）",
  "3. 【里程碑】已完成72+9=81个World系统测试改善（+1608+224=1832测试），继续下一批",
  "4. 【策略】每批3 Agent × 3文件 = 9个系统，每批约+150-250测试",
  "5. 【下一批系统】WorldGeothermalSystem WorldGeothermalVentSystem WorldGermaniumSpringSystem及后续"
]
💡 AI 积累经验：[
  "非空断言(!)是最常见的崩溃点",
  "子代理并行修复大批量文件极高效：4个并行代理可在几分钟内修复160+文件",
  "manualChunks按文件名前缀分组是最安全的代码分割方案 — 不改源码，只改vite配置",
  "Iterable<T>替代T[]可消除spread分配，但检查消费侧是否用了.length/.includes等数组方法",
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
  "per-tick生物位置缓存模式：在系统update开始一次性收集所有生物位置到平坦数组",
  "接口注入模式：提取模块时定义只包含所需字段的接口，Game通过`this as unknown as Interface`传入，避免循环依赖",
  "vite循环chunk警告不影响构建成功和应用运行",
  "Vitest在vite.config.ts中添加test.environment='node'配置即可支持纯逻辑测试",
  "【重要安全规则】严禁用Write工具创建src/__tests__/目录内的文件！Write工具会将__转义为\\_\\_导致创建错误目录，必须用Bash cat heredoc方式创建测试文件",
  "【迭代89新增】死代码方法扫描策略：用Python脚本找public方法→grep '.methodName('验证无外部调用→并行派发子代理批量删除，效率极高",
  "【迭代96新增】整系统文件死代码的识别方法：检查'类名是否出现在Game.ts'而非'实例字段是否有.update()调用'，因为很多系统通过_batchXXY数组批量调度",
  "【迭代100新增-最重要】非空断言扫描必须同时用两种正则：① [^a-zA-Z]!\\. 匹配 x!.y 形式；② \\)!(?=[.\\[;,\\)\\s]|$) 匹配 func()! 形式。只用其中一种必然漏报！",
  "【迭代112新增】some(item => item.entityId === eid)在for(entities)循环内是O(n*list)陷阱——标准修复：添加private _xxxSet = new Set<number>()，push时.add(eid)，splice时.delete(eid)，查询时.has(eid)",
  "【迭代112新增】添加Set优化后，public查询方法(getXxx)需要加lazy sync fallback——因为测试会直接push内部数组绕过Set",
  "【迭代120新增】项目进入「稳定维护」阶段：systems/game/civilization/entities/ui/utils所有目录的私有方法死代码已全部清除，find()/some()优化已穷举",
  "【迭代121新增】测试路径规范：src/__tests__/目录内的测试文件import路径是'../systems/'（单级上溯），不是'../../systems/'（双级）",
  "【迭代121新增】数据模块（仅含常量/接口/纯函数的文件）是最易测的模块——无需mock、无Canvas、无DOM",
  "【迭代122新增】addComponent API需要带type字段的对象：{ type: 'position', x, y }不能缺type字段，否则getEntitiesWithComponents找不到实体",
  "【迭代122新增】performance.now()在短生命周期测试进程中可能<3000ms——需用vi.spyOn(performance, 'now').mockReturnValue(大数)来mock超时测试",
  "【迭代123新增】工匠系统cleanup边界规则：先递增后cleanup，cleanup条件<=4，初始值4.0会在+0.02后变4.02>4不删除，需用3.98确保4.00<=4触发删除",
  "【迭代124新增】并行Agent批处理效率极高：每批9个系统，3个Agent并行，2-3分钟完成+100-180个测试，本轮共处理81个系统，+904个测试",
  "【迭代125新增】测试含招募逻辑的cleanup时：getEntitiesWithComponent必须返回空数组[]，否则招募新实体会干扰cleanup后数量断言（NomadSystem是典型案例）",
  "【迭代126新增】Diplomatic系统有3种update签名变体：(a)标准4参数(dt,world,em,tick)；(b)3参数(dt,em,civManager,tick)；(c)含civs数组的特殊签名。必须先读源码确认",
  "【迭代127新增】random=0导致civA===civB早返回问题：duration/cleanup测试必须用mockReturnValue(1)跳过spawn块",
  "【迭代129新增】spawn后同次update立刻执行duration+=1——新spawn的arrangement.duration=1不是0，测试时注意边界",
  "【迭代130新增】Flaky测试根本原因：cleanup/state测试中未mock Math.random，spawn逻辑有小概率触发导致length断言失败或TypeError",
  "【迭代130新增】Flaky修复策略：在有sys.update()且有确定性toHaveLength(N)断言的测试中，在update前加vi.spyOn(Math,'random').mockReturnValue(0.9)",
  "【迭代131新增】TileType枚举正确值：DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7——MOUNTAIN=5不是4！",
  "【迭代131新增】hasAdjacentTile安全mock：用getTile:()=>2(SAND)，因为SAND既不匹配SHALLOW_WATER也不匹配DEEP_WATER也不匹配MOUNTAIN，可靠阻断Spring系统spawn",
  "【迭代133新增】WorldFrostbiteSystem severity升级：mild→moderate@60000→severe@120000→extreme@200000，age>300000时active=false并删除",
  "【迭代134新增】WorldFumaroleSystem cleanup特殊性：temperature=50时会先Math.max(50,50-0.01)=50，然后判断<=50触发删除——边界测试需注意",
  "【迭代134新增】WorldFungalNetworkSystem有Set去重结构_networkKeySet：key=x*10000+y，cleanup时需同步清除keySet",
  "【迭代134新增】WorldGeoglyphSystem非时间cleanup：visibility<=10（侵蚀阈值），age>100000才触发-0.03递减——需要tick差值>100000才能观察到侵蚀",
  "【迭代134新增】温泉/地热系统（GeothermalPool/GeothermalSpring）无特殊spawn tile要求，任意地形均可，字段temperature有随机浮动+Math.max/min钳制"
]

迭代轮次: 41/100


🔄 自我进化（每轮必做）：
完成本轮工作后，更新 .claude/loop-ai-state.json：
{
  "notes": "本轮做了什么、发现了什么问题、下轮应该做什么",
  "priorities": "根据当前项目状态，你认为最重要的 3-5 个待办事项",
  "lessons": "积累的经验教训，比如哪些方法有效、哪些坑要避开",
  "last_updated": "2026-03-03T00:29:26+08:00"
}
这个文件是你的记忆，下一轮的你会读到它。写有价值的内容，帮助未来的自己更高效。
