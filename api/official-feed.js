const SPORTTERY_ENDPOINT = process.env.SPORTTERY_ENDPOINT || "https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry?channel=1&poolCode=crs";
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 45_000);

let cache = null;
let cacheAt = 0;

const scoreMap = {
  "1:0": "s01s00",
  "2:0": "s02s00",
  "2:1": "s02s01",
  "3:0": "s03s00",
  "3:1": "s03s01",
  "3:2": "s03s02",
  "4:0": "s04s00",
  "4:1": "s04s01",
  "4:2": "s04s02",
  "5:0": "s05s00",
  "5:1": "s05s01",
  "5:2": "s05s02",
  "胜其他": "s1sh",
  "0:0": "s00s00",
  "1:1": "s01s01",
  "2:2": "s02s02",
  "3:3": "s03s03",
  "平其他": "s1sd",
  "0:1": "s00s01",
  "0:2": "s00s02",
  "1:2": "s01s02",
  "0:3": "s00s03",
  "1:3": "s01s03",
  "2:3": "s02s03",
  "0:4": "s00s04",
  "1:4": "s01s04",
  "2:4": "s02s04",
  "0:5": "s00s05",
  "1:5": "s01s05",
  "2:5": "s02s05",
  "负其他": "s1sa",
};

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const data = await getOfficialFeed();
    res.setHeader("Cache-Control", "s-maxage=45, stale-while-revalidate=30");
    res.status(200).json(data);
  } catch (error) {
    res.status(502).json({ error: error.message || "official feed unavailable" });
  }
};

async function getOfficialFeed() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;

  const response = await fetch(SPORTTERY_ENDPOINT, {
    headers: {
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Origin": "https://www.sporttery.cn",
      "Referer": "https://www.sporttery.cn/jc/jsq/zqbf/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`体彩官方接口返回 ${response.status}`);
  }
  const raw = await response.json();
  if (String(raw.errorCode) !== "0" || !raw.value) {
    throw new Error(raw.errorMessage || "体彩官方接口未返回有效数据");
  }

  const matches = [];
  for (const group of raw.value.matchInfoList || []) {
    for (const item of group.subMatchList || []) {
      if (item.leagueCode !== "WCC" && item.leagueAbbName !== "世界杯") continue;
      if (!item.crs || !Object.keys(item.crs).length) continue;
      matches.push(mapMatch(item));
    }
  }

  cache = {
    source: "中国体育彩票官方 Web API / 竞彩足球比分 CRS",
    sourceUrl: "https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry",
    syncedAt: new Date().toISOString(),
    officialLastUpdateTime: raw.value.lastUpdateTime,
    matches,
  };
  cacheAt = now;
  return cache;
}

function mapMatch(item) {
  const correctScore = {};
  for (const [label, key] of Object.entries(scoreMap)) {
    const value = item.crs[key];
    if (value !== undefined && value !== "") correctScore[label] = Number(value);
  }
  const oddsUpdatedAt = toIso(item.crs.updateDate, item.crs.updateTime) || new Date().toISOString();
  return {
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
    kickoff: toIso(item.matchDate, item.matchTime),
    deadline: toIso(item.matchDate, item.matchTime),
    status: item.matchStatus,
    sellStatus: item.sellStatus,
    remark: item.remark || "",
    oddsUpdatedAt,
    correctScore,
    result: null,
  };
}

function toIso(date, time) {
  if (!date) return null;
  const clock = time || "00:00:00";
  return new Date(`${date}T${clock}+08:00`).toISOString();
}
