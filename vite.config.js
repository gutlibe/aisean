import { defineConfig } from 'vite';
import { resolve } from 'path';
import stylelint from 'vite-plugin-stylelint';
import fs from 'fs';

// Simple plugin to create htaccess.txt in the build output
const createHtaccessTextPlugin = () => {
  return {
    name: 'create-htaccess-text-plugin',
    closeBundle() {
      try {
        const htaccessPath = resolve(__dirname, '.htaccess');
        const destPath = resolve(__dirname, 'dist', 'htaccess.txt');
        
        // Ensure the destination directory exists
        if (!fs.existsSync(resolve(__dirname, 'dist'))) {
          fs.mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
        }
        
        if (fs.existsSync(htaccessPath)) {
          // Copy the .htaccess content to htaccess.txt
          fs.copyFileSync(htaccessPath, destPath);
          console.log('htaccess.txt file successfully created in build output');
        } else {
          console.warn('.htaccess file not found in root directory');
          
          // Create a basic htaccess.txt file if the original doesn't exist
          const basicHtaccess = `# Basic .htaccess file
# You can edit this file and rename it to .htaccess

# Enable rewrite engine
RewriteEngine On

# Redirect all requests to index.html except for actual files and directories
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
`;
          fs.writeFileSync(destPath, basicHtaccess);
          console.log('Created a basic htaccess.txt file in build output');
        }
      } catch (error) {
        console.error('Error creating htaccess.txt file:', error);
      }
    }
  };
};

// Load CSS mapping
let cssMapping = {};
try {
  const mappingPath = resolve(__dirname, 'css-mapping.json');
  if (fs.existsSync(mappingPath)) {
    cssMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  }
} catch (error) {
  console.warn('Could not load CSS mapping:', error);
}
const hashedCssFiles = new Set(Object.values(cssMapping));

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  plugins: [
    stylelint({
      fix: false,
      quiet: false,
    }),
    createHtaccessTextPlugin() // Add the custom plugin
  ],
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2 },
      mangle: true,
      format: { comments: false },
    },
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      
      output: {
        entryFileNames: 'assets/js/[hash:20].js',
        chunkFileNames: 'assets/js/[hash:20].js',
        
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            if (hashedCssFiles.has(assetInfo.name)) {
              return 'assets/css/[name]';
            }
            
            if (/\.[a-f0-9]{8}\.css$/.test(assetInfo.name)) {
              return 'assets/css/[name]';
            }
            
            return 'assets/css/[hash:20][extname]';
          }
          
          return 'assets/[ext]/[hash:20][extname]';
        },
      },
    }
  },
  
  server: {
    open: true
  }
});

console.log("Updated Vite config to create htaccess.txt in build output");