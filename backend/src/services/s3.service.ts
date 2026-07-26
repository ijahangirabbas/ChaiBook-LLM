import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import { config } from '../config/env.config';

export class S3Service {
  private client: S3Client | null = null;
  private bucketName: string;

  constructor() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'chaibook-sources';

    if (accessKeyId && secretAccessKey && !accessKeyId.includes('your_aws')) {
      this.client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  async uploadFile(filePath: string, s3Key: string, mimeType: string): Promise<string | null> {
    if (!this.client) {
      console.warn('⚠️ S3 client not configured. Skipping S3 upload.');
      return null;
    }

    const fileStream = fs.createReadStream(filePath);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileStream,
        ContentType: mimeType,
      })
    );

    return `https://${this.bucketName}.s3.amazonaws.com/${s3Key}`;
  }

  async getPresignedDownloadUrl(s3Key: string, expiresInSeconds = 3600): Promise<string | null> {
    if (!this.client) return null;
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: s3Key });
    return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteFile(s3Key: string): Promise<void> {
    if (!this.client) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: s3Key }));
  }
}

export const s3Service = new S3Service();
