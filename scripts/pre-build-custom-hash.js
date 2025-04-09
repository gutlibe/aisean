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
  // This is the target directory for hashed files (used by Vite build)
  cssOutputDir: path.join(projectRoot, 'assets/css'),
  jsSourceDirs: [
    path.join(projectRoot, 'assets/js/pages')
  ],
  cssManagerFile: path.join(projectRoot, 'assets/js/chunks/css-manager.js'),
  hashLength: 8,
  // Removed publicCssDir as we won't copy there anymore
};

async function calculateFileHash(filePath) {
  const fileContent = await fs.readFile(filePath);
  return crypto.createHash('sha1').update(fileContent).digest('hex').substring(0, config.hashLength);
}

function flattenPath(filePath, baseDir) {
  const relativePath = path.relative(baseDir, filePath);
  return relativePath.replace(/[\\/]/g, '_'); // More robust replacement
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
    if (error.code !== 'ENOENT') { // Ignore if dir doesn't exist yet
        console.error(`Error reading directory ${dir}:`, error);
    }
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

// --- Added ---
async function cleanOutputDirectory() {
  console.log(`Cleaning old hashed files from ${config.cssOutputDir}`);
  const hashPattern = new RegExp(`\\.[a-f0-9]{${config.hashLength}}\\.(css|js|map)$`, 'i');
  try {
    const entries = await fs.readdir(config.cssOutputDir, { withFileTypes: true });
    let cleanedCount = 0;
    for (const entry of entries) {
      // Only delete files matching the hash pattern directly in cssOutputDir
      if (entry.isFile() && hashPattern.test(entry.name)) {
        const filePath = path.join(config.cssOutputDir, entry.name);
        try {
          await fs.unlink(filePath);
          // console.log(`  Deleted: ${entry.name}`);
          cleanedCount++;
        } catch (unlinkError) {
          console.error(`  Error deleting ${filePath}:`, unlinkError);
        }
      }
    }
     console.log(`Cleaned ${cleanedCount} old hashed files.`);
  } catch (error) {
     if (error.code !== 'ENOENT') { // Ignore if dir doesn't exist
        console.error(`Error cleaning directory ${config.cssOutputDir}:`, error);
     } else {
        console.log(`Output directory ${config.cssOutputDir} does not exist, skipping cleaning.`);
     }
  }
}
// --- End Added ---

async function processCoreCssFiles() {
  const coreCssMapping = {};
  console.log(`Processing ${config.coreCssFiles.length} core CSS files`);
  await ensureDirectoryExists(config.cssOutputDir);

  for (const baseName of config.coreCssFiles) {
    const cssFile = path.join(config.coreCssDir, `${baseName}.css`);
    try {
      await fs.access(cssFile);
      const hash = await calculateFileHash(cssFile);
      const newFileName = `${baseName}.${hash}.css`;
      const outputPath = path.join(config.cssOutputDir, newFileName);

      // Copy only to assets/css/ (for Vite build input)
      await fs.copyFile(cssFile, outputPath);

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

  for (const cssFile of cssFiles) {
    try {
        const hash = await calculateFileHash(cssFile);
        const baseDir = config.cssSourceDirs.find(dir => cssFile.startsWith(dir));
        if (!baseDir) continue;

        const flattenedName = flattenPath(cssFile, baseDir);
        const extname = path.extname(flattenedName);
        const basename = path.basename(flattenedName, extname);
        const newFileName = `${basename}.${hash}${extname}`;

        // Copy only to assets/css/ (for Vite build input)
        const outputPath = path.join(config.cssOutputDir, newFileName);
        await fs.copyFile(cssFile, outputPath);

        const originalRelativePath = path.relative(path.join(baseDir, '..'), cssFile).replace(/\\/g, '/');
        const newRelativePath = newFileName; // The filename itself is the new path identifier

        cssMapping[originalRelativePath] = newRelativePath;
        console.log(`Processed: ${originalRelativePath} -> ${newRelativePath}`);
    } catch (error) {
        console.error(`Error processing CSS file ${cssFile}:`, error);
    }
  }
  return cssMapping;
}

async function updateJsFiles(cssMapping) {
  const jsFiles = await findJsFiles();
  let updatedCount = 0;
  console.log(`Found ${jsFiles.length} JS files to check`);

  const cssPathMap = new Map(Object.entries(cssMapping));
  // Create a secondary map to handle potential variations in how paths might be stored
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
        ecmaVersion: 2020, // Keep consistent with original
        sourceType: 'module'
      });

      walk.simple(ast, {
        AssignmentExpression(node) {
          if (node.left?.type === 'MemberExpression' &&
              node.left.property?.name === 'cssFiles' &&
              node.right?.type === 'ArrayExpression') {

            let hasChanges = false;
            node.right.elements = node.right.elements.map(element => { // Use map for cleaner update
              if (element.type === 'Literal' && typeof element.value === 'string') {
                const cssPath = element.value;
                // Check primary map first, then secondary variations
                let newPath = cssPathMap.get(cssPath) || secondaryMap.get(cssPath);

                if (newPath) {
                  console.log(`  In ${path.basename(jsFile)}: "${cssPath}" → "${newPath}"`);
                  hasChanges = true;
                  // Return a new Literal node with the updated value
                  return { ...element, value: newPath, raw: JSON.stringify(newPath) };
                }
              }
              return element; // Return unchanged element
            });

            if (hasChanges) {
              modified = true;
            }
          }
        }
      });

      if (modified) {
        // Regenerate code only if modifications occurred
        const updatedCode = escodegen.generate(ast, {
             format: { // Optional: Add some formatting options if needed
                indent: { style: '  ', base: 0 },
                semicolons: true,
             }
        });
        await fs.writeFile(jsFile, updatedCode, 'utf8');
        updatedCount++;
        console.log(`Updated JS file: ${jsFile}`);
      }
    } catch (error) {
      console.error(`Error processing JS file ${jsFile}:`, error);
      console.error("Original content snippet:", fileContent.substring(0, 200)); // Log snippet on error
    }
  }
  console.log(`Updated ${updatedCount} JS files with new CSS paths`);
  return updatedCount;
}

async function updateCssManager(coreCssMapping, cssMapping) {
    try {
        if (!config.cssManagerFile || !await fs.access(config.cssManagerFile).then(() => true).catch(() => false)) {
            console.log('CSS Manager file not specified or not found, skipping update.');
            return false;
        }

        console.log(`Updating CSS Manager: ${config.cssManagerFile}`);
        const fileContent = await fs.readFile(config.cssManagerFile, 'utf8');
        const ast = acorn.parse(fileContent, { ecmaVersion: 2020, sourceType: 'module' });
        let modified = false;

        walk.simple(ast, {
            ObjectExpression(node) {
                const isCssConfigObject = node.properties.some(prop =>
                    prop.key?.type === 'Identifier' && ['core', 'components', 'pages'].includes(prop.key.name) // Added 'pages' just in case
                );

                if (isCssConfigObject) {
                    node.properties.forEach(prop => {
                        if (prop.key?.type === 'Identifier' && prop.value?.type === 'ArrayExpression') {
                            const arrayName = prop.key.name; // 'core', 'components', 'pages'
                            let mappingSource = null;
                            let pathPrefix = '';

                            if (arrayName === 'core') {
                                mappingSource = coreCssMapping;
                            } else if (arrayName === 'components') {
                                mappingSource = cssMapping;
                                pathPrefix = 'components/';
                            } else if (arrayName === 'pages') { // Handle pages if needed
                                mappingSource = cssMapping;
                                pathPrefix = 'pages/';
                             }
                            // Add other types like 'pages' if they exist in your cssConfig

                            if (mappingSource) {
                                prop.value.elements = prop.value.elements.map(element => {
                                    if (element.type === 'Literal' && typeof element.value === 'string') {
                                        const originalValue = element.value;
                                        // Construct the key used in the mapping
                                        const mappingKey = arrayName === 'core'
                                            ? `${originalValue}.css`
                                            : `${pathPrefix}${originalValue}.css`;

                                        const hashedFile = mappingSource[mappingKey];

                                        if (hashedFile) {
                                            const newValue = hashedFile.replace(/\.css$/, ''); // Remove .css extension
                                            if (element.value !== newValue) {
                                                console.log(`  Updated ${arrayName} CSS: "${originalValue}" → "${newValue}"`);
                                                modified = true;
                                                return { ...element, value: newValue, raw: JSON.stringify(newValue) };
                                            }
                                        } else {
                                            console.warn(`  Warning: No mapping found for ${arrayName} CSS: "${originalValue}" (key: ${mappingKey})`);
                                        }
                                    }
                                    return element;
                                });
                            }
                        }
                    });
                }
            }
        });

        if (modified) {
            const updatedCode = escodegen.generate(ast, {
                format: { indent: { style: '  ', base: 0 }, semicolons: true }
            });
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


async function main() {
  console.log('Starting pre-build CSS hashing process...');
  try {
    // Clean the output directory first
    await cleanOutputDirectory();
    await ensureDirectoryExists(config.cssOutputDir); // Ensure it exists after cleaning potentially

    const coreCssMapping = await processCoreCssFiles();
    const cssMapping = await processCssFiles();
    const combinedMapping = { ...coreCssMapping, ...cssMapping };

    await updateJsFiles(cssMapping); // Pass only component/page mapping here as core isn't referenced this way
    await updateCssManager(coreCssMapping, cssMapping); // Pass both mappings here

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