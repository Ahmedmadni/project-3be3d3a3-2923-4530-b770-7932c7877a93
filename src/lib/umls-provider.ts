import type {
  TerminologyCandidate,
  TerminologyProvider,
  TerminologySearchRequest,
} from "./terminology";

interface UmlsSearchResult {
  ui: string;
  name: string;
  uri?: string;
  rootSource?: string;
}

interface UmlsSearchResponse {
  result?: {
    results?: UmlsSearchResult[];
  };
}

export interface UmlsProviderOptions {
  apiKey: string;
  baseUrl?: string;
  version?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Server-side UMLS terminology adapter.
 *
 * Do not instantiate this in browser code. The UTS API key is licensed to an
 * individual account and must remain a server secret.
 */
export class UmlsTerminologyProvider implements TerminologyProvider {
  readonly key = "nlm_umls";
  readonly requiresCredentials = true;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly version: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: UmlsProviderOptions) {
    if (!options.apiKey.trim()) throw new Error("UMLS_API_KEY_REQUIRED");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://uts-ws.nlm.nih.gov/rest").replace(/\/$/, "");
    this.version = options.version ?? "current";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async search(request: TerminologySearchRequest): Promise<TerminologyCandidate[]> {
    const text = request.text.trim();
    if (!text) return [];

    const url = new URL(`${this.baseUrl}/search/${this.version}`);
    url.searchParams.set("string", text);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("pageSize", String(Math.min(Math.max(request.pageSize ?? 10, 1), 25)));

    if (request.semanticGroup) {
      url.searchParams.set("semanticGroup", request.semanticGroup);
    }

    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`UMLS_SEARCH_FAILED:${response.status}`);
    }

    const payload = (await response.json()) as UmlsSearchResponse;
    return (payload.result?.results ?? [])
      .filter((item) => item.ui && item.ui !== "NONE" && item.name)
      .map((item) => ({
        terminologySystem: item.rootSource || "UMLS",
        externalCode: item.ui,
        preferredTerm: item.name,
        externalUri: item.uri ?? null,
        semanticType: null,
      }));
  }
}
