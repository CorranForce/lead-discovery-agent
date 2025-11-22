import { searchOrganizations } from './server/apollo.ts';

async function testKeywordExtraction() {
  const testQuery = 'SaaS companies that need automation';
  console.log(`Original query: "${testQuery}"`);
  console.log('Testing search...\n');
  
  try {
    const results = await searchOrganizations({
      query: testQuery,
      page: 1,
      perPage: 5
    });
    
    console.log(`✅ Found ${results.organizations.length} organizations`);
    console.log(`Total entries: ${results.pagination.total_entries}`);
    
    if (results.organizations.length > 0) {
      console.log('\nResults:');
      results.organizations.forEach((org, i) => {
        console.log(`${i+1}. ${org.name} - ${org.industry || 'No industry'}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testKeywordExtraction();
