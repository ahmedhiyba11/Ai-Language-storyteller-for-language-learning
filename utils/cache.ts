import { type Story, type CachedStoryItem } from '../types';

const DB_NAME = 'ai-story-cache';
const DB_VERSION = 2; // Version bumped to update schema
const STORE_NAME = 'stories';

let db: IDBDatabase | null = null;

function getDb(): Promise<IDBDatabase> {
    if (db) {
        return Promise.resolve(db);
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening IndexedDB.');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            // If the old store exists, remove it to create a new one without a keyPath
            if (dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.deleteObjectStore(STORE_NAME);
            }
            // Create the new store without a keyPath, allowing us to use any string as a key
            dbInstance.createObjectStore(STORE_NAME);
        };
    });
}

/**
 * Saves a generated story to the IndexedDB cache.
 * @param key A unique key identifying the story configuration.
 * @param item The complete cached story item to save.
 */
export async function saveStoryToCache(key: string, item: CachedStoryItem): Promise<void> {
    try {
        const db = await getDb();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(item, key); // Use the explicit key
    } catch (error) {
        console.error('Failed to save story to cache. The app will still function.', error);
    }
}

/**
 * Retrieves a story from the IndexedDB cache for a given key.
 * @param key The unique key of the story to look up.
 * @returns The cached CachedStoryItem object, or null if not found or if an error occurs.
 */
export async function getStoryFromCache(key: string): Promise<CachedStoryItem | null> {
    try {
        const db = await getDb();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key); // Use the explicit key

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    resolve(result as CachedStoryItem);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => {
                console.error('Failed to get story from cache:', request.error);
                resolve(null); // Treat errors as a cache miss
            };
        });
    } catch (error) {
        console.error('Failed to connect to cache DB:', error);
        return null; // Treat DB connection errors as a cache miss
    }
}