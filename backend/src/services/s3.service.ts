import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import { config } from '../config/env.config';

export class S3Service {
  private client: S3Client | null = null;
  private bucketName: string;

  constructor() {
    const accessKeyId = config.awsAccessKeyId;
    const secretAccessKey = config.awsSecretAccessKey;
    const region = config.awsRegion;
    this.bucketName = config.awsS3BucketName;

    if (accessKeyId && secretAccessKey && !accessKeyId.includes('your_aws')) {
      this.client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async uploadFile(filePath: string, s3Key: string, mimeType: string): Promise<string | null> {
    if (!this.client) {
      if (config.nodeEnv === 'production') {
        throw new Error('S3 client is not configured — file upload cannot proceed in production.');
      }
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

  async downloadToTempFile(s3Key: string): Promise<string> {
    if (!this.client) {
      throw new Error('S3 client is not configured — cannot download file for processing.');
    }

    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: s3Key })
    );

    if (!response.Body) {
      throw new Error(`S3 object "${s3Key}" returned an empty body.`);
    }

    const ext = path.extname(s3Key) || '.bin';
    const tempPath = path.join(os.tmpdir(), `chaibook-${Date.now()}${ext}`);
    await pipeline(response.Body as NodeJS.ReadableStream, fs.createWriteStream(tempPath));
    return tempPath;
  }

  async getPresignedUploadUrl(
    s3Key: string,
    contentType: string,
    expiresInSeconds = 3600
  ): Promise<{ uploadUrl: string; s3Key: string } | null> {
    if (!this.client) return null;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return { uploadUrl, s3Key };
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
