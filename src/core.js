// Console 核心规则：权限、区域隔离、指标汇总、配置自检。纯函数，页面与测试页共用。
(function (global) {
  "use strict";

  function canSeeShelf(role, shelf) {
    return shelf.clearance <= role.clearance && shelf.regions.some((r) => role.regions.includes(r));
  }

  function visibleShelves(data, role) {
    return data.shelves.map((s) => ({ ...s, allowed: canSeeShelf(role, s) }));
  }

  function searchDocs(data, role, query) {
    const allowed = new Set(data.shelves.filter((s) => canSeeShelf(role, s)).map((s) => s.id));
    const q = query.trim().toLowerCase();
    return data.docs.filter((d) => allowed.has(d.shelf) && (!q || d.title.toLowerCase().includes(q)));
  }

  function scopedExceptions(data, role) {
    return data.exceptions
      .filter((e) => role.regions.includes(e.region))
      .sort((a, b) => b.severity - a.severity);
  }

  function overview(data, role) {
    const stats = role.regions.map((r) => data.regionStats[r]);
    const sessions = stats.reduce((a, s) => a + s.sessions, 0);
    const hitRate = sessions ? stats.reduce((a, s) => a + s.hitRate * s.sessions, 0) / sessions : 0;
    return {
      sessions,
      hitRate,
      slaBreaches: stats.reduce((a, s) => a + s.slaBreaches, 0),
      backlog: stats.reduce((a, s) => a + s.backlog, 0),
    };
  }

  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  // 配置自检：每一项都直接从配置计算，配置一改，结果跟着变
  function selfCheck(data, today) {
    const shelfIds = new Set(data.shelves.map((s) => s.id));
    const regionSet = new Set(data.regions);
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok, detail });

    const badAgentShelves = data.agents.flatMap((a) => a.shelves.filter((s) => !shelfIds.has(s)).map((s) => `${a.name}→${s}`));
    add("智能体绑定的书架都存在", !badAgentShelves.length, badAgentShelves.length ? `未找到：${badAgentShelves.join("、")}` : `${data.agents.length} 个智能体全部有效`);

    const orphans = data.docs.filter((d) => !shelfIds.has(d.shelf));
    add("文献都归属有效书架", !orphans.length, orphans.length ? `孤儿文献：${orphans.map((d) => d.title).join("、")}` : `${data.docs.length} 篇文献全部归档`);

    const emptyShelves = data.shelves.filter((s) => !data.docs.some((d) => d.shelf === s.id));
    add("每个书架至少一篇文献", !emptyShelves.length, emptyShelves.length ? `空书架：${emptyShelves.map((s) => s.name).join("、")}` : `${data.shelves.length} 个书架均有内容`);

    const unbound = data.shelves.filter((s) => s.clearance < 3 && !data.agents.some((a) => a.shelves.includes(s.id)));
    add("业务书架都有智能体检索", !unbound.length, unbound.length ? `无人检索：${unbound.map((s) => s.name).join("、")}` : "全部书架已绑定");

    const badRegions = data.shelves.filter((s) => s.regions.some((r) => !regionSet.has(r)));
    add("书架区域配置合法", !badRegions.length, badRegions.length ? badRegions.map((s) => s.name).join("、") : "区域取值均在 AMER / APAC / EMEA 内");

    const stale = data.docs.filter((d) => shelfIds.has(d.shelf) && daysBetween(d.updated, today) > 90);
    add("文献 90 天内复核", !stale.length, stale.length ? `${stale.length} 篇超期：${stale.slice(0, 3).map((d) => d.title).join("、")}` : "全部在复核期内");

    const missingStats = data.regions.filter((r) => !data.regionStats[r]);
    add("各区域指标齐全", !missingStats.length, missingStats.length ? `缺少：${missingStats.join("、")}` : "三大区域指标齐全");

    const hasRouter = data.agents.filter((a) => a.kind === "router").length === 1;
    add("有且仅有一个主智能体", hasRouter, hasRouter ? "路由入口唯一" : "主智能体数量异常");

    return checks;
  }

  const api = { canSeeShelf, visibleShelves, searchDocs, scopedExceptions, overview, selfCheck };
  global.ConsoleCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
