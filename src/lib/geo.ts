/**
 * Maps domain TLDs and region codes to DataForSEO location codes and Serper country codes.
 * DataForSEO uses numeric location_code, Serper uses 2-letter country code (gl param).
 */

export interface GeoTarget {
  locationCode: number;   // DataForSEO location_code
  countryCode: string;    // Serper gl param (2-letter)
  languageCode: string;   // language_code for DataForSEO / hl for Serper
  label: string;
}

// Common DataForSEO location codes: https://docs.dataforseo.com/v3/appendix/locations
const REGIONS: Record<string, GeoTarget> = {
  // Middle East
  ae: { locationCode: 2784, countryCode: "ae", languageCode: "en", label: "United Arab Emirates" },
  sa: { locationCode: 2682, countryCode: "sa", languageCode: "ar", label: "Saudi Arabia" },
  qa: { locationCode: 2634, countryCode: "qa", languageCode: "en", label: "Qatar" },
  kw: { locationCode: 2414, countryCode: "kw", languageCode: "ar", label: "Kuwait" },
  bh: { locationCode: 2048, countryCode: "bh", languageCode: "ar", label: "Bahrain" },
  om: { locationCode: 2512, countryCode: "om", languageCode: "ar", label: "Oman" },

  // Major markets
  us: { locationCode: 2840, countryCode: "us", languageCode: "en", label: "United States" },
  uk: { locationCode: 2826, countryCode: "uk", languageCode: "en", label: "United Kingdom" },
  gb: { locationCode: 2826, countryCode: "uk", languageCode: "en", label: "United Kingdom" },
  ca: { locationCode: 2124, countryCode: "ca", languageCode: "en", label: "Canada" },
  au: { locationCode: 2036, countryCode: "au", languageCode: "en", label: "Australia" },
  de: { locationCode: 2276, countryCode: "de", languageCode: "de", label: "Germany" },
  fr: { locationCode: 2250, countryCode: "fr", languageCode: "fr", label: "France" },
  in: { locationCode: 2356, countryCode: "in", languageCode: "en", label: "India" },
  sg: { locationCode: 2702, countryCode: "sg", languageCode: "en", label: "Singapore" },
  jp: { locationCode: 2392, countryCode: "jp", languageCode: "ja", label: "Japan" },
  br: { locationCode: 2076, countryCode: "br", languageCode: "pt", label: "Brazil" },
  mx: { locationCode: 2484, countryCode: "mx", languageCode: "es", label: "Mexico" },
  es: { locationCode: 2724, countryCode: "es", languageCode: "es", label: "Spain" },
  it: { locationCode: 2380, countryCode: "it", languageCode: "it", label: "Italy" },
  nl: { locationCode: 2528, countryCode: "nl", languageCode: "nl", label: "Netherlands" },
  se: { locationCode: 2752, countryCode: "se", languageCode: "sv", label: "Sweden" },
  no: { locationCode: 2578, countryCode: "no", languageCode: "no", label: "Norway" },
  dk: { locationCode: 2208, countryCode: "dk", languageCode: "da", label: "Denmark" },
  fi: { locationCode: 2246, countryCode: "fi", languageCode: "fi", label: "Finland" },
  pl: { locationCode: 2616, countryCode: "pl", languageCode: "pl", label: "Poland" },
  tr: { locationCode: 2792, countryCode: "tr", languageCode: "tr", label: "Turkey" },
  za: { locationCode: 2710, countryCode: "za", languageCode: "en", label: "South Africa" },
  ng: { locationCode: 2566, countryCode: "ng", languageCode: "en", label: "Nigeria" },
  eg: { locationCode: 2818, countryCode: "eg", languageCode: "ar", label: "Egypt" },
  pk: { locationCode: 2586, countryCode: "pk", languageCode: "en", label: "Pakistan" },
  id: { locationCode: 2360, countryCode: "id", languageCode: "id", label: "Indonesia" },
  my: { locationCode: 2458, countryCode: "my", languageCode: "en", label: "Malaysia" },
  ph: { locationCode: 2608, countryCode: "ph", languageCode: "en", label: "Philippines" },
  th: { locationCode: 2764, countryCode: "th", languageCode: "th", label: "Thailand" },
  vn: { locationCode: 2704, countryCode: "vn", languageCode: "vi", label: "Vietnam" },
  kr: { locationCode: 2410, countryCode: "kr", languageCode: "ko", label: "South Korea" },
  nz: { locationCode: 2554, countryCode: "nz", languageCode: "en", label: "New Zealand" },
  ie: { locationCode: 2372, countryCode: "ie", languageCode: "en", label: "Ireland" },
  ch: { locationCode: 2756, countryCode: "ch", languageCode: "de", label: "Switzerland" },
  at: { locationCode: 2040, countryCode: "at", languageCode: "de", label: "Austria" },
  be: { locationCode: 2056, countryCode: "be", languageCode: "nl", label: "Belgium" },
  pt: { locationCode: 2620, countryCode: "pt", languageCode: "pt", label: "Portugal" },
  co: { locationCode: 2170, countryCode: "co", languageCode: "es", label: "Colombia" },
  ar: { locationCode: 2032, countryCode: "ar", languageCode: "es", label: "Argentina" },
  cl: { locationCode: 2152, countryCode: "cl", languageCode: "es", label: "Chile" },
  il: { locationCode: 2376, countryCode: "il", languageCode: "he", label: "Israel" },
};

// For the settings dropdown
export const REGION_OPTIONS = Object.entries(REGIONS)
  .reduce((acc, [code, geo]) => {
    // Deduplicate (gb/uk point to same)
    if (!acc.find((r) => r.locationCode === geo.locationCode)) {
      acc.push({ code, ...geo });
    }
    return acc;
  }, [] as (GeoTarget & { code: string })[])
  .sort((a, b) => a.label.localeCompare(b.label));

const DEFAULT_GEO: GeoTarget = REGIONS.us;

/**
 * Resolve a domain's TLD to a GeoTarget.
 * e.g. "hugoboss.ae" → UAE (2784), "example.co.uk" → UK (2826)
 */
function tldFromDomain(domain: string): string | null {
  const clean = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  const parts = clean.split(".");
  if (parts.length < 2) return null;

  const tld = parts[parts.length - 1];
  // Handle two-part TLDs like .co.uk
  if (parts.length >= 3) {
    const twoPartTld = parts[parts.length - 2] + "." + tld;
    if (twoPartTld === "co.uk") return "uk";
    if (twoPartTld === "co.in") return "in";
    if (twoPartTld === "co.za") return "za";
    if (twoPartTld === "co.nz") return "nz";
    if (twoPartTld === "co.kr") return "kr";
    if (twoPartTld === "co.jp") return "jp";
  }

  // Generic TLDs don't tell us anything
  if (["com", "org", "net", "io", "app", "dev", "ai", "co"].includes(tld)) {
    return null;
  }

  return tld.toLowerCase();
}

/**
 * Resolve geo targeting for a site.
 * Priority: targetRegions[0] → domain TLD → default (US)
 */
export function resolveGeo(domain: string, targetRegions?: string[]): GeoTarget {
  // 1. Explicit target region from settings
  if (targetRegions && targetRegions.length > 0) {
    const region = targetRegions[0].toLowerCase();
    if (REGIONS[region]) return REGIONS[region];
  }

  // 2. Domain TLD
  const tld = tldFromDomain(domain);
  if (tld && REGIONS[tld]) return REGIONS[tld];

  // 3. Default to US
  return DEFAULT_GEO;
}
