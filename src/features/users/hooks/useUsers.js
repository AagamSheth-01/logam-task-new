/**
 * useUsers Hook
 */

import { useEffect, useCallback } from 'react';
import useUsersStore from '../store/usersStore.js';
import usersApi from '../api/usersApi.js';

export function useUsers(options = {}) {
  const { autoLoad = true } = options;

  const {
    users,
    loading,
    error,
    setUsers,
    setLoading,
    setError,
    addUser: addUserToStore,
    updateUserInList,
    removeUser: removeUserFromStore
  } = useUsersStore();

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await usersApi.getUsers();
      if (response.success) {
        // Handle nested data structure from API response
        if (response.data && response.data.users) {
          setUsers(response.data.users);
        } else {
          setUsers(response.users || response.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setUsers, setLoading, setError]);

  const createUser = useCallback(async (userData) => {
    try {
      const result = await usersApi.createUser(userData);
      if (result.success) {
        // Handle nested response structure: result.data.user
        const newUser = result.data?.user || result.user || result.data;
        if (newUser) {
          addUserToStore(newUser);
        }
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [addUserToStore, setError]);

  const updateUser = useCallback(async (userId, updates) => {
    try {
      const result = await usersApi.updateUser(userId, updates);

      if (result.success) {
        // Handle response: API returns updated user or just success
        const updatedUser = result.data?.user || result.user;

        if (updatedUser) {
          // Use the full updated user from API response
          updateUserInList(userId, updatedUser);
        } else {
          // Fallback: merge the updates with existing data
          updateUserInList(userId, updates);
        }
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateUserInList, setError]);

  const deleteUser = useCallback(async (userId) => {
    try {
      const result = await usersApi.deleteUser(userId);
      if (result.success) {
        removeUserFromStore(userId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeUserFromStore, setError]);

  useEffect(() => {
    if (autoLoad) {
      loadUsers();
    }
  }, [autoLoad, loadUsers]);

  return {
    users,
    loading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    updateUserInList
  };
}

export default useUsers;
