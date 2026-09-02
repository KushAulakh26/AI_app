/// <reference path="../pb_data/types.d.ts" />
// pb_hooks/aigc.pb.js — AI provider AIGC 标准模型中转 (self-contained, 单路由 + allowlist)
//
// 上面那行协议标记 + 下面各处的 localForwardRhHeaders 是「创作者自主定价」的发布
// 审计判据: 标记声明意图, 而真正被检查的是 "X-Provider-Ticket" 这个字面量确实出现在
// 请求头构造里。只认注释会被旧模板复制粘贴骗过, 只认函数定义会被一个从没被调用的
// 空壳骗过 —— 那正是"配了系数一分不加"的静默失效来源。判定结果决定后台能否配 >0。
//
// 路由约定:
//   GET  /api/aigc/models
//   POST /api/aigc/upload                         multipart file -> RH download_url
//   POST /api/aigc/submit                         body.model=<provider-model-id>
//   POST /api/aigc/jobs/{jobId}/poll
//   POST /api/aigc/history                         body.model 可选
//   POST /api/aigc/history/{jobId}/update
//   POST /api/aigc/history/{jobId}/delete
//
// ⚠️ 这个文件由 the AIGC route installer 装到目标路径。
//    加模型只更新 ALLOWED_MODELS, 不新增 per-model routerAdd。
//
// 业务字段 (book_id / order_id 等) 必须新建独立 collection 用 task_id 外键关联,
// **禁止**往 aigc_tasks 加业务字段 (会逼模型绕开 MCP 自己 Write).
//
// 字段名注意:
//   - PB 不允许字段名叫 model (跟 PB Record 内置属性冲突) → 表字段用 model_name。
//   - 前端传 body.model, 后端用 ALLOWED_MODELS[model] 校验并读取 endpoint/payload 契约。

routerAdd("GET", "/api/aigc/models", function (e) {
  // Catalogs are provider-owned. Keep image and video models in one contract so pages
  // branch on output_type rather than maintaining separate routes or model allowlists.
  var helpers = require(`${__hooks}/aigc_helpers.js`)
  try {
    var cfg = helpers.loadAigcProviderConfig()
    var imageRes = $http.send({ url: cfg.baseUrl + "/image-models", method: "GET", headers: { "Authorization": "Bearer " + cfg.apiKey }, timeout: 30 })
    var videoRes = $http.send({ url: cfg.baseUrl + "/video-models", method: "GET", headers: { "Authorization": "Bearer " + cfg.apiKey }, timeout: 30 })
    var imageParsed = null; var videoParsed = null
    try { imageParsed = JSON.parse((imageRes && imageRes.raw) || "") } catch (_) {}
    try { videoParsed = JSON.parse((videoRes && videoRes.raw) || "") } catch (_) {}
    var imageList = (imageParsed && (imageParsed.data || imageParsed.models)) || []
    var videoList = (videoParsed && (videoParsed.data || videoParsed.models)) || []
    var items = []
    function scalarParams(m) {
      var scal = []
      if (m.ratios && m.ratios.length) scal.push({ name: "ratio", type: "string", required: false, enum: m.ratios, default: m.ratios[0] })
      if (m.resolutions && m.resolutions.length) scal.push({ name: "resolution", type: "string", required: false, enum: m.resolutions, default: m.resolutions[0] })
      // 時長區間每個模型不同且伺服器端會擋，所以照實透出；沒有建議值就用 min..max 展開。
      var durs = []
      if (m.videoDurationSuggest && m.videoDurationSuggest.length) {
        for (var dsi = 0; dsi < m.videoDurationSuggest.length; dsi++) durs.push(String(m.videoDurationSuggest[dsi]))
      } else {
        var dmin = Number(m.videoDurationMin || 0), dmax = Number(m.videoDurationMax || 0)
        for (var dv = dmin; dv > 0 && dv <= dmax && durs.length < 32; dv++) durs.push(String(dv))
      }
      if (durs.length) scal.push({ name: "duration", type: "number", required: false, enum: durs, default: durs[0] })
      return scal
    }
    for (var i = 0; i < imageList.length; i++) {
      var image = imageList[i] || {}; var imageId = String(image.id || image.model || "")
      if (!imageId) continue
      var imageMedia = []; var imageFileMax = Number(image.fileMax || 0)
      if (imageFileMax > 0) imageMedia.push({ name: "imageUrls", type: "image", required: false, multiple: true, max_num: imageFileMax, accept: '["JPG","JPEG","PNG","WEBP"]', max_size: 30 })
      items.push({ model: imageId, endpoint: "", output_type: "image", primary_input: { name: "prompt", required: true }, scalar_params: scalarParams(image), media_params: imageMedia, displayName: String(image.displayName || imageId) })
    }
    for (var j = 0; j < videoList.length; j++) {
      var video = videoList[j] || {}; var videoId = String(video.id || video.model || "")
      if (!videoId) continue
      // 五種 videoType：1 文生 / 2 首幀 / 3 首尾幀 / 4 參考 / 5 Omni 參考。
      // 這個應用一定從畫面出發，所以只收支援 2 或 3 的模型。
      var videoTypes = video.allowedVideoTypes || []; var codes = []
      for (var k = 0; k < videoTypes.length; k++) {
        var cd = videoTypes[k] && videoTypes[k].code
        if (cd != null) codes.push(Number(cd))
      }
      if (codes.indexOf(2) < 0 && codes.indexOf(3) < 0) continue
      // 分成 firstFrameUrl / lastFrameUrl 兩個參數：單一 imageUrls 多選欄位會讓前端
      // buildShotBody 塞進一個字串，而且尾幀永遠傳不進來。
      var vmedia = [{ name: "firstFrameUrl", type: "image", required: true, multiple: false, max_num: 1, accept: '["JPG","JPEG","PNG","WEBP"]', max_size: 30 }]
      if (codes.indexOf(3) >= 0) vmedia.push({ name: "lastFrameUrl", type: "image", required: false, multiple: false, max_num: 1, accept: '["JPG","JPEG","PNG","WEBP"]', max_size: 30 })
      items.push({ model: videoId, endpoint: "", output_type: "video", primary_input: { name: "prompt", required: false }, scalar_params: scalarParams(video), media_params: vmedia, allowed_video_types: codes, displayName: String(video.displayName || videoId) })
    }
    var PREFERRED_IMAGES = ["seedream-4.5-white", "seedream-5.0-white", "seedream-4.5", "kling-3.0-omni-image-white", "nano banana 2"]
    var PREFERRED_VIDEOS = ["seedance-1-5-pro-white"]
    items.sort(function (a, b) {
      var preferred = a.output_type === "video" ? PREFERRED_VIDEOS : PREFERRED_IMAGES
      var ia = preferred.indexOf(a.model); var ib = preferred.indexOf(b.model)
      if (ia < 0) ia = a.model === "gpt-image-2" ? 999 : 500
      if (ib < 0) ib = b.model === "gpt-image-2" ? 999 : 500
      return ia - ib
    })
    return e.json(200, { ok: true, models: items })
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(502, { error: "provider_models_failed", message: msg, fingerprint: msg.substring(0, 80) })
  }
})

routerAdd("POST", "/api/aigc/upload", function (e) {
  // 上傳走本地 PocketBase 存儲：provider 只接受公網 HTTPS URL，沒有上傳接口。
  // 存檔後回傳 PUBLIC_ASSET_BASE_URL 拼出的公開地址，provider 端才抓得到。
  var helpers = require(`${__hooks}/aigc_helpers.js`)
  try {
    var publicBase = String($os.getenv("PUBLIC_ASSET_BASE_URL") || "").replace(/\/+$/, "")
    if (!publicBase) {
      return e.json(503, { error: "storage_not_configured", message: "Image storage is not configured", message_zh: "尚未配置圖片存儲" })
    }

    var providerFile = null
    var fileType = "image"
    try {
      try { e.request.parseMultipartForm(64 << 20) } catch (_) {}
      var mf = e.request.multipartForm
      if (mf && mf.value && mf.value["fileType"] && mf.value["fileType"].length) fileType = String(mf.value["fileType"][0] || "image")
      if (mf && mf.file && mf.file["file"] && mf.file["file"].length) {
        providerFile = $filesystem.fileFromMultipart(mf.file["file"][0])
      }
    } catch (_) { providerFile = null }
    if (!providerFile) return e.json(400, { error: "invalid_upload", message: "multipart/form-data 'file' field is required" })

    fileType = String(fileType || "image").toLowerCase()
    if (["image", "audio", "video", "zip"].indexOf(fileType) < 0) fileType = "image"

    // viewRule 必須是公開的 (""), 否則 /api/files/... 對匿名請求 403,
    // provider 的伺服器就抓不到圖 —— 整條圖生圖鏈路會靜默失敗。
    var coll = null
    try { coll = $app.findCollectionByNameOrId("uploads") } catch (_) {}
    if (!coll) {
      coll = new Collection({
        type: "base",
        name: "uploads",
        listRule: null, viewRule: "", createRule: null, updateRule: null, deleteRule: null,
        fields: [{ name: "file", type: "file", maxSelect: 1, maxSize: 67108864 }],
      })
      $app.save(coll)
      coll = $app.findCollectionByNameOrId("uploads")
    } else if (coll.viewRule === null || coll.viewRule === undefined) {
      try { coll.viewRule = ""; $app.save(coll); coll = $app.findCollectionByNameOrId("uploads") } catch (_) {}
    }

    var rec = new Record(coll)
    rec.set("file", providerFile)
    $app.save(rec)
    var stored = String(rec.getString("file") || "")
    if (!stored) return e.json(500, { error: "store_failed", message: "file was not persisted" })

    var downloadUrl = publicBase + "/api/files/uploads/" + String(rec.id) + "/" + stored
    return e.json(200, {
      ok: true,
      type: fileType,
      download_url: downloadUrl,
      downloadUrl: downloadUrl,
      fileName: stored,
    })
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "aigc_upload_error", message: msg, fingerprint: msg.substring(0, 80) })
  }
})

routerAdd("POST", "/api/aigc/submit", function (e) {
  var helpers = require(`${__hooks}/aigc_helpers.js`)
  function newTaskId() { return "task-" + new Date().getTime() + "-" + Math.random().toString(16).slice(2, 10) }
  try {
    var userId = helpers.getAuthUserId(e)
    if (!userId) return e.json(412, { error: "login_required", message: "Sign in to start generating" })
    var cfg = helpers.loadAigcProviderConfig()
    var body = e.requestInfo().body || {}
    var modelName = String(body.model || "").trim()
    if (!modelName) return e.json(400, { error: "model_required", message: "model is required" })

    var videoModel = null
    try { videoModel = helpers.getVideoModel(cfg, modelName) } catch (_) {}
    var isVideo = !!videoModel
    var payload = { model: modelName, text: String(body.prompt || body.text || "") }
    var imageUrls = []
    if (Array.isArray(body.imageUrls)) imageUrls = body.imageUrls
    else if (typeof body.imageUrls === "string" && body.imageUrls) imageUrls = [body.imageUrls]
    else if (body.imageUrl) imageUrls = [String(body.imageUrl)]
    // 目錄把影片的畫面拆成 firstFrameUrl / lastFrameUrl 兩個參數（單一 imageUrls 多選欄位
    // 會讓前端 buildShotBody 只塞得進一個字串，尾幀永遠傳不上來）。這裡把兩者收斂回
    // provider 要的 imageUrls 陣列，同時保留舊的 imageUrls 傳法。
    var ff = helpers.toUrlArray(body.firstFrameUrl)
    var lf = helpers.toUrlArray(body.lastFrameUrl)
    if (ff.length || lf.length) {
      var merged = []
      if (ff.length) merged.push(ff[0])
      else if (imageUrls.length) merged.push(String(imageUrls[0]))
      if (lf.length) merged.push(lf[0])
      imageUrls = merged
    }
    if (isVideo) {
      var hasFirstFrame = imageUrls.length > 0 && !!String(imageUrls[0] || "")
      var hasLastFrame = imageUrls.length > 1 && !!String(imageUrls[1] || "")
      var videoType = hasFirstFrame ? (hasLastFrame ? 3 : 2) : 1
      var allowed = videoModel.allowedVideoTypes || []
      var typeAllowed = false
      for (var ci = 0; ci < allowed.length; ci++) if (Number(allowed[ci] && allowed[ci].code) === videoType) { typeAllowed = true; break }
      if (!typeAllowed) return e.json(400, { error: "video_type_not_supported", message: "selected video model does not support videoType " + videoType })
      payload.videoType = videoType
      if (hasFirstFrame) payload.imageUrls = imageUrls.slice(0, hasLastFrame ? 2 : 1)
      if (body.resolution) payload.resolution = String(body.resolution)
      if (body.ratio) payload.ratio = String(body.ratio)
      if (body.duration !== undefined && body.duration !== null && String(body.duration) !== "") payload.duration = Number(body.duration)
    } else {
      if (imageUrls.length) payload.imageUrls = imageUrls
      var ratio = body.ratio || body.aspectRatio
      if (ratio && String(ratio) !== "empty" && String(ratio) !== "adaptive") payload.ratio = String(ratio)
      if (body.resolution) payload.resolution = String(body.resolution)
      // count is REQUIRED: provider NPEs on null (ImageModelRequest.getCount()).
      payload.count = Number(body.count || 1)
    }

    var res = $http.send({
      url: cfg.baseUrl + (isVideo ? "/video-generations" : "/image-generations"), method: "POST",
      headers: { "Authorization": "Bearer " + cfg.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload), timeout: 60,
    })
    var raw = (res && typeof res.raw === "string") ? res.raw : ""
    if (helpers.isAuthError(raw)) return e.json(412, { error: "login_required", message: "API key rejected by provider" })
    var parsed = null; try { parsed = JSON.parse(raw) } catch (_) {}
    var upstream = parsed && parsed.data && parsed.data.taskId
    if (!upstream) {
      var bm = "provider submit: HTTP " + (res ? res.statusCode : 0) + " " + raw.substring(0, 240)
      return e.json(502, { error: "provider_submit_failed", message: bm, fingerprint: bm.substring(0, 80) })
    }
    var localTaskId = newTaskId()
    try {
      var coll = helpers.ensureColl()
      var rec = new Record(coll)
      rec.set("task_id", localTaskId); rec.set("upstream_task_id", String(upstream)); rec.set("model_name", modelName)
      rec.set("user_id", userId); rec.set("page", String(body.page || "")); rec.set("output_type", isVideo ? "video" : "image")
      rec.set("prompt", payload.text); rec.set("status", "running")
      $app.save(rec)
    } catch (_) {}
    return e.json(200, { ok: true, taskId: localTaskId, upstreamTaskId: String(upstream), status: "running", model: modelName })
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "aigc_submit_error", message: msg, fingerprint: msg.substring(0, 80) })
  }
})

// Price preview is optional. The current provider exposes live model catalogs but no
// authoritative price-preview endpoint, so never invent an estimate or use a legacy route.
routerAdd("POST", "/api/aigc/price-preview", function (e) {
  var helpers = require(`${__hooks}/aigc_helpers.js`)
  try {
    var body = e.requestInfo().body || {}
    var modelName = String(body.model || "").trim()
    if (!modelName) return e.json(200, { ok: false, message: "model_required" })
    var cfg = helpers.loadAigcProviderConfig()
    var contract = helpers.getAigcModelContract(cfg, modelName)
    if (!contract) return e.json(200, { ok: false, message: "model_not_available" })
    return e.json(200, {
      ok: false,
      message: "pricing_unavailable",
      pricingAvailable: false,
      model: modelName,
    })
  } catch (_) {
    return e.json(200, { ok: false, message: "pricing_unavailable", pricingAvailable: false })
  }
})

routerAdd("POST", "/api/aigc/jobs/{jobId}/poll", function (e) {
  var helpers = require(`${__hooks}/aigc_helpers.js`)
  try {
    var userId = helpers.getAuthUserId(e)
    if (!userId) return e.json(412, { error: "login_required", message: "Sign in to start generating" })
    var jobId = e.request.pathValue("jobId")
    var rec = null
    try { rec = $app.findFirstRecordByFilter("aigc_tasks", "task_id = {:t}", { t: jobId }) } catch (_) {}
    if (!rec) return e.json(200, { ok: true, taskId: jobId, status: "RUNNING", outputs: [] })
    var upstream = rec.getString("upstream_task_id")
    if (!upstream) return e.json(200, { ok: true, taskId: jobId, status: "RUNNING", outputs: [] })

    var cfg = helpers.loadAigcProviderConfig()
    var modelName = rec.getString("model_name")
    var isVideo = rec.getString("output_type") === "video"
    if (!isVideo) {
      try { isVideo = !!helpers.getVideoModel(cfg, modelName) } catch (_) {}
    }
    var res = $http.send({
      url: cfg.baseUrl + (isVideo ? "/video-generations/" : "/image-generations/") + encodeURIComponent(upstream), method: "GET",
      headers: { "Authorization": "Bearer " + cfg.apiKey }, timeout: 30,
    })
    var raw = (res && typeof res.raw === "string") ? res.raw : ""
    var parsed = null; try { parsed = JSON.parse(raw) } catch (_) {}
    var data = (parsed && parsed.data) ? parsed.data : parsed
    if (!data) return e.json(200, { ok: true, taskId: jobId, status: "RUNNING", outputs: [], model: rec.getString("model_name") })

    var st = String(data.status || "pending").toLowerCase()
    var outputs = []
    if (isVideo) {
      var videoUrl = String(data.videoUrl || "")
      if (videoUrl) outputs.push({ url: videoUrl, type: "video" })
    } else {
      // `images` is a JSON-STRINGIFIED array: parse it again after parsing the body.
      var urls = []
      try {
        var imgs = data.images
        if (typeof imgs === "string") imgs = JSON.parse(imgs)
        if (imgs && imgs.length) { for (var i = 0; i < imgs.length; i++) { if (imgs[i]) urls.push(String(imgs[i])) } }
      } catch (_) {}
      for (var j = 0; j < urls.length; j++) outputs.push({ url: urls[j], type: "image" })
    }

    if (st === "success" && outputs.length) {
      // 已經落地過就直接回，不要每次 poll 都重抓一份幾 MB 的成品。
      var already = rec.getString("result_url")
      if (already && already.indexOf("/api/files/generated/") >= 0) {
        return e.json(200, { ok: true, taskId: jobId, status: "SUCCESS", outputs: [{ url: already, type: outputs[0].type }], model: rec.getString("model_name") })
      }
      // 把簽名 URL 的成品抓回自家儲存，換成永久網址；抓失敗就沿用原網址。
      for (var oi = 0; oi < outputs.length; oi++) {
        var hosted = helpers.rehostToPocketBase(outputs[oi].url)
        if (hosted) outputs[oi].url = hosted
      }
      try { rec.set("status", "success"); rec.set("result_url", outputs[0].url.substring(0, 2048)); $app.save(rec) } catch (_) {}
      return e.json(200, { ok: true, taskId: jobId, status: "SUCCESS", outputs: outputs, model: rec.getString("model_name") })
    }
    if (st === "failed") {
      var emsg = String(data.errorMessage || data.message || "generation failed")
      try { rec.set("status", "failed"); rec.set("error_message", emsg.substring(0, 4000)); $app.save(rec) } catch (_) {}
      return e.json(200, { ok: false, taskId: jobId, status: "FAILED", outputs: [], error: emsg, model: rec.getString("model_name") })
    }
    return e.json(200, { ok: true, taskId: jobId, status: "RUNNING", outputs: [], model: rec.getString("model_name") })
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "aigc_poll_error", message: msg, fingerprint: msg.substring(0, 80) })
  }
})

routerAdd("POST", "/api/aigc/history", function (e) {
  var helpers = require(`${__hooks}/aigc_helpers.js`)
  
  // 懒对账: 关页/刷新期间没有浏览器在 poll 时, /jobs/{jobId}/poll (唯一写终态的地方) 就没人调用,
  // aigc_tasks 记录会永远停在 running —— 哪怕 RH 那边任务早就跑完了。这里在用户自己打开历史列表时,
  // 用他自己请求带的 key 顺带把 stale running 记录的真实终态补上, 逻辑跟 /jobs/{jobId}/poll 完全一致
  // (成功查usage/结果URL, 失败查errorMessage), 避免记录变成永远转圈的幽灵。
  // 只处理本页 status=="running" 且 updated 超过 30s 的记录, 最多 3 条 (串行请求 RH), 防止一页里
  // 混进很多 stale 记录时拖慢 /history 响应 —— 没处理到的等下次打开历史 (或 resumeAigcJob) 再对账。
  // RH /query 对已被清理/过期的任务不会返回 status=FAILED, 而是返回错误文案 (无 status 字段)。
  // 这类记录必须写成 failed, 否则永远卡 running —— 恰恰是"隔天才回来看历史"这种最需要对账的场景。
  // 只认明确的 not-found/expired 标记, 瞬时错误 (限流/5xx 文案) 不能误判成终态。
  try {
    var userId = helpers.getAuthUserId(e)
    if (!userId) return e.json(200, { ok: true, items: [], page: 1, perPage: 0 })
    var body = {}
    try { body = e.requestInfo().body || {} } catch (_) {}
    var query = {}
    try { query = e.requestInfo().query || {} } catch (_) {}
    var page = parseInt(String(body.page || query.page || "1"), 10); if (!page || page < 1) page = 1
    var perPage = parseInt(String(body.perPage || query.perPage || "20"), 10); if (!perPage || perPage < 1) perPage = 20
    if (perPage > 100) perPage = 100

    var filters = ["user_id = {:uid}"]
    var params = { uid: userId }
    var modelName = String(body.model || query.model || "").trim()
    if (modelName) { filters.push("model_name = {:m}"); params.m = modelName }
    if (body.favorite === true || body.favorite === "true") filters.push("favorite = true")
    if (body.status) { filters.push("status = {:status}"); params.status = String(body.status) }
    if (body.category) { filters.push("category = {:category}"); params.category = String(body.category).substring(0, 32) }
    var minRating = parseInt(String(body.minRating || "0"), 10)
    if (minRating > 0) { filters.push("rating >= {:minRating}"); params.minRating = minRating }
    var sort = "-created"
    if (body.sort === "oldest") sort = "created"
    if (body.sort === "rating") sort = "-rating,-created"
    if (body.sort === "favorite") sort = "-favorite,-created"

    var records = []
    try {
      records = $app.findRecordsByFilter("aigc_tasks", filters.join(" && "), sort, perPage, (page - 1) * perPage, params) || []
    } catch (_) { records = [] }

    helpers.reconcileStaleRunning(records, helpers.readKey(e))

    var items = []
    for (var i = 0; i < records.length; i++) items.push(helpers.itemFromRecord(records[i]))
    return e.json(200, { ok: true, items: items, page: page, perPage: perPage })
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "aigc_history_error", message: msg, fingerprint: msg.substring(0, 80) })
  }
})

routerAdd("POST", "/api/aigc/history/{jobId}/update", function (e) {
  var helpers = require(`${__hooks}/aigc_helpers.js`)
  
  try {
    var userId = helpers.getAuthUserId(e)
    if (!userId) return e.json(412, { error: "login_required", message: "请用右上角按钮登录 AI provider" })
    var jobId = e.request.pathValue("jobId")
    var rec = null
    try { rec = $app.findFirstRecordByFilter("aigc_tasks", "task_id = {:tid} && user_id = {:uid}", { tid: jobId, uid: userId }) } catch (_) {}
    if (!rec) return e.json(404, { error: "history_not_found", message: "记录不存在或已删除" })
    var body = {}
    try { body = e.requestInfo().body || {} } catch (_) {}
    if (body.rating !== undefined) {
      var rating = Number(body.rating || 0)
      if (rating < 0 || rating > 5 || Math.floor(rating) !== rating) return e.json(400, { error: "invalid_rating", message: "评分必须是 1-5, 或 0 表示清空" })
      rec.set("rating", rating)
    }
    if (body.favorite !== undefined) rec.set("favorite", !!body.favorite)
    if (body.category !== undefined) rec.set("category", String(body.category || "").substring(0, 32))
    if (body.note !== undefined) rec.set("note", String(body.note || "").substring(0, 1000))
    $app.save(rec)
    return e.json(200, { ok: true, item: helpers.itemFromRecord(rec) })
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "aigc_history_update_error", message: msg, fingerprint: msg.substring(0, 80) })
  }
})

routerAdd("POST", "/api/aigc/history/{jobId}/delete", function (e) {
  var helpers = require(`${__hooks}/aigc_helpers.js`)
  
  try {
    var userId = helpers.getAuthUserId(e)
    if (!userId) return e.json(412, { error: "login_required", message: "请用右上角按钮登录 AI provider" })
    var jobId = e.request.pathValue("jobId")
    var rec = null
    try { rec = $app.findFirstRecordByFilter("aigc_tasks", "task_id = {:tid} && user_id = {:uid}", { tid: jobId, uid: userId }) } catch (_) {}
    if (!rec) return e.json(404, { error: "history_not_found", message: "记录不存在或已删除" })
    $app.delete(rec)
    return e.json(200, { ok: true, deleted: true, jobId: jobId })
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "aigc_history_delete_error", message: msg, fingerprint: msg.substring(0, 80) })
  }
})
