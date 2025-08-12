/**
 * Utility for managing offline data storage using IndexedDB
 */

// Define database name and version
const DB_NAME = 'free-state-offline-db';
const DB_VERSION = 1;

// Define store names
const STORES = {
  PROJECTS: 'projects',
  COMPANIES: 'companies',
  PLACES: 'places',
  PENDING_ACTIONS: 'pendingActions'
};

// Open database connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.COMPANIES)) {
        db.createObjectStore(STORES.COMPANIES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.PLACES)) {
        db.createObjectStore(STORES.PLACES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_ACTIONS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        pendingStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
};

/**
 * Save data to IndexedDB
 * @param storeName The name of the object store
 * @param data The data to save
 */
export const saveToIndexedDB = async <T>(storeName: string, data: T | T[]): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Handle both single items and arrays
    if (Array.isArray(data)) {
      for (const item of data) {
        store.put(item);
      }
    } else {
      store.put(data);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = (event) => {
        reject(tx.error);
      };
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get all data from an object store
 * @param storeName The name of the object store
 */
export const getAllFromIndexedDB = async <T>(storeName: string): Promise<T[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    return [];
  }
};

/**
 * Get a specific item by ID
 * @param storeName The name of the object store
 * @param id The ID of the item to get
 */
export const getByIdFromIndexedDB = async <T>(storeName: string, id: string | number): Promise<T | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result as T || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    return null;
  }
};

/**
 * Delete an item from IndexedDB
 * @param storeName The name of the object store
 * @param id The ID of the item to delete
 */
export const deleteFromIndexedDB = async (storeName: string, id: string | number): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Clear all data from an object store
 * @param storeName The name of the object store
 */
export const clearIndexedDBStore = async (storeName: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Save a pending action to be processed when online
 * @param action The action to save
 */
export const savePendingAction = async (action: {
  type: string;
  data: any;
  url?: string;
  method?: string;
}): Promise<void> => {
  const pendingAction = {
    ...action,
    timestamp: Date.now(),
    processed: false
  };

  await saveToIndexedDB(STORES.PENDING_ACTIONS, pendingAction);
};

/**
 * Get all pending actions
 */
export const getPendingActions = async () => {
  return getAllFromIndexedDB(STORES.PENDING_ACTIONS);
};

/**
 * Mark a pending action as processed
 * @param id The ID of the pending action
 */
export const markPendingActionProcessed = async (id: number): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PENDING_ACTIONS, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_ACTIONS);
    
    const request = store.get(id);
    
    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        data.processed = true;
        store.put(data);
      }
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch (error) {
    throw error;
  }
};

// Export store names for use in components
export { STORES };