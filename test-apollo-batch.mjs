import 'dotenv/config';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_API_BASE = "https://api.apollo.io/api/v1";

async function testLargeBatch() {
  console.log("🚀 Apollo.io Large Batch Test (100+ Companies)\n");
  console.log("=" .repeat(60));
  
  if (!APOLLO_API_KEY) {
    console.error("❌ APOLLO_API_KEY not configured");
    return;
  }
  
  const testQueries = [
    { name: "AI Software Companies", query: "artificial intelligence software", perPage: 25 },
    { name: "RPA Automation Firms", query: "robotic process automation", perPage: 25 },
    { name: "Cloud Computing", query: "cloud computing", perPage: 25 },
    { name: "Cybersecurity", query: "cybersecurity", perPage: 25 },
  ];
  
  let totalCompanies = 0;
  let totalTime = 0;
  const results = [];
  
  console.log("\n📊 Running 4 batch queries (25 companies each = 100 total)\n");
  
  for (const test of testQueries) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${APOLLO_API_BASE}/organizations/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": APOLLO_API_KEY,
        },
        body: JSON.stringify({
          page: 1,
          per_page: test.perPage,
          q_organization_name: test.query,
        }),
      });
      
      const elapsed = Date.now() - startTime;
      totalTime += elapsed;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${test.name}: Failed (${response.status})`);
        console.error(`   Error: ${errorText}\n`);
        continue;
      }
      
      const data = await response.json();
      const count = data.organizations?.length || 0;
      totalCompanies += count;
      
      results.push({
        name: test.name,
        count,
        elapsed,
        totalAvailable: data.pagination?.total_entries || 0,
      });
      
      console.log(`✅ ${test.name}`);
      console.log(`   Retrieved: ${count} companies`);
      console.log(`   Total available: ${data.pagination?.total_entries?.toLocaleString() || 0}`);
      console.log(`   Response time: ${elapsed}ms`);
      console.log(`   Sample: ${data.organizations[0]?.name || 'N/A'}\n`);
      
      // Rate limit protection: wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}\n`);
    }
  }
  
  console.log("=" .repeat(60));
  console.log("\n📈 BATCH TEST RESULTS\n");
  console.log(`Total Companies Retrieved: ${totalCompanies}`);
  console.log(`Average Response Time: ${Math.round(totalTime / testQueries.length)}ms`);
  console.log(`Total Test Duration: ${(totalTime / 1000).toFixed(2)}s`);
  
  const avgPerQuery = totalCompanies / testQueries.length;
  console.log(`Average per Query: ${avgPerQuery.toFixed(1)} companies`);
  
  if (totalCompanies >= 100) {
    console.log("\n✅ SUCCESS: Retrieved 100+ companies successfully!");
    console.log("   Your upgraded Apollo plan is working perfectly.");
  } else {
    console.log(`\n⚠️  WARNING: Only retrieved ${totalCompanies} companies`);
    console.log("   Expected 100+. Check rate limits or API status.");
  }
  
  console.log("\n📊 Detailed Breakdown:");
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.name}: ${r.count} companies (${r.elapsed}ms)`);
  });
  
  console.log("\n" + "=".repeat(60));
}

testLargeBatch();
