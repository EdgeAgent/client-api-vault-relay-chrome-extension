export const sourceCatalogues = [
  {
    id: "awesome-freellm-apis",
    name: "Awesome Free LLM APIs",
    purpose: "LLM provider presets and free-tier discovery",
    sourceUrl: "https://github.com/open-free-llm-api/awesome-freellm-apis",
    dataUrl: "https://freellm.net/",
  },
  {
    id: "public-api-lists",
    name: "Public API Lists",
    purpose: "General API discovery with published JSON metadata",
    sourceUrl: "https://github.com/public-api-lists/public-api-lists",
    dataUrl: "https://public-api-lists.github.io/public-api-lists/api/all.json",
  },
  {
    id: "public-apis",
    name: "Public APIs",
    purpose: "Independent general public-API discovery catalogue",
    sourceUrl: "https://github.com/public-apis/public-apis",
    dataUrl: "https://github.com/public-apis/public-apis/blob/master/README.md",
  },
];

// Provider metadata is a maintained snapshot derived from the user-supplied
// Awesome Free LLM APIs repository. A preset never includes a credential.
export const providerCatalog = [
  ["nvidia-nim", "NVIDIA NIM", "https://integrate.api.nvidia.com/v1", "openai", "https://build.nvidia.com/settings/api-keys", "z-ai/glm-5.2"],
  ["modelscope", "ModelScope", "https://api-inference.modelscope.cn/v1", "openai", "https://modelscope.cn/my/myaccesstoken", "qwen/qwen3-5-35b-a3b"],
  ["cloudflare-workers-ai", "Cloudflare Workers AI", "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run", "manual", "https://dash.cloudflare.com/profile/api-tokens", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"],
  ["openrouter", "OpenRouter", "https://openrouter.ai/api/v1", "openai", "https://openrouter.ai/workspaces/default/keys", "nvidia/nemotron-3-super-120b-a12b:free"],
  ["gemini", "Google Gemini", "https://generativelanguage.googleapis.com/v1beta", "gemini", "https://aistudio.google.com/app/apikey", "gemini-2.0-flash"],
  ["github-models", "GitHub Models", "https://models.github.ai/inference", "openai", "https://github.com/marketplace/models", "Phi-4"],
  ["llm7", "LLM7.io", "https://api.llm7.io/v1", "openai", "https://token.llm7.io/", "deepseek-v3"],
  ["ovhcloud", "OVHcloud AI Endpoints", "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1", "openai", "https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/", "qwen3.5-397b-a17b"],
  ["ollama-cloud", "Ollama Cloud", "https://api.ollama.com", "openai", "https://ollama.com/settings/keys", "gpt-oss:20b"],
  ["ollama-local", "Ollama Local", "http://127.0.0.1:11434", "ollama", "https://ollama.com/download", "llama3.2"],
  ["groq", "Groq", "https://api.groq.com/openai/v1", "openai", "https://console.groq.com/keys", "llama-3.3-70b-versatile"],
  ["mistral", "Mistral AI", "https://api.mistral.ai/v1", "openai", "https://console.mistral.ai/api-keys", "open-mistral-7b"],
  ["cohere", "Cohere", "https://api.cohere.com/v2", "manual", "https://dashboard.cohere.com/api-keys", "command-a-03-2025"],
  ["kilo", "Kilo Code", "https://api.kilo.ai/api/gateway", "openai", "https://kilo.ai/", "nvidia/nemotron-3-super-120b-a12b:free"],
  ["opencode-zen", "OpenCode Zen", "https://opencode.ai/zen/v1", "openai", "https://opencode.ai/auth", "deepseek-v4-flash-free"],
  ["cerebras", "Cerebras", "https://api.cerebras.ai/v1", "openai", "https://cloud.cerebras.ai/", "llama3.1-70b"],
  ["aion", "Aion Labs", "https://api.aionlabs.ai/v1", "openai", "https://www.aionlabs.ai/", "aion-2.5"],
  ["huggingface", "Hugging Face", "https://router.huggingface.co/v1", "openai", "https://huggingface.co/settings/tokens", "meta-llama/Meta-Llama-3.1-8B-Instruct"],
  ["agnes", "Agnes AI", "https://apihub.agnes-ai.com/v1", "openai", "https://platform.agnes-ai.com/settings/apiKeys", "agnes-2.0-flash"],
  ["alibaba-model-studio", "Alibaba Cloud Model Studio", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", "openai", "https://bailian.console.alibabacloud.com/?apiKey=1", "qwen3-max"],
  ["zai", "Z AI", "https://open.bigmodel.cn/api/paas/v4", "openai", "https://open.bigmodel.cn/usercenter/apikeys", "glm-4.7"],
  ["sambanova", "SambaNova", "https://api.sambanova.ai/v1", "openai", "https://cloud.sambanova.ai/apis", "DeepSeek-V3.1"],
  ["siliconflow", "SiliconFlow", "https://api.siliconflow.cn/v1", "openai", "https://cloud.siliconflow.cn/account/ak", "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B"],
  ["xai", "xAI", "https://api.x.ai/v1", "openai", "https://console.x.ai/", "grok-3-mini"],
  ["cline", "Cline", "", "manual", "https://github.com/open-free-llm-api/awesome-freellm-apis", "deepseek/deepseek-v4-flash"],
  ["chutes", "Chutes.ai", "https://api.chutes.ai/v1", "openai", "https://chutes.ai/", "deepseek-ai/DeepSeek-R1"],
  ["glhf", "Glhf.chat", "https://glhf.chat/api/openai/v1", "openai", "https://glhf.chat/", "meta-llama/Meta-Llama-3.1-70B-Instruct"],
  ["ai21", "AI21 Labs", "https://api.ai21.com/studio/v1", "openai", "https://studio.ai21.com/account/api-key", "Jamba-Large-1.7"],
  ["deepseek", "DeepSeek", "https://api.deepseek.com/v1", "openai", "https://platform.deepseek.com/api_keys", "deepseek-chat"],
  ["nscale", "Nscale", "https://inference.api.nscale.com/v1", "openai", "https://console.nscale.com/", "deepseek-ai/DeepSeek-V3.1"],
  ["nebius", "Nebius", "https://api.studio.nebius.com/v1", "openai", "https://studio.nebius.com/settings/api-keys", "Qwen/Qwen3-32B"],
].map(([id, name, baseUrl, adapter, keyUrl, defaultModel]) => {
  const requestRoute = adapter === "openai"
    ? `${baseUrl}/chat/completions`
    : adapter === "gemini"
      ? `${baseUrl}/models/{model}:generateContent?key={api_key}`
      : adapter === "ollama"
        ? `${baseUrl}/api/chat`
        : "Provider-specific route — review the provider documentation";

  return {
    id,
    name,
    baseUrl,
    adapter,
    keyUrl,
    defaultModel,
    requestRoute,
    source: "open-free-llm-api/awesome-freellm-apis",
    accessLabel: id === "ollama-local" ? "Local — no cloud key" : "Free tier listed — provider account required",
    canAddToVault: Boolean(baseUrl) && adapter !== "manual",
  };
});

export function getProvider(id) {
  return providerCatalog.find(provider => provider.id === id) ?? null;
}
