/// <reference path="../pb_data/types.d.ts" />
// ciyuan-market OpenAI-compatible LLM proxy.

onBootstrap(function (e) {
  e.next()
  try {
    var existing = null
    try { existing = $app.findCollectionByNameOrId("llm_jobs") } catch (_) {}
    if (!existing) {
      $app.save(new Collection({
        type: "base", name: "llm_jobs",
        listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
        fields: [
          { name: "request_id", type: "text", required: true, max: 160 },
          { name: "model_name", type: "text", required: true, max: 80 },
          { name: "page", type: "text", max: 64 },
          { name: "status", type: "text", required: true, max: 32 },
          { name: "result_text", type: "text", max: 80000 },
          { name: "error_message", type: "text", max: 4000 },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_llm_jobs_request_id ON llm_jobs (request_id)"],
      }))
    }
  } catch (err) {
    try { $app.logger().error("llm_jobs bootstrap: " + String(err && err.message || err)) } catch (_) {}
  }
})

routerAdd("GET", "/api/llm/models", function (e) {
  try {
    var provider = require(`${__hooks}/ai_provider.js`).loadProviderConfig("llm")
    var res = $http.send({
      url: provider.baseUrl + "/models",
      method: "GET",
      headers: { "Authorization": "Bearer " + provider.apiKey },
      timeout: 30,
    })
    var raw = (res && typeof res.raw === "string") ? res.raw : ""
    var parsed = null
    try { parsed = JSON.parse(raw) } catch (_) {}
    if (!res || res.statusCode < 200 || res.statusCode >= 300 || !parsed) {
      return e.json(res && res.statusCode === 401 ? 401 : 502, { error: "provider_models_failed", message: "無法取得 AI provider 模型清單" })
    }
    var source = Array.isArray(parsed.data) ? parsed.data : (parsed.data && Array.isArray(parsed.data.data) ? parsed.data.data : [])
    var models = []
    for (var i = 0; i < source.length; i++) {
      var id = String((source[i] && (source[i].id || source[i].model)) || "").trim()
      if (!id) continue
      models.push({ model: id, provider_model_id: id, max_tokens: 8192, timeout_s: 600, supports_temperature: false })
    }
    return e.json(200, { ok: true, models: models })
  } catch (err) {
    return e.json(502, { error: "provider_models_failed", message: String(err && err.message || err) })
  }
})

routerAdd("POST", "/api/llm/chat", function (e) {
  try {
    var provider = require(`${__hooks}/ai_provider.js`).loadProviderConfig("llm")
    var body = e.requestInfo().body || {}
    var model = String(body.model || "").trim()
    var messages = body.messages
    if (!model) return e.json(400, { error: "model_required", message: "缺少模型 ID" })
    if (!Array.isArray(messages) || !messages.length) return e.json(400, { error: "messages_required", message: "缺少 messages" })
    var payload = { model: model, messages: messages, stream: false }
    if (body.max_tokens != null) payload.max_tokens = Number(body.max_tokens) || 8192
    if (body.temperature != null) payload.temperature = body.temperature
    var res = $http.send({
      url: provider.baseUrl + "/chat/completions",
      method: "POST",
      headers: { "Authorization": "Bearer " + provider.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeout: 600,
    })
    var raw = (res && typeof res.raw === "string") ? res.raw : ""
    var parsed = null
    try { parsed = JSON.parse(raw) } catch (_) {}
    if (res && res.statusCode === 401) return e.json(401, { error: "provider_auth", message: "AI provider API key 無效" })
    if (!res || res.statusCode < 200 || res.statusCode >= 300 || !parsed) {
      var msg = String((parsed && (parsed.message || parsed.error)) || raw || "AI provider 請求失敗").substring(0, 400)
      return e.json(502, { error: "llm_failed", message: msg })
    }
    var choice = parsed.choices && parsed.choices[0]
    var text = choice && choice.message ? String(choice.message.content || "") : ""
    if (!choice) return e.json(502, { error: "llm_bad_json", message: "AI provider 回應缺少 choices" })
    return e.json(200, { ok: true, status: "success", model: model, text: text, usage: parsed.usage || null })
  } catch (err) {
    return e.json(502, { error: "llm_failed", message: String(err && err.message || err) })
  }
})

routerAdd("POST", "/api/llm/poll", function (e) {
  try {
    var coll = null
    try { coll = $app.findCollectionByNameOrId("llm_jobs") } catch (_) {}
    if (!coll) {
      coll = new Collection({
        type: "base", name: "llm_jobs",
        listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
        fields: [
          { name: "request_id", type: "text", required: true, max: 160 },
          { name: "model_name", type: "text", required: true, max: 80 },
          { name: "page", type: "text", max: 64 },
          { name: "status", type: "text", required: true, max: 32 },
          { name: "result_text", type: "text", max: 80000 },
          { name: "error_message", type: "text", max: 4000 },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_llm_jobs_request_id ON llm_jobs (request_id)"],
      })
      $app.save(coll)
    }
    var body = e.requestInfo().body || {}
    var requestId = String(body.request_id || "").trim()
    if (!requestId) return e.json(400, { error: "request_id_required" })
    var rec = null
    try { rec = $app.findFirstRecordByFilter("llm_jobs", "request_id = {:r}", { r: requestId }) } catch (_) {}
    if (!rec) return e.json(200, { ok: false, status: "not_found", text: "", error: "not_found" })
    var status = rec.getString("status")
    return e.json(200, { ok: status === "success", status: status, text: status === "success" ? rec.getString("result_text") : "", error: status === "failed" ? rec.getString("error_message") : "", model: rec.getString("model_name") })
  } catch (err) {
    return e.json(500, { error: "poll_error", message: String(err && err.message || err) })
  }
})
