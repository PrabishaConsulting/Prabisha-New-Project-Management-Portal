// scripts/backup-database.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Promisify exec for better async handling
const execAsync = promisify(exec);

// IMPORTANT: Update these paths to match your system
const MYSQLDUMP_PATH = "C:\\xampp\\mysql\\bin\\mysqldump.exe"; // Path to mysqldump

// Database configuration interface
const parseDbUrl = (url: string) => {
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
};

// Main backup function
const backupDatabase = async () => {
  try {
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config({ path: path.join(__dirname, '../.env') });

    // Get database configuration
    const prodDb = parseDbUrl(process.env.DATABASE_URL || '');

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate timestamp for backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    console.log('Starting database backup...');
    console.log('Database:', prodDb);

    // Step 1: Dump production database
    const dumpCommand = `"${MYSQLDUMP_PATH}" -u ${prodDb.user} -p${prodDb.password} -h ${prodDb.host} -P ${prodDb.port} ${prodDb.database} > "${backupFile}"`;
    
    console.log('Creating database dump...');
    console.log('Command:', dumpCommand);
    await execAsync(dumpCommand);
    console.log(`Database dump created at: ${backupFile}`);

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
};

// Execute backup
backupDatabase()
  .then(() => {
    console.log('Backup process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backup process failed:', error);
    process.exit(1);
  });