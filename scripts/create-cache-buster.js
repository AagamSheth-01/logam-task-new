import fs from 'fs';
import path from 'path';

async function createCacheBuster() {
  try {
    console.log('🧹 CREATING CACHE BUSTER SOLUTION\n');

    const timestamp = Date.now();
    const cacheKey = `attendance_cache_${timestamp}`;

    // Create a simple cache-busting script
    const cacheBusterScript = `
// Cache Buster for Attendance Data
// Run this in browser console or add to app

// 1. Clear localStorage
console.log('🧹 Clearing localStorage...');
Object.keys(localStorage).forEach(key => {
  if (key.includes('attendance') || key.includes('cache')) {
    localStorage.removeItem(key);
    console.log('Removed:', key);
  }
});

// 2. Clear sessionStorage
console.log('🧹 Clearing sessionStorage...');
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('attendance') || key.includes('cache')) {
    sessionStorage.removeItem(key);
    console.log('Removed:', key);
  }
});

// 3. Force reload attendance data with cache bust
console.log('🔄 Force reloading attendance data...');
if (window.location.href.includes('attendance') || window.location.href.includes('dashboard')) {
  // Add cache buster to current URL
  const url = new URL(window.location);
  url.searchParams.set('_cacheBust', '${timestamp}');
  window.location.href = url.toString();
} else {
  console.log('ℹ️ Navigate to attendance page and run this script again');
}
`;

    // Save the cache buster script
    const scriptPath = path.join(process.cwd(), 'cache-buster.js');
    fs.writeFileSync(scriptPath, cacheBusterScript);

    console.log('✅ Created cache-buster.js file');
    console.log('\n📋 INSTRUCTIONS TO CLEAR UI CACHE:');
    console.log('\n1. 🌐 BROWSER METHOD:');
    console.log('   - Open the attendance page');
    console.log('   - Open Developer Tools (F12)');
    console.log('   - Go to Console tab');
    console.log('   - Copy and paste the cache-buster.js content');
    console.log('   - Press Enter');

    console.log('\n2. 🔄 MANUAL METHOD:');
    console.log('   - Hard refresh: Ctrl+F5 (or Cmd+Shift+R on Mac)');
    console.log('   - Or clear browser cache completely');

    console.log('\n3. 🧹 NETWORK TAB METHOD:');
    console.log('   - Open Developer Tools');
    console.log('   - Go to Network tab');
    console.log('   - Check "Disable cache" checkbox');
    console.log('   - Refresh the page');

    console.log('\n4. 📱 IF STILL NOT WORKING:');
    console.log('   - Try incognito/private browsing mode');
    console.log('   - Check if there are any service workers installed');

    // Also create a simple API test endpoint suggestion
    console.log('\n5. 🧪 API TEST:');
    console.log('   - Test API directly: GET /api/attendance?username=Ayaz Memon&startDate=2025-11-01&endDate=2025-11-22');
    console.log('   - Should return 22 records with Office workType');

    console.log('\n📊 EXPECTED UI DISPLAY AFTER CACHE CLEAR:');
    console.log('   ✅ Total Days: 22');
    console.log('   ✅ Present: 22');
    console.log('   ✅ Absent: 0');
    console.log('   ✅ Office Days: 22');
    console.log('   ✅ WFH Days: 0');
    console.log('   ✅ All records show "Office" at "Anand Vidhyanagar"');
    console.log('   ✅ All records have clock in/out times');

    return {
      scriptPath: scriptPath,
      cacheKey: cacheKey,
      timestamp: timestamp
    };

  } catch (error) {
    console.error('❌ Error creating cache buster:', error);
    throw error;
  }
}

// Run the cache buster creation
createCacheBuster()
  .then((result) => {
    console.log('\n🎉 Cache buster created successfully!');
    console.log(`📁 Script saved to: ${result.scriptPath}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to create cache buster:', error);
    process.exit(1);
  });