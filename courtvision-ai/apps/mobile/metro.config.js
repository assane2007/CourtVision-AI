const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

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

// 4. Forcer expo-font vers la version locale SDK 51 (v12).
//    Le root node_modules contient expo-font@14 (SDK53) qui n'a pas registerWebModule
//    en expo-modules-core v1.x, causant une erreur au runtime web.
const localExpoFont = path.join(localModules, 'expo-font');

config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Intercepter tout require de expo-font (package ou sous-chemin)
    if (
        fs.existsSync(localExpoFont) &&
        (moduleName === 'expo-font' || moduleName.startsWith('expo-font/'))
    ) {
        return context.resolveRequest(
            { ...context, originModulePath: path.join(localExpoFont, 'package.json') },
            moduleName,
            platform
        );
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
