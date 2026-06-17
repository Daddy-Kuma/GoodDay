# 世界杯积分竞猜 PWA

这是一个移动端优先的世界杯虚拟积分竞猜 PWA，支持从中国体育彩票官方 Web API 同步竞彩足球比分（CRS）在售场次和赔率，支持赔率快照、虚拟积分结算、排行榜和 PWA 安装。

## 运行

```bash
npm start
```

默认地址：

```text
http://localhost:8081
```

长期部署见 [DEPLOY.md](./DEPLOY.md)。如果选择 Vercel，按 [VERCEL.md](./VERCEL.md) 操作。

## 数据源

服务端代理接口：

```text
GET /api/official-feed
```

上游来源：

```text
https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry?channel=1&poolCode=crs
```

该接口来自中国体育彩票官网比分计算器页面使用的数据通道。服务端只保留 `leagueCode=WCC` 或联赛名为“世界杯”的场次，且只展示官方接口返回的 CRS 比分玩法数据。

页面不会使用假赛程兜底；如果官方接口没有返回世界杯比分玩法，页面会显示暂无在售场次。

## 输出结构

```json
{
  "source": "中国体育彩票官方 Web API / 竞彩足球比分 CRS",
  "syncedAt": "2026-06-18T10:00:00.000Z",
  "officialLastUpdateTime": "2026-06-17 21:56:46",
  "matches": [
    {
      "id": "wc-001",
      "home": "法国",
      "away": "巴西",
      "kickoff": "2026-06-18T14:00:00.000Z",
      "deadline": "2026-06-18T13:45:00.000Z",
      "status": "open",
      "result": null,
      "oddsUpdatedAt": "2026-06-18T09:59:30.000Z",
      "winDrawLose": { "home": 2.32, "draw": 3.08, "away": 2.78 },
      "correctScore": {
        "1:0": 6.5,
        "2:0": 10.5,
        "2:1": 7.25,
        "胜其他": 60
      }
    }
  ]
}
```

## 合规边界

- 只使用虚拟积分。
- 不提供充值、提现、转赠、兑换权益。
- 用户竞猜单按提交时赔率快照结算。
- 生产环境建议与官方或授权数据商确认接口使用授权、频率限制和缓存策略。
