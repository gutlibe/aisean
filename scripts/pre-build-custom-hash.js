#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import * as escodegen from 'escodegen';
import { createHash } from 'crypto';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const config = {
  cssSourceDirs: [
    path.join(projectRoot, 'assets/css/pages'),
    path.join(projectRoot, 'assets/css/components')
  ],
  cssOutputDir: path.join(projectRoot, 'assets/css'),
  jsSourceDirs: [
    path.join(projectRoot, 'assets/js/pages')
  ],
  hashLength: 8,
  publicCssDir: path.join(projectRoot, 'public/assets/css')
};

/**
 * Calculates SHA-1 hash for a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Hash string
 */
async function calculateFileHash(filePath) {
  const fileContent = await fs.readFile(filePath);
  return crypto.createHash('sha1').update(fileContent).digest('hex').substring(0, config.hashLength);
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dir - Directory path
 */
async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Recursively finds files in a directory
 * @param {string} dir - Directory to search
 * @param {Function} callback - Called for each file found
 */
async function findFilesRecursively(dir, callback) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await findFilesRecursively(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

/**
 * Finds all CSS files in the source directories
 * @returns {Promise<string[]>} - Array of CSS file paths
 */
async function findCssFiles() {
  const cssFiles = [];
  
  for (const dir of config.cssSourceDirs) {
    await findFilesRecursively(dir, (filePath) => {
      if (filePath.endsWith('.css')) {
        cssFiles.push(filePath);
      }
    });
  }
  
  return cssFiles;
}

/**
 * Finds all JS files that might reference CSS files
 * @returns {Promise<string[]>} - Array of JS file paths
 */
async function findJsFiles() {
  const jsFiles = [];
  
  for (const dir of config.jsSourceDirs) {
    await findFilesRecursively(dir, (filePath) => {
      if (filePath.endsWith('.js')) {
        jsFiles.push(filePath);
      }
    });
  }
  
  return jsFiles;
}

/**
 * Minifies CSS content
 * @param {string} cssContent - CSS content to minify
 * @returns {string} - Minified CSS content
 */
function minifyCss(cssContent) {
  // Basic CSS minification
  return cssContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ')             // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1')// Remove spaces around punctuation
    .replace(/;\}/g, '}')             // Remove trailing semicolons
    .trim();
}

/**
 * Processes CSS files: hashes, copies, and renames them
 * @returns {Promise<Object>} - Mapping from original paths to new paths
 */
async function processCssFiles() {
  const cssFiles = await findCssFiles();
  const cssMapping = {};
  
  console.log(`Found ${cssFiles.length} CSS files to process`);
  
  // Ensure output directories exist
  await ensureDirectoryExists(config.cssOutputDir);
  await ensureDirectoryExists(config.publicCssDir);
  
  // Create a set to track used hashes to avoid collisions
  const usedHashes = new Set();
  
  for (const cssFile of cssFiles) {
    // Read the file content
    const cssContent = await fs.readFile(cssFile, 'utf8');
    
    // Minify the CSS content
    const minifiedCss = minifyCss(cssContent);
    
    // Calculate hash based on the minified content
    const hash = createHash('sha1')
      .update(minifiedCss)
      .digest('hex')
      .substring(0, config.hashLength);
    
    // Ensure hash uniqueness by adding a counter if needed
    let uniqueHash = hash;
    let counter = 0;
    while (usedHashes.has(uniqueHash)) {
      counter++;
      uniqueHash = hash.substring(0, config.hashLength - counter.toString().length) + counter;
    }
    usedHashes.add(uniqueHash);
    
    // Create new filename with just the hash
    const newFileName = `${uniqueHash}.css`;
    
    // Copy to assets/css/ (for build)
    const outputPath = path.join(config.cssOutputDir, newFileName);
    await fs.writeFile(outputPath, minifiedCss);
    console.log(`  Minified: ${newFileName}`);
    
    // Also copy to public/assets/css/ (for development)
    const publicOutputPath = path.join(config.publicCssDir, newFileName);
    await fs.writeFile(publicOutputPath, minifiedCss);
    
    // Determine the base directory this file belongs to
    const baseDir = config.cssSourceDirs.find(dir => cssFile.startsWith(dir));
    if (!baseDir) continue;
    
    // Create the mapping entry
    const originalRelativePath = path.relative(path.join(baseDir, '..'), cssFile).replace(/\\/g, '/');
    const newRelativePath = newFileName;
    
    cssMapping[originalRelativePath] = newRelativePath;
    console.log(`Processed: ${originalRelativePath} -> ${newRelativePath}`);
  }
  
  return cssMapping;
}

/**
 * Updates JS files to use the new CSS paths
 * @param {Object} cssMapping - Mapping from original paths to new paths
 * @returns {Promise<number>} - Number of updated files
 */
async function updateJsFiles(cssMapping) {
  const jsFiles = await findJsFiles();
  let updatedCount = 0;
  
  console.log(`Found ${jsFiles.length} JS files to check`);
  
  const cssPathMap = new Map(Object.entries(cssMapping));
  const secondaryMap = new Map();
  
  for (const [originalPath, newPath] of cssPathMap.entries()) {
    secondaryMap.set(`/assets/css/${originalPath}`, newPath);
    secondaryMap.set(`assets/css/${originalPath}`, newPath);
  }
  
  for (const jsFile of jsFiles) {
    let fileContent = await fs.readFile(jsFile, 'utf8');
    let modified = false;
    
    try {
      const ast = acorn.parse(fileContent, { 
        ecmaVersion: 2020,
        sourceType: 'module'
      });
      
      walk.simple(ast, {
        AssignmentExpression(node) {
          if (node.left?.type === 'MemberExpression' && 
              node.left.property?.name === 'cssFiles' &&
              node.right?.type === 'ArrayExpression') {
            
            let hasChanges = false;
            
            node.right.elements.forEach((element, index) => {
              if (element.type === 'Literal' && typeof element.value === 'string') {
                const cssPath = element.value;
                let newPath = cssPathMap.get(cssPath) || secondaryMap.get(cssPath);
                
                if (newPath) {
                  node.right.elements[index].value = newPath;
                  hasChanges = true;
                  console.log(`  In ${path.basename(jsFile)}: "${cssPath}" → "${newPath}"`);
                }
              }
            });
            
            if (hasChanges) {
              modified = true;
            }
          }
        }
      });
      
      if (modified) {
        const updatedCode = escodegen.generate(ast);
        await fs.writeFile(jsFile, updatedCode, 'utf8');
        updatedCount++;
        console.log(`Updated JS file: ${jsFile}`);
      }
    } catch (error) {
      console.error(`Error processing JS file ${jsFile}:`, error);
    }
  }
  
  console.log(`Updated ${updatedCount} JS files with new CSS paths`);
  return updatedCount;
}

/**
 * Main function that orchestrates the pre-build process
 */
async function main() {
  console.log('Starting pre-build CSS hashing process...');
  
  try {
    const cssMapping = await processCssFiles();
    await updateJsFiles(cssMapping);
    
    await fs.writeFile(
      path.join(projectRoot, 'css-mapping.json'), 
      JSON.stringify(cssMapping, null, 2), 
      'utf8'
    );
    
    console.log('Pre-build CSS hashing completed successfully!');
  } catch (error) {
    console.error('Error during pre-build process:', error);
    process.exit(1);
  }
}

main();