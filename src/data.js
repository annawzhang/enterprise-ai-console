// 演示配置与数据：全部虚构。Console 的权限、区域隔离、自检都由这份配置驱动。
window.CONSOLE_DATA = (function () {
  const regions = ["AMER", "APAC", "EMEA"];

  const roles = {
    admin: { name: "运营管理员", user: "Alex", regions: ["AMER", "APAC", "EMEA"], clearance: 3 },
    amer: { name: "AMER 区域负责人", user: "Jordan", regions: ["AMER"], clearance: 2 },
    apac: { name: "APAC 区域负责人", user: "Mei", regions: ["APAC"], clearance: 2 },
    viewer: { name: "访客", user: "Guest", regions: ["AMER", "APAC", "EMEA"], clearance: 1 },
  };

  // clearance：1 公开 / 2 区域内部 / 3 运营敏感
  const shelves = [
    { id: "pay", name: "薪酬发放", regions: ["AMER", "APAC", "EMEA"], clearance: 1 },
    { id: "ben", name: "福利与保险", regions: ["AMER", "APAC", "EMEA"], clearance: 1 },
    { id: "leave", name: "假期与考勤", regions: ["AMER", "APAC", "EMEA"], clearance: 1 },
    { id: "tax", name: "个税与申报", regions: ["AMER", "APAC", "EMEA"], clearance: 2 },
    { id: "us-ben", name: "美国福利特例", regions: ["AMER"], clearance: 2 },
    { id: "sg-cpf", name: "新加坡公积金", regions: ["APAC"], clearance: 2 },
    { id: "eu-works", name: "欧洲劳资协商", regions: ["EMEA"], clearance: 2 },
    { id: "sys", name: "系统操作指引", regions: ["AMER", "APAC", "EMEA"], clearance: 1 },
    { id: "ops", name: "运营 SOP 与应急预案", regions: ["AMER", "APAC", "EMEA"], clearance: 3 },
  ];

  const topics = {
    pay: ["发薪日调整说明", "工资条字段解读", "跨月入职首月工资计算", "银行账户变更流程", "补发与扣回规则"],
    ben: ["年度体检预约", "补充医疗报销范围", "商业保险理赔材料", "家属加保流程"],
    leave: ["年假折算规则", "病假证明要求", "育儿假申请", "公共假期日历"],
    tax: ["年度个税汇算", "专项附加扣除填报", "外籍员工税务居民判定"],
    "us-ben": ["401(k) 匹配规则", "Open Enrollment 时间表", "HSA 与 FSA 区别"],
    "sg-cpf": ["CPF 缴纳比例", "外籍员工 CPF 适用", "CPF 补缴流程"],
    "eu-works": ["劳资委员会咨询流程", "德国加班补偿", "法国 RTT 假期"],
    sys: ["自助平台登录问题", "电子签收工资条", "移动端请假操作"],
    ops: ["机器人宕机应急预案", "敏感问题升级 SOP", "高管咨询白名单流程"],
  };
  const docs = [];
  Object.entries(topics).forEach(([shelf, titles]) => titles.forEach((title, i) => {
    docs.push({ id: `${shelf}-${i + 1}`, shelf, title, updated: `2026-0${(i % 3) + 7}-${String(10 + i * 3).padStart(2, "0")}` });
  }));
  docs.push({ id: "orphan-1", shelf: "legacy", title: "旧版报销制度（待迁移）", updated: "2025-11-02" });

  const agents = [
    { id: "main", name: "主智能体", kind: "router", shelves: [] },
    { id: "a-pay", name: "薪酬助手", kind: "domain", shelves: ["pay"] },
    { id: "a-ben", name: "福利助手", kind: "domain", shelves: ["ben", "us-ben"] },
    { id: "a-leave", name: "假期助手", kind: "domain", shelves: ["leave"] },
    { id: "a-tax", name: "税务助手", kind: "domain", shelves: ["tax"] },
    { id: "a-cpf", name: "公积金助手", kind: "domain", shelves: ["sg-cpf"] },
    { id: "a-eu", name: "欧洲劳动法助手", kind: "domain", shelves: ["eu-works"] },
    { id: "a-sys", name: "系统操作助手", kind: "domain", shelves: ["sys"] },
    { id: "a-risk", name: "敏感词风控", kind: "skill", shelves: [] },
    { id: "a-vip", name: "高管识别", kind: "skill", shelves: ["ops"] },
    { id: "a-ticket", name: "转人工工单", kind: "skill", shelves: [] },
    { id: "a-gap", name: "知识缺口发现", kind: "skill", shelves: [] },
    { id: "a-expense", name: "报销助手", kind: "domain", shelves: ["expense"] },
  ];

  const regionStats = {
    AMER: { sessions: 18420, hitRate: 0.93, slaBreaches: 7, backlog: 41, csat: 4.5, weeklyMiss: [0.14, 0.12, 0.1, 0.09, 0.08, 0.07] },
    APAC: { sessions: 22650, hitRate: 0.95, slaBreaches: 3, backlog: 26, csat: 4.6, weeklyMiss: [0.11, 0.1, 0.08, 0.07, 0.06, 0.05] },
    EMEA: { sessions: 9870, hitRate: 0.89, slaBreaches: 12, backlog: 58, csat: 4.2, weeklyMiss: [0.18, 0.17, 0.15, 0.13, 0.12, 0.11] },
  };

  const exceptions = [
    { type: "SLA 超时", region: "EMEA", severity: 3, detail: "12 张工单超过 48 小时未首响", owner: "EMEA 服务台" },
    { type: "未命中激增", region: "EMEA", severity: 2, detail: "「法国 RTT 假期」相关提问未命中率 31%", owner: "知识运营" },
    { type: "敏感词命中", region: "AMER", severity: 3, detail: "2 条对话触发 P0 敏感词，已自动转人工", owner: "风控" },
    { type: "工单积压", region: "AMER", severity: 2, detail: "积压 41 张，较上周 +18%", owner: "AMER 服务台" },
    { type: "知识过期", region: "APAC", severity: 1, detail: "CPF 缴纳比例文档超过 90 天未复核", owner: "APAC 知识运营" },
    { type: "系统健康", region: "APAC", severity: 1, detail: "向量索引重建耗时 18 分钟，高于基线", owner: "平台" },
  ];

  const topMisses = [
    { q: "法国 RTT 假期怎么折算", region: "EMEA", count: 46 },
    { q: "新入职员工什么时候能加保家属", region: "AMER", count: 31 },
    { q: "CPF 补缴会不会影响个税", region: "APAC", count: 22 },
    { q: "德国加班可以换调休吗", region: "EMEA", count: 19 },
  ];

  return { asOf: "2026-10-11", regions, roles, shelves, docs, agents, regionStats, exceptions, topMisses };
})();
