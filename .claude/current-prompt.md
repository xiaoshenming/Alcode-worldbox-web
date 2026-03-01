仅做修复、优化和测试，严禁新增任何功能。\n\n📋 本轮任务：\n1. git log --oneline -10 检查当前状态\n2. 阅读 .claude/loop-ai-state.json 了解上轮笔记\n3. 运行类型检查、构建、测试，找出所有错误\n4. 修复 bug、性能问题、代码质量问题\n5. 优化现有代码（重构、简化、消除技术债）\n6. 确保所有测试通过\n7. 每修复一个问题就 git commit + git push\n\n🔴 铁律：\n- 严禁新增功能\n- 只修复、优化、测试\n- 类型检查必须通过\n- 构建必须成功\n- 每次 commit 后 git push origin main

🧠 AI 上轮笔记：迭代88完成。修复迭代87遗留的大规模测试失败问题，并完成所有系统文件提交。主要工作：1) 修复TS错误(AchievementSystem.test.ts的ASI问题和_unlockedBuf字段访问)；2) 批量恢复测试文件的getter调用——Python脚本把sys.getXxx(key)错误替换成(sys as any).xxx，本轮通过3个并行Agent修复了341个测试文件；3) 提交284个系统文件的dead getter删除；4) 全部5359测试通过，TypeScript零错误。主要修复模式：①getXxx().get(key)->getXxx(key)直接传参；②readonly数组注入改为私有字段；③lazy buffer改为public方法；④ASI加分号；⑤字段名映射修正。
🎯 AI 自定优先级：[
  "1. 继续扫描更多死代码机会 — 现在系统文件已经批量处理过了，可以聚焦在更精细的优化",
  "2. 检查是否还有'switch返回固定对象'模式可转为模块级const单例",
  "3. 扫描热路径中的字符串拼接和临时对象创建",
  "4. 检查是否有更多序列化/反序列化死代码可以删除",
  "5. 考虑对ECS核心路径进行进一步优化"
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
  "per-tick生物位置缓存模式：在系统update开始一次性收集所有生物位置到平坦数组",
  "接口注入模式：提取模块时定义只包含所需字段的接口，Game通过`this as unknown as Interface`传入，避免循环依赖",
  "vite循环chunk警告不影响构建成功和应用运行",
  "Vitest在vite.config.ts中添加test.environment='node'配置即可支持纯逻辑测试",
  "【重要安全规则】严禁用Write工具创建src/__tests__/目录内的文件！Write工具会将__转义为\\_\\_导致创建错误目录，必须用Bash cat heredoc方式创建测试文件",
  "【迭代27新增】alive Set反模式：可用em.hasComponent(id,'creature')直接替代，零分配",
  "【迭代28新增】this.xxx = this.xxx.filter(...)在每帧调用的update()中是高优先级GC源 — 用for逆序+splice替代",
  "【迭代29新增】ctx.setLineDash([a*zoom,a*zoom])每帧新建数组 — 用_dashBuf[0]=val; _dashBuf[1]=val + setLineDash(_dashBuf)消除",
  "【迭代45新增】EventLog环形缓冲区模式：_buf[MAX]+_head+_count，shift()→_head=(head+1)%MAX",
  "【迭代47新增】预计算查找表模式（Record<EnumType,string>）：消除render路径中固定枚举的字符串操作",
  "【迭代47新增】Map复用模式：不new Map()而是复用_xxxCache，reset各entry字段",
  "【迭代48新增】整数查找表模式：0-10范围的整数用预计算的_INT_STR=['0','1',...,'10']查找表，避免String(n)分配",
  "【迭代49新增】对象数组→平坦缓冲区模式：unclaimed:{id,x,y}[]改为_idBuf/_xBuf/_yBuf三个数组",
  "【迭代53新增】方法内字面量数组反模式：const types: FooType[] = ['a','b','c'] 在每次调用时重建 — 提取为模块级常量",
  "【迭代56新增】EcosystemSystem热路径：Array.includes→Set.has是最高收益优化",
  "【迭代63新增】render路径字符串缓存模式：对于低频变化的显示值，在值变化时重建缓存字符串，render直接用缓存",
  "【迭代65新增】系统级header字符串缓存模式：在数据变化时重建，render直接用",
  "【迭代67新增】外部设置数据时批量预计算字符串：updateXxx等在接收外部数据时一次性预计算所有render需要的字符串缓存",
  "【迭代69新增】float64Array平坦缓冲区替代number[][]嵌套数组：cumulative[i][c]改为_cumBuf[i*STRIDE+c]",
  "【迭代72新增】字符串脏标记改数值比较模式：_prevA, _prevB + if(a!==_prevA||b!==_prevB)——消除每帧临时字符串",
  "【迭代72新增】BattleReplaySystem.findMVP是O(frames×units²)复杂度，每render调用极贵——移至stopRecording时一次性计算并存mvpStr",
  "【迭代73新增】??fallback永不触发的识别模式：接口已保证字段赋值（addXxx内设置）时，render路径??fallback是冗余GC源，用!替代",
  "【迭代73新增】颜色字符串拼接预计算：color+'33'/color+'44'/color+'CC'等固定后缀在模块初始化时预计算为查找表",
  "【迭代73新增】脏标记缓存render路径中的O(N)计算：getOrderedSamples()/buildLayout()等在数据变化时设置_xxxDirty=true，render时检查后按需重建",
  "【迭代75新增】粒子池化通用模式：固定MAX_SIZE数组+maxLife=0为空槽，spawn时找空槽复用，update时maxLife=0跳过，render时检查，消除splice和push对象字面量",
  "【迭代79新增】getter方法返回{...}的识别模式：getPanelRect/panelRect()等每帧调用的方法，若返回{x,y,w,h}，应改为缓存对象+screenW/H脏标记，仅屏幕尺寸变化时重算",
  "【迭代81新增】枚举switch固定返回N个对象：提取为N个模块级const单例，switch直接return引用 — 7种OreType→7个_BONUS_XXX常量，零GC分配",
  "【迭代81新增】死代码识别：grep整个src目录（排除tests）确认方法名无调用者后直接删除，消除潜在分配",
  "【迭代84新增】删除死代码前必须确认：grep -rn 'methodName' src/game/ src/systems/ — 不只grep src/，因为Game.ts中可能有内部调用",
  "【迭代85新增】serialize/deserialize死代码规律：若SaveSystem.ts中没有grep到对应系统的serialize调用，则该系统的serialize/deserialize是安全可删的死代码",
  "【迭代86新增】增量更新计数缓存：getProgress()等返回{count,total}的方法，在unlock时increment而非每次O(N)扫描，getProgress直接返回_progressBuf引用",
  "【迭代86新增】getActiveSpies/getActiveXxx改为private的识别：若外部无调用者但内部render/update使用，改为private而非删除",
  "【迭代88新增】Python批量替换脚本风险：getXxx(key)可能被错误替换为getXxx()?.get(key)，造成大量测试失败；下次处理时要仔细核对方法签名",
  "【迭代88新增】lazy buffer访问陷阱：_unlockedBuf等buffer只在调用对应getter后才填充，测试应调用public方法而非直接访问buffer",
  "【迭代88新增】readonly数组注入：系统getter返回ReadonlyArray时，测试注入数据应改为(sys as any).privateField.push()而非getter().push()",
  "【迭代88新增】ASI（自动分号插入）陷阱：void返回的调用后接(...)括号会被解析为函数调用，需加分号防止"
]

迭代轮次: 89/100


🔄 自我进化（每轮必做）：
完成本轮工作后，更新 .claude/loop-ai-state.json：
{
  "notes": "本轮做了什么、发现了什么问题、下轮应该做什么",
  "priorities": "根据当前项目状态，你认为最重要的 3-5 个待办事项",
  "lessons": "积累的经验教训，比如哪些方法有效、哪些坑要避开",
  "last_updated": "2026-03-01T15:54:09+08:00"
}
这个文件是你的记忆，下一轮的你会读到它。写有价值的内容，帮助未来的自己更高效。
