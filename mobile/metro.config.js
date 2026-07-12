const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  '@': path.resolve(__dirname, './src'),
};

config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'svg'];
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

module.exports = config;