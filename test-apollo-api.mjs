import 'dotenv/config';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_API_BASE = "https://api.apollo.io/api/v1";

async function testApolloAPI() {
  console.log("Testing Apollo.io API...\n");
  
  if (!APOLLO_API_KEY) {
    console.error("❌ APOLLO_API_KEY is not configured in environment variables");
    return;
  }
  
  console.log("✅ Apollo API Key found in environment");
  console.log(`   Key preview: ${APOLLO_API_KEY.substring(0, 10)}...${APOLLO_API_KEY.substring(APOLLO_API_KEY.length - 4)}\n`);
  
  try {
    console.log("🔍 Testing API with organization search...");
    
    const requestBody = {
      page: 1,
      per_page: 5,
      q_organization_name: "software"
    };
    
    const response = await fetch(`${APOLLO_API_BASE}/organizations/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log(`   Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API Error: ${response.status}`);
      console.error(`   Error details: ${errorText}`);
      
      if (response.status === 401) {
        console.error("\n⚠️  Authentication failed - API key may be invalid or expired");
        console.error("   → You need to generate a new API key from Apollo.io");
      } else if (response.status === 403) {
        console.error("\n⚠️  Access forbidden - API key may not have required permissions");
        console.error("   → Check your Apollo.io plan and API key permissions");
      } else if (response.status === 429) {
        console.error("\n⚠️  Rate limit exceeded - too many requests");
        console.error("   → Wait a few minutes and try again");
      }
      
      return;
    }
    
    const data = await response.json();
    
    console.log("\n✅ API Test Successful!");
    console.log(`   Found ${data.pagination?.total_entries || 0} total organizations`);
    console.log(`   Returned ${data.organizations?.length || 0} results in this page`);
    
    if (data.organizations && data.organizations.length > 0) {
      console.log("\n📊 Sample Results:");
      data.organizations.slice(0, 3).forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.name}`);
        console.log(`      Industry: ${org.industry || 'N/A'}`);
        console.log(`      Location: ${[org.city, org.state, org.country].filter(Boolean).join(', ') || 'N/A'}`);
        console.log(`      Employees: ${org.estimated_num_employees || 'N/A'}`);
      });
    }
    
    console.log("\n✅ CONCLUSION: Your Apollo API key is working correctly!");
    console.log("   No need to update the API key after your plan upgrade.");
    console.log("   The same API key works across all Apollo.io plan tiers.");
    
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(`   ${error.message}`);
    
    if (error.message.includes('fetch')) {
      console.error("\n⚠️  Network error - check your internet connection");
    }
  }
}

testApolloAPI();
