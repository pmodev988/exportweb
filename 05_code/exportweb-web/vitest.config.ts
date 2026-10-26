import {defineConfig} from 'vitest/config';
import vue from '@vitejs/plugin-vue';
export default defineConfig({plugins:[vue()],ssr:{noExternal:['element-plus','@popperjs/core']},test:{environment:'jsdom',setupFiles:['./test/setup.ts'],testTimeout:15000}});
