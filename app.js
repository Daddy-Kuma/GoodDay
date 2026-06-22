const OFFICIAL_FEED_ENDPOINT = "/api/official-feed";
const SPORTTERY_BROWSER_ENDPOINT = "https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry?channel=1&poolCode=crs";

const scoreFieldMap = {
  "1:0": "s01s00", "2:0": "s02s00", "2:1": "s02s01",
  "3:0": "s03s00", "3:1": "s03s01", "3:2": "s03s02",
  "4:0": "s04s00", "4:1": "s04s01", "4:2": "s04s02",
  "5:0": "s05s00", "5:1": "s05s01", "5:2": "s05s02",
  "胜其他": "s1sh",
  "0:0": "s00s00", "1:1": "s01s01", "2:2": "s02s02", "3:3": "s03s03",
  "平其他": "s1sd",
  "0:1": "s00s01", "0:2": "s00s02", "1:2": "s01s02",
  "0:3": "s00s03", "1:3": "s01s03", "2:3": "s02s03",
  "0:4": "s00s04", "1:4": "s01s04", "2:4": "s02s04",
  "0:5": "s00s05", "1:5": "s01s05", "2:5": "s02s05",
  "负其他": "s1sa",
};

const state = {
  points: Number(localStorage.getItem("wc-points")) || 10000,
  selectedMatch: null,
  selectedScore: null,
  tickets: JSON.parse(localStorage.getItem("wc-tickets") || "[]"),
  matches: [],
  source: "等待同步",
  syncedAt: null,
  error: "",
};

const scoreOptions = [
  "1:0", "2:0", "2:1", "3:0", "3:1", "3:2", "4:0", "4:1", "4:2", "5:0", "5:1", "5:2", "胜其他",
  "0:0", "1:1", "2:2", "3:3", "平其他",
  "0:1", "0:2", "1:2", "0:3", "1:3", "2:3", "0:4", "1:4", "2:4", "0:5", "1:5", "2:5", "负其他",
];

const els = {
  pointsBalance: document.querySelector("#pointsBalance"),
  openTicketCount: document.querySelector("#openTicketCount"),
  syncTime: document.querySelector("#syncTime"),
  sourceLabel: document.querySelector("#sourceLabel"),
  matchList: document.querySelector("#matchList"),
  ticketList: document.querySelector("#ticketList"),
  rankList: document.querySelector("#rankList"),
  syncButton: document.querySelector("#syncButton"),
  betDialog: document.querySelector("#betDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogDeadline: document.querySelector("#dialogDeadline"),
  scoreGrid: document.querySelector("#scoreGrid"),
  stakeInput: document.querySelector("#stakeInput"),
  selectionCard: document.querySelector("#selectionCard"),
  confirmBet: document.querySelector("#confirmBet"),
};

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}View`).classList.add("active");
  });
});

els.syncButton.addEventListener("click", syncData);
els.confirmBet.addEventListener("click", submitBet);
els.stakeInput.addEventListener("input", renderSelection);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

syncData();
setInterval(syncData, 60_000);

async function syncData() {
  els.syncButton.classList.add("syncing");
  try {
    const payload = await fetchOfficialFeed();
    state.matches = payload.matches || [];
    state.source = payload.source || "中国体育彩票官方 Web API";
    state.syncedAt = payload.syncedAt || new Date().toISOString();
    state.error = "";
    settleFinishedTickets();
  } catch (error) {
    state.error = error.message || "官方数据同步失败";
    state.matches = [];
    state.source = "同步失败";
    state.syncedAt = new Date().toISOString();
  }
  render();
  els.syncButton.classList.remove("syncing");
}

async function fetchOfficialFeed() {
  try {
    const response = await fetch(OFFICIAL_FEED_ENDPOINT, { cache: "no-store" });
    if (!response.ok) throw new Error(`Vercel proxy ${response.status}`);
    return response.json();
  } catch (proxyError) {
    const response = await fetch(SPORTTERY_BROWSER_ENDPOINT, {
      cache: "no-store",
      mode: "cors",
      credentials: "omit",
      headers: { "Accept": "application/json,text/plain,*/*" },
    });
    if (!response.ok) {
      throw new Error(`官方数据同步失败：代理 ${proxyError.message}，直连 ${response.status}`);
    }
    const raw = await response.json();
    return normalizeSportteryPayload(raw);
  }
}

function normalizeSportteryPayload(raw) {
  if (String(raw.errorCode) !== "0" || !raw.value) {
    throw new Error(raw.errorMessage || "体彩官方接口未返回有效数据");
  }
  const matches = [];
  for (const group of raw.value.matchInfoList || []) {
    for (const item of group.subMatchList || []) {
      if (item.leagueCode !== "WCC" && item.leagueAbbName !== "世界杯") continue;
      if (!item.crs || !Object.keys(item.crs).length) continue;
      const correctScore = {};
      for (const [label, key] of Object.entries(scoreFieldMap)) {
        const value = item.crs[key];
        if (value !== undefined && value !== "") correctScore[label] = Number(value);
      }
      matches.push({
        id: String(item.matchId),
        matchId: item.matchId,
        matchNum: item.matchNum,
        matchNumStr: item.matchNumStr,
        matchNumDate: item.matchNumDate,
        taxDateNo: item.taxDateNo,
        league: item.leagueAbbName || item.leagueAllName,
        leagueCode: item.leagueCode,
        home: item.homeTeamAbbName || item.homeTeamAllName,
        away: item.awayTeamAbbName || item.awayTeamAllName,
        homeRank: item.homeRank || "",
        awayRank: item.awayRank || "",
        kickoff: toChinaIso(item.matchDate, item.matchTime),
        deadline: toChinaIso(item.matchDate, item.matchTime),
        status: item.matchStatus,
        sellStatus: item.sellStatus,
        remark: item.remark || "",
        oddsUpdatedAt: toChinaIso(item.crs.updateDate, item.crs.updateTime),
        correctScore,
        result: null,
      });
    }
  }
  return {
    source: "中国体育彩票官方 Web API / 浏览器直连 CRS",
    syncedAt: new Date().toISOString(),
    officialLastUpdateTime: raw.value.lastUpdateTime,
    matches,
  };
}

function render() {
  localStorage.setItem("wc-points", String(state.points));
  localStorage.setItem("wc-tickets", JSON.stringify(state.tickets));
  els.pointsBalance.textContent = formatNumber(state.points);
  els.openTicketCount.textContent = state.tickets.filter((ticket) => ticket.status === "open").length;
  els.syncTime.textContent = state.syncedAt ? formatTime(state.syncedAt) : "--:--";
  els.sourceLabel.textContent = state.source;
  renderMatches();
  renderTickets();
  renderRank();
}

function renderMatches() {
  if (state.error) {
    els.matchList.innerHTML = `
      <article class="empty-card">
        <strong>官方数据同步失败</strong>
        <span>${escapeHtml(state.error)}</span>
      </article>
    `;
    return;
  }
  if (!state.matches.length) {
    els.matchList.innerHTML = `
      <article class="empty-card">
        <strong>暂无在售世界杯比分玩法</strong>
        <span>当前官方接口没有返回世界杯 CRS 比分玩法场次，页面不会使用示例赛程代替。</span>
      </article>
    `;
    return;
  }

  els.matchList.innerHTML = state.matches.map((match) => {
    const closed = new Date(match.deadline) <= new Date() || match.status !== "Selling";
    return `
      <article class="match-card">
        <div class="match-head">
          <div>
            <strong>${escapeHtml(match.matchNumStr)} · ${escapeHtml(match.league)}</strong>
            <span class="match-meta">开赛 ${formatDate(match.kickoff)} ${formatTime(match.kickoff)} · 官方更新 ${formatTime(match.oddsUpdatedAt)}</span>
          </div>
          <span class="match-meta">${closed ? "已截止" : "可竞猜"}</span>
        </div>
        <div class="team-line">
          <span>${escapeHtml(match.home)} <small>${escapeHtml(match.homeRank || "")}</small></span>
          <span class="vs">VS</span>
          <span>${escapeHtml(match.away)} <small>${escapeHtml(match.awayRank || "")}</small></span>
        </div>
        <div class="odds-row" aria-label="比分赔率概览">
          <div class="odds-pill">1:0 ${displayOdds(match.correctScore["1:0"])}</div>
          <div class="odds-pill">1:1 ${displayOdds(match.correctScore["1:1"])}</div>
          <div class="odds-pill">0:1 ${displayOdds(match.correctScore["0:1"])}</div>
        </div>
        <p class="match-meta">${escapeHtml(match.remark || "以中国体育彩票官方接口返回数据为准")}</p>
        <button class="outline-button" data-match-id="${match.id}" ${closed ? "disabled" : ""}>查看全部比分赔率</button>
      </article>
    `;
  }).join("");

  els.matchList.querySelectorAll("[data-match-id]").forEach((button) => {
    button.addEventListener("click", () => openBetDialog(button.dataset.matchId));
  });
}

function openBetDialog(matchId) {
  state.selectedMatch = state.matches.find((match) => match.id === matchId);
  state.selectedScore = null;
  els.stakeInput.value = "500";
  els.dialogTitle.textContent = `${state.selectedMatch.home} vs ${state.selectedMatch.away}`;
  els.dialogDeadline.textContent = `开赛 ${formatDate(state.selectedMatch.kickoff)} ${formatTime(state.selectedMatch.kickoff)} · 赔率更新时间 ${formatDate(state.selectedMatch.oddsUpdatedAt)} ${formatTime(state.selectedMatch.oddsUpdatedAt)}`;
  renderScoreGrid();
  renderSelection();
  els.betDialog.showModal();
}

function renderScoreGrid() {
  els.scoreGrid.innerHTML = scoreOptions.map((score) => {
    const odds = state.selectedMatch.correctScore[score];
    return `
      <button class="score-option" type="button" data-score="${score}" ${odds ? "" : "disabled"}>
        <strong>${score}</strong>
        <span>${odds ? Number(odds).toFixed(2) : "--"}</span>
      </button>
    `;
  }).join("");

  els.scoreGrid.querySelectorAll("[data-score]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedScore = button.dataset.score;
      els.scoreGrid.querySelectorAll(".score-option").forEach((option) => option.classList.remove("active"));
      button.classList.add("active");
      renderSelection();
    });
  });
}

function renderSelection() {
  if (!state.selectedMatch || !state.selectedScore) {
    els.selectionCard.textContent = "请选择一个比分";
    els.confirmBet.disabled = true;
    return;
  }
  const stake = normalizeStake();
  const odds = Number(state.selectedMatch.correctScore[state.selectedScore]);
  const returnPoints = Math.floor(stake * odds);
  els.selectionCard.innerHTML = `
    已选 <strong>${escapeHtml(state.selectedScore)}</strong> · 官方赔率快照 <strong>${odds.toFixed(2)}</strong><br>
    投入 ${formatNumber(stake)}，命中返还 ${formatNumber(returnPoints)} 积分
  `;
  els.confirmBet.disabled = stake > state.points || stake < 100 || stake > 2000;
}

function submitBet(event) {
  event.preventDefault();
  if (!state.selectedMatch || !state.selectedScore) return;
  const stake = normalizeStake();
  const odds = Number(state.selectedMatch.correctScore[state.selectedScore]);
  if (stake > state.points || stake < 100 || stake > 2000 || !odds) return;

  state.points -= stake;
  state.tickets.unshift({
    id: `ticket-${Date.now()}`,
    matchId: state.selectedMatch.id,
    matchName: `${state.selectedMatch.home} vs ${state.selectedMatch.away}`,
    matchNumStr: state.selectedMatch.matchNumStr,
    play: "比分",
    selection: state.selectedScore,
    stake,
    odds,
    oddsUpdatedAt: state.selectedMatch.oddsUpdatedAt,
    source: state.source,
    status: "open",
    createdAt: new Date().toISOString(),
  });
  els.betDialog.close();
  render();
}

function settleFinishedTickets() {
  state.tickets.forEach((ticket) => {
    if (ticket.status !== "open") return;
    const match = state.matches.find((item) => item.id === ticket.matchId);
    if (!match?.result) return;
    const won = scoreMatches(ticket.selection, match.result);
    ticket.status = won ? "won" : "lost";
    ticket.result = match.result;
    ticket.settledAt = new Date().toISOString();
    if (won) {
      ticket.payout = Math.floor(ticket.stake * ticket.odds);
      state.points += ticket.payout;
    }
  });
}

function renderTickets() {
  if (!state.tickets.length) {
    els.ticketList.innerHTML = `<article class="ticket-card">还没有竞猜单。去赛程里选择一场比赛猜比分。</article>`;
    return;
  }
  els.ticketList.innerHTML = state.tickets.map((ticket) => `
    <article class="ticket-card">
      <div class="ticket-row">
        <div>
          <strong>${escapeHtml(ticket.matchNumStr || "")} ${escapeHtml(ticket.matchName)}</strong>
          <span class="ticket-meta">${ticket.play} ${escapeHtml(ticket.selection)} · 投入 ${formatNumber(ticket.stake)}</span>
        </div>
        <div class="ticket-result ${ticket.status === "won" ? "win" : ticket.status === "lost" ? "lose" : ""}">
          ${ticket.status === "open" ? "待结算" : ticket.status === "won" ? `+${formatNumber(ticket.payout)}` : "未命中"}
        </div>
      </div>
      <div class="ticket-row">
        <span class="ticket-meta">赔率快照 ${ticket.odds.toFixed(2)} · ${formatTime(ticket.oddsUpdatedAt)} · ${escapeHtml(ticket.source)}</span>
      </div>
    </article>
  `).join("");
}

function renderRank() {
  const rows = [
    ["你", state.points],
    ["云端射门员", 18680],
    ["补时大师", 15320],
    ["比分猎手", 12840],
    ["小组赛之王", 10660],
  ].sort((a, b) => b[1] - a[1]);
  els.rankList.innerHTML = rows.map((row, index) => `
    <div class="rank-row">
      <span class="rank-badge">${index + 1}</span>
      <strong>${escapeHtml(row[0])}</strong>
      <span>${formatNumber(row[1])}</span>
    </div>
  `).join("");
}

function scoreMatches(selection, result) {
  if (selection === result) return true;
  const [home, away] = result.split(":").map(Number);
  if (selection === "胜其他") return home > away && !scoreOptions.includes(result);
  if (selection === "平其他") return home === away && !scoreOptions.includes(result);
  if (selection === "负其他") return home < away && !scoreOptions.includes(result);
  return false;
}

function normalizeStake() {
  const value = Number(els.stakeInput.value) || 0;
  return Math.max(0, Math.floor(value / 100) * 100);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function displayOdds(value) {
  return value ? Number(value).toFixed(2) : "--";
}

function toChinaIso(date, time) {
  if (!date) return null;
  return new Date(`${date}T${time || "00:00:00"}+08:00`).toISOString();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}
