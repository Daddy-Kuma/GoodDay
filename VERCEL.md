# Vercel 上线步骤

## 1. 注册

打开：

```text
https://vercel.com/signup
```

建议使用 GitHub 登录。Vercel 会需要你授权读取仓库，这样它才能自动部署。

## 2. 准备 GitHub 仓库

把本目录 `outputs/worldcup-odds-pwa` 放进一个 GitHub 仓库。Vercel 项目根目录必须指向这个目录。

## 3. 导入项目

在 Vercel Dashboard：

```text
Add New... -> Project -> Import Git Repository
```

配置项：

```text
Framework Preset: Other
Root Directory: outputs/worldcup-odds-pwa
Build Command: npm run check
Output Directory: 留空
Install Command: 留空或 npm install
```

如果你只上传了 `worldcup-odds-pwa` 这个目录本身作为仓库根目录，则 Root Directory 留空。

## 4. 环境变量

通常不用填。可选：

```text
CACHE_TTL_MS=45000
```

## 5. 部署后验证

部署完成后，Vercel 会给你一个域名，例如：

```text
https://your-project.vercel.app
```

检查：

```text
https://your-project.vercel.app/health
https://your-project.vercel.app/api/official-feed
```

`/api/official-feed` 应返回：

```json
{
  "source": "中国体育彩票官方 Web API / 竞彩足球比分 CRS",
  "matches": []
}
```

如果 `matches` 是空数组，说明体彩官方接口当前没有返回世界杯 CRS 在售场次。页面不会使用假数据兜底。

## 注意

- Vercel 免费层适合早期验证。
- 如果访问量上来，建议升级或迁移到云服务器。
- 上游体彩接口使用建议确认授权、频率限制和商业使用边界。
