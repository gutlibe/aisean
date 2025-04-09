#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import * as escodegen from 'escodegen';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const config = {
  // Core CSS files are now in the root CSS directory
  coreCssDir: path.join(projectRoot, 'assets/css'),
  coreCssFiles: ['base.css', 'theme.css', 'loader.css', 'page.css', 'menu.css'],
  
  // Page-specific CSS files
  cssSourceDirs: [
    path.join(projectRoot, 'assets/css/pages'),
    path.join(projectRoot, 'assets/css/components')
  ],
  cssOutputDir: path.join(projectRoot, 'assets/css'),
  
  // JS files to update
  jsSourceDirs: [
    path.join(projectRoot, 'assets/js/pages')
  ],
  
  // CSS Manager file
  cssManagerPath: path.join(projectRoot, 'assets/js/chunks/css-manager.js'),
  
  // Hash length for generated filenames
  hashLength: 8,
  
  // Public directory for development
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
 * Creates a flattened path with underscores
 * @param {string} filePath - Original file path
 * @param {string} baseDir - Base directory to create relative path from
 * @returns {string} - Flattened path
 */
function flattenPath(filePath, baseDir) {
  const relativePath = path.relative(baseDir, filePath);
  return relativePath.replace(/\//g, '_').replace(/\\/g, '_');
}

/**
 * Recursively finds files in a directory
 * @param {string} dir - Directory to search
 * @param {Function} callback - Called for each file found
 */
async function findFilesRecursively(dir, callback) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await findFilesRecursively(fullPath, callback);
      } else {
        callback(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
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
 * Processes core CSS files
 * @returns {Promise<Object>} - Mapping from original filenames to hashed filenames
 */
async function processCoreCssFiles() {
  const coreMapping = {};
  
  console.log('Processing core CSS files...');
  
  for (const cssFile of config.coreCssFiles) {
    const filePath = path.join(config.coreCssDir, cssFile);
    
    try {
      await fs.access(filePath);
      
      const hash = await calculateFileHash(filePath);
      const extname = path.extname(cssFile);
      const basename = path.basename(cssFile, extname);
      const newFileName = `${basename}.${hash}${extname}`;
      
      // Copy to output directory with hashed name
      const outputPath = path.join(config.cssOutputDir, newFileName);
      await fs.copyFile(filePath, outputPath);
      
      // Also copy to public directory for development
      const publicOutputPath = path.join(config.publicCssDir, newFileName);
      await fs.copyFile(filePath, publicOutputPath);
      
      // Store mapping
      coreMapping[cssFile] = newFileName;
      console.log(`Processed core CSS: ${cssFile} -> ${newFileName}`);
    } catch (error) {
      console.error(`Error processing core CSS file ${cssFile}:`, error);
    }
  }
  
  return coreMapping;
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
  
  for (const cssFile of cssFiles) {
    const hash = await calculateFileHash(cssFile);
    const baseDir = config.cssSourceDirs.find(dir => cssFile.startsWith(dir));
    if (!baseDir) continue;
    
    const flattenedName = flattenPath(cssFile, baseDir);
    const extname = path.extname(flattenedName);
    const basename = path.basename(flattenedName, extname);
    const newFileName = `${basename}.${hash}${extname}`;
    
    // Copy to assets/css/ (for build)
    const outputPath = path.join(config.cssOutputDir, newFileName);
    await fs.copyFile(cssFile, outputPath);
    
    // Also copy to public/assets/css/ (for development)
    const publicOutputPath = path.join(config.publicCssDir, newFileName);
    await fs.copyFile(cssFile, publicOutputPath);
    
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
 * Updates the CSS Manager file to use hashed filenames
 * @param {Object} coreMapping - Mapping of core CSS files
 * @param {Object} cssMapping - Mapping of other CSS files
 * @returns {Promise<boolean>} - Success status
 */
async function updateCssManager(coreMapping, cssMapping) {
  try {
    console.log('Updating CSS Manager...');
    
    // Read the CSS Manager file
    const cssManagerContent = await fs.readFile(config.cssManagerPath, 'utf8');
    
    // Parse the file
    const ast = acorn.parse(cssManagerContent, { 
      ecmaVersion: 2020,
      sourceType: 'module'
    });
    
    let modified = false;
    
    // Find and update the cssConfig object
    walk.simple(ast, {
      Property(node) {
        // Look for the core array in cssConfig
        if (node.key?.name === 'core' && node.value?.type === 'ArrayExpression') {
          const coreArray = node.value;
          
          // Update core CSS files
          coreArray.elements.forEach((element, index) => {
            if (element.type === 'Literal' && typeof element.value === 'string') {
              const cssName = element.value + '.css';
              if (coreMapping[cssName]) {
                // Remove the .css extension from the mapping
                const newName = coreMapping[cssName].replace(/\.css$/, '');
                coreArray.elements[index].value = newName;
                modified = true;
                console.log(`  Updated core CSS in manager: "${element.value}" → "${newName}"`);
              }
            }
          });
        }
        
        // Look for the components array in cssConfig
        if (node.key?.name === 'components' && node.value?.type === 'ArrayExpression') {
          const componentsArray = node.value;
          
          // Update component CSS files - menu.css is now a core file, so we might need to remove it
          for (let i = componentsArray.elements.length - 1; i >= 0; i--) {
            const element = componentsArray.elements[i];
            if (element.type === 'Literal' && element.value === 'menu') {
              // Remove menu from components array as it's now a core file
              componentsArray.elements.splice(i, 1);
              modified = true;
              console.log(`  Removed 'menu' from components array in CSS Manager`);
            }
          }
        }
      }
    });
    
    if (modified) {
      // Generate updated code
      const updatedCode = escodegen.generate(ast);
      
      // Write back to the file
      await fs.writeFile(config.cssManagerPath, updatedCode, 'utf8');
      console.log('CSS Manager updated successfully');
      return true;
    } else {
      console.log('No changes needed in CSS Manager');
      return false;
    }
  } catch (error) {
    console.error('Error updating CSS Manager:', error);
    return false;
  }
}

/**
 * Main function that orchestrates the pre-build process
 */
async function main() {
  console.log('Starting pre-build CSS hashing process...');
  
  try {
    // Process core CSS files first
    const coreMapping = await processCoreCssFiles();
    
    // Process other CSS files
    const cssMapping = await processCssFiles();
    
    // Combine mappings
    const combinedMapping = { ...cssMapping, ...Object.fromEntries(
      Object.entries(coreMapping).map(([key, value]) => [`${key}`, value])
    )};
    
    // Update JS files with new CSS paths
    await updateJsFiles(combinedMapping);
    
    // Update CSS Manager
    await updateCssManager(coreMapping, cssMapping);
    
    // Write the mapping to a file for reference and for Vite config
    await fs.writeFile(
      path.join(projectRoot, 'css-mapping.json'), 
      JSON.stringify(combinedMapping, null, 2), 
      'utf8'
    );
    
    console.log('Pre-build CSS hashing completed successfully!');
  } catch (error) {
    console.error('Error during pre-build process:', error);
    process.exit(1);
  }
}

main();