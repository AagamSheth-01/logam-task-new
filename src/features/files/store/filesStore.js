/**
 * Files Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useFilesStore = create(
  devtools(
    (set, get) => ({
      files: [],
      selectedFile: null,
      loading: false,
      error: null,
      uploadProgress: 0,
      filters: {
        clientId: null,
        fileType: null,
        search: null
      },

      setFiles: (files) => set({ files }),
      setSelectedFile: (file) => set({ selectedFile: file }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setUploadProgress: (progress) => set({ uploadProgress: progress }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      addFile: (file) => set((state) => ({
        files: [file, ...state.files]
      })),

      updateFileInList: (fileId, updates) => set((state) => ({
        files: state.files.map(f => f.id === fileId ? { ...f, ...updates } : f)
      })),

      removeFile: (fileId) => set((state) => ({
        files: state.files.filter(f => f.id !== fileId)
      })),

      reset: () => set({
        files: [],
        selectedFile: null,
        error: null,
        uploadProgress: 0
      })
    }),
    { name: 'Files Store' }
  )
);

export default useFilesStore;
