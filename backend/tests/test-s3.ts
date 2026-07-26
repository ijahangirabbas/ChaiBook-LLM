import dotenv from 'dotenv';
import { S3Client, GetBucketLocationCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

export async function testS3(): Promise<boolean> {
  console.log('\n========================================');
  console.log('☁️ 3. Testing AWS S3 Cloud Storage...');
  console.log('========================================');

  let region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !bucketName || accessKeyId.includes('your_aws')) {
    console.warn('⚠️ AWS S3 credentials not fully configured in .env file.');
    console.warn('   To enable S3: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME in .env.');
    return false;
  }

  try {
    // 1. Probe Bucket Location/Region dynamically
    console.log(`🔹 Checking region for bucket "${bucketName}"...`);
    const probeClient = new S3Client({
      region: 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
    });

    try {
      const locResponse = await probeClient.send(new GetBucketLocationCommand({ Bucket: bucketName }));
      // LocationConstraint is empty string '' for us-east-1, or 'us-west-2', 'eu-west-1', etc.
      const detectedRegion = locResponse.LocationConstraint || 'us-east-1';
      region = detectedRegion === 'EU' ? 'eu-west-1' : detectedRegion;
      console.log(`✅ Bucket Region Detected: "${region}"`);
    } catch (locErr) {
      console.log(`ℹ️ Defaulting to configured region "${region}"`);
    }

    const s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const testKey = `tests/chaibook-test-${Date.now()}.txt`;
    const testBody = 'ChaiBook LLM S3 Integration Test File Content';

    // 2. Upload Test Object
    console.log(`🔹 Uploading test object to S3 key: "${testKey}"...`);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: testBody,
        ContentType: 'text/plain',
      })
    );
    console.log('✅ File uploaded successfully to S3 bucket!');

    // 3. Generate Presigned URL
    console.log('🔹 Generating S3 presigned download URL...');
    const command = new GetObjectCommand({ Bucket: bucketName, Key: testKey });
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    console.log(`✅ Presigned URL Generated Successfully!`);
    console.log(`   URL Preview: ${presignedUrl.substring(0, 70)}...`);

    // 4. Clean up Test Object
    console.log('🔹 Deleting test object from S3 bucket...');
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: testKey,
      })
    );
    console.log('✅ S3 Test object deleted cleanly.');

    console.log('🎉 AWS S3 Test Passed Successfully!\n');
    return true;
  } catch (error) {
    console.error(`❌ AWS S3 Test Failed: ${(error as Error).message}\n`);
    return false;
  }
}

if (require.main === module) {
  testS3();
}
