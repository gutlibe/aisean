import fs from 'fs/promises';
import path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsBuildDir = path.resolve(__dirname, '../dist/assets/js');

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: false,
  // controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: false,
  // deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  // debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  // splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};


async function obfuscateFile(filePath) {
  try {
    const code = await fs.readFile(filePath, 'utf8');
    if (!code) {
      console.warn(`Skipping empty file: ${path.basename(filePath)}`);
      return;
    }
    
    console.log(`Obfuscating: ${path.basename(filePath)}...`);
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    const obfuscatedCode = obfuscationResult.getObfuscatedCode();
    
    await fs.writeFile(filePath, obfuscatedCode, 'utf8');
    console.log(`   Done: ${path.basename(filePath)}`);
    
  } catch (error) {
    console.error(`Error obfuscating file ${path.basename(filePath)}:`, error);
  }
}

async function runObfuscation() {
  console.log(`\nStarting post-build obfuscation in: ${jsBuildDir}`);
  try {
    const files = await fs.readdir(jsBuildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    if (jsFiles.length === 0) {
      console.warn("No JavaScript files found to obfuscate in", jsBuildDir);
      return;
    }
    
    const obfuscationPromises = jsFiles.map(file => {
      const fullPath = path.join(jsBuildDir, file);
      return obfuscateFile(fullPath);
    });
    
    await Promise.all(obfuscationPromises);
    console.log('JavaScript obfuscation complete.');
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Warning: Directory not found ${jsBuildDir}.`);
      console.warn("Skipping obfuscation. Ensure 'vite build' ran successfully first.");
    } else {
      console.error('Error during obfuscation process:', error);
      process.exit(1);
    }
  }
}

runObfuscation();