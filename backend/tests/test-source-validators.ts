import { createSourceSchema } from '../src/validators';

export async function testSourceValidators(): Promise<boolean> {
  console.log('\n========================================');
  console.log('📝 Testing Source Validators & Payload Formats');
  console.log('========================================');

  let passed = true;

  // 1. Test standard payload with type
  const validWithType = createSourceSchema.safeParse({
    type: 'pdf',
    title: 'Sample Research Paper',
    url: 'https://example.com/paper.pdf',
  });

  if (validWithType.success) {
    console.log('✅ Standard payload with type: PASSED');
  } else {
    console.error('❌ Standard payload with type: FAILED');
    passed = false;
  }

  // 2. Test file upload FormData payload (where type is omitted/optional)
  const validFileUpload = createSourceSchema.safeParse({
    title: 'Uploaded Document.pdf',
  });

  if (validFileUpload.success) {
    console.log('✅ File upload payload (optional type): PASSED');
  } else {
    console.error('❌ File upload payload (optional type): FAILED');
    passed = false;
  }

  if (passed) {
    console.log('🎉 Source Validators Test PASSED!\n');
  } else {
    console.error('❌ Source Validators Test FAILED!\n');
  }

  return passed;
}

if (require.main === module) {
  testSourceValidators();
}
