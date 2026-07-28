import { YoutubeLoader } from '../src/loaders/youtube.loader';

export async function testYoutubeLoader(): Promise<boolean> {
  console.log('\n========================================');
  console.log('🎥 Testing YouTube Video ID & Transcript Loader');
  console.log('========================================');

  const loader = new YoutubeLoader();
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  try {
    console.log(`🔹 Attempting to extract transcript from YouTube URL: ${testUrl}`);
    const docs = await loader.load({ url: testUrl });
    console.log(`✅ YouTube Transcript Extracted Successfully! Total segments: ${docs.length}`);
    if (docs.length > 0) {
      console.log(`Preview: "${docs[0].pageContent.slice(0, 100)}..."`);
    }
    console.log('🎉 YouTube Loader Test PASSED!\n');
    return true;
  } catch (err) {
    console.error(`❌ YouTube Loader Test Failed: ${(err as Error).message}\n`);
    return false;
  }
}

if (require.main === module) {
  testYoutubeLoader();
}
