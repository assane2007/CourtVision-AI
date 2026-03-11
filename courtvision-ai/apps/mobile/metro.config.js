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

// 4. Resolve request overrides:
//    - Force ALL react/react-dom to local (19.1.0) — root monorepo has 18.2.0
//      which causes duplicate React and "Invalid Hook Call" errors on web
//    - Prevent Node.js-only modules from being bundled
//    - Force zustand CJS on web (ESM build uses import.meta which Metro doesn't support)
const reactForceMap = {
    'react': path.resolve(localModules, 'react', 'index.js'),
    'react/jsx-runtime': path.resolve(localModules, 'react', 'jsx-runtime.js'),
    'react/jsx-dev-runtime': path.resolve(localModules, 'react', 'jsx-dev-runtime.js'),
    'react-dom': path.resolve(localModules, 'react-dom', 'index.js'),
    'react-dom/client': path.resolve(localModules, 'react-dom', 'client.js'),
};

const zustandRoot = path.dirname(require.resolve('zustand/package.json', { paths: [localModules, rootModules] }));
const zustandCjsMap = {
    'zustand': path.join(zustandRoot, 'index.js'),
    'zustand/vanilla': path.join(zustandRoot, 'vanilla.js'),
    'zustand/middleware': path.join(zustandRoot, 'middleware.js'),
    'zustand/middleware/immer': path.join(zustandRoot, 'middleware', 'immer.js'),
    'zustand/shallow': path.join(zustandRoot, 'shallow.js'),
    'zustand/react': path.join(zustandRoot, 'react.js'),
    'zustand/react/shallow': path.join(zustandRoot, 'react', 'shallow.js'),
    'zustand/traditional': path.join(zustandRoot, 'traditional.js'),
    'zustand/context': path.join(zustandRoot, 'context.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Return empty module for Node-only packages
    if (moduleName === 'stream' || moduleName === 'ws' || moduleName.startsWith('ws/')) {
        return { type: 'empty' };
    }
    // On web: stub out @react-three/* and react-reconciler (they depend on
    // React 18 internals and aren't needed for web rendering)
    if (platform === 'web' && (
        moduleName.startsWith('@react-three/') ||
        moduleName === 'react-reconciler' ||
        moduleName.startsWith('react-reconciler/') ||
        moduleName === 'three' ||
        moduleName.startsWith('three/')
    )) {
        return { type: 'empty' };
    }
    // Force react/react-dom to local node_modules (React 19)
    // This prevents the monorepo root React 18 from being bundled
    if (reactForceMap[moduleName]) {
        return { type: 'sourceFile', filePath: reactForceMap[moduleName] };
    }
    // Force zustand CJS on web to avoid import.meta.env SyntaxError
    if (platform === 'web' && zustandCjsMap[moduleName]) {
        return { type: 'sourceFile', filePath: zustandCjsMap[moduleName] };
    }
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
