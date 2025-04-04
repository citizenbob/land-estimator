// your tokens file path
const config = {
  source: ['src/tokens/tokens.json'],
  customFormats: {
    'css/variables': (dictionary) => {
      return (
        ':root {\n' +
        dictionary.allProperties
          .map((prop) => `  --${prop.path.join('-')}: ${prop.value};`)
          .join('\n') +
        '\n}'
      );
    }
  },
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/tokens/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables'
        }
      ]
    }
  }
};

export default config;
