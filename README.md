# 高速公路塞不塞（HighwayChecker）

輸入起訖點（可細到交流道或地標），查看兩地之間各條國道的壅塞程度。

- 只有 `index.html`：純靜態，示範資料（GitHub Pages 即可）。
- 加上後端（`server.js`）：接上交通部 TDX，「現在時間」情境改用即時時速。金鑰只放在後端。

## 在 NAS 上用 Docker 部署

```bash
git clone https://github.com/singwillychen/HighwayChecker.git && cd HighwayChecker
cp .env.example .env        # 填入 TDX_CLIENT_ID / TDX_CLIENT_SECRET
docker compose up -d --build
```

打開 `http://NAS的IP:8080/`。檢查：

```bash
curl http://NAS的IP:8080/api/health                      # tdxKey 應為 configured
docker exec highway-checker node scripts/tdx-test.js      # 測 TDX 介接
```

`/api/tdx/raw?kind=section` 與 `kind=live` 會回傳 TDX 原始資料前 3 筆，用來核對欄位名稱。
