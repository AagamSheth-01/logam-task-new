import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const useAdminDashboardStore = create(
  persist(
    (set, get) => ({
      // State
      dashboardData: null,
      loading: false,
      error: null,
      lastUpdated: null,

      // Cache duration: 5 minutes
      CACHE_DURATION: 5 * 60 * 1000,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Check if data is stale
      isDataStale: () => {
        const { lastUpdated, CACHE_DURATION } = get();
        if (!lastUpdated) return true;
        return Date.now() - lastUpdated > CACHE_DURATION;
      },

      // Fetch dashboard data
      fetchDashboardData: async (force = false) => {
        const { dashboardData, isDataStale, setLoading, setError } = get();

        // Return cached data if it's fresh and not forced
        if (!force && dashboardData && !isDataStale()) {
          return dashboardData;
        }

        setLoading(true);
        setError(null);

        try {
          const [
            usersSnapshot,
            tasksSnapshot,
            attendanceSnapshot
          ] = await Promise.all([
            getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
            getDocs(collection(db, 'tasks')),
            getDocs(query(collection(db, 'attendance'), where('date', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))))
          ]);

          // Process data
          const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()
          }));

          const tasks = tasksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.(),
            dueDate: doc.data().dueDate?.toDate?.()
          }));

          // Extract unique clients from tasks (for backward compatibility)
          const uniqueClients = [...new Set(tasks.map(t => t.client_name).filter(Boolean))];
          const clients = uniqueClients.map(name => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            email: '',
            status: 'Active',
            totalTasks: tasks.filter(t => t.client_name === name).length,
            completedTasks: tasks.filter(t => t.client_name === name && t.status === 'done').length,
            pendingTasks: tasks.filter(t => t.client_name === name && t.status === 'pending').length,
            overdueTasks: tasks.filter(t => {
              if (t.client_name === name && t.status === 'pending' && t.dueDate) {
                return new Date(t.dueDate) < new Date();
              }
              return false;
            }).length
          }));

          const attendance = attendanceSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate?.()
          }));

          const recentTasks = tasks.slice(0, 10); // Get recent 10 for display

          // Calculate metrics
          const totalUsers = users.length;
          const newUsersThisMonth = users.filter(user =>
            user.createdAt && user.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length;

          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(task => task.status === 'done').length;
          const pendingTasks = tasks.filter(task => task.status === 'pending').length;
          const overdueTasks = tasks.filter(task =>
            task.dueDate && task.dueDate < new Date() && task.status !== 'done'
          ).length;

          // Attendance metrics
          const today = new Date();
          const todayAttendance = attendance.filter(record => {
            if (!record.date) return false;
            return record.date.toDateString() === today.toDateString();
          });

          const presentToday = todayAttendance.filter(record =>
            record.status === 'present' || record.status === 'half-day' || record.checkIn
          ).length;

          // Task completion rate
          const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

          // Calculate performance data
          const perfData = {};
          tasks.forEach(task => {
            const user = task.assigned_to;
            if (!user) return;

            if (!perfData[user]) {
              perfData[user] = { total: 0, completed: 0, pending: 0 };
            }

            perfData[user].total++;
            if (task.status === 'done') {
              perfData[user].completed++;
            } else {
              perfData[user].pending++;
            }
          });

          const newData = {
            users: {
              total: totalUsers,
              newThisMonth: newUsersThisMonth,
              list: users.slice(0, 10), // Only store recent 10 for display
              all: users // Include all users for admin functionality
            },
            tasks: {
              total: totalTasks,
              completed: completedTasks,
              pending: pendingTasks,
              overdue: overdueTasks,
              completionRate: parseFloat(completionRate),
              recent: recentTasks,
              all: tasks // Include all tasks for admin dashboard
            },
            attendance: {
              presentToday,
              totalToday: todayAttendance.length
            },
            performance: perfData,
            clients: clients,
            designAnalytics: {} // TODO: Add design analytics if needed
          };

          set({
            dashboardData: newData,
            loading: false,
            lastUpdated: Date.now()
          });

          return newData;
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
          setError(error.message);
          setLoading(false);
          throw error;
        }
      },

      // Refresh data
      refreshData: () => get().fetchDashboardData(true),

      // Clear cache
      clearCache: () => set({
        dashboardData: null,
        lastUpdated: null
      })
    }),
    {
      name: 'admin-dashboard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        dashboardData: state.dashboardData,
        lastUpdated: state.lastUpdated
      })
    }
  )
);

export default useAdminDashboardStore;