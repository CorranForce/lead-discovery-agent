import { searchOrganizations } from './server/apollo.ts';

async function testSimpleSearch() {
  console.log('Testing with simple query: "SaaS"');
  
  try {
    const results = await searchOrganizations({
      query: 'SaaS',
      page: 1,
      perPage: 5
    });
    
    console.log(`\n✅ Found ${results.organizations.length} organizations`);
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

testSimpleSearch();
