/// <reference path="../pb_data/types.d.ts" />
// cloud_works CRUD. Ownership is always derived from e.requestInfo().auth.id.

onBootstrap(function (e) {
  e.next()
  try {
    var existing = null
    try { existing = $app.findCollectionByNameOrId("cloud_works") } catch (_) { existing = null }
    if (existing) {
      var changed = false
      function hasField(name) {
        try { return !!existing.fields.getByName(name) } catch (_) {}
        try {
          for (var i = 0; i < existing.fields.length; i++) {
            if (String(existing.fields[i].name) === name) return true
          }
        } catch (_) {}
        return false
      }
      function addField(def) {
        if (!hasField(def.name)) {
          try { existing.fields.add(new Field(def)); changed = true } catch (_) {}
        }
      }
      addField({ name: "user_id", type: "text", required: true })
      addField({ name: "kind", type: "text", required: true })
      addField({ name: "asset_type", type: "text" })
      addField({ name: "title", type: "text" })
      addField({ name: "summary", type: "text" })
      addField({ name: "content", type: "json" })
      addField({ name: "media_urls", type: "json" })
      addField({ name: "model_name", type: "text" })
      addField({ name: "source_page", type: "text" })
      addField({ name: "local_key", type: "text" })
      addField({ name: "synced_from_local", type: "bool" })
      addField({ name: "created", type: "autodate", onCreate: true })
      addField({ name: "updated", type: "autodate", onCreate: true, onUpdate: true })
      if (changed) $app.save(existing)
    } else {
      $app.save(new Collection({
        type: "base",
        name: "cloud_works",
        listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
        fields: [
          { name: "user_id", type: "text", required: true },
          { name: "kind", type: "text", required: true },
          { name: "asset_type", type: "text" }, { name: "title", type: "text" },
          { name: "summary", type: "text" }, { name: "content", type: "json" },
          { name: "media_urls", type: "json" }, { name: "model_name", type: "text" },
          { name: "source_page", type: "text" }, { name: "local_key", type: "text" },
          { name: "synced_from_local", type: "bool" },
          { name: "created", type: "autodate", onCreate: true },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      }))
    }
  } catch (err) {
    try { $app.logger().error("cloud_works bootstrap: " + String(err && err.message || err)) } catch (_) {}
  }
})

routerAdd("GET", "/api/cloud_works", function (e) {
  try {
    var auth = e.requestInfo().auth
    if (!auth || !auth.id) return e.json(401, { error: "unauthorized", message: "请先登录" })
    var info = e.requestInfo()
    var query = info.query || {}
    var page = parseInt(String(query.page || "1"), 10) || 1
    var perPage = parseInt(String(query.perPage || "50"), 10) || 50
    if (perPage > 200) perPage = 200
    var parts = ["user_id = {:user_id}"]
    var params = { user_id: String(auth.id) }
    if (query.kind !== undefined && query.kind !== "") { parts.push("kind = {:kind}"); params.kind = String(query.kind) }
    if (query.local_key !== undefined && query.local_key !== "") { parts.push("local_key = {:local_key}"); params.local_key = String(query.local_key) }
    var records = $app.findRecordsByFilter("cloud_works", parts.join(" && "), String(query.sort || "-created"), perPage, (page - 1) * perPage, params)
    var items = []
    for (var i = 0; i < records.length; i++) items.push(records[i].publicExport())
    return e.json(200, { items: items, page: page, perPage: perPage, totalItems: items.length })
  } catch (err) {
    return e.json(500, { error: "list_failed", message: String(err && err.message || err) })
  }
})

routerAdd("GET", "/api/cloud_works/{id}", function (e) {
  try {
    var auth = e.requestInfo().auth
    if (!auth || !auth.id) return e.json(401, { error: "unauthorized", message: "请先登录" })
    var rec = null
    try { rec = $app.findRecordById("cloud_works", e.request.pathValue("id")) } catch (_) {}
    if (!rec || rec.getString("user_id") !== String(auth.id)) return e.json(404, { error: "not_found" })
    return e.json(200, rec.publicExport())
  } catch (err) { return e.json(500, { error: "get_failed", message: String(err && err.message || err) }) }
})

routerAdd("POST", "/api/cloud_works", function (e) {
  try {
    var auth = e.requestInfo().auth
    if (!auth || !auth.id) return e.json(401, { error: "unauthorized", message: "请先登录" })
    var body = e.requestInfo().body || {}
    var coll = $app.findCollectionByNameOrId("cloud_works")
    var rec = new Record(coll)
    rec.set("user_id", String(auth.id))
    rec.set("kind", body.kind == null ? "" : String(body.kind))
    rec.set("asset_type", body.asset_type == null ? "" : String(body.asset_type))
    rec.set("title", body.title == null ? "" : String(body.title))
    rec.set("summary", body.summary == null ? "" : String(body.summary))
    rec.set("content", body.content); rec.set("media_urls", body.media_urls)
    rec.set("model_name", body.model_name == null ? "" : String(body.model_name))
    rec.set("source_page", body.source_page == null ? "" : String(body.source_page))
    rec.set("local_key", body.local_key == null ? "" : String(body.local_key))
    rec.set("synced_from_local", !!body.synced_from_local)
    $app.save(rec)
    return e.json(200, rec.publicExport())
  } catch (err) { return e.json(500, { error: "create_failed", message: String(err && err.message || err) }) }
})

routerAdd("PATCH", "/api/cloud_works/{id}", function (e) {
  try {
    var auth = e.requestInfo().auth
    if (!auth || !auth.id) return e.json(401, { error: "unauthorized", message: "请先登录" })
    var rec = null
    try { rec = $app.findRecordById("cloud_works", e.request.pathValue("id")) } catch (_) {}
    if (!rec || rec.getString("user_id") !== String(auth.id)) return e.json(404, { error: "not_found" })
    var body = e.requestInfo().body || {}
    if ("kind" in body) rec.set("kind", body.kind == null ? "" : String(body.kind))
    if ("asset_type" in body) rec.set("asset_type", body.asset_type == null ? "" : String(body.asset_type))
    if ("title" in body) rec.set("title", body.title == null ? "" : String(body.title))
    if ("summary" in body) rec.set("summary", body.summary == null ? "" : String(body.summary))
    if ("content" in body) rec.set("content", body.content)
    if ("media_urls" in body) rec.set("media_urls", body.media_urls)
    if ("model_name" in body) rec.set("model_name", body.model_name == null ? "" : String(body.model_name))
    if ("source_page" in body) rec.set("source_page", body.source_page == null ? "" : String(body.source_page))
    if ("local_key" in body) rec.set("local_key", body.local_key == null ? "" : String(body.local_key))
    if ("synced_from_local" in body) rec.set("synced_from_local", !!body.synced_from_local)
    $app.save(rec)
    return e.json(200, rec.publicExport())
  } catch (err) { return e.json(500, { error: "update_failed", message: String(err && err.message || err) }) }
})

routerAdd("DELETE", "/api/cloud_works/{id}", function (e) {
  try {
    var auth = e.requestInfo().auth
    if (!auth || !auth.id) return e.json(401, { error: "unauthorized", message: "请先登录" })
    var rec = null
    try { rec = $app.findRecordById("cloud_works", e.request.pathValue("id")) } catch (_) {}
    if (!rec || rec.getString("user_id") !== String(auth.id)) return e.json(404, { error: "not_found" })
    $app.delete(rec)
    return e.json(200, { ok: true })
  } catch (err) { return e.json(500, { error: "delete_failed", message: String(err && err.message || err) }) }
})
