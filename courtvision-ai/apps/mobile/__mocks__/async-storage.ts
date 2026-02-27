// Mock for @react-native-async-storage/async-storage
let store: Record<string, string> = {}

function _setItem(key: string, value: string) { store[key] = value; return Promise.resolve() }
function _getItem(key: string) { return Promise.resolve(store[key] ?? null) }
function _removeItem(key: string) { delete store[key]; return Promise.resolve() }
function _multiGet(keys: string[]) { return Promise.resolve(keys.map(k => [k, store[k] ?? null])) }
function _multiSet(pairs: [string, string][]) { pairs.forEach(([k, v]) => { store[k] = v }); return Promise.resolve() }
function _multiRemove(keys: string[]) { keys.forEach(k => { delete store[k] }); return Promise.resolve() }
function _getAllKeys() { return Promise.resolve(Object.keys(store)) }
function _clear() { Object.keys(store).forEach(k => { delete store[k] }); return Promise.resolve() }

const AsyncStorage = {
    setItem: jest.fn(_setItem),
    getItem: jest.fn(_getItem),
    removeItem: jest.fn(_removeItem),
    multiGet: jest.fn(_multiGet),
    multiSet: jest.fn(_multiSet),
    multiRemove: jest.fn(_multiRemove),
    getAllKeys: jest.fn(_getAllKeys),
    clear: jest.fn(_clear),
    /** Reset internal store and restore mock implementations */
    __resetStore: () => {
        store = {}
        AsyncStorage.setItem.mockImplementation(_setItem)
        AsyncStorage.getItem.mockImplementation(_getItem)
        AsyncStorage.removeItem.mockImplementation(_removeItem)
        AsyncStorage.multiGet.mockImplementation(_multiGet)
        AsyncStorage.multiSet.mockImplementation(_multiSet)
        AsyncStorage.multiRemove.mockImplementation(_multiRemove)
        AsyncStorage.getAllKeys.mockImplementation(_getAllKeys)
        AsyncStorage.clear.mockImplementation(_clear)
    },
}
export default AsyncStorage
