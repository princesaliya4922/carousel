import { terser } from "rollup-plugin-terser";

export default {
  input: 'src/index.js', // your source entry point
  output: [
    {
      file: 'dist/swipix.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/swipix.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/swipix.umd.js',
      format: 'umd',
      name: 'Swipix',
      sourcemap: true,
      plugins: [terser()] // minify UMD build
    }
  ],
  plugins: [terser()] // optional: minify all outputs if desired
};
