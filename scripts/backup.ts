// scripts/backup-database.ts
import { config } from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

// Promisify exec for better async handling
const execAsync = promisify(exec);

// Database configuration interface
interface DbConfig {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
}

// Parse database URL
function parseDbUrl(url: string): DbConfig {
  const regex = /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid database URL');
  }
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5]
  };
}

// Main backup function
async function backupDatabase() {
  try {
    // Get database configurations
    const prodDb = parseDbUrl(process.env.DATABASE_URL || '');
    const backupDb = parseDbUrl(process.env.DATABASE_URL_BACKUP || '');

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate timestamp for backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    console.log('Starting database backup...');

    // Step 1: Dump production database
    const dumpCommand = `mysqldump -u ${prodDb.user} -p${prodDb.password} -h ${prodDb.host} -P ${prodDb.port} ${prodDb.database} > ${backupFile}`;
    
    console.log('Creating database dump...');
    await execAsync(dumpCommand);
    console.log(`Database dump created at: ${backupFile}`);

    // Step 2: Import to backup database
    const importCommand = `mysql -u ${backupDb.user} -p${backupDb.password} -h ${backupDb.host} -P ${backupDb.port} ${backupDb.database} < ${backupFile}`;
    
    console.log('Importing to backup database...');
    await execAsync(importCommand);
    console.log('Backup database updated successfully!');
    console.log(`Backup file saved at: ${backupFile}`);

    // Optional: Clean up old backup files (keep only last 5)
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .sort();

    if (files.length > 5) {
      const filesToDelete = files.slice(0, files.length - 5);
      filesToDelete.forEach(file => {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`Deleted old backup: ${file}`);
      });
    }

    return backupFile;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

// Execute backup if this file is run directly
if (require.main === module) {
  backupDatabase()
    .then(() => {
      console.log('Backup process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backup process failed:', error);
      process.exit(1);
    });
}

export default backupDatabase;