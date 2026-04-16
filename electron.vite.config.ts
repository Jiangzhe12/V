import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function electronRendererHtmlPlugin(): Plugin {
  return {
    name: 'electron-renderer-html',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/ crossorigin/g, '')
        .replace(/<script type="module"/g, '<script defer')
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron-store'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          clipboard: resolve(__dirname, 'src/renderer/clipboard.html'),
          screenshot: resolve(__dirname, 'src/renderer/screenshot.html'),
          pin: resolve(__dirname, 'src/renderer/pin.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), electronRendererHtmlPlugin()]
  }
})
