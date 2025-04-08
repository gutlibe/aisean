import fs from 'fs/promises';
import path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const jsBuildDir = path.resolve(projectRoot, 'dist/assets/js');

const obfuscationOptions = {
  compact: true,
  simplify: true,
  log: false,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.75,
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  transformObjectKeys: false,
  unicodeEscapeSequence: true,
  numbersToExpressions: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,
  debugProtection: true,
  disableConsoleOutput: true,
};


async function obfuscateFile(filePath) {
  const fileName = path.basename(filePath);
  try {
    const code = await fs.readFile(filePath, 'utf8');
    if (!code || code.trim() === '') {
      console.warn(`Skipping empty file: ${fileName}`);
      return;
    }
    if (code.includes('Obfuscation completed')) {
      console.warn(`Skipping already obfuscated file: ${fileName}`);
      return;
    }
    
    console.log(`Obfuscating: ${fileName}...`);
    const startTime = performance.now();
    
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    const obfuscatedCode = obfuscationResult.getObfuscatedCode();
    const finalCode = `// Obfuscation completed: ${new Date().toISOString()}\n${obfuscatedCode}`;
    
    await fs.writeFile(filePath, finalCode, 'utf8');
    const endTime = performance.now();
    console.log(`   Done: ${fileName} (took ${(endTime - startTime).toFixed(2)}ms)`);
    
  } catch (error) {
    console.error(`Error obfuscating file ${fileName}:`, error.message);
  }
}

async function runObfuscation() {
  console.log(`\nStarting post-build obfuscation in: ${jsBuildDir}`);
  const overallStart = performance.now();
  try {
    let files;
    try {
      files = await fs.readdir(jsBuildDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`Warning: Directory not found ${jsBuildDir}.`);
        console.warn("Skipping obfuscation. Ensure 'npm run build:vite' ran successfully first.");
        return;
      }
      throw error;
    }
    
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.endsWith('.map'));
    
    if (jsFiles.length === 0) {
      console.warn("No JavaScript files found to obfuscate in", jsBuildDir);
      return;
    }
    
    console.log(`Found ${jsFiles.length} JavaScript file(s) to obfuscate.`);
    
    for (const file of jsFiles) {
      const fullPath = path.join(jsBuildDir, file);
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