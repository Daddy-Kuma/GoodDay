# 长期稳定上线部署

这个站点不是纯静态站，因为浏览器前端需要通过服务端代理同步中国体育彩票官方 Web API 的竞彩足球比分赔率。长期上线需要运行 `server.js`。

## 推荐架构

```text
浏览器
  -> HTTPS 域名
  -> Nginx / Caddy / 平台网关
  -> Node.js server.js
  -> 中国体育彩票官方 Web API
```

## 方式 A：Docker 部署到云服务器

适合阿里云、腾讯云、AWS Lightsail、Vultr 等 VPS。

```bash
docker compose up -d --build
```

验证：

```bash
curl http://127.0.0.1:8081/health
curl http://127.0.0.1:8081/api/official-feed
```

再用 Nginx 或 Caddy 把你的域名反代到 `127.0.0.1:8081`，并开启 HTTPS。

## 方式 B：PM2 部署到云服务器

服务器已有 Node.js 时可以用：

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

验证：

```bash
curl http://127.0.0.1:8081/health
```

## 方式 C：托管平台

Render、Railway、Fly.io 等能运行 Node 服务的平台都可以部署这个目录。启动命令：

```bash
npm start
```

健康检查路径：

```text
/health
```

## 方式 D：Vercel 部署

Vercel 使用项目根目录的静态文件，并把 `api/*.js` 部署为 Serverless Functions。本站已包含：

```text
api/official-feed.js
api/health.js
vercel.json
```

部署步骤：

1. 创建 Vercel 账号并连接 GitHub。
2. 把 `outputs/worldcup-odds-pwa` 作为项目根目录上传到 GitHub。
3. 在 Vercel 新建 Project，选择该仓库。
4. Framework Preset 选择 `Other`。
5. Build Command 留空或使用 `npm run check`。
6. Output Directory 留空。
7. 部署完成后访问 Vercel 给出的域名。

验证：

```text
https://你的域名.vercel.app/health
https://你的域名.vercel.app/api/official-feed
```

## 环境变量

| 名称 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8081` | 服务监听端口 |
| `CACHE_TTL_MS` | `45000` | 体彩官方接口缓存时间，避免过度请求 |
| `SPORTTERY_ENDPOINT` | 官方 CRS 接口 | 上游数据源，通常不需要改 |
| `BUILD_ID` | `local` | 部署版本标识 |

## 上线注意

- 生产环境建议确认体彩官方接口的授权、频率和商业使用边界。
- 不要把虚拟积分设计成可充值、提现、转让或兑换奖品。
- 建议加域名 HTTPS、访问日志、错误监控和备份策略。
