// scripts/restore-database.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Promisify exec for better async handling
const execAsync = promisify(exec);

// IMPORTANT: Update these paths to match your system
const MYSQL_PATH = "C:\\xampp\\mysql\\bin\\mysql.exe"; // Path to mysql

// Database configuration interface
const parseDbUrl = (url) => {
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

// Function to list available backup files
const listBackupFiles = () => {
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('Backup directory does not exist. Please run backup first.');
    return [];
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
    .sort();
  
  return files;
};

// Function to get user input
const askQuestion = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

// Main restore function
const restoreDatabase = async (backupFile) => {
  try {
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config({ path: path.join(__dirname, '../.env') });

    // Get backup database configuration
    const backupDb = parseDbUrl(process.env.DATABASE_URL_BACKUP || '');

    console.log('Starting database restore...');
    console.log('Target DB:', backupDb);
    console.log('Backup file:', backupFile);

    // Import to backup database
    // Handle SSL mode for Aiven MySQL
    const importCommand = `"${MYSQL_PATH}" -u ${backupDb.user} -p${backupDb.password} -h ${backupDb.host} -P ${backupDb.port} --ssl-mode=REQUIRED ${backupDb.database} < "${backupFile}"`;
    
    console.log('Importing to backup database...');
    console.log('Command:', importCommand);
    await execAsync(importCommand);
    console.log('Database restored successfully!');

    return backupFile;
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    console.log('=== Database Restore Tool ===\n');
    
    // List available backup files
    const backupFiles = listBackupFiles();
    
    if (backupFiles.length === 0) {
      console.log('No backup files found. Please run backup first.');
      return;
    }
    
    console.log('Available backup files:');
    backupFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    // Ask user to select a backup file
    const answer = await askQuestion('\nEnter the number of the backup file to restore: ');
    const fileIndex = parseInt(answer) - 1;
    
    if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= backupFiles.length) {
      console.log('Invalid selection.');
      return;
    }
    
    const selectedFile = backupFiles[fileIndex];
    const backupFilePath = path.join(__dirname, '../backups', selectedFile);
    
    // Confirm before restoring
    const confirm = await askQuestion(`Are you sure you want to restore from ${selectedFile}? (y/N): `);
    
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Restore cancelled.');
      return;
    }
    
    // Perform the restore
    await restoreDatabase(backupFilePath);
    console.log('Restore process completed successfully');
    
  } catch (error) {
    console.error('Restore process failed:', error);
  } finally {
    process.exit(0);
  }
};

// Execute main function
main();