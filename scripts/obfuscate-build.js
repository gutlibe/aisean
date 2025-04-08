/**
 * JavaScript Obfuscation Script with Environment Detection
 * 
 * This script detects the current branch/environment and applies appropriate
 * domain locks for JavaScript obfuscation. Production builds only allow the
 * main domain, while development builds also allow localhost.
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { fileURLToPath } from 'url';

// File paths configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Build directories
const DIRECTORIES = {
  main: path.resolve(projectRoot, 'dist/assets/js'),
  login: path.resolve(projectRoot, 'dist/login/assets/js'),
};

// Domain configuration
const DOMAINS = {
  production: 'aisean.eu.org',
  development: ['localhost', '127.0.0.1'],
  redirectUrl: 'https://aisean.eu.org/'
};

/**
 * Detects the current Git branch
 * @returns {string} - Name of the current branch
 */
function getCurrentBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    console.log(`🔍 Detected branch: ${branch}`);
    return branch;
  } catch (error) {
    console.warn(`⚠️ Could not detect Git branch: ${error.message}`);
    console.warn('   Defaulting to production environment');
    return 'main'; // Default to production if Git command fails
  }
}

/**
 * Determines if this is a production build
 * @param {string} branch - Git branch name
 * @returns {boolean} - True if production, false otherwise
 */
function isProduction(branch) {
  return branch === 'main' || branch === 'master';
}

/**
 * Creates the appropriate domain lock configuration based on environment
 * @param {boolean} isProd - Whether this is a production build
 * @returns {Object} - Domain lock configuration
 */
function createDomainLockConfig(isProd) {
  const domainLock = isProd ?
    [DOMAINS.production] :
    [DOMAINS.production, ...DOMAINS.development];
  
  return {
    domainLock,
    domainLockRedirectUrl: DOMAINS.redirectUrl,
  };
}

/**
 * Find all JavaScript files in a directory (excluding source maps)
 * @param {string} directory - Directory to search
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findJsFiles(directory) {
  try {
    const files = await fs.readdir(directory);
    return files
      .filter(file => file.endsWith('.js') && !file.endsWith('.map'))
      .map(file => path.join(directory, file));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Directory not found: ${directory} - skipping`);
    } else {
      console.error(`Error reading directory ${directory}:`, error);
    }
    return [];
  }
}

/**
 * Obfuscate a single JavaScript file
 * @param {string} filePath - Path to the file
 * @param {Object} options - Obfuscation options
 * @returns {Promise<void>}
 */
async function obfuscateFile(filePath, options) {
  const relativePath = path.relative(projectRoot, filePath);
  
  try {
    // Read file content
    const code = await fs.readFile(filePath, 'utf8');
    
    // Skip empty files
    if (!code || code.trim() === '') {
      console.warn(`Skipping empty file: ${relativePath}`);
      return;
    }
    
    console.log(`Obfuscating: ${relativePath}`);
    const startTime = performance.now();
    
    // Obfuscate the code
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, options);
    const obfuscatedCode = obfuscationResult.getObfuscatedCode();
    
    // Write the obfuscated code back to the file
    await fs.writeFile(filePath, obfuscatedCode, 'utf8');
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`   ✓ Done: ${relativePath} (${duration}ms)`);
  } catch (error) {
    console.error(`   ✗ Error: ${relativePath} - ${error.message}`);
  }
}

/**
 * Main obfuscation process
 */
async function runObfuscation() {
  console.log('\n🔒 Starting JavaScript obfuscation...');
  const startTime = performance.now();
  
  try {
    // Detect environment
    const currentBranch = getCurrentBranch();
    const prod = isProduction(currentBranch);
    
    console.log(`🌐 Environment: ${prod ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    
    // Create environment-specific configuration
    const domainConfig = createDomainLockConfig(prod);
    
    // Base obfuscation options
    const obfuscationOptions = {
      // Basic settings
      compact: true,
      simplify: true,
      log: false,
      
      // String transformation
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      unicodeEscapeSequence: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      
      // Identifier handling
      identifierNamesGenerator: 'hexadecimal',
      renameGlobals: false,
      
      // Code transformation
      numbersToExpressions: true,
      disableConsoleOutput: prod, // Only disable console in production
      
      // Security features (disabled for performance)
      controlFlowFlattening: false,
      deadCodeInjection: false,
      selfDefending: false,
      debugProtection: false,
      transformObjectKeys: false,
      
      // Domain locking (from environment detection)
      ...domainConfig
    };
    
    // Show domain lock configuration
    console.log(`🔐 Domain lock: ${obfuscationOptions.domainLock.join(', ')}`);
    
    // Find all JavaScript files
    const filePromises = Object.values(DIRECTORIES).map(findJsFiles);
    const fileGroups = await Promise.all(filePromises);
    const allJsFiles = fileGroups.flat();
    
    // Check if any files were found
    if (allJsFiles.length === 0) {
      console.warn("⚠️  No JavaScript files found in expected directories:");
      Object.values(DIRECTORIES).forEach(dir => console.warn(`   - ${dir}`));
      console.warn("   Ensure build process ran successfully first.");
      return;
    }
    
    console.log(`📄 Found ${allJsFiles.length} JavaScript file(s) to process`);
    
    // Process all files
    for (const filePath of allJsFiles) {
      await obfuscateFile(filePath, obfuscationOptions);
    }
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`\n✅ Obfuscation complete (${duration}ms)`);
    
  } catch (error) {
    console.error('\n❌ Obfuscation failed:', error);
    process.exit(1);
  }
}

// Execute the script
runObfuscation();