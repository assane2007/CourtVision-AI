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

// 4. Resolve request overrides — prevent Node.js-only modules from being bundled.
//    @supabase/realtime-js imports "ws" which imports Node's "stream".
//    React Native has a global WebSocket, so ws/stream aren't needed at runtime.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Return empty module for Node-only packages
    if (moduleName === 'stream' || moduleName === 'ws' || moduleName.startsWith('ws/')) {
        return { type: 'empty' };
    }
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
