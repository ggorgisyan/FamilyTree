import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = process.env.VITE_REPO_NAME || 'FamilyTree'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/',
})
