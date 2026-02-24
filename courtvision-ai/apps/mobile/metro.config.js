const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Racine du projet mobile
const projectRoot = __dirname;
// Racine du mono-repo (2 niveaux au-dessus)
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Surveiller tous les fichiers du mono-repo (packages/* aussi)
//    On conserve les watchFolders par défaut d'Expo au lieu de les écraser
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// 2. Ordre de résolution : d'abord local, puis racine du mono-repo
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Résoudre @courtvision/shared directement depuis le source TypeScript
//    (évite d'avoir à lancer `build:shared` manuellement)
config.resolver.extraNodeModules = {
    '@courtvision/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
};

// 4. Désactiver le resolver "unstable_enablePackageExports" qui peut
//    causer des conflits dans les workspaces npm
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
