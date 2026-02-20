/**
 * Users Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useUsersStore = create(
  devtools(
    (set) => ({
      users: [],
      selectedUser: null,
      loading: false,
      error: null,

      setUsers: (users) => set({ users }),
      setSelectedUser: (user) => set({ selectedUser: user }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      addUser: (user) => set((state) => ({
        users: Array.isArray(state.users)
          ? [user, ...state.users]
          : [user]
      })),

      updateUserInList: (userId, updates) => set((state) => {
        if (!Array.isArray(state.users)) return { users: [] };

        const updatedUsers = state.users.map(u =>
          u.id === userId ? { ...u, ...updates } : u
        );

        return { users: updatedUsers };
      }),

      removeUser: (userId) => set((state) => ({
        users: Array.isArray(state.users)
          ? state.users.filter(u => u.id !== userId)
          : []
      })),

      reset: () => set({
        users: [],
        selectedUser: null,
        error: null
      })
    }),
    { name: 'Users Store' }
  )
);

export default useUsersStore;
