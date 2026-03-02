仅做修复、优化和测试，严禁新增任何功能。\n\n📋 本轮任务：\n1. git log --oneline -10 检查当前状态\n2. 阅读 .claude/loop-ai-state.json 了解上轮笔记\n3. 运行类型检查、构建、测试，找出所有错误\n4. 修复 bug、性能问题、代码质量问题\n5. 优化现有代码（重构、简化、消除技术债）\n6. 确保所有测试通过\n7. 每修复一个问题就 git commit + git push\n\n🔴 铁律：\n- 严禁新增功能\n- 只修复、优化、测试\n- 类型检查必须通过\n- 构建必须成功\n- 每次 commit 后 git push origin main

🧠 AI 上轮笔记：迭代136（循环43/100）。本轮主要成就：批量处理9个World系统测试（EEE2/FFF2/GGG2组），测试从13731增至13958，+227个测试。

本轮处理的系统（分3批Agent并行）：
EEE2组(+70): WorldHeatmapSystem(5→30) WorldHogbackSystem(5→28) WorldHolmiumSpringSystem(5→27)
FFF2组(+87): WorldHoodooSystem(5→30) WorldHotPoolSystem(5→29) WorldHotSpringSystem(5→33)
GGG2组(+80): WorldHotSpringSystem2(5→29) WorldIceCaveSystem(5→30) WorldIceSheetSystem(5→36)

关键发现：
- WorldHeatmapSystem: update(_tick)只有1个参数（不是标准4参数），handleKey('m')循环5种模式，grids是Map<string,Float32Array>
- WorldHogbackSystem: CHECK_INTERVAL=2620, MAX_HOGBACKS=15, spawn需MOUNTAIN(5)/FOREST(4), cleanup: tick-91000
- WorldHolmiumSpringSystem: CHECK_INTERVAL=2990, 3次attempt, nearWater||nearMountain, cleanup: tick-54000, 无动态字段更新
- WorldHoodooSystem: CHECK_INTERVAL=2800, MAX_HOODOOS=16, spawn需SAND(2)/MOUNTAIN(5), 侵蚀update(height-=erosionRate*0.0003), cleanup: tick-90000
- WorldHotPoolSystem: CHECK_INTERVAL=2730, MAX_POOLS=7, 无tile限制, age+=0.004, cleanup: age>=93
- WorldHotSpringSystem: CHECK_INTERVAL=3800, MAX_SPRINGS=10, spawn需MOUNTAIN/FOREST, TTL=300000, visitors有0.02概率++
- WorldHotSpringSystem2: CHECK_INTERVAL=2640, MAX_SPRINGS=10, waterTemp衰减至<=30触发cleanup, 无tile限制
- WorldIceCaveSystem: CHECK_INTERVAL=2900, 3次attempt, 需SNOW(6)/MOUNTAIN(5), cleanup: tick-58000
- WorldIceSheetSystem: CHECK_INTERVAL=4000, MAX_ICE_SHEETS=8, 需SNOW(6), expanding逻辑+thickness/area<=0 cleanup

本轮flaky陷阱：
1. WorldHotSpringSystem visitors off-by-one: spawn时random=0触发0<0.02使visitors在spawn帧立即变1，修复：直接注入对象测初始值
2. WorldHotSpringSystem2 waterTemp=30.001钳位后被cleanup删除: 30.001-0.005=29.996→Math.max(30,29.996)=30→30<=30删除，修复：改为验证toHaveLength(0)
3. WorldIceCaveSystem 3次attempt都spawn: random=0时3次都满足→spawn3个，修复：改为toBeGreaterThanOrEqual(1)

当前已派发下一批（HHH2/III2/JJJ2）：
- HHH2组: WorldIceShelfSystem WorldIndiumSpringSystem WorldInlierSystem
- III2组: WorldInselbergSystem WorldIridiumSpringSystem WorldIrrigationSystem
- JJJ2组: WorldKarstSpringSystem WorldKarstTowerSystem WorldKelpForestSystem

下轮优先方向：
1. 等待HHH2/III2/JJJ2 Agent完成，收集结果
2. 运行全量测试验证，修复flaky测试
3. 继续处理WorldK/L/M系列
🎯 AI 自定优先级：[
  "1. 【持续目标】继续处理World系统（剩余约150个文件），用并行Agent批量处理",
  "2. 【持续监控】tsc+vitest+build三重验证保持全绿（当前13958/13958通过）",
  "3. 【里程碑】已完成90+9=99个World系统测试改善（+2076+227=2303测试），继续下一批",
  "4. 【策略】每批3 Agent × 3文件 = 9个系统，每批约+150-250测试",
  "5. 【下一批系统】WorldKettleHoleSystem及后续K/L/M系列"
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
  "【迭代134新增】温泉/地热系统（GeothermalPool/GeothermalSpring）无特殊spawn tile要求，任意地形均可，字段temperature有随机浮动+Math.max/min钳制",
  "【迭代135新增】spawn后立即update的off-by-one陷阱：同一次update()内先spawn再update所有记录，导致spawn初始值立即偏移（-0.01,-0.02,-0.004等）——修复方案：断言下界用Math.max保底值而非spawn初始值",
  "【迭代135新增】GeothermalVentSystem的eruption陷阱：ERUPTION_CHANCE=0.008，random=0时0<0.008会触发eruption，使heatOutput+40/cooldown=2000+random*3000/activity='erupting'——需用mockReturnValueOnce(0).mockReturnValue(0.9)分别控制spawn和后续update",
  "【迭代135新增】GeyserFieldSystem的eruptionInterval干扰cleanup：lastEruption=0+小tick时会触发喷发+5温度，阻止cleanup；测试cleanup时设eruptionInterval:999999",
  "【迭代135新增】GeyserSystem cleanup测试必须用nullTileWorld（getTile:()=>null）：nullTile阻断spawn，确保cleanup后无新记录干扰length断言",
  "【迭代135新增】WorldGeothermalSystem spawn需tile>=6(SNOW=6或LAVA=7)，不是MOUNTAIN=5；safeWorld用getTile:()=>2(SAND)阻断spawn",
  "【迭代136新增】WorldHeatmapSystem的update()只有1个参数_tick，不是标准4参数(dt,world,em,tick)——调用时必须用sys.update(tick)单参数形式",
  "【迭代136新增】WorldHotSpringSystem visitors off-by-one: spawn时random=0使visitors在spawn帧立即变1（0<0.02）——测试初始visitors必须直接注入对象而非通过update spawn",
  "【迭代136新增】WorldHotSpringSystem2 waterTemp钳位触发cleanup: waterTemp=30.001经update→Math.max(30,29.996)=30→30<=30被cleanup删除——需验证toHaveLength(0)而非读取waterTemp",
  "【迭代136新增】3次attempt系统(IceCaveSystem等): random=0时3次都spawn→length=3，spawn验证改用toBeGreaterThanOrEqual(1)而非toHaveLength(1)",
  "【迭代136新增】IceShelfSystem特殊cleanup: sh.tick < cutoff-100000 || sh.thickness < 10，spawn后thickness初始>=20但update后立即减少calvingRate*0.05"
]

迭代轮次: 44/100


🔄 自我进化（每轮必做）：
完成本轮工作后，更新 .claude/loop-ai-state.json：
{
  "notes": "本轮做了什么、发现了什么问题、下轮应该做什么",
  "priorities": "根据当前项目状态，你认为最重要的 3-5 个待办事项",
  "lessons": "积累的经验教训，比如哪些方法有效、哪些坑要避开",
  "last_updated": "2026-03-03T01:07:27+08:00"
}
这个文件是你的记忆，下一轮的你会读到它。写有价值的内容，帮助未来的自己更高效。
