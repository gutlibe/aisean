#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import * as escodegen from 'escodegen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const config = {
  coreCssDir: path.join(projectRoot, 'assets/css'),
  coreCssFiles: ['base', 'theme', 'loader', 'page', 'menu'],
  
  cssSourceDirs: [
    path.join(projectRoot, 'assets/css/pages'),
    path.join(projectRoot, 'assets/css/components')
  ],
  cssOutputDir: path.join(projectRoot, 'assets/css'),
  
  jsSourceDirs: [
    path.join(projectRoot, 'assets/js/pages')
  ],
  
  cssManagerFile: path.join(projectRoot, 'assets/js/chunks/css-manager.js'),
  
  hashLength: 8,
  publicCssDir: path.join(projectRoot, 'public/assets/css')
};

async function calculateFileHash(filePath) {
  const fileContent = await fs.readFile(filePath);
  return crypto.createHash('sha1').update(fileContent).digest('hex').substring(0, config.hashLength);
}

function flattenPath(filePath, baseDir) {
  const relativePath = path.relative(baseDir, filePath);
  return relativePath.replace(/\//g, '_').replace(/\\/g, '_');
}

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

async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function processCoreCssFiles() {
  const coreCssMapping = {};
  
  console.log(`Processing ${config.coreCssFiles.length} core CSS files`);
  
  await ensureDirectoryExists(config.cssOutputDir);
  await ensureDirectoryExists(config.publicCssDir);
  
  for (const baseName of config.coreCssFiles) {
    const cssFile = path.join(config.coreCssDir, `${baseName}.css`);
    
    try {
      await fs.access(cssFile);
      
      const hash = await calculateFileHash(cssFile);
      const newFileName = `${baseName}.${hash}.css`;
      
      const outputPath = path.join(config.cssOutputDir, newFileName);
      await fs.copyFile(cssFile, outputPath);
      
      const publicOutputPath = path.join(config.publicCssDir, newFileName);
      await fs.copyFile(cssFile, publicOutputPath);
      
      coreCssMapping[`${baseName}.css`] = newFileName;
      console.log(`Processed core CSS: ${baseName}.css -> ${newFileName}`);
    } catch (error) {
      console.error(`Error processing core CSS file ${cssFile}:`, error);
    }
  }
  
  return coreCssMapping;
}

async function processCssFiles() {
  const cssFiles = await findCssFiles();
  const cssMapping = {};
  
  console.log(`Found ${cssFiles.length} CSS files to process`);
  
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
    
    const outputPath = path.join(config.cssOutputDir, newFileName);
    await fs.copyFile(cssFile, outputPath);
    
    const publicOutputPath = path.join(config.publicCssDir, newFileName);
    await fs.copyFile(cssFile, publicOutputPath);
    
    const originalRelativePath = path.relative(path.join(baseDir, '..'), cssFile).replace(/\\/g, '/');
    const newRelativePath = newFileName;
    
    cssMapping[originalRelativePath] = newRelativePath;
    console.log(`Processed: ${originalRelativePath} -> ${newRelativePath}`);
  }
  
  return cssMapping;
}

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

async function updateCssManager(coreCssMapping, cssMapping) {
  try {
    if (!config.cssManagerFile) {
      console.log('CSS Manager file not specified, skipping update');
      return false;
    }
    
    console.log(`Updating CSS Manager: ${config.cssManagerFile}`);
    
    const fileContent = await fs.readFile(config.cssManagerFile, 'utf8');
    
    const ast = acorn.parse(fileContent, { 
      ecmaVersion: 2020,
      sourceType: 'module'
    });
    
    let modified = false;
    
    walk.simple(ast, {
      ObjectExpression(node) {
        const isCssConfigObject = node.properties.some(prop => 
          prop.key && prop.key.type === 'Identifier' && 
          (prop.key.name === 'core' || prop.key.name === 'components')
        );
        
        if (isCssConfigObject) {
          node.properties.forEach(prop => {
            if (prop.key && prop.key.type === 'Identifier') {
              if (prop.key.name === 'core' && prop.value.type === 'ArrayExpression') {
                prop.value.elements.forEach((element, index) => {
                  if (element.type === 'Literal' && typeof element.value === 'string') {
                    const cssFile = `${element.value}.css`;
                    const hashedFile = coreCssMapping[cssFile];
                    
                    if (hashedFile) {
                      const newValue = hashedFile.replace(/\.css$/, '');
                      prop.value.elements[index].value = newValue;
                      modified = true;
                      console.log(`  Updated core CSS: "${element.value}" → "${newValue}"`);
                    }
                  }
                });
              }
              
              if (prop.key.name === 'components' && prop.value.type === 'ArrayExpression') {
                prop.value.elements.forEach((element, index) => {
                  if (element.type === 'Literal' && typeof element.value === 'string') {
                    const componentPath = `components/${element.value}.css`;
                    const hashedFile = cssMapping[componentPath];
                    
                    if (hashedFile) {
                      const newValue = hashedFile.replace(/\.css$/, '');
                      prop.value.elements[index].value = newValue;
                      modified = true;
                      console.log(`  Updated component CSS: "${element.value}" → "${newValue}"`);
                    }
                  }
                });
              }
            }
          });
        }
      }
    });
    
    if (modified) {
      const updatedCode = escodegen.generate(ast);
      await fs.writeFile(config.cssManagerFile, updatedCode, 'utf8');
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

async function cleanOriginalCssFiles() {
  console.log('Cleaning original CSS files from public directory...');
  
  try {
    for (const dir of [...config.cssSourceDirs, config.coreCssDir]) {
      const publicDir = path.join(config.publicCssDir, path.basename(dir));
      
      try {
        await fs.access(publicDir);
        await fs.rm(publicDir, { recursive: true, force: true });
        console.log(`Removed directory: ${publicDir}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error removing directory ${publicDir}:`, error);
        }
      }
    }
    
    for (const baseName of config.coreCssFiles) {
      const originalFile = path.join(config.publicCssDir, `${baseName}.css`);
      try {
        await fs.access(originalFile);
        await fs.unlink(originalFile);
        console.log(`Removed original file: ${originalFile}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error removing file ${originalFile}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning original CSS files:', error);
  }
}

async function main() {
  console.log('Starting pre-build CSS hashing process...');
  
  try {
    const coreCssMapping = await processCoreCssFiles();
    const cssMapping = await processCssFiles();
    const combinedMapping = { ...coreCssMapping, ...cssMapping };
    
    await updateJsFiles(combinedMapping);
    await updateCssManager(coreCssMapping, cssMapping);
    await cleanOriginalCssFiles();
    
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