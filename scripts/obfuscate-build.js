import fs from 'fs/promises';
import path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const mainJsBuildDir = path.resolve(projectRoot, 'dist/assets/js');
const loginJsBuildDir = path.resolve(projectRoot, 'dist/login/assets/js');

const obfuscationOptions = {
  compact: true,
  simplify: true,
  log: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: true,
  numbersToExpressions: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  disableConsoleOutput: true,
};


async function obfuscateFile(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(projectRoot, filePath);
  try {
    const code = await fs.readFile(filePath, 'utf8');
    if (!code || code.trim() === '') {
      console.warn(`Skipping empty file: ${relativePath}`);
      return;
    }
    if (code.includes('Obfuscation completed')) {
      console.warn(`Skipping already obfuscated file: ${relativePath}`);
      return;
    }
    
    console.log(`Obfuscating: ${relativePath}...`);
    const startTime = performance.now();
    
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    const obfuscatedCode = obfuscationResult.getObfuscatedCode();
    const finalCode = `// Obfuscation completed: ${new Date().toISOString()}\n${obfuscatedCode}`;
    
    await fs.writeFile(filePath, finalCode, 'utf8');
    const endTime = performance.now();
    console.log(`   Done: ${relativePath} (took ${(endTime - startTime).toFixed(2)}ms)`);
    
  } catch (error) {
    console.error(`Error obfuscating file ${relativePath}:`, error.message);
  }
}

async function findJsFiles(directory) {
  try {
    const files = await fs.readdir(directory);
    return files
      .filter(file => file.endsWith('.js') && !file.endsWith('.map'))
      .map(file => path.join(directory, file));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Warning: Directory not found ${directory}. Skipping search here.`);
    } else {
      console.error(`Error reading directory ${directory}:`, error);
    }
    return [];
  }
}

async function runObfuscation() {
  console.log(`\nStarting post-build obfuscation...`);
  const overallStart = performance.now();
  try {
    const mainJsFiles = await findJsFiles(mainJsBuildDir);
    const loginJsFiles = await findJsFiles(loginJsBuildDir);
    const allJsFiles = [...mainJsFiles, ...loginJsFiles];
    
    if (allJsFiles.length === 0) {
      console.warn("No JavaScript files found to obfuscate in expected directories.");
      console.warn(`Checked: ${mainJsBuildDir}`);
      console.warn(`Checked: ${loginJsBuildDir}`);
      console.warn("Ensure build:vite and copy:login ran successfully first.");
      return;
    }
    
    console.log(`Found ${allJsFiles.length} JavaScript file(s) to obfuscate.`);
    
    for (const fullPath of allJsFiles) {
      await obfuscateFile(fullPath);
    }
    
    const overallEnd = performance.now();
    console.log(`\nJavaScript obfuscation complete. Total time: ${(overallEnd - overallStart).toFixed(2)}ms`);
    
  } catch (error) {
    console.error('Error during obfuscation process:', error);
    process.exit(1);
  }
}

runObfuscation();