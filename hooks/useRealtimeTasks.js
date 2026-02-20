// hooks/useRealtimeTasks.js - Real-time Firebase listener for tasks
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useRealtimeTasks = (username, role) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get tenantId from localStorage
    let tenantId = null;
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        tenantId = user.tenantId;
      }
    } catch (err) {
      // Silent error handling
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    // Helper function to fetch and attach profile images
    const attachProfileImages = async (tasksData) => {
      if (!tasksData || tasksData.length === 0) return tasksData;

      try {
        // Extract unique usernames
        const usernames = new Set();
        tasksData.forEach(task => {
          if (task.assigned_to) usernames.add(task.assigned_to);
          if (task.given_by) usernames.add(task.given_by);
        });

        if (usernames.size === 0) return tasksData;

        // Fetch profile images in batches (Firestore limit: 10 per 'in' query)
        const profileImages = {};
        const usernameArray = Array.from(usernames);

        for (let i = 0; i < usernameArray.length; i += 10) {
          const batch = usernameArray.slice(i, i + 10);
          const usersQuery = query(
            collection(db, 'users'),
            where('tenantId', '==', tenantId),
            where('username', 'in', batch)
          );

          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.username && userData.profileImage) {
              profileImages[userData.username] = userData.profileImage;
            }
          });
        }

        // Attach profile images to tasks
        return tasksData.map(task => ({
          ...task,
          assigned_to_profile_image: task.assigned_to && profileImages[task.assigned_to]
            ? profileImages[task.assigned_to]
            : task.assigned_to_profile_image,
          given_by_profile_image: task.given_by && profileImages[task.given_by]
            ? profileImages[task.given_by]
            : task.given_by_profile_image
        }));
      } catch (error) {
        console.error('Error fetching profile images:', error);
        return tasksData; // Return tasks without images on error
      }
    };

    // Build query based on role
    // Note: Removed orderBy to avoid composite index requirement
    // Sorting will be done in JavaScript after fetching
    if (role?.toLowerCase() === 'admin') {
      // Admin sees all tasks in their tenant
      const q = query(
        collection(db, 'tasks'),
        where('tenantId', '==', tenantId)
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const tasksData = [];
          snapshot.forEach((doc) => {
            const data = doc.data();

            // Convert Firestore Timestamps to readable format
            const task = {
              id: doc.id,
              ...data,
              assigned_date: data.assigned_date || (data.createdAt ? data.createdAt.toDate().toISOString() : null),
              completed_date: data.completed_date || null,
              createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
            };

            tasksData.push(task);
          });

          // Sort by createdAt desc in JavaScript (to avoid composite index requirement)
          tasksData.sort((a, b) => {
            const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bDate - aDate; // Descending order (newest first)
          });

          // Attach profile images
          const tasksWithImages = await attachProfileImages(tasksData);

          setTasks(tasksWithImages);
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => {
        unsubscribe();
      };
    } else {
      // Regular users see tasks assigned TO them OR created BY them
      // Since Firestore doesn't support OR queries, we need two separate queries
      const assignedToQuery = query(
        collection(db, 'tasks'),
        where('tenantId', '==', tenantId),
        where('assigned_to', '==', username)
      );

      const givenByQuery = query(
        collection(db, 'tasks'),
        where('tenantId', '==', tenantId),
        where('given_by', '==', username)
      );

      // Store tasks from both queries
      let assignedTasks = [];
      let givenTasks = [];

      // Function to merge and update tasks
      const mergeTasks = async () => {
        const taskMap = new Map();

        // Add all assigned tasks
        assignedTasks.forEach(task => {
          taskMap.set(task.id, task);
        });

        // Add all given tasks (will skip duplicates due to Map)
        givenTasks.forEach(task => {
          if (!taskMap.has(task.id)) {
            taskMap.set(task.id, task);
          }
        });

        // Convert to array and sort
        const mergedTasks = Array.from(taskMap.values());
        mergedTasks.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate; // Descending order (newest first)
        });

        // Attach profile images
        const tasksWithImages = await attachProfileImages(mergedTasks);

        setTasks(tasksWithImages);
        setLoading(false);
        setError(null);
      };

      // Set up listener for tasks assigned TO user
      const unsubscribeAssigned = onSnapshot(
        assignedToQuery,
        (snapshot) => {
          assignedTasks = [];
          snapshot.forEach((doc) => {
            const data = doc.data();

            // Convert Firestore Timestamps to readable format
            const task = {
              id: doc.id,
              ...data,
              assigned_date: data.assigned_date || (data.createdAt ? data.createdAt.toDate().toISOString() : null),
              completed_date: data.completed_date || null,
              createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
            };

            assignedTasks.push(task);
          });

          mergeTasks();
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );

      // Set up listener for tasks created BY user
      const unsubscribeGiven = onSnapshot(
        givenByQuery,
        (snapshot) => {
          givenTasks = [];
          snapshot.forEach((doc) => {
            const data = doc.data();

            // Convert Firestore Timestamps to readable format
            const task = {
              id: doc.id,
              ...data,
              assigned_date: data.assigned_date || (data.createdAt ? data.createdAt.toDate().toISOString() : null),
              completed_date: data.completed_date || null,
              createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
            };

            givenTasks.push(task);
          });

          mergeTasks();
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup both listeners on unmount
      return () => {
        unsubscribeAssigned();
        unsubscribeGiven();
      };
    }
  }, [username, role]);

  return { tasks, loading, error };
};
