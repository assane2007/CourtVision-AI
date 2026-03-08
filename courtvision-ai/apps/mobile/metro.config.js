const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Racine du projet mobile
const projectRoot = __dirname;
// Racine du mono-repo (2 niveaux au-dessus)
const workspaceRoot = path.resolve(projectRoot, '../..');
const localModules = path.resolve(projectRoot, 'node_modules');
const rootModules = path.resolve(workspaceRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// 1. Surveiller tous les fichiers du mono-repo (packages/* aussi)
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// 2. Ordre de résolution : d'abord local, puis racine du mono-repo
config.resolver.nodeModulesPaths = [localModules, rootModules];

// 3. Alias explicites
config.resolver.extraNodeModules = {
    '@courtvision/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
};

module.exports = config;
