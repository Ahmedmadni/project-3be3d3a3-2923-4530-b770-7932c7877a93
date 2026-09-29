import { describe, expect, it, vi } from "vitest";
import { UmlsTerminologyProvider } from "./umls-provider";

describe("UmlsTerminologyProvider", () => {
  it("requires a server-side API key", () => {
    expect(() => new UmlsTerminologyProvider({ apiKey: "" })).toThrow("UMLS_API_KEY_REQUIRED");
  });

  it("maps UMLS search results without exposing provider credentials in output", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/rest/search/current");
      expect(url.searchParams.get("string")).toBe("headache");
      expect(url.searchParams.get("apiKey")).toBe("secret-key");

      return new Response(JSON.stringify({
        result: {
          results: [
            {
              ui: "C0018681",
              name: "Headache",
              uri: "https://uts-ws.nlm.nih.gov/rest/content/current/CUI/C0018681",
              rootSource: "SNOMEDCT_US",
            },
          ],
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;

    const provider = new UmlsTerminologyProvider({
      apiKey: "secret-key",
      fetchImpl,
    });

    const result = await provider.search({ text: "headache", pageSize: 5 });

    expect(result).toEqual([
      {
        terminologySystem: "SNOMEDCT_US",
        externalCode: "C0018681",
        preferredTerm: "Headache",
        externalUri: "https://uts-ws.nlm.nih.gov/rest/content/current/CUI/C0018681",
        semanticType: null,
      },
    ]);
  });

  it("returns no candidates for empty text without calling the network", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const provider = new UmlsTerminologyProvider({
      apiKey: "secret-key",
      fetchImpl,
    });

    expect(await provider.search({ text: "   " })).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
