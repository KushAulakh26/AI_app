/// <reference path="../pb_data/types.d.ts" />
// pb_hooks/engine_settings.pb.js — 业务 collection + REST CRUD 路由 (self-contained)
//
// 由 the business-collection installer 装. 不要直接 Read+Write 这个文件.
// 业务字段: user_id:text, aigc_defaults:json, llm_defaults:json, aigc_disabled:json, llm_disabled:json
// 路由: list,get,create,update,delete
// list filter 字段: user_id
// list 默认排序: -created

onBootstrap(function (e) {
  e.next()
  try {
    var existing = null
    try { existing = $app.findCollectionByNameOrId("engine_settings") } catch (_) { existing = null }
    if (existing) {
      var changed = false
      function hasField(name) {
        try { return !!existing.fields.getByName(name) } catch (_) {}
        try {
          for (var i = 0; i < existing.fields.length; i++) {
            if (String(existing.fields[i].name) === String(name)) return true
          }
        } catch (_) {}
        return false
      }
      function addField(def) {
        if (hasField(def.name)) return
        try { existing.fields.add(new Field(def)); changed = true } catch (_) {}
      }
      addField({ name: 'user_id', type: 'text', required: true })
      addField({ name: 'aigc_defaults', type: 'json' })
      addField({ name: 'llm_defaults', type: 'json' })
      addField({ name: 'aigc_disabled', type: 'json' })
      addField({ name: 'llm_disabled', type: 'json' })
      addField({ name: "created", type: "autodate", onCreate: true })
      addField({ name: "updated", type: "autodate", onCreate: true, onUpdate: true })
      if (changed) {
        $app.save(existing)
        try { $app.logger().info("engine_settings collection upgraded") } catch (_) {}
      }
    } else {
      var col = new Collection({
        type: "base",
        name: "engine_settings",
        listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
        fields: [
          { name: 'user_id', type: 'text', required: true },
          { name: 'aigc_defaults', type: 'json' },
          { name: 'llm_defaults', type: 'json' },
          { name: 'aigc_disabled', type: 'json' },
          { name: 'llm_disabled', type: 'json' },
          { name: "created", type: "autodate", onCreate: true },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      })
      $app.save(col)
      try { $app.logger().info("engine_settings collection created") } catch (_) {}
    }
  } catch (err) {
    try { $app.logger().error("engine_settings bootstrap: " + String(err && err.message || err)) } catch (_) {}
  }
})

function isAdminRequest(e) {
  try {
    var info = e.requestInfo() || {}
    var auth = info.authRecord || (e.auth && e.auth.record)
    if (!auth) return false
    var email = String(auth.email ? auth.email() : (auth.getString && auth.getString("email")) || "").trim().toLowerCase()
    if (!email) return false
    try {
      var rec = $app.findFirstRecordByFilter("admin_whitelist", "email = {:email}", { email: email })
      return !!rec
    } catch (_) {
      return false
    }
  } catch (_) {}
  return false
}


// GET /api/engine_settings?page=1&perPage=50&sort=-created&user_id=...
routerAdd("GET", "/api/engine_settings", function (e) {
  function ensureCollLocal() {
    try { return $app.findCollectionByNameOrId("engine_settings") } catch (_) {}
    var col = new Collection({
      type: "base",
      name: "engine_settings",
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
          { name: 'user_id', type: 'text', required: true },
          { name: 'aigc_defaults', type: 'json' },
          { name: 'llm_defaults', type: 'json' },
          { name: 'aigc_disabled', type: 'json' },
          { name: 'llm_disabled', type: 'json' },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    })
    $app.save(col)
    return $app.findCollectionByNameOrId("engine_settings")
  }
  try {
    ensureCollLocal()
    var info = e.requestInfo()
    var query = info.query || {}
    var page = parseInt(String(query.page || "1"), 10) || 1
    var perPage = parseInt(String(query.perPage || "50"), 10) || 50
    if (perPage > 200) perPage = 200
    var sort = String(query.sort || "-created")
    var filterParts = []
    var params = {}
    var helpers = require(`${__hooks}/aigc_helpers.js`)
    var authUserId = helpers.getAuthUserId(e)
    if (!authUserId) return e.json(401, { error: "unauthorized", message: "请先登录" })
    filterParts.push("user_id = {:user_id}")
    params.user_id = authUserId
    var filter = filterParts.length > 0 ? filterParts.join(" && ") : ""
    var records = filter
      ? $app.findRecordsByFilter("engine_settings", filter, sort, perPage, (page - 1) * perPage, params)
      : $app.findRecordsByFilter("engine_settings", "", sort, perPage, (page - 1) * perPage)
    var items = []
    for (var i = 0; i < records.length; i++) {
      items.push(records[i].publicExport())
    }
    return e.json(200, { items: items, page: page, perPage: perPage, totalItems: items.length })
  } catch (err) {
    var msg = String(err && err.message || err)
    try { $app.logger().error("engine_settings list: " + msg) } catch (_) {}
    return e.json(500, { error: "list_failed", message: msg, fingerprint: msg.substring(0, 80) })
  }
})
// GET /api/engine_settings/{id}
routerAdd("GET", "/api/engine_settings/{id}", function (e) {
  try {
    var id = e.request.pathValue("id")
    if (!id) return e.json(400, { error: "id_required" })
    var rec = null
    try { rec = $app.findRecordById("engine_settings", id) } catch (_) { rec = null }
    if (!rec) return e.json(404, { error: "not_found" })
    var helpers = require(`${__hooks}/aigc_helpers.js`)
    var authUserId = helpers.getAuthUserId(e)
    if (rec.getString("user_id") !== authUserId) {
      return e.json(403, { error: "forbidden", message: "无权访问该记录" })
    }
    return e.json(200, rec.publicExport())
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "get_failed", message: msg, fingerprint: msg.substring(0, 80) })
  }
})
// POST /api/engine_settings  body 字段: user_id, aigc_defaults, llm_defaults, aigc_disabled, llm_disabled
routerAdd("POST", "/api/engine_settings", function (e) {
  function ensureCollLocal() {
    try { return $app.findCollectionByNameOrId("engine_settings") } catch (_) {}
    var col = new Collection({
      type: "base",
      name: "engine_settings",
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
          { name: 'user_id', type: 'text', required: true },
          { name: 'aigc_defaults', type: 'json' },
          { name: 'llm_defaults', type: 'json' },
          { name: 'aigc_disabled', type: 'json' },
          { name: 'llm_disabled', type: 'json' },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    })
    $app.save(col)
    return $app.findCollectionByNameOrId("engine_settings")
  }
  try {
    var coll = ensureCollLocal()
    var body = e.requestInfo().body || {}
    var helpers = require(`${__hooks}/aigc_helpers.js`)
    var authUserId = helpers.getAuthUserId(e)
    if (!authUserId) return e.json(401, { error: "unauthorized", message: "请先登录" })
    var rec = new Record(coll)
    rec.set("user_id", authUserId)
    rec.set("aigc_defaults", body.aigc_defaults)
    rec.set("llm_defaults", body.llm_defaults)
    rec.set("aigc_disabled", body.aigc_disabled)
    rec.set("llm_disabled", body.llm_disabled)
    $app.save(rec)
    return e.json(200, rec.publicExport())
  } catch (err) {
    var msg = String(err && err.message || err)
    try { $app.logger().error("engine_settings create: " + msg) } catch (_) {}
    return e.json(500, { error: "create_failed", message: msg, fingerprint: msg.substring(0, 80) })
  }
})
// PATCH /api/engine_settings/{id}  body 字段同 POST, 只更新 body 里出现的字段
routerAdd("PATCH", "/api/engine_settings/{id}", function (e) {
  try {
    var id = e.request.pathValue("id")
    if (!id) return e.json(400, { error: "id_required" })
    var rec = null
    try { rec = $app.findRecordById("engine_settings", id) } catch (_) { rec = null }
    if (!rec) return e.json(404, { error: "not_found" })
    var helpers = require(`${__hooks}/aigc_helpers.js`)
    var authUserId = helpers.getAuthUserId(e)
    if (rec.getString("user_id") !== authUserId) {
      return e.json(403, { error: "forbidden", message: "无权修改该记录" })
    }
    var body = e.requestInfo().body || {}
    // user_id 禁止修改; 数据始终属于创建者
    if ("aigc_defaults" in body) rec.set("aigc_defaults", body.aigc_defaults)
    if ("llm_defaults" in body) rec.set("llm_defaults", body.llm_defaults)
    if ("aigc_disabled" in body) rec.set("aigc_disabled", body.aigc_disabled)
    if ("llm_disabled" in body) rec.set("llm_disabled", body.llm_disabled)
    $app.save(rec)
    return e.json(200, rec.publicExport())
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "update_failed", message: msg, fingerprint: msg.substring(0, 80) })
  }
})
// DELETE /api/engine_settings/{id}
routerAdd("DELETE", "/api/engine_settings/{id}", function (e) {
  try {
    var id = e.request.pathValue("id")
    if (!id) return e.json(400, { error: "id_required" })
    var rec = null
    try { rec = $app.findRecordById("engine_settings", id) } catch (_) { rec = null }
    if (!rec) return e.json(404, { error: "not_found" })
    var helpers = require(`${__hooks}/aigc_helpers.js`)
    var authUserId = helpers.getAuthUserId(e)
    if (rec.getString("user_id") !== authUserId) {
      return e.json(403, { error: "forbidden", message: "无权删除该记录" })
    }
    $app.delete(rec)
    return e.json(200, { ok: true })
  } catch (err) {
    var msg = String(err && err.message || err)
    return e.json(500, { error: "delete_failed", message: msg, fingerprint: msg.substring(0, 80) })
  }
})
