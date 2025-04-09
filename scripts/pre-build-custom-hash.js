#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import * as escodegen from 'escodegen';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const config = {
  // Main app CSS
  coreCssDir: path.join(projectRoot, 'assets/css'),
  coreCssFiles: ['base', 'theme', 'loader', 'page', 'menu'],
  cssSourceDirs: [
    path.join(projectRoot, 'assets/css/pages')
  ],
  cssOutputDir: path.join(projectRoot, 'assets/css'),
  
  // Login CSS
  loginCssDir: path.join(projectRoot, 'login/assets/css'),
  loginJsDir: path.join(projectRoot, 'login/assets/js'),
  loginOutputCssDir: path.join(projectRoot, 'login/assets/css'),
  loginOutputJsDir: path.join(projectRoot, 'login/assets/js'),
  
  // JS files to update
  jsSourceDirs: [
    path.join(projectRoot, 'assets/js/pages')
  ],
  
  // CSS Manager file to update
  cssManagerFile: path.join(projectRoot, 'assets/js/chunks/css-manager.js'),
  
  // Login HTML files that might reference CSS/JS
  loginHtmlFiles: [
    path.join(projectRoot, 'login/index.html'),
    path.join(projectRoot, 'login/reset.html'),
    path.join(projectRoot, 'login/register.html')
  ],
  
  hashLength: 16,
  publicCssDir: path.join(projectRoot, 'public/assets/css'),
  publicLoginDir: path.join(projectRoot, 'public/login')
};

async function calculateFileHash(filePath) {
  const fileContent = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileContent).digest('hex').substring(0, config.hashLength);
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

async function findLoginCssFiles() {
  const cssFiles = [];
  
  try {
    const entries = await fs.readdir(config.loginCssDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory() && entry.name.endsWith('.css')) {
        cssFiles.push(path.join(config.loginCssDir, entry.name));
      }
    }
  } catch (error) {
    console.error(`Error reading login CSS directory: ${error}`);
  }
  
  return cssFiles;
}

async function findLoginJsFiles() {
  const jsFiles = [];
  
  try {
    const entries = await fs.readdir(config.loginJsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory() && entry.name.endsWith('.js')) {
        jsFiles.push(path.join(config.loginJsDir, entry.name));
      }
    }
  } catch (error) {
    console.error(`Error reading login JS directory: ${error}`);
  }
  
  return jsFiles;
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
      const newFileName = `${hash}.css`;
      
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
    
    const newFileName = `${hash}.css`;
    
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

async function processLoginCssFiles() {
  const cssFiles = await findLoginCssFiles();
  const cssMapping = {};
  
  console.log(`Found ${cssFiles.length} login CSS files to process`);
  
  await ensureDirectoryExists(config.loginOutputCssDir);
  
  for (const cssFile of cssFiles) {
    const originalName = path.basename(cssFile);
    const hash = await calculateFileHash(cssFile);
    const newFileName = `${hash}.css`;
    
    const outputPath = path.join(config.loginOutputCssDir, newFileName);
    await fs.copyFile(cssFile, outputPath);
    
    cssMapping[originalName] = newFileName;
    console.log(`Processed login CSS: ${originalName} -> ${newFileName}`);
  }
  
  return cssMapping;
}

async function processLoginJsFiles() {
  const jsFiles = await findLoginJsFiles();
  const jsMapping = {};
  
  console.log(`Found ${jsFiles.length} login JS files to process`);
  
  await ensureDirectoryExists(config.loginOutputJsDir);
  
  for (const jsFile of jsFiles) {
    const originalName = path.basename(jsFile);
    const hash = await calculateFileHash(jsFile);
    const newFileName = `${hash}.js`;
    
    const outputPath = path.join(config.loginOutputJsDir, newFileName);
    await fs.copyFile(jsFile, outputPath);
    
    jsMapping[originalName] = newFileName;
    console.log(`Processed login JS: ${originalName} -> ${newFileName}`);
  }
  
  return jsMapping;
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

async function updateLoginHtmlFiles(cssMapping, jsMapping) {
  let updatedCount = 0;
  
  for (const htmlFile of config.loginHtmlFiles) {
    try {
      await fs.access(htmlFile);
      
      let content = await fs.readFile(htmlFile, 'utf8');
      let modified = false;
      
      // Update CSS references
      for (const [originalName, newName] of Object.entries(cssMapping)) {
        const cssPattern = new RegExp(`(href=["'])assets/css/${originalName}(["'])`, 'g');
        if (cssPattern.test(content)) {
          content = content.replace(cssPattern, `$1assets/css/${newName}$2`);
          modified = true;
          console.log(`  In ${path.basename(htmlFile)}: CSS "${originalName}" → "${newName}"`);
        }
      }
      
      // Update JS references
      for (const [originalName, newName] of Object.entries(jsMapping)) {
        const jsPattern = new RegExp(`(src=["'])assets/js/${originalName}(["'])`, 'g');
        if (jsPattern.test(content)) {
          content = content.replace(jsPattern, `$1assets/js/${newName}$2`);
          modified = true;
          console.log(`  In ${path.basename(htmlFile)}: JS "${originalName}" → "${newName}"`);
        }
      }
      
      if (modified) {
        await fs.writeFile(htmlFile, content, 'utf8');
        updatedCount++;
        console.log(`Updated HTML file: ${htmlFile}`);
      }
    } catch (error) {
      console.error(`Error processing HTML file ${htmlFile}:`, error);
    }
  }
  
  console.log(`Updated ${updatedCount} login HTML files`);
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
                    const componentPath = `pages/${element.value}.css`;
                    const hashedFile = cssMapping[componentPath];
                    
                    if (hashedFile) {
                      const newValue = hashedFile.replace(/\.css$/, '');
                      prop.value.elements[index].value = newValue;
                      modified = true;
                      console.log(`  Updated page CSS: "${element.value}" → "${newValue}"`);
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
    for (const dir of config.cssSourceDirs) {
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
    
    const componentsDir = path.join(config.publicCssDir, 'components');
    try {
      await fs.access(componentsDir);
      await fs.rm(componentsDir, { recursive: true, force: true });
      console.log(`Removed components directory: ${componentsDir}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Error removing components directory: ${error}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning original CSS files:', error);
  }
}

async function cleanOriginalLoginFiles() {
  console.log('Cleaning original login CSS and JS files...');
  
  try {
    // Get list of all CSS files in login directory
    const cssFiles = await findLoginCssFiles();
    for (const cssFile of cssFiles) {
      const fileName = path.basename(cssFile);
      if (!/^[a-f0-9]{16}\.css$/.test(fileName)) {
        try {
          await fs.unlink(cssFile);
          console.log(`Removed original login CSS file: ${fileName}`);
        } catch (error) {
          console.error(`Error removing file ${cssFile}:`, error);
        }
      }
    }
    
    // Get list of all JS files in login directory
    const jsFiles = await findLoginJsFiles();
    for (const jsFile of jsFiles) {
      const fileName = path.basename(jsFile);
      if (!/^[a-f0-9]{16}\.js$/.test(fileName)) {
        try {
          await fs.unlink(jsFile);
          console.log(`Removed original login JS file: ${fileName}`);
        } catch (error) {
          console.error(`Error removing file ${jsFile}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning original login files:', error);
  }
}

async function minifyLoginCssFiles() {
  console.log('Minifying login CSS files...');
  
  try {
    const cssDir = config.loginOutputCssDir;
    const entries = await fs.readdir(cssDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory() && entry.name.endsWith('.css') && /^[a-f0-9]{16}\.css$/.test(entry.name)) {
        const cssFile = path.join(cssDir, entry.name);
        
        try {
          // Use lightningcss to minify the file in place
          const command = `npx lightningcss --minify --targets '>= 0.25%' "${cssFile}" -o "${cssFile}"`;
          execSync(command, { stdio: 'inherit' });
          console.log(`Minified login CSS file: ${entry.name}`);
        } catch (error) {
          console.error(`Error minifying CSS file ${cssFile}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error minifying login CSS files:', error);
  }
}

async function minifyLoginJsFiles() {
  console.log('Minifying login JS files...');
  
  try {
    const jsDir = config.loginOutputJsDir;
    const entries = await fs.readdir(jsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory() && entry.name.endsWith('.js') && /^[a-f0-9]{16}\.js$/.test(entry.name)) {
        const jsFile = path.join(jsDir, entry.name);
        
        try {
          // Use terser to minify the file in place
          const command = `npx terser "${jsFile}" --compress --mangle --output "${jsFile}"`;
          execSync(command, { stdio: 'inherit' });
          console.log(`Minified login JS file: ${entry.name}`);
        } catch (error) {
          console.error(`Error minifying JS file ${jsFile}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error minifying login JS files:', error);
  }
}

async function main() {
  console.log('Starting pre-build CSS and JS hashing process...');
  
  try {
    // Process main app CSS
    const coreCssMapping = await processCoreCssFiles();
    const cssMapping = await processCssFiles();
    const combinedMapping = { ...coreCssMapping, ...cssMapping };
    
    // Process login CSS and JS
    const loginCssMapping = await processLoginCssFiles();
    const loginJsMapping = await processLoginJsFiles();
    
    // Update references
    await updateJsFiles(combinedMapping);
    await updateCssManager(coreCssMapping, cssMapping);
    await updateLoginHtmlFiles(loginCssMapping, loginJsMapping);
    
    // Minify login files
    await minifyLoginCssFiles();
    await minifyLoginJsFiles();
    
    // Clean up original files
    await cleanOriginalCssFiles();
    await cleanOriginalLoginFiles();
    
    // Save mappings for reference
    await fs.writeFile(
      path.join(projectRoot, 'css-mapping.json'), 
      JSON.stringify(combinedMapping, null, 2), 
      'utf8'
    );
    
    await fs.writeFile(
      path.join(projectRoot, 'login-mapping.json'), 
      JSON.stringify({
        css: loginCssMapping,
        js: loginJsMapping
      }, null, 2), 
      'utf8'
    );
    
    console.log('Pre-build CSS and JS hashing completed successfully!');
  } catch (error) {
    console.error('Error during pre-build process:', error);
    process.exit(1);
  }
}

main();
