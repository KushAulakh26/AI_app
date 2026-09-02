/// <reference path="../pb_data/types.d.ts" />
// Delete generated provider files only after a retention window and only when no cloud work references them.

function retentionDays() {
  var days = parseInt(String($os.getenv("GENERATED_RETENTION_DAYS") || "30"), 10)
  return days > 0 ? days : 30
}

function isReferenced(url, refs) {
  for (var i = 0; i < refs.length; i++) if (String(refs[i] || "").indexOf(url) >= 0) return true
  return false
}

cronAdd("generated-file-retention", "17 3 * * *", function () {
  try {
    var cutoff = new Date(Date.now() - retentionDays() * 24 * 60 * 60 * 1000)
    var works = []
    try { works = $app.findAllRecords("cloud_works") || [] } catch (_) {}
    var refs = []
    for (var wi = 0; wi < works.length; wi++) {
      var media = works[wi].get("media_urls") || []
      for (var mi = 0; mi < media.length; mi++) refs.push(String(media[mi] || ""))
      refs.push(String(works[wi].getString("content") || ""))
    }
    var generated = []
    try { generated = $app.findRecordsByFilter("generated", "created < {:cutoff}", "created", 1000, 0, { cutoff: cutoff.toISOString().replace("T", " ").replace("Z", "") }) || [] } catch (_) {}
    for (var gi = 0; gi < generated.length; gi++) {
      var rec = generated[gi]
      var filename = rec.getString("file")
      if (!filename) continue
      var url = "/api/files/generated/" + String(rec.id) + "/" + filename
      if (!isReferenced(url, refs)) $app.delete(rec)
    }
  } catch (err) {
    try { $app.logger().error("generated retention: " + String(err && err.message || err)) } catch (_) {}
  }
})
