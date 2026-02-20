/**
 * User Management Hook
 * MVC Pattern implementation for user management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import httpClient from '../src/shared/api/httpClient';

const useUserManagementStore = create(
  persist(
    (set, get) => ({
      // State
      users: [],
      loading: false,
      error: null,
      success: null,
      lastUpdated: null,

      // Modal states
      showCreateModal: false,
      showEditModal: false,
      showDeleteModal: false,
      showResetPasswordModal: false,

      // Selected data
      userToEdit: null,
      userToDelete: null,
      userToResetPassword: null,

      // Form data
      newUser: {
        username: '',
        email: '',
        password: '',
        role: 'user'
      },
      editUser: {
        id: '',
        username: '',
        email: '',
        role: 'user',
        password: ''
      },
      resetPassword: '',

      // UI states
      showPassword: false,
      showEditPassword: false,
      showResetPassword: false,

      // Cache duration: 5 minutes
      CACHE_DURATION: 5 * 60 * 1000,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, success: null }),
      setSuccess: (success) => set({ success, error: null }),

      // Clear messages
      clearMessages: () => set({ error: null, success: null }),

      // Modal actions
      openCreateModal: () => set({
        showCreateModal: true,
        error: null,
        success: null,
        newUser: { username: '', email: '', password: '', role: 'user' }
      }),
      closeCreateModal: () => set({ showCreateModal: false, error: null }),

      openEditModal: (user) => set({
        showEditModal: true,
        userToEdit: user,
        editUser: {
          id: user.id,
          username: user.username,
          email: user.email || '',
          role: user.role,
          password: ''
        },
        error: null,
        success: null
      }),
      closeEditModal: () => set({
        showEditModal: false,
        userToEdit: null,
        editUser: { id: '', username: '', email: '', role: 'user', password: '' },
        error: null
      }),

      openDeleteModal: (user) => set({
        showDeleteModal: true,
        userToDelete: user,
        error: null,
        success: null
      }),
      closeDeleteModal: () => set({
        showDeleteModal: false,
        userToDelete: null,
        error: null
      }),

      openResetPasswordModal: (user) => set({
        showResetPasswordModal: true,
        userToResetPassword: user,
        resetPassword: '',
        error: null,
        success: null
      }),
      closeResetPasswordModal: () => set({
        showResetPasswordModal: false,
        userToResetPassword: null,
        resetPassword: '',
        error: null
      }),

      // Form updates
      updateNewUser: (updates) => set((state) => ({
        newUser: { ...state.newUser, ...updates },
        error: null
      })),

      updateEditUser: (updates) => set((state) => ({
        editUser: { ...state.editUser, ...updates },
        error: null
      })),

      updateResetPassword: (password) => set({ resetPassword: password, error: null }),

      // Password visibility toggles
      toggleShowPassword: () => set((state) => ({ showPassword: !state.showPassword })),
      toggleShowEditPassword: () => set((state) => ({ showEditPassword: !state.showEditPassword })),
      toggleShowResetPassword: () => set((state) => ({ showResetPassword: !state.showResetPassword })),

      // Check if data is stale
      isDataStale: () => {
        const { lastUpdated, CACHE_DURATION } = get();
        if (!lastUpdated) return true;
        return Date.now() - lastUpdated > CACHE_DURATION;
      },

      // Load users
      loadUsers: async (force = false) => {
        const { users, isDataStale, setLoading, setError } = get();

        // Return cached data if it's fresh and not forced
        if (!force && users.length > 0 && !isDataStale()) {
          return users;
        }

        setLoading(true);

        try {
          const response = await httpClient.get('/users');

          if (response.success) {
            const usersList = response.users || [];
            set({
              users: usersList,
              loading: false,
              lastUpdated: Date.now(),
              error: null
            });
            return usersList;
          } else {
            throw new Error(response.message || 'Failed to load users');
          }
        } catch (error) {
          setError('Failed to load users: ' + error.message);
          set({ loading: false });
          throw error;
        }
      },

      // Create user
      createUser: async () => {
        const { newUser, setLoading, setError, setSuccess, loadUsers } = get();

        // Validation
        if (!newUser.username?.trim()) {
          setError('Username is required');
          return false;
        }

        if (!newUser.password?.trim()) {
          setError('Password is required');
          return false;
        }

        if (newUser.username.trim().length < 3) {
          setError('Username must be at least 3 characters');
          return false;
        }

        if (newUser.password.trim().length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }

        setLoading(true);

        try {
          const userPayload = {
            username: newUser.username.trim(),
            email: newUser.email?.trim() || '',
            password: newUser.password.trim(),
            role: newUser.role
          };

          const response = await httpClient.post('/users', userPayload);

          if (response.success) {
            setSuccess(`✅ User "${newUser.username}" created successfully!`);

            set({
              showCreateModal: false,
              newUser: { username: '', email: '', password: '', role: 'user' }
            });

            // Reload users list
            await loadUsers(true);

            // Clear success message after delay
            setTimeout(() => set({ success: null }), 5000);

            return true;
          } else {
            throw new Error(response.message || 'Failed to create user');
          }
        } catch (error) {
          setError('Failed to create user: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Update user
      updateUser: async () => {
        const { editUser, setLoading, setError, setSuccess, loadUsers } = get();

        // Validation
        if (!editUser.username?.trim()) {
          setError('Username is required');
          return false;
        }

        if (editUser.username.trim().length < 3) {
          setError('Username must be at least 3 characters');
          return false;
        }

        if (editUser.password && editUser.password.trim().length < 6) {
          setError('Password must be at least 6 characters (leave empty to keep current password)');
          return false;
        }

        setLoading(true);

        try {
          // Prepare update payload (only include changed fields)
          const updatePayload = {
            userId: editUser.id,
            username: editUser.username.trim(),
            email: editUser.email?.trim() || '',
            role: editUser.role
          };

          // Only include password if it's provided
          if (editUser.password && editUser.password.trim()) {
            updatePayload.password = editUser.password.trim();
          }

          const response = await httpClient.put('/users', updatePayload);

          if (response.success) {
            setSuccess(`✅ User "${editUser.username}" updated successfully!`);

            set({
              showEditModal: false,
              userToEdit: null,
              editUser: { id: '', username: '', email: '', role: 'user', password: '' }
            });

            // Reload users list
            await loadUsers(true);

            // Clear success message after delay
            setTimeout(() => set({ success: null }), 5000);

            return true;
          } else {
            throw new Error(response.message || 'Failed to update user');
          }
        } catch (error) {
          setError('Failed to update user: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Delete user
      deleteUser: async () => {
        const { userToDelete, setLoading, setError, setSuccess, loadUsers } = get();

        if (!userToDelete) return false;

        setLoading(true);

        try {
          const deletePayload = {
            userId: userToDelete.id,
            username: userToDelete.username
          };

          const response = await httpClient.delete('/users', deletePayload);

          if (response.success) {
            setSuccess(`✅ User "${userToDelete.username}" deleted successfully!`);

            set({
              showDeleteModal: false,
              userToDelete: null
            });

            // Reload users list
            await loadUsers(true);

            // Clear success message after delay
            setTimeout(() => set({ success: null }), 5000);

            return true;
          } else {
            throw new Error(response.message || 'Failed to delete user');
          }
        } catch (error) {
          setError('Failed to delete user: ' + error.message);
          set({
            showDeleteModal: false,
            userToDelete: null
          });
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Reset password
      resetUserPassword: async () => {
        const { userToResetPassword, resetPassword, setLoading, setError, setSuccess } = get();

        if (!userToResetPassword || !resetPassword) {
          setError('Password is required');
          return false;
        }

        if (resetPassword.length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }

        setLoading(true);

        try {
          const response = await httpClient.put('/users', {
            userId: userToResetPassword.id,
            password: resetPassword
          });

          if (response.success) {
            setSuccess(`✅ Password for "${userToResetPassword.username}" has been reset successfully!`);

            set({
              showResetPasswordModal: false,
              userToResetPassword: null,
              resetPassword: ''
            });

            // Clear success message after delay
            setTimeout(() => set({ success: null }), 5000);

            return true;
          } else {
            throw new Error(response.message || 'Failed to reset password');
          }
        } catch (error) {
          setError('Failed to reset password: ' + error.message);
          return false;
        } finally {
          setLoading(false);
        }
      },

      // Refresh data
      refreshUsers: () => get().loadUsers(true),

      // Clear cache
      clearCache: () => set({
        users: [],
        lastUpdated: null,
        error: null,
        success: null
      })
    }),
    {
      name: 'user-management-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the data, not the loading states or modals
      partialize: (state) => ({
        users: state.users,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useUserManagementStore;