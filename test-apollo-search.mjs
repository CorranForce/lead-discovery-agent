import { searchOrganizations } from './server/apollo.ts';

async function testSearch() {
  console.log('Testing Apollo.io organization search...');
  console.log('Query: "SaaS companies that need automation"');
  
  try {
    const results = await searchOrganizations({
      query: 'SaaS companies that need automation',
      page: 1,
      perPage: 5
    });
    
    console.log('\n✅ Search successful!');
    console.log(`Found ${results.organizations.length} organizations`);
    console.log(`Total entries: ${results.pagination.total_entries}`);
    
    if (results.organizations.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(results.organizations[0], null, 2));
    }
  } catch (error) {
    console.error('\n❌ Search failed:');
    console.error(error.message);
  }
}

testSearch();
