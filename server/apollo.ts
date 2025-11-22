/**
 * Apollo.io API Client
 * Provides functions to search for organizations using Apollo's B2B database
 * Note: Using /organizations/search endpoint which works with free API keys
 */

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_API_BASE = "https://api.apollo.io/api/v1";

interface ApolloOrganizationSearchParams {
  query?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  page?: number;
  perPage?: number;
}

interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string;
  primary_domain?: string;
  industry?: string;
  estimated_num_employees?: number;
  city?: string;
  state?: string;
  country?: string;
  linkedin_url?: string;
  phone?: string;
  short_description?: string;
}

interface ApolloOrganizationSearchResponse {
  organizations: ApolloOrganization[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

/**
 * Extract meaningful search keywords from natural language queries
 * Apollo's q_organization_name does company name matching, not semantic search
 */
function extractSearchKeywords(query: string): string {
  // Remove common filler words and phrases
  const fillerWords = [
    'companies', 'company', 'businesses', 'business', 'organizations', 'organization',
    'that', 'need', 'needs', 'want', 'wants', 'looking for', 'interested in',
    'in the', 'with', 'who', 'which', 'are', 'is', 'have', 'has'
  ];
  
  let keywords = query.toLowerCase();
  
  // Remove filler words
  fillerWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    keywords = keywords.replace(regex, '');
  });
  
  // Clean up extra spaces
  keywords = keywords.replace(/\s+/g, ' ').trim();
  
  // If we removed everything, return the original query
  if (!keywords) {
    return query;
  }
  
  return keywords;
}

/**
 * Search for organizations using Apollo.io API
 * This endpoint works with free API keys
 */
export async function searchOrganizations(params: ApolloOrganizationSearchParams): Promise<ApolloOrganizationSearchResponse> {
  if (!APOLLO_API_KEY) {
    throw new Error("APOLLO_API_KEY is not configured");
  }

  const requestBody: any = {
    page: params.page || 1,
    per_page: params.perPage || 10,
  };

  // Map our parameters to Apollo's format
  if (params.query) {
    // Extract keywords from natural language query
    // Apollo's q_organization_name does name matching, not semantic search
    // So we need to extract industry/business keywords
    const keywords = extractSearchKeywords(params.query);
    if (keywords) {
      requestBody.q_organization_name = keywords;
    }
  }

  if (params.industry) {
    // For industry, we can add it to the organization name search
    // or use organization_industry_tag_ids if we have the specific IDs
    if (requestBody.q_organization_name) {
      requestBody.q_organization_name = `${requestBody.q_organization_name} ${params.industry}`;
    } else {
      requestBody.q_organization_name = params.industry;
    }
  }

  if (params.companySize) {
    // Parse company size range (e.g., "1-10", "51-200")
    const sizeMap: Record<string, string> = {
      "1-10": "1,10",
      "11-50": "11,50",
      "51-200": "51,200",
      "201-500": "201,500",
      "501-1000": "501,1000",
      "1001-5000": "1001,5000",
      "5001+": "5001,999999",
    };
    
    if (sizeMap[params.companySize]) {
      requestBody.organization_num_employees_ranges = [sizeMap[params.companySize]];
    }
  }

  if (params.location) {
    requestBody.organization_locations = [params.location];
  }

  try {
    const response = await fetch(`${APOLLO_API_BASE}/organizations/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[Apollo API] Search failed:", error);
    throw error;
  }
}

/**
 * Convert Apollo organization data to our lead format
 */
export function convertApolloOrgToLead(org: ApolloOrganization) {
  return {
    companyName: org.name || "Unknown Company",
    website: org.website_url || org.primary_domain || "",
    industry: org.industry || "Unknown",
    companySize: org.estimated_num_employees 
      ? `${org.estimated_num_employees} employees` 
      : "Unknown",
    location: [org.city, org.state, org.country].filter(Boolean).join(", ") || "Unknown",
    description: org.short_description || `${org.name} is a company in the ${org.industry || "business"} industry.`,
    contactName: "",
    contactTitle: "",
    contactEmail: "",
    contactLinkedin: org.linkedin_url || "",
    contactPhone: org.phone || "",
    status: "new" as const,
    source: "apollo" as const,
    score: null,
  };
}
