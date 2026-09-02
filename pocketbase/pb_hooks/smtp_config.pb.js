/// <reference path="../pb_data/types.d.ts" />
// Configure PocketBase's system mailer from .env.local on startup.

onBootstrap(function (e) {
  e.next()
  var configured = !!(
    String($os.getenv("SMTP_HOST") || "").trim() &&
    String($os.getenv("SMTP_PORT") || "").trim() &&
    String($os.getenv("SMTP_USERNAME") || "").trim() &&
    String($os.getenv("SMTP_PASSWORD") || "").trim() &&
    String($os.getenv("SMTP_SENDER_ADDRESS") || "").trim()
  )
  if (!configured) return
  try {
    var settings = $app.settings()
    settings.smtp.enabled = true
    settings.smtp.host = String($os.getenv("SMTP_HOST")).trim()
    settings.smtp.port = parseInt(String($os.getenv("SMTP_PORT")), 10)
    settings.smtp.username = String($os.getenv("SMTP_USERNAME")).trim()
    settings.smtp.password = String($os.getenv("SMTP_PASSWORD"))
    settings.smtp.authMethod = String($os.getenv("SMTP_AUTH_METHOD") || "PLAIN").trim()
    settings.smtp.tls = String($os.getenv("SMTP_TLS") || "false").toLowerCase() === "true"
    settings.smtp.localName = String($os.getenv("SMTP_LOCAL_NAME") || "").trim()
    settings.meta.senderName = String($os.getenv("SMTP_SENDER_NAME") || "電商寶").trim()
    settings.meta.senderAddress = String($os.getenv("SMTP_SENDER_ADDRESS")).trim()
    $app.save(settings)
  } catch (err) {
    try { $app.logger().error("smtp configuration: " + String(err && err.message || err)) } catch (_) {}
  }
})

routerAdd("GET", "/api/system/mail-status", function (e) {
  var configured = !!(
    String($os.getenv("SMTP_HOST") || "").trim() &&
    String($os.getenv("SMTP_PORT") || "").trim() &&
    String($os.getenv("SMTP_USERNAME") || "").trim() &&
    String($os.getenv("SMTP_PASSWORD") || "").trim() &&
    String($os.getenv("SMTP_SENDER_ADDRESS") || "").trim()
  )
  return e.json(200, { configured: configured })
})
