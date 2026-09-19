export type ModelProviderKind =
  | "xai"
  | "openai"
  | "ollama"
  | "vllm"
  | "lmstudio"
  | "azure"
  | "bedrock"
  | "custom";

export type ModelEndpoint = {
  id: string;
  label: string;
  kind: ModelProviderKind;
  baseUrl: string;
  model: string;
  apiKeyEnv: string;
  maxTokens: number;
  enabled: boolean;
};

export type McpServerConfig = {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  url?: string;
  enabled: boolean;
};

export type KeycloakConfig = {
  enabled: boolean;
  issuer: string;
  realm: string;
  clientId: string;
  redirectPath: string;
};

export type QuotaConfig = {
  monthlyTokenLimit: number;
  perRequestMaxTokens: number;
  warnAtPercent: number;
};

export type PlatformConfig = {
  defaultModelId: string;
  models: ModelEndpoint[];
  mcp: McpServerConfig[];
  keycloak: KeycloakConfig;
  quota: QuotaConfig;
};

export const DEFAULT_PLATFORM: PlatformConfig = {
  defaultModelId: "default",
  models: [
    {
      id: "default",
      label: "xAI Grok",
      kind: "xai",
      baseUrl: "https://api.x.ai/v1",
      model: "grok-4.5",
      apiKeyEnv: "XAI_API_KEY",
      maxTokens: 3500,
      enabled: true,
    },
    {
      id: "ollama-local",
      label: "Ollama (localhost)",
      kind: "ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "llama3.1",
      apiKeyEnv: "OLLAMA_API_KEY",
      maxTokens: 4096,
      enabled: false,
    },
    {
      id: "vllm",
      label: "vLLM / hosted OpenAI-compatible",
      kind: "vllm",
      baseUrl: "http://127.0.0.1:8000/v1",
      model: "hosted-model",
      apiKeyEnv: "SUTRA_MODEL_API_KEY",
      maxTokens: 4096,
      enabled: false,
    },
    {
      id: "bedrock",
      label: "AWS Bedrock (OpenAI-compat or LiteLLM)",
      kind: "bedrock",
      baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1",
      model: "anthropic.claude-sonnet-4-20250514-v1:0",
      apiKeyEnv: "AWS_BEARER_TOKEN_BEDROCK",
      maxTokens: 4096,
      enabled: false,
    },
  ],
  mcp: [
    {
      id: "fs",
      name: "filesystem",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
      enabled: false,
    },
  ],
  keycloak: {
    enabled: false,
    issuer: "https://keycloak.example.com",
    realm: "sutra",
    clientId: "sutra-ide",
    redirectPath: "/auth/callback",
  },
  quota: {
    monthlyTokenLimit: 2_000_000,
    perRequestMaxTokens: 8000,
    warnAtPercent: 80,
  },
};

const KEY = "sutra.platform.v1";

export function loadPlatform(): PlatformConfig {
  if (typeof localStorage === "undefined") return DEFAULT_PLATFORM;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as PlatformConfig | null;
    if (!raw?.models) return DEFAULT_PLATFORM;
    return {
      ...DEFAULT_PLATFORM,
      ...raw,
      models: raw.models.length ? raw.models : DEFAULT_PLATFORM.models,
      mcp: raw.mcp ?? DEFAULT_PLATFORM.mcp,
      keycloak: { ...DEFAULT_PLATFORM.keycloak, ...raw.keycloak },
      quota: { ...DEFAULT_PLATFORM.quota, ...raw.quota },
    };
  } catch {
    return DEFAULT_PLATFORM;
  }
}

export function savePlatform(cfg: PlatformConfig) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function kindHint(kind: ModelProviderKind) {
  switch (kind) {
    case "xai":
      return "OpenAI-compatible. Base https://api.x.ai/v1 · env XAI_API_KEY";
    case "openai":
      return "https://api.openai.com/v1 · env OPENAI_API_KEY";
    case "ollama":
      return "Install Ollama, pull a model, base http://127.0.0.1:11434/v1 (no key)";
    case "vllm":
      return "vLLM --api-key and OpenAI chat route at /v1";
    case "lmstudio":
      return "LM Studio local server, usually http://127.0.0.1:1234/v1";
    case "azure":
      return "Azure OpenAI: https://{resource}.openai.azure.com/openai/v1 · AZURE_OPENAI_API_KEY";
    case "bedrock":
      return "Put LiteLLM or Bedrock OpenAI-compat URL here. Bearer = AWS_BEARER_TOKEN_BEDROCK or LiteLLM key";
    default:
      return "Any server that implements POST /chat/completions";
  }
}
