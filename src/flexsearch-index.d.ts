declare module 'flexsearch/dist/module/index' {
  import { Index } from 'flexsearch';

  const FlexSearchIndexConstructor: typeof Index;
  export default FlexSearchIndexConstructor;
}
