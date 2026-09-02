module.exports = {
  // provider 回傳的成品是「簽名 URL」（TOS/OSS 之類），會過期。
  // 直接存進作品庫的話，使用者的 作品牆 過一陣子就整片失效。
  // 這裡把成品抓回來落地到自家 PocketBase，回傳我們自己的永久網址。
  // 失敗就回空字串，呼叫端會退回原本的簽名網址 —— 寧可暫時能看，也不要整個掛掉。
  rehostToPocketBase: function (url) {
    try {
      // 落地成品只是「把檔案抓回來存自己這」，回傳的是相對路徑，
      // 完全不需要公網網域 —— 沒設隧道時也該照樣存檔，不然結果反而丟失。
      if (!url) return ""
      var coll = null
      try { coll = $app.findCollectionByNameOrId("generated") } catch (_) {}
      if (!coll) {
        coll = new Collection({
          type: "base", name: "generated",
          listRule: null, viewRule: "", createRule: null, updateRule: null, deleteRule: null,
          fields: [{ name: "file", type: "file", maxSelect: 1, maxSize: 268435456 }],
        })
        $app.save(coll)
        coll = $app.findCollectionByNameOrId("generated")
      }
      // 用 fileFromBytes 而不是 fileFromURL：後者拿簽名網址當檔名，會產生
      // jpeg_x_tos_algorithm_tos4_hmac_sha256_... 這種公開可見的垃圾檔名。
      var u = String(url)
      var q = u.indexOf("?")
      var pathOnly = q >= 0 ? u.substring(0, q) : u
      var dot = pathOnly.lastIndexOf(".")
      var slash = pathOnly.lastIndexOf("/")
      var ext = (dot > slash && dot >= 0) ? pathOnly.substring(dot + 1).toLowerCase() : ""
      if (!ext || ext.length > 5) ext = "bin"
      var res = $http.send({ url: u, method: "GET", timeout: 180 })
      if (!res || res.statusCode < 200 || res.statusCode >= 300 || !res.body) return ""
      var name = "gen_" + new Date().getTime() + "_" + Math.random().toString(16).slice(2, 8) + "." + ext
      var f = $filesystem.fileFromBytes(res.body, name)
      var rec = new Record(coll)
      rec.set("file", f)
      $app.save(rec)
      var stored = String(rec.getString("file") || "")
      if (!stored) return ""
      // 存**相對**路徑：base 是 cloudflared 快速隧道網域，每次重啟都會換，
      // 把它寫進作品連結，等於讓「永久網址」重新變成會過期的網址。
      // 前端透過 /__pb 代理解析相對路徑，換隧道、換部署都不受影響。
      return "/api/files/generated/" + String(rec.id) + "/" + stored
    } catch (_) { return "" }
  },
  // 影片目錄有 TTL 快取：submit 每次都打 /video-models 只為了判斷是不是影片模型，
  // 等於每次生成多一次往返。require() 若有快取這個變數就活著，沒有也不會更差。
  _videoCache: null,
  _videoCacheAt: 0,
  videoModels: function (cfg) {
    var now = new Date().getTime()
    if (this._videoCache && (now - this._videoCacheAt) < 300000) return this._videoCache
    try {
      var res = $http.send({
        url: cfg.baseUrl + "/video-models", method: "GET",
        headers: { "Authorization": "Bearer " + cfg.apiKey }, timeout: 30,
      })
      var parsed = JSON.parse((res && res.raw) || "{}")
      var list = (parsed && (parsed.data || parsed.models)) || []
      this._videoCache = list; this._videoCacheAt = now
      return list
    } catch (_) { return this._videoCache || [] }
  },
  // 一律轉成陣列：前端 buildShotBody 會把單一 URL 當字串塞進來，
  // 而字串也有 .length，直接送出去就變成 String 而不是 String[]。
  toUrlArray: function (v) {
    if (v == null || v === "") return []
    if (Object.prototype.toString.call(v) === "[object Array]") {
      var out = []
      for (var i = 0; i < v.length; i++) { if (v[i]) out.push(String(v[i])) }
      return out
    }
    return [String(v)]
  },
  loadAigcProviderConfig: function () { return require(`${__hooks}/ai_provider.js`).loadProviderConfig("aigc") },
  buildProviderAuthHeaders: function (e, extra) { return extra || {} },
  getAuthUserId: function (e) {
    try { var a = e.requestInfo().auth; return a && a.id ? String(a.id) : "" } catch (_) { return "" }
  },
  readKey: function (e) {
    try {
      var h = e.requestInfo().headers || {}
      return String(h["x-provider-api-key"] || h["X-Provider-Api-Key"] || $os.getenv("AI_PROVIDER_API_KEY") || "")
    } catch (_) { return "" }
  },
  responseText: function (res) { return res && typeof res.raw === "string" ? res.raw : "" },
  responseJson: function (res) { try { return JSON.parse(this.responseText(res)) } catch (_) { return null } },
  newTaskId: function () { return "task-" + new Date().getTime() + "-" + Math.random().toString(16).slice(2, 10) },
  isAuthError: function (raw) {
    var s = String(raw || "").toLowerCase()
    return s.indexOf("invalid api key") >= 0 || s.indexOf('"code":401') >= 0 || s.indexOf("unauthorized") >= 0
  },
  mapBizError: function (parsed, raw) {
    var p = parsed || {}, code = String(p.code || p.errorCode || ""), message = String(p.message || p.errorMessage || p.error || raw || "")
    return code || message ? { error: "provider_failed", errorCode: code, message: message } : null
  },
  ensureColl: function () {
    // output_type 決定 poll 要打 image-generations 還是 video-generations。
    // 既有 collection 少這個欄位時就地補上，不用手動 migration。
    try {
      var found = $app.findCollectionByNameOrId("aigc_tasks")
      var has = false
      try { has = !!found.fields.getByName("output_type") } catch (_) {}
      if (!has) {
        try {
          found.fields.add(new Field({ name: "output_type", type: "text", max: 16 }))
          $app.save(found)
          found = $app.findCollectionByNameOrId("aigc_tasks")
        } catch (_) {}
      }
      return found
    } catch (_) {}
    var col = new Collection({ type: "base", name: "aigc_tasks", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null, fields: [
      { name: "task_id", type: "text", required: true, max: 160 }, { name: "user_id", type: "text", max: 160 }, { name: "upstream_task_id", type: "text", max: 160 }, { name: "model_name", type: "text", required: true, max: 64 }, { name: "page", type: "text", max: 64 }, { name: "prompt", type: "text", max: 5000 }, { name: "status", type: "text", required: true, max: 32 }, { name: "result_url", type: "text", max: 2048 }, { name: "error_message", type: "text", max: 4000 }, { name: "output_type", type: "text", max: 16 },
    ] })
    $app.save(col); return col
  },
  normalizeOutputUrl: function (url) { return url ? String(url) : "" },
  itemFromRecord: function (r) { return { jobId: r.getString("task_id"), taskId: r.getString("upstream_task_id"), status: r.getString("status"), page: r.getString("page"), prompt: r.getString("prompt"), resultUrl: r.getString("result_url"), errorMessage: r.getString("error_message"), model: r.getString("model_name") } },
  extractUsage: function (data) { var u = data && data.usage || {}; return { consumeMoney: u.consumeMoney == null ? null : String(u.consumeMoney), consumeCoins: u.consumeCoins == null ? null : String(u.consumeCoins), taskCostTime: u.taskCostTime == null ? null : String(u.taskCostTime), thirdPartyConsumeMoney: u.thirdPartyConsumeMoney == null ? null : String(u.thirdPartyConsumeMoney) } },
  reconcileStaleRunning: function () {},
  reportTaskIndex: function () {},
  buildPayload: function (cfg, body) {
    var payload = {}, text = String(body.prompt || body.text || "").trim()
    if (cfg.primary_input && cfg.primary_input.name) payload[cfg.primary_input.name] = text
    for (var i = 0; i < (cfg.scalar_params || []).length; i++) { var p = cfg.scalar_params[i]; if (body[p.name] !== undefined) payload[p.name] = body[p.name]; else if (p.default !== undefined) payload[p.name] = p.default }
    for (var j = 0; j < (cfg.media_params || []).length; j++) { var m = cfg.media_params[j]; if (body[m.name] !== undefined) payload[m.name] = body[m.name] }
    return { payload: payload, input_text: text }
  },
  publicAssetUrl: function (collection, record, filename) {
    var base = String($os.getenv("PUBLIC_ASSET_BASE_URL") || "").replace(/\/+$/, "")
    if (!base) return ""
    return base + "/api/files/" + encodeURIComponent(String(collection)) + "/" + encodeURIComponent(String(record)) + "/" + encodeURIComponent(String(filename))
  },
  getVideoModel: function (cfg, modelName) {
    var now = Date.now()
    var cache = this._videoModelCache || { expiresAt: 0, byId: {} }
    if (cache.expiresAt <= now) {
      var res = $http.send({ url: cfg.baseUrl + "/video-models", method: "GET", headers: { "Authorization": "Bearer " + cfg.apiKey }, timeout: 30 })
      var parsed = null; try { parsed = JSON.parse((res && res.raw) || "") } catch (_) {}
      var list = (parsed && (parsed.data || parsed.models)) || []
      var byId = {}
      for (var i = 0; i < list.length; i++) { var item = list[i] || {}; var id = String(item.id || item.model || ""); if (id) byId[id] = item }
      cache = { expiresAt: now + 60000, byId: byId }
      this._videoModelCache = cache
    }
    return cache.byId[String(modelName || "")] || null
  },
  getAigcModelContract: function (cfg, modelName) {
    var video = this.getVideoModel(cfg, modelName)
    if (video) return { model: video, output_type: "video" }
    var now = Date.now()
    var cache = this._imageModelCache || { expiresAt: 0, byId: {} }
    if (cache.expiresAt <= now) {
      var res = $http.send({ url: cfg.baseUrl + "/image-models", method: "GET", headers: { "Authorization": "Bearer " + cfg.apiKey }, timeout: 30 })
      var parsed = null; try { parsed = JSON.parse((res && res.raw) || "") } catch (_) {}
      var list = (parsed && (parsed.data || parsed.models)) || []
      var byId = {}
      for (var i = 0; i < list.length; i++) { var item = list[i] || {}; var id = String(item.id || item.model || ""); if (id) byId[id] = item }
      cache = { expiresAt: now + 60000, byId: byId }
      this._imageModelCache = cache
    }
    var image = cache.byId[String(modelName || "")] || null
    return image ? { model: image, output_type: "image" } : null
  },
  ciyuanConfig: function () { return require(`${__hooks}/ai_provider.js`).loadProviderConfig("aigc") },
  ciyuanJson: function (res) { try { return JSON.parse(res && res.raw || "") } catch (_) { return null } },
  ciyuanRequest: function (cfg, path, method, body) {
    return $http.send({ url: cfg.baseUrl + path, method: method || "GET", headers: { "Authorization": "Bearer " + cfg.apiKey, "Content-Type": "application/json" }, body: body == null ? undefined : JSON.stringify(body), timeout: 60 })
  },
}
