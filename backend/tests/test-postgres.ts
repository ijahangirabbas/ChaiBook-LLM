import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

dotenv.config();

export async function testPostgres(): Promise<boolean> {
  console.log('\n========================================');
  console.log('🐘 4. Testing PostgreSQL Database (Prisma)...');
  console.log('========================================');

  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes('user:password@localhost')) {
    console.warn('⚠️ DATABASE_URL not fully configured in .env file.');
    console.warn('   To enable PostgreSQL: Set DATABASE_URL="postgresql://user:password@host:5432/dbname" in .env.');
    return false;
  }

  // Ensure SSL mode is set for cloud databases like Neon/Supabase
  if (databaseUrl.includes('neon.tech') && !databaseUrl.includes('sslmode')) {
    databaseUrl += databaseUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
    process.env.DATABASE_URL = databaseUrl;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // 1. Verify Database Connection
    console.log('🔹 Connecting to PostgreSQL database...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL Connection Verified!');

    // 2. Ensure Database Schema Tables Exist
    try {
      await prisma.user.findFirst();
      console.log('✅ Database schema tables verified.');
    } catch {
      console.log('🔹 Syncing database schema (npx prisma db push)...');
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });
      console.log('✅ Database schema synced successfully.');
    }

    // 3. Perform CRUD Test Operation
    const testEmail = `test.user.${Date.now()}@chaibook.io`;
    console.log(`🔹 Creating test User record (${testEmail})...`);

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'ChaiBook Test User',
        provider: 'google',
      },
    });
    console.log(`✅ User created! ID: ${user.id}`);

    console.log(`🔹 Creating test Notebook for User...`);
    const notebook = await prisma.notebook.create({
      data: {
        title: 'Integration Test Workspace',
        userId: user.id,
        color: 'indigo',
        icon: 'book',
      },
    });
    console.log(`✅ Notebook created! ID: ${notebook.id}`);

    // 4. Clean up Test Records
    console.log('🔹 Cleaning up test records...');
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log('✅ Test records cleaned up successfully.');

    await prisma.$disconnect();
    console.log('🎉 PostgreSQL Test Passed Successfully!\n');
    return true;
  } catch (error) {
    console.error(`❌ PostgreSQL Test Failed: ${(error as Error).message}\n`);
    await prisma.$disconnect();
    return false;
  }
}

if (require.main === module) {
  testPostgres();
}
