仅做修复、优化和测试，严禁新增任何功能。\n\n📋 本轮任务：\n1. git log --oneline -10 检查当前状态\n2. 阅读 .claude/loop-ai-state.json 了解上轮笔记\n3. 运行类型检查、构建、测试，找出所有错误\n4. 修复 bug、性能问题、代码质量问题\n5. 优化现有代码（重构、简化、消除技术债）\n6. 确保所有测试通过\n7. 每修复一个问题就 git commit + git push\n\n🔴 铁律：\n- 严禁新增功能\n- 只修复、优化、测试\n- 类型检查必须通过\n- 构建必须成功\n- 每次 commit 后 git push origin main

🧠 AI 上轮笔记：迭代143（循环50/100）。本轮主要成就：收集并提交ZZZ2/AAA3/BBB3三批Agent结果，测试从15879增至16307，+428个测试。

本轮处理的系统（3批Agent并行）：
ZZZ2组(+142): WorldPeatBogSystem(52) WorldPedimentSystem(53) WorldPermafrostThawSystem(52)
AAA3组(+144): WorldPetrificationSystem(53) WorldPinnacleSystem(52) WorldPlayaSystem(54)
BBB3组(+142): WorldPotassiumSpringSystem(52) WorldPraseodymiumSpringSystem(52) WorldQuicksandSystem(53)

关键发现：
- WorldPeatBogSystem: CHECK_INTERVAL=?, FORM_CHANCE=?, cutoff=95000, spawn后waterTable同帧偏移（spawn=60+rand*30，update±0.25）
- WorldPedimentSystem: CHECK_INTERVAL=?, cutoff=90000, spawn后slope(-0.00002)和spectacle(+(rand-0.47)*0.09)同帧偏移
- WorldPermafrostThawSystem: CHECK_INTERVAL=?, cutoff=85000, spawn后groundStability(-0.03)同帧偏移
- WorldPetrificationSystem: spawn后age=1(非0)、radius已增加spreadRate——spawn+update同帧，邻近距离排斥dx²+dy²<400
- WorldPinnacleSystem: cutoff=93000, cleanup用严格<（tick===cutoff时保留）
- WorldPlayaSystem: cutoff=88000, cleanup用严格<
- WorldPotassiumSpringSystem: cutoff=57000, 字段spawn后静态不变（无per-record update）
- WorldPraseodymiumSpringSystem: cutoff=54000, 与Potassium结构对称，仅常量不同
- WorldQuicksandSystem: tile=SAND(2)或GRASS(3)，cleanup依据active=false字段而非tick年龄，depth波动/radius扩张/实体陷阱在update阶段执行

当前已派发下一批（CCC3/DDD3/EEE3）：
- CCC3组(a5a1194adc833e296): WorldOsmiumSpringSystem WorldOutlierSystem WorldProtactiniumSpringSystem
- DDD3组(ac18d809395d54e23): WorldPumiceFieldSystem WorldPurificationSystem WorldPyroclasticFlowSystem
- EEE3组(a747b3bf50e2d7edf): WorldRadiumSpringSystem WorldRadonSpringSystem WorldRainbowSystem

下轮优先方向：
1. 等待CCC3/DDD3/EEE3 Agent完成，收集结果
2. 运行全量测试验证，修复flaky测试
3. 继续处理WorldR系列（Ravine/Rift/RiftValley/Rock系列）
🎯 AI 自定优先级：[
  "1. 【持续目标】继续处理World系统（剩余约50个文件），用并行Agent批量处理",
  "2. 【持续监控】tsc+vitest+build三重验证保持全绿（当前16307/16307通过）",
  "3. 【里程碑】已完成162个World系统测试改善（+4652测试），继续下一批",
  "4. 【策略】每批3 Agent × 3文件 = 9个系统，每批约+400-500测试",
  "5. 【下一批系统】WorldR系列（Ravine/Rift/RiftValley/Rock系列）"
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
  "【迭代130新增】Flaky测试根本原因：cleanup/state测试中未mock Math.random，spawn逻辑有小概率触发导致length断言失败或TypeError",
  "【迭代130新增】Flaky修复策略：在有sys.update()且有确定性toHaveLength(N)断言的测试中，在update前加vi.spyOn(Math,'random').mockReturnValue(0.9)",
  "【迭代131新增】TileType枚举正确值：DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5, SNOW=6, LAVA=7——MOUNTAIN=5不是4！",
  "【迭代135新增】spawn后立即update的off-by-one陷阱：同一次update()内先spawn再update所有记录，导致spawn初始值立即偏移（-0.01,-0.02,-0.004等）——修复方案：断言下界用Math.max保底值而非spawn初始值",
  "【迭代137新增】tick==CHECK_INTERVAL边界：条件tick-lastCheck<CHECK_INTERVAL，等于时3000-0=3000不<3000，会执行（而非不执行）",
  "【迭代138新增】WorldLabyrinthSystem cleanup双条件：explored>=100 AND tick<cutoff，两个条件都满足才删除",
  "【迭代138新增】WorldLaharSystem cleanup条件为velocity<=1（含等于），是<=不是<——与大多数系统的严格小于不同！",
  "【迭代138新增】WorldLighthouseSystem building→active条件：tick-lh.tick>5000（严格大于），测试需用5001而非5000才能触发状态转换",
  "【迭代139新增】WorldMaelstromSystem age超MAX_AGE后active=false并立刻被cleanup删除——不能断言active字段，应断言toHaveLength(0)",
  "【迭代139新增】WorldMagicStormSystem的spawn后同tick触发moveStorms：age从0→1（非0），spawn字段测试必须考虑同帧update偏移",
  "【迭代139新增】WorldMagicStormSystem的cleanupZones：tick>=decayAt（含等于）时删除，与常见严格<相反！",
  "【迭代140新增】WeatherSystem.test.ts的mock world需包含getSeason方法——WeatherSystem.update()在startRandomWeather时调用this.world.getSeason()",
  "【迭代140新增】Flaky概率测试：5%概率100次循环失败概率0.95^100≈0.6%偶尔失败，改为500次（0.95^500≈7e-12）消除flakiness",
  "【迭代141新增】WorldMudslideSystem预填充泥石流：默认startTick=0,duration=800在tick=1400时progress=175>100被cleanup删除——需用startTick=1000,duration=800确保progress=50<100保留",
  "【迭代141新增】WorldNorthernLightsSystem spawn后evolve立即修改age=0的极光intensity为faint——spawn后的intensity断言应改为测试progress在[0.3,0.7]区间时intensity保持不变",
  "【迭代141新增】WorldOasisSystem的spawn判断是Math.random()>FORM_CHANCE（大于，与其他系统<不同！），需特别注意判断方向",
  "【迭代141新增】WorldNunatakSystem的spawn后update立即修改字段：weathering+0.002、exposedRock+=(random-0.48)*0.1等，断言需用toBeCloseTo而非toBe",
  "【迭代142新增】WorldObsidianFieldSystem tradeValue=deposit*1.5*(sharpness/100)中，sharpness用的是更新前的旧值——因为源码先计算tradeValue，再更新sharpness",
  "【迭代142新增】WorldPermafrostSystem的applyEffects在节流外执行——不受CHECK_INTERVAL约束，即使tick<CHECK_INTERVAL也会对范围内生物造成COLD_DAMAGE",
  "【迭代142新增】WorldPermafrostSystem多个zone同时thaw测试：depth=10,thawRate=2只减一次（10-2=8>0不删除），需用depth=0.5,thawRate=2才能触发删除（0.5-2<0）",
  "【迭代142新增】WorldPhreaticExplosionSystem的steamPressure下限测试：max(5, 5.02-0.03)=max(5,4.99)=5，不能用toBeCloseTo(4.99)断言中间值，只能断言最终值toBe(5)",
  "【迭代143新增】WorldPetrificationSystem邻近距离排斥：预填充zones坐标需离新spawn点>20单位（dx²+dy²<400时拒绝），测试预填充用(50+i*10,50)而非(i,i)",
  "【迭代143新增】WorldQuicksandSystem cleanup依据active=false字段（不是tick年龄），与大多数系统不同——需检查源码确认cleanup触发条件类型",
  "【迭代143新增】Spring系统静态字段确认：WorldPotassiumSpring/WorldPraseodymiumSpring字段spawn后不被update修改——与WorldHotSpring2等动态Spring不同"
]

迭代轮次: 51/100


🔄 自我进化（每轮必做）：
完成本轮工作后，更新 .claude/loop-ai-state.json：
{
  "notes": "本轮做了什么、发现了什么问题、下轮应该做什么",
  "priorities": "根据当前项目状态，你认为最重要的 3-5 个待办事项",
  "lessons": "积累的经验教训，比如哪些方法有效、哪些坑要避开",
  "last_updated": "2026-03-03T02:22:11+08:00"
}
这个文件是你的记忆，下一轮的你会读到它。写有价值的内容，帮助未来的自己更高效。
