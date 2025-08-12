import { useState, useEffect, useCallback } from 'react';
import {
  saveToIndexedDB,
  getAllFromIndexedDB,
  getByIdFromIndexedDB,
  deleteFromIndexedDB,
  savePendingAction,
  STORES
} from '../utils/offlineStorage';

/**
 * Custom hook for managing offline data with IndexedDB
 * @param storeName The IndexedDB store to use
 */
const useOfflineData = <T extends { id: string | number }>(storeName: string) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load all data from the store
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAllFromIndexedDB<T>(storeName);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
      console.error('Error loading offline data:', err);
    } finally {
      setLoading(false);
    }
  }, [storeName]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save data to the store
  const saveData = useCallback(async (itemData: T | T[]) => {
    try {
      await saveToIndexedDB<T>(storeName, itemData);
      await loadData(); // Reload data after saving
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save data'));
      console.error('Error saving offline data:', err);
      return false;
    }
  }, [storeName, loadData]);

  // Get a specific item by ID
  const getById = useCallback(async (id: string | number) => {
    try {
      return await getByIdFromIndexedDB<T>(storeName, id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get item'));
      console.error('Error getting offline item:', err);
      return null;
    }
  }, [storeName]);

  // Delete an item
  const deleteItem = useCallback(async (id: string | number) => {
    try {
      await deleteFromIndexedDB(storeName, id);
      await loadData(); // Reload data after deletion
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete item'));
      console.error('Error deleting offline item:', err);
      return false;
    }
  }, [storeName, loadData]);

  // Save a pending action for when the app is back online
  const savePending = useCallback(async (actionType: string, actionData: any, apiDetails?: { url: string, method: string }) => {
    try {
      await savePendingAction({
        type: actionType,
        data: actionData,
        url: apiDetails?.url,
        method: apiDetails?.method || 'POST'
      });
      return true;
    } catch (err) {
      console.error('Error saving pending action:', err);
      return false;
    }
  }, []);

  // Check if we're online
  const isOnline = useCallback(() => {
    return navigator.onLine;
  }, []);

  return {
    data,
    loading,
    error,
    loadData,
    saveData,
    getById,
    deleteItem,
    savePending,
    isOnline
  };
};

export default useOfflineData;