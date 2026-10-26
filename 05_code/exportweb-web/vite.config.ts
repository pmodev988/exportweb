import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({plugins:[vue()],base:'/workspace/',build:{outDir:'../../21_client/exportweb-web',emptyOutDir:true,sourcemap:false}});
