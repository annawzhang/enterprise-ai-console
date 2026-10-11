(function () {
  "use strict";
  const D = window.CONSOLE_DATA;
  const C = window.ConsoleCore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pct = (v) => (v * 100).toFixed(1) + "%";
  const num = (v) => v.toLocaleString("en-US");

  const state = { role: "admin", shelf: null, query: "", region: null, bus: [] };
  const role = () => D.roles[state.role];

  $("role").innerHTML = Object.entries(D.roles).map(([k, r]) => `<option value="${k}">${r.name}（${r.user}）</option>`).join("");
  $("role").addEventListener("change", (e) => {
    state.role = e.target.value;
    state.shelf = null;
    state.region = null;
    render();
  });

  const pages = {
    overview: { title: "指挥总览", sub: "30 秒掌握运营健康：核心指标 + 异常置顶", render: renderOverview },
    library: { title: "知识图书馆", sub: "权限化书架 · 按身份过滤可见内容", render: renderLibrary },
    region: { title: "区域作战室", sub: "区域数据隔离：只能进入有权限的区域", render: renderRegion },
    bot: { title: "Chatbot 运营", sub: "建库 → 用库 → 补库 的知识闭环", render: renderBot },
    tools: { title: "区域工具", sub: "微前端子应用：iframe 嵌入 + postMessage 通信", render: renderTools },
    system: { title: "系统自检", sub: "配置优先于代码：8 项检查全部由配置实时计算", render: renderSystem },
  };

  function kpi(label, value, sub) {
    return `<div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub || ""}</div></div>`;
  }

  function renderOverview() {
    const o = C.overview(D, role());
    const ex = C.scopedExceptions(D, role());
    const checks = C.selfCheck(D, D.asOf);
    const failed = checks.filter((c) => !c.ok).length;
    return `
      <div class="grid g4">
        ${kpi("对话量（本月）", num(o.sessions), role().regions.join(" / "))}
        ${kpi("知识命中率", pct(o.hitRate), "按对话量加权")}
        ${kpi("SLA 超时工单", o.slaBreaches, `积压 ${o.backlog} 张`)}
        ${kpi("配置自检", `${checks.length - failed}/${checks.length}`, failed ? `${failed} 项待处理 → 系统自检` : "全部通过")}
      </div>
      <div class="card section"><h3>异常监控（按严重度排序）</h3>
        <table><thead><tr><th>级别</th><th>类型</th><th>区域</th><th>详情</th><th>责任方</th></tr></thead><tbody>
        ${ex.map((e) => `<tr><td><span class="sev sev${e.severity}">${["", "低", "中", "高"][e.severity]}</span></td><td>${e.type}</td><td>${e.region}</td><td>${esc(e.detail)}</td><td>${esc(e.owner)}</td></tr>`).join("")}
        </tbody></table></div>
      <div class="card section"><h3>智能体编排</h3>
        <div class="flow"><span>员工提问</span><i>→</i><span>主智能体路由</span><i>→</i><span>业务子智能体 × ${D.agents.filter((a) => a.kind === "domain").length}</span><i>→</i><span>权限化书架检索</span><i>→</i><span>可溯源回答</span><i>→</i><span>反馈 / 转人工</span><i>→</i><span>知识缺口发现</span></div>
        <div style="margin-top:12px">${D.agents.map((a) => `<span class="tag">${esc(a.name)}</span>`).join("")}</div>
      </div>`;
  }

  function renderLibrary() {
    const shelves = C.visibleShelves(D, role());
    const docs = C.searchDocs(D, role(), state.query).filter((d) => !state.shelf || d.shelf === state.shelf);
    const allowedCount = shelves.filter((s) => s.allowed).length;
    const shelfName = Object.fromEntries(D.shelves.map((s) => [s.id, s.name]));
    return `
      <div class="meta" style="margin-bottom:10px">当前身份可访问 ${allowedCount} / ${shelves.length} 个书架，灰色书架因权限等级或区域不符被隐藏内容。</div>
      <div class="grid g3">
        ${shelves.map((s) => `<div class="shelf ${s.allowed ? "" : "locked"} ${state.shelf === s.id ? "sel" : ""}" data-shelf="${s.allowed ? s.id : ""}">
          <div class="n">${s.allowed ? "" : "🔒 "}${esc(s.name)}</div>
          <div class="t">${s.regions.join(" / ")} · 等级 ${s.clearance} · ${D.docs.filter((d) => d.shelf === s.id).length} 篇</div></div>`).join("")}
      </div>
      <div class="card section">
        <input class="search" id="q" placeholder="检索有权限的文献，例如：CPF、体检、个税" value="${esc(state.query)}" />
        <table><thead><tr><th>文献</th><th>书架</th><th>更新日期</th></tr></thead><tbody>
        ${docs.map((d) => `<tr><td>${esc(d.title)}</td><td>${esc(shelfName[d.shelf])}</td><td>${d.updated}</td></tr>`).join("") || `<tr><td colspan="3">没有匹配的文献</td></tr>`}
        </tbody></table>
      </div>`;
  }

  function renderRegion() {
    const allowed = role().regions;
    if (!state.region || !allowed.includes(state.region)) state.region = allowed[0];
    const r = state.region;
    const s = D.regionStats[r];
    const ex = D.exceptions.filter((e) => e.region === r);
    return `
      <div class="tabs">${D.regions.map((x) => `<button data-region="${x}" class="${x === r ? "on" : ""}" ${allowed.includes(x) ? "" : "disabled title='无权限'"}>${x}</button>`).join("")}</div>
      <div class="grid g4">
        ${kpi("对话量", num(s.sessions))}${kpi("命中率", pct(s.hitRate))}${kpi("SLA 超时", s.slaBreaches, `积压 ${s.backlog}`)}${kpi("满意度", s.csat.toFixed(1), "5 分制")}
      </div>
      <div class="card section"><h3>${r} 待办异常</h3>
        <table><tbody>${ex.map((e) => `<tr><td><span class="sev sev${e.severity}">${["", "低", "中", "高"][e.severity]}</span></td><td>${e.type}</td><td>${esc(e.detail)}</td><td>${esc(e.owner)}</td></tr>`).join("") || "<tr><td>暂无异常</td></tr>"}</tbody></table>
      </div>`;
  }

  function lineChart(series) {
    const w = 560, h = 200, pad = 34;
    const max = Math.max(...series.flatMap((s) => s.values)) * 1.15;
    const n = series[0].values.length;
    const x = (i) => pad + (i * (w - pad * 2)) / (n - 1);
    const y = (v) => h - pad - (v / max) * (h - pad * 2);
    const colors = { AMER: "#4f46e5", APAC: "#16a34a", EMEA: "#dc2626" };
    let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%">`;
    for (let i = 0; i < n; i++) svg += `<text x="${x(i)}" y="${h - 10}" font-size="11" fill="#64748b" text-anchor="middle">W${i + 1}</text>`;
    series.forEach((s) => {
      svg += `<polyline fill="none" stroke="${colors[s.name]}" stroke-width="2.5" points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}"/>`;
      const last = s.values[n - 1];
      svg += `<text x="${x(n - 1) + 6}" y="${y(last) + 4}" font-size="11" fill="${colors[s.name]}">${s.name} ${pct(last)}</text>`;
    });
    return svg + "</svg>";
  }

  function renderBot() {
    const regions = role().regions;
    const misses = D.topMisses.filter((m) => regions.includes(m.region));
    return `
      <div class="card"><h3>未命中率周趋势</h3>${lineChart(regions.map((r) => ({ name: r, values: D.regionStats[r].weeklyMiss })))}</div>
      <div class="grid g2 section">
        <div class="card"><h3>知识闭环</h3>
          <div class="flow"><span>建库：书架与文献</span><i>→</i><span>用库：智能体检索作答</span><i>→</i><span>采集：未命中 / 低分 / 差评</span><i>→</i><span>补库：聚类缺口、补 FAQ</span><i>→</i><span>索引重建</span></div>
          <p class="meta" style="margin-top:12px">缺口发现算法的公开实现见 <a href="https://github.com/annawzhang/kb-gap-finder" target="_blank" rel="noopener">kb-gap-finder</a>。</p>
        </div>
        <div class="card"><h3>高频未命中问题</h3>
          <table><thead><tr><th>问题</th><th>区域</th><th>次数</th></tr></thead><tbody>
          ${misses.map((m) => `<tr><td>${esc(m.q)}</td><td>${m.region}</td><td>${m.count}</td></tr>`).join("") || "<tr><td colspan=3>暂无</td></tr>"}
          </tbody></table></div>
      </div>`;
  }

  function renderTools() {
    return `
      <div class="grid g2" style="margin-bottom:14px">
        <div class="card"><h3>成本分摊工作台</h3><p class="meta" style="margin:0">独立部署的子应用，由 Console 统一下发身份。子应用运行结果会回传到下方消息总线。</p></div>
        <div class="card"><h3>消息总线</h3><div class="bus" id="bus">${state.bus.map(esc).join("<br/>") || "等待子应用加载…"}</div></div>
      </div>
      <iframe id="tool" src="../cost-allocation-workbench/" title="成本分摊工作台"></iframe>`;
  }

  function renderSystem() {
    const checks = C.selfCheck(D, D.asOf);
    const passed = checks.filter((c) => c.ok).length;
    return `
      <div class="grid g3">
        ${kpi("通过", passed)}${kpi("待处理", checks.length - passed)}${kpi("检查基准日", D.asOf)}
      </div>
      <div class="card section"><h3>配置自检</h3>
        ${checks.map((c) => `<div class="check ${c.ok ? "ok" : "bad"}"><div class="ic">${c.ok ? "✓" : "!"}</div><div><div>${esc(c.name)}</div><div class="d">${esc(c.detail)}</div></div></div>`).join("")}
      </div>
      <p class="meta">演示配置里故意保留了几处问题（孤儿文献、绑定了不存在书架的智能体、超期文献），用来展示自检如何发现配置漂移。</p>`;
  }

  function pushBus(line) {
    state.bus.push(`${new Date().toLocaleTimeString()}  ${line}`);
    const bus = $("bus");
    if (bus) { bus.innerHTML = state.bus.map(esc).join("<br/>"); bus.scrollTop = bus.scrollHeight; }
  }

  window.addEventListener("message", (e) => {
    const frame = $("tool");
    if (!frame || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === "workbench:ready") {
      pushBus("← workbench:ready");
      const ctx = { type: "console:context", user: role().user, role: role().name };
      frame.contentWindow.postMessage(ctx, "*");
      pushBus(`→ console:context ${role().user} · ${role().name}`);
    } else if (e.data.type === "workbench:result") {
      pushBus(`← workbench:result 发票 ${e.data.invoices} · 错误 ${e.data.errors} · 明细 ${e.data.lines}`);
    }
  });

  function render() {
    const page = (location.hash || "#overview").slice(1);
    const p = pages[page] || pages.overview;
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.page === page));
    $("page-title").textContent = p.title;
    $("page-sub").textContent = p.sub;
    if (page !== "tools") state.bus = [];
    $("view").innerHTML = p.render();
    const q = $("q");
    if (q) {
      q.addEventListener("input", () => {
        state.query = q.value;
        const pos = q.selectionStart;
        render();
        const nq = $("q");
        nq.focus();
        nq.setSelectionRange(pos, pos);
      });
    }
  }

  $("view").addEventListener("click", (e) => {
    const shelf = e.target.closest("[data-shelf]");
    if (shelf && shelf.dataset.shelf) {
      state.shelf = state.shelf === shelf.dataset.shelf ? null : shelf.dataset.shelf;
      render();
    }
    const region = e.target.closest("[data-region]");
    if (region && !region.disabled) {
      state.region = region.dataset.region;
      render();
    }
  });

  window.addEventListener("hashchange", render);
  render();
})();
