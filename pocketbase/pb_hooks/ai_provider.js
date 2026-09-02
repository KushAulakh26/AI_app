module.exports = {
  loadProviderConfig: function (purpose) {
    var kind = String($os.getenv("AI_PROVIDER_KIND") || "").trim()
    var baseUrl = String($os.getenv("AI_PROVIDER_BASE_URL") || "").replace(/\/+$/, "")
    var keyName = purpose === "llm" ? "AI_PROVIDER_LLM_API_KEY" : "AI_PROVIDER_API_KEY"
    var key = String($os.getenv(keyName) || "").trim()
    if (purpose === "llm" && !key) key = String($os.getenv("AI_PROVIDER_API_KEY") || "").trim()
    if (kind !== "ciyuan-market") throw new Error("AI provider kind must be ciyuan-market")
    if (!baseUrl) throw new Error("AI provider base URL is not configured")
    if (!key) throw new Error("AI provider API key is not configured")
    return { kind: kind, baseUrl: baseUrl, apiKey: key }
  },
}
