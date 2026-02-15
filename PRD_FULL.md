# PRD — 《一介新手，制霸剑道全国》 — 完整版

版本：v1.0
作者：产品 & 技术合成稿
目标：生成可交付给开发团队的小程序产品需求文档（PRD），用于直接实现 MVP 并上线微信小程序。

一、项目概述
- 名称（暂定）：《一介新手，制霸剑道全国》
- 品类：卡牌策略 · 单局通关（可扩展 PVP、多人生存/剧情）
- 平台：微信小程序（首发），后续 H5 / 原生支持
- 核心卖点：搞笑+戏谑+中二的剑道梗文案包裹下的卡牌通关体验；短时强代入的晋级流程（地方→地区→全国）；多结局与高复玩价值。

二、目标用户与定位
- 目标用户：18–35 岁喜好二次元/体育竞技梗、休闲策略玩家、剑道圈内/外段子手
- 产品定位：休闲＋策略，轻竞技导向，快节奏对局（30–60 分钟/局）

三、总体玩法框架（一句话）
- 玩家通过卡牌构筑与事件选择，在道馆成长并通过地方→地区→全国积分赛的晋级流程，最终挑战全国赛魔王或选择另类职业路线，过程中面临伤病、舆论与财务等真实化约束，形成多结局通关体验。

四、必须实现的功能清单（MVP 范围）
1. 初始创建：城市、道馆、流派选择与初始卡组生成
2. 卡牌引擎：抽牌、出牌、消耗、手牌/弃牌堆、卡牌效果执行
3. 事件系统：随机事件 + 剧情事件模板，可读并影响玩家状态
4. 单人比赛（AI）：地方赛（短系列赛）与积分结算逻辑
5. 成长系统：经验、等级、卡牌升级/解锁
6. UI：创建界面、卡组界面、对局界面、事件弹窗、结算页
7. 本地存档与简单云存档（微信云）

五、产品调性与文案规范
- 风格：搞笑、戏谑、中二、现实毒打（讽刺剑道圈真实生态）
- 长短句交替使用，避免低俗词汇，注意审核规则（微信）
- 示例语气：贴吧老哥 + 剑道老前辈 + 游戏策划喝多了的调侃

六、详细系统设计

6.1 初始创建（实现细则）
- 步骤：城市选择 -> 道馆选择 -> 流派选择 -> 初始卡组/数值生成
- 城市（参数）:
  - 一线: startCoins=800, exposure=1.3, baseOpponentStrength=1.2, dojoLevel=3
  - 二线: startCoins=500, exposure=1.0, baseOpponentStrength=1.0, dojoLevel=2
  - 小城: startCoins=300, exposure=0.7, baseOpponentStrength=0.85, dojoLevel=1
- 道馆（标签）: 每个道馆定义 GrowthMultiplier, InjuryRiskDelta, LearnCardBias, SponsorChance
- 流派：中段/上段/二刀，每个流派有专属卡池 ID 前缀，专属被动、专属事件触发概率

6.2 卡牌系统（数据驱动）
- 数据格式（cards.json）: { id, name, type, cost, effectType, params, rarity, growthTag, isFlowExclusive }
- 类型：tech/tactic/body/learn/social/event
- 回合资源：Energy（每回合基础恢复=3，可通过被动/卡提升）
- 抽牌/弃牌：起手 5，回合抽 2（受技能影响）
- 升级：重复卡合成或消耗经验道具提升卡牌数值（受道馆 GrowthMultiplier）

6.3 事件系统（事件模板）
- 事件字段（events.json）: { id, title, description, triggers, options: [{ id, text, effects }] }
- 触发器：timeBased (matchCount/day), actionBased (useCardId), thresholdBased (exposure> X)
- 效果语言：effects 使用小型 DSL 或 JSON 变更数组（coins +=, exp +=, injury +=, exposure +=, deckAddCardId）

6.4 比赛系统（对局引擎）
- 回合结构：StartPhase (恢复/触发被动) -> DrawPhase -> ActionPhase -> EndPhase (状态衰减/触发事件)
- 读招机制：玩家可使用战术卡下注对手动作，若猜中触发额外分数/连段条件
- 胜负判定：达到对手 HP <=0 或比赛回合数结束后积分高者胜
- 伤病逻辑：高损伤动作或过度训练产生伤病值，伤病累计到阈值会触发医疗事件或永久减益

6.5 积分与晋级
- 每场基础积分（winPoints = 100），连胜加成 +10%/连胜，连败惩罚 -15%/连败
- 曝光系数：exposure 正向可提升 sponsorChance 与局外金币，负向会触发舆论事件并降低晋级加成
- 晋级流程：累积赛季积分达到门槛自动晋级到下一赛区；赛季保留机制：晋级保留部分积分

6.6 多结局（决策树）
- 结局触发条件由状态机计算：{ injuryLevel, exposure, coins, dojoRelation, seasonPoints }
- 主要结局：全国冠军/亚军/职业选手线/教练线/商业变现/摆烂主播（喜剧）/伤病退役/被逐出道馆/圈内封杀/经济崩盘


七、数据模型（简化 schema，便于实现）
- users: { id, nickname, city, dojoId, flowId, level, exp, coins, deck: [cardId], stats, lastSaved }
- cards: { id, name, type, cost, params, rarity, flowExclusive }
- dojos: { id, name, tags, growthMultiplier, injuryRiskDelta }
- events: { id, title, desc, triggers, options }
- matches: { id, players, result, replay, timestamp }
- leaderboard: { seasonId, userId, points, rank }

八、前端架构（微信小程序）
- 推荐栈：Taro + React + TypeScript（便于后续 H5/Native），也可使用原生小程序框架
- 目录建议：
  - src/pages/* 页面
  - src/components/* 可复用组件（CardView、DeckEditor、EventModal、MatchView）
  - src/data/* cards.json, events.json, ai_profiles.json
  - src/utils/* cardEngine.ts, eventEngine.ts, matchEngine.ts, storage.ts
- 存储：本地使用 `wx.setStorageSync`，云端使用微信云开发或独立后端

九、后端与服务（MVP 可无后端，仅本地）
- MVP：本地驱动（cards/events 存在包内），云端仅用于排行榜/云存档/分享
- 若需 PVP / 实时：Node.js + WebSocket / Redis + 排队/房间服务

十、AI 对手与难度曲线
- AI 配置文件驱动：ai_profiles.json 定义不同段位决策权重（攻/防/读招），AI 行为为带权随机策略
- 难度随着赛区提升：更高 winThreshold、更强决策权重、特殊卡池

十一、UI/UX 要点与关键页面流程
- 页面：启动页 → 创建页（城市/道馆/流派）→ 主界面（道馆/训练/比赛/商店）→ 卡组编辑 → 对局视图 → 事件弹窗 → 赛后结算 → 排行榜/剧情分支页面
- 对局视图核心：卡牌拖拽或点击出牌，右侧显示对手动作/读招提示，顶部显示回合/体力/曝光/金币
- 事件弹窗支持：简短动画、选项按钮、后果预览（概率/风险）

十二、示例流程（前 30 分钟）
1) 新手创建：选二线 + 技术道馆 + 中段流
2) 教程训练：完成 2 个训练事件，获得 2 张学习卡、+1 maxHP
3) 友谊赛（教学赛）：学习抽牌/出牌/读招机制，完成胜利
4) 卡组调整：合成 1 张基础卡升级，替换手牌
5) 地方小赛：3 场循环，触发一次舆论事件或小伤病，结算并展示晋级目标

十三、内容示例（已实现于 data 文件夹）
- 示例卡牌集（10 张），示例事件集（5 条），Bad Ending 文案（3 条），Final Boss 设定（山本·不动）

十四、运营与变现策略
- 首发：免费 + 内购（非付费胜利，出售皮肤/表情/扩展卡包、DLC 道馆）
- 广告策略：可选插屏/激励视频（用于快速恢复体力或翻牌）
- 活动：周赛季节限定卡池、直播互动（摆烂主播线与观众互动）

十五、合规、审核与上线准备清单
- 隐私协议、用户数据说明、未成年人保护（非暴力/未含赌博）
- 游戏分类：互动游戏；避免敏感词、涉未成年人或鼓励极端行为的表述
- 上线资源：图标、启动图、截图、版本说明、客服邮箱

十六、测试与平衡计划
- 单元：卡牌效果、事件效果、积分计算、晋级判定
- 集成：一整局本地模拟（仿真器），千局随机数值测试用于平衡
- 性能：对小程序内存、卡牌渲染优化，避免大 JSON 一次性加载卡顿

十七、开发里程碑（详细）
- Sprint 1（Week1）: PRD 完成、基础数据模型、卡牌/事件 JSON、轻量卡牌引擎
- Sprint 2（Week2）: 小程序骨架、创建页面、卡组编辑、基础 UI
- Sprint 3（Week3）: 单局对战（AI）、事件系统、存档
- Sprint 4（Week4）: 地方赛 + 积分逻辑、结算 & 排行榜（云端可选）
- Sprint 5（Week5）: UI 打磨、文案补全、内测准备、Bugfix
- Sprint 6（Week6）: 上线提交、审核、发布

十八、后续扩展（PVP / DLC / 多人生存）
- 异步回合 PVP：玩家提交回合动作，服务器重放对战
- 实时 PVP：房间/WebSocket（后期扩展）
- DLC：新增道馆、流派、Boss 战、限时活动卡池

十九、运维与数据监测（KPI）
- 日活（DAU）、次留（D1）、7 日留存、付费转化、ARPU、平均局时长、平均局数/天
- 通过云函数/后端记录比赛数据（非必要时用采样上报）

二十、交付清单（交付给开发）
1. this PRD_FULL.md（功能与流程详述）
2. cards.json / events.json（位于 `src/data/`）
3. 简易卡牌引擎（`src/utils/cardEngine.ts`）
4. 小程序骨架（`src/pages/`、`src/app.tsx`）
5. 构建 & 发布说明（README.md）

二一、风险与应对
- 风险：数值失衡 → 应对：早期搭建仿真器 + 自动化批量测试
- 风险：微信审核问题 → 应对：提前准备隐私政策、避免敏感表述
- 风险：性能问题（小程序限制）→ 应对：资源懒加载、精简卡牌渲染

二二、下一步建议
1. 立即开始 Sprint 1：完善数据模型、补齐卡牌/事件库到至少 50 张/30 条
2. 建立 CI（GitHub Actions）用于构建与单元测试
3. 组织 1 批小范围内测（团队/好友）收集平衡数据

附件：已把示例卡牌与事件写入 `src/data/cards.json` 与 `src/data/events.json`。

—— 文档结束 ——
