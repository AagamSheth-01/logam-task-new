/**
 * useFiles Hook
 */

import { useEffect, useCallback } from 'react';
import useFilesStore from '../store/filesStore.js';
import filesApi from '../api/filesApi.js';

export function useFiles(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    files,
    loading,
    error,
    filters,
    uploadProgress,
    setFiles,
    setLoading,
    setError,
    setFilters,
    setUploadProgress,
    addFile: addFileToStore,
    updateFileInList,
    removeFile: removeFileFromStore
  } = useFilesStore();

  const loadFiles = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await filesApi.getFiles(mergedFilters);

      if (response.success) {
        setFiles(response.files || response.data || []);
      }
    } catch (err) {
      console.error('Error loading files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setFiles, setLoading, setError]);

  const uploadFile = useCallback(async (fileData) => {
    try {
      setUploadProgress(0);
      const result = await filesApi.uploadFile(fileData);
      if (result.success) {
        addFileToStore(result.file || result.data);
      }
      setUploadProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      setUploadProgress(0);
      throw err;
    }
  }, [addFileToStore, setError, setUploadProgress]);

  const updateFile = useCallback(async (fileId, updates) => {
    try {
      const result = await filesApi.updateFile(fileId, updates);
      if (result.success) {
        updateFileInList(fileId, updates);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateFileInList, setError]);

  const deleteFile = useCallback(async (fileId) => {
    try {
      const result = await filesApi.deleteFile(fileId);
      if (result.success) {
        removeFileFromStore(fileId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeFileFromStore, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadFiles(initialFilters);
    }
  }, [autoLoad]);

  return {
    files,
    loading,
    error,
    filters,
    uploadProgress,
    loadFiles,
    uploadFile,
    updateFile,
    deleteFile,
    setFilters
  };
}

export default useFiles;
