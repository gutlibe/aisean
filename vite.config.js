import { defineConfig } from "vite"
import { resolve } from "path"
import stylelint from "vite-plugin-stylelint"
import fs from "fs"

// Simple plugin to create htaccess.txt in the build output
const createHtaccessTextPlugin = () => {
  return {
    name: "create-htaccess-text-plugin",
    closeBundle() {
      try {
        const htaccessPath = resolve(__dirname, ".htaccess")
        const destPath = resolve(__dirname, "dist", "htaccess.txt")

        // Ensure the destination directory exists
        if (!fs.existsSync(resolve(__dirname, "dist"))) {
          fs.mkdirSync(resolve(__dirname, "dist"), { recursive: true })
        }

        if (fs.existsSync(htaccessPath)) {
          // Copy the .htaccess content to htaccess.txt
          fs.copyFileSync(htaccessPath, destPath)
          console.log("htaccess.txt file successfully created in build output")
        } else {
          console.warn(".htaccess file not found in root directory")

          // Create a basic htaccess.txt file if the original doesn't exist
          const basicHtaccess = `# Basic .htaccess file
# You can edit this file and rename it to .htaccess

# Enable rewrite engine
RewriteEngine On

# Redirect all requests to index.html except for actual files and directories
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
`
          fs.writeFileSync(destPath, basicHtaccess)
          console.log("Created a basic htaccess.txt file in build output")
        }
      } catch (error) {
        console.error("Error creating htaccess.txt file:", error)
      }
    },
  }
}

// Plugin to copy images from assets/img to build output
const copyImagesPlugin = () => {
  return {
    name: "copy-images-plugin",
    closeBundle() {
      try {
        const sourceImgDir = resolve(__dirname, "assets/img")
        const destImgDir = resolve(__dirname, "dist/assets/img")

        // Ensure the destination directory exists
        if (!fs.existsSync(destImgDir)) {
          fs.mkdirSync(destImgDir, { recursive: true })
        }

        // Function to copy files recursively
        const copyFilesRecursively = (src, dest) => {
          if (!fs.existsSync(src)) {
            console.warn(`Source directory does not exist: ${src}`)
            return
          }

          const entries = fs.readdirSync(src, { withFileTypes: true })

          for (const entry of entries) {
            const srcPath = resolve(src, entry.name)
            const destPath = resolve(dest, entry.name)

            if (entry.isDirectory()) {
              // Create the directory if it doesn't exist
              if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true })
              }
              // Recursively copy files in subdirectory
              copyFilesRecursively(srcPath, destPath)
            } else {
              // Copy the file
              fs.copyFileSync(srcPath, destPath)
              console.log(`Copied image: ${entry.name}`)
            }
          }
        }

        copyFilesRecursively(sourceImgDir, destImgDir)
        console.log("All images copied to build output successfully")
      } catch (error) {
        console.error("Error copying images:", error)
      }
    },
  }
}

// Load CSS mapping
let cssMapping = {}
try {
  const mappingPath = resolve(__dirname, "css-mapping.json")
  if (fs.existsSync(mappingPath)) {
    cssMapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"))
  }
} catch (error) {
  console.warn("Could not load CSS mapping:", error)
}
const hashedCssFiles = new Set(Object.values(cssMapping))

export default defineConfig({
  root: ".",
  publicDir: "public",

  plugins: [
    stylelint({
      fix: false,
      quiet: false,
    }),
    createHtaccessTextPlugin(),
    copyImagesPlugin(), // Add the custom plugin to copy images
  ],

  build: {
    outDir: "dist",
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 0,

    minify: "terser",
    terserOptions: {
      compress: { passes: 2 },
      mangle: true,
      format: { comments: false },
    },

    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },

      output: {
        entryFileNames: "assets/js/[hash:20].js",
        chunkFileNames: "assets/js/[hash:20].js",

        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            if (hashedCssFiles.has(assetInfo.name)) {
              return "assets/css/[name]"
            }

            if (/\.[a-f0-9]{8}\.css$/.test(assetInfo.name)) {
              return "assets/css/[name]"
            }

            return "assets/css/[hash:20][extname]"
          }

          // Preserve image paths in assets/img
          if (assetInfo.name && /\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            if (assetInfo.name.includes("assets/img/")) {
              // Keep the original path structure for images in assets/img
              return "[name]"
            }
            return "assets/[ext]/[hash:20][extname]"
          }

          return "assets/[ext]/[hash:20][extname]"
        },
      },
    },
  },

  server: {
    open: true,
  },
})
