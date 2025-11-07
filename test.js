const fs = require('fs');

// Test configuration
const WORKER_URL = 'http://localhost:8787'; // Default wrangler dev URL

// Test payloads
const testCases = [
  {
    name: 'HTML to Image',
    payload: {
      html: '<html><body style="font-family: Arial; padding: 20px; background: linear-gradient(45deg, #ff6b6b, #4ecdc4);"><h1 style="color: white; text-align: center;">Hello from Cloudflare Worker!</h1><p style="color: white; text-align: center;">This is a test HTML to image conversion</p></body></html>',
      width: 800,
      height: 600,
      qualityFactor: 2
    },
    expectedContentType: 'image/png',
    outputFile: 'test-html-output.png'
  },
  {
    name: 'HTML to Image (Full Page)',
    payload: {
      html: '<html><body style="font-family: Arial; padding: 20px;"><h1>Full Page Test</h1><div style="height: 2000px; background: linear-gradient(to bottom, red, blue);"><p>This is a very tall page to test full page capture</p></div></body></html>'
    },
    expectedContentType: 'image/png',
    outputFile: 'test-html-fullpage.png'
  },
  {
    name: 'URL Screenshot',
    payload: {
      url: 'https://example.com',
      width: 1280
    },
    expectedContentType: 'image/png',
    outputFile: 'test-url-output.png'
  },
  {
    name: 'PDF Generation',
    payload: {
      pdfURL: 'https://example.com'
    },
    expectedContentType: 'application/pdf',
    outputFile: 'test-pdf-output.pdf'
  }
];

async function runTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('Payload:', JSON.stringify(testCase.payload, null, 2));

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.payload)
    });

    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Test failed: ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log('Response structure:', {
      statusCode: result.statusCode,
      contentType: result.headers['Content-Type'],
      hasBody: !!result.body,
      isBase64Encoded: result.isBase64Encoded,
      bodyLength: result.body ? result.body.length : 0
    });

    // Validate response structure
    if (result.statusCode !== 200) {
      console.error(`❌ Wrong status code: ${result.statusCode}`);
      return false;
    }

    if (result.headers['Content-Type'] !== testCase.expectedContentType) {
      console.error(`❌ Wrong content type: ${result.headers['Content-Type']}`);
      return false;
    }

    if (!result.isBase64Encoded) {
      console.error('❌ Response should be base64 encoded');
      return false;
    }

    if (!result.body) {
      console.error('❌ No body in response');
      return false;
    }

    // Save the output file
    try {
      const buffer = Buffer.from(result.body, 'base64');
      fs.writeFileSync(testCase.outputFile, buffer);
      console.log(`✅ File saved: ${testCase.outputFile} (${buffer.length} bytes)`);
    } catch (saveError) {
      console.error(`❌ Failed to save file: ${saveError.message}`);
      return false;
    }

    console.log('✅ Test passed!');
    return true;

  } catch (error) {
    console.error(`❌ Test failed with error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Cloudflare Worker Tests');
  console.log(`Testing against: ${WORKER_URL}`);
  console.log('Make sure your worker is running with: npx wrangler dev');

  let passed = 0;
  let total = testCases.length;

  for (const testCase of testCases) {
    const success = await runTest(testCase);
    if (success) passed++;
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Test individual functions
async function testMethodNotAllowed() {
  console.log('\n🧪 Testing GET request (should fail)');
  try {
    const response = await fetch(WORKER_URL, { method: 'GET' });
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text}`);
    
    if (response.status === 405) {
      console.log('✅ GET request correctly rejected');
    } else {
      console.log('❌ GET request should return 405');
    }
  } catch (error) {
    console.error(`❌ Error testing GET: ${error.message}`);
  }
}

async function testInvalidPayload() {
  console.log('\n🧪 Testing invalid payload');
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'payload' })
    });
    
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text}`);
    
    if (response.status === 400) {
      console.log('✅ Invalid payload correctly rejected');
    } else {
      console.log('❌ Invalid payload should return 400');
    }
  } catch (error) {
    console.error(`❌ Error testing invalid payload: ${error.message}`);
  }
}

// Main execution
async function main() {
  // Test edge cases first
  await testMethodNotAllowed();
  await testInvalidPayload();
  
  // Run main tests
  await runAllTests();
}

// Check if worker is running
async function checkWorkerStatus() {
  try {
    const response = await fetch(WORKER_URL, { method: 'GET' });
    return true;
  } catch (error) {
    console.error('❌ Worker not accessible. Make sure to run: npx wrangler dev');
    console.error(`Error: ${error.message}`);
    return false;
  }
}

// Run tests
checkWorkerStatus().then(isRunning => {
  if (isRunning) {
    main().catch(console.error);
  } else {
    process.exit(1);
  }
});
