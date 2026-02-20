/**
 * Task Assignment Controller Hook
 * MVC Pattern implementation for task assignment functionality
 */

import { useState, useCallback, useEffect } from 'react';

const useTaskAssignment = (user) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [users, setUsers] = useState([]);
  const [clientList, setClientList] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    task: '',
    assigned_to: '',
    client_name: '',
    priority: 'Medium',
    deadline: '',
    assignerNotes: '',
    assignerPrivateNotes: '',
    isCustomClient: false,
    custom_client: ''
  });

  // UI state
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Fetch users for assignment dropdown
  const fetchUsers = useCallback(async () => {
    if (!user?.tenantId) return;

    try {
      const response = await fetch('/api/users', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const result = await response.json();
      const userList = result.data?.users || result.users || [];
      setUsers(userList);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    }
  }, [user?.tenantId]);

  // Fetch clients from database via API
  const fetchClients = useCallback(async () => {
    if (!user?.tenantId) return;

    try {
      const response = await fetch('/api/clients', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.status}`);
      }

      const result = await response.json();
      const clients = result.clients || [];

      setClientList(clients);
      console.log(`✅ Loaded ${clients.length} clients from database (${result.defaultCount || 0} default + ${result.customCount || 0} custom)`);

    } catch (err) {
      console.error('❌ Failed to fetch clients from API:', err);

      // Fallback to basic default list if API fails
      const fallbackClients = [
        'Aatmee Developer', 'Logam Academy', 'Logam Digital', 'Not Funny',
        'Own It Pure', 'Brahmras', 'DSQR', 'Fitnessfox'
      ];

      setClientList(fallbackClients);
      console.warn(`⚠️ Using fallback client list (${fallbackClients.length} clients)`);
    }
  }, [user?.tenantId]);

  // Add client to database via API
  const addClientToDatabase = useCallback(async (clientName) => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          client_name: clientName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to add client',
          errors: result.errors || [],
          existingClient: result.existingClient
        };
      }

      console.log('✅ Client added to database:', result.client?.name);

      // Refresh the client list to get updated data
      await fetchClients();

      return {
        success: true,
        client: result.client,
        message: result.message
      };

    } catch (err) {
      console.error('❌ Error adding client to database:', err);
      return {
        success: false,
        message: 'Network error: Failed to add client',
        errors: [err.message]
      };
    }
  }, [fetchClients]);

  // Migrate default clients to database (one-time operation)
  const migrateDefaultClients = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚀 Starting client migration to database...');

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'migrate_defaults'
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Migration completed: ${result.migrated} clients migrated, ${result.skipped} skipped`);

        // Refresh client list after migration
        await fetchClients();

        return {
          success: true,
          message: `Migration completed successfully! ${result.migrated} clients migrated to database.`,
          migrated: result.migrated,
          skipped: result.skipped
        };
      } else {
        throw new Error(result.message || 'Migration failed');
      }

    } catch (err) {
      console.error('❌ Migration failed:', err);
      return {
        success: false,
        message: `Migration failed: ${err.message}`
      };
    } finally {
      setLoading(false);
    }
  }, [fetchClients]);

  // Update form field
  const updateFormField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear success message when user starts editing
    if (success) {
      setSuccess(null);
    }
  }, [success]);

  // Handle client selection with custom client logic
  const handleClientChange = useCallback((value) => {
    if (value === 'custom') {
      setFormData(prev => ({
        ...prev,
        isCustomClient: true,
        client_name: '',
        custom_client: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        isCustomClient: false,
        client_name: value,
        custom_client: ''
      }));
    }
  }, []);

  // Validate form data
  const validateForm = useCallback(() => {
    const errors = [];

    if (!formData.task.trim()) {
      errors.push('Task description is required');
    }

    if (!formData.assigned_to) {
      errors.push('Please select a user to assign the task to');
    }

    if (formData.isCustomClient && !formData.custom_client.trim()) {
      errors.push('Custom client name is required');
    }

    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (deadlineDate < today) {
        errors.push('Deadline cannot be in the past');
      }
    }

    return errors;
  }, [formData]);

  // Submit task assignment
  const submitTask = useCallback(async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Get current time in India/Kolkata timezone
      const now = new Date();
      const kolkataTime = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(now);

      const kolkataTimestamp = `${kolkataTime[0].value}-${kolkataTime[2].value}-${kolkataTime[4].value} ${kolkataTime[6].value}:${kolkataTime[8].value}:${kolkataTime[10].value}`;

      // Prepare task data
      const taskData = {
        task: formData.task.trim(),
        assigned_to: formData.assigned_to,
        priority: formData.priority,
        deadline: formData.deadline || null,
        status: 'pending',
        created_by: user.username,
        tenantId: user.tenantId,
        assignerNotes: formData.assignerNotes.trim() || null,
        assignerPrivateNotes: formData.assignerPrivateNotes.trim() || null,
        created_at: kolkataTimestamp,
        timezone: 'Asia/Kolkata'
      };

      // Handle client assignment with validation and database addition
      if (formData.isCustomClient && formData.custom_client.trim()) {
        try {
          const addResult = await addCustomClientToList(formData.custom_client);

          if (addResult.success) {
            taskData.client_name = addResult.formattedName;
            console.log(addResult.message);
          } else {
            // If it exists, use the existing one
            if (addResult.existingClient) {
              taskData.client_name = addResult.existingClient;
              console.log(`Using existing client: ${addResult.existingClient}`);
            } else {
              // Validation error - still use the original name but don't add to database
              taskData.client_name = formatClientName(formData.custom_client);
              console.warn('Client validation failed:', addResult.errors);
            }
          }
        } catch (addError) {
          console.error('Error adding client to database:', addError);
          // Fallback: use the formatted name even if database addition failed
          taskData.client_name = formatClientName(formData.custom_client);
        }
      } else if (formData.client_name) {
        taskData.client_name = formData.client_name;
      }

      // Submit task via API
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create task: ${response.status}`);
      }

      const result = await response.json();
      const createdTask = result.data?.task || result.task || result;

      // Reset form on success
      setFormData({
        task: '',
        assigned_to: '',
        client_name: '',
        priority: 'Medium',
        deadline: '',
        assignerNotes: '',
        assignerPrivateNotes: '',
        isCustomClient: false,
        custom_client: ''
      });

      setSuccess(`Task successfully assigned to ${formData.assigned_to}`);

      return createdTask;
    } catch (err) {
      console.error('Failed to create task:', err);
      setError(err.message || 'Failed to create task');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [formData, validateForm, user]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      task: '',
      assigned_to: '',
      client_name: '',
      priority: 'Medium',
      deadline: '',
      assignerNotes: '',
      assignerPrivateNotes: '',
      isCustomClient: false,
      custom_client: ''
    });
    setError(null);
    setSuccess(null);
  }, []);

  // Load initial data
  useEffect(() => {
    if (user?.username) {
      setLoading(true);
      Promise.all([
        fetchUsers(),
        fetchClients()
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [user?.username, fetchUsers, fetchClients]);

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timeout = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, success]);

  // Character count helpers
  const getCharacterCount = useCallback((field) => {
    return formData[field]?.length || 0;
  }, [formData]);

  const isCharacterLimitExceeded = useCallback((field, limit = 2000) => {
    return getCharacterCount(field) > limit;
  }, [getCharacterCount]);

  // Client suggestion helpers
  const normalizeClientName = useCallback((name) => {
    return name.toLowerCase().replace(/\s+/g, ' ').trim();
  }, []);

  const findSimilarClients = useCallback((customClientName) => {
    if (!customClientName || customClientName.length < 2) return [];

    const normalizedInput = normalizeClientName(customClientName);
    const suggestions = [];

    clientList.forEach(client => {
      const normalizedClient = normalizeClientName(client);

      // Exact match (case insensitive)
      if (normalizedClient === normalizedInput) {
        suggestions.push({ client, type: 'exact', similarity: 1 });
        return;
      }

      // Contains match
      if (normalizedClient.includes(normalizedInput) || normalizedInput.includes(normalizedClient)) {
        const similarity = Math.min(normalizedInput.length, normalizedClient.length) /
                          Math.max(normalizedInput.length, normalizedClient.length);
        suggestions.push({ client, type: 'contains', similarity });
        return;
      }

      // Word-based matching
      const inputWords = normalizedInput.split(' ');
      const clientWords = normalizedClient.split(' ');

      let matchingWords = 0;
      inputWords.forEach(inputWord => {
        if (inputWord.length < 2) return;
        clientWords.forEach(clientWord => {
          if (clientWord.includes(inputWord) || inputWord.includes(clientWord)) {
            matchingWords++;
          }
        });
      });

      if (matchingWords > 0) {
        const similarity = matchingWords / Math.max(inputWords.length, clientWords.length);
        if (similarity > 0.4) {
          suggestions.push({ client, type: 'partial', similarity });
        }
      }
    });

    // Sort by similarity and type priority
    return suggestions
      .sort((a, b) => {
        // Prioritize exact matches
        if (a.type === 'exact' && b.type !== 'exact') return -1;
        if (b.type === 'exact' && a.type !== 'exact') return 1;
        // Then by similarity
        return b.similarity - a.similarity;
      })
      .slice(0, 3) // Show max 3 suggestions
      .map(s => s.client);
  }, [clientList, normalizeClientName]);

  const getClientSuggestions = useCallback(() => {
    if (!formData.isCustomClient || !formData.custom_client) return [];
    return findSimilarClients(formData.custom_client);
  }, [formData.isCustomClient, formData.custom_client, findSimilarClients]);

  const applySuggestion = useCallback((suggestedClient) => {
    setFormData(prev => ({
      ...prev,
      isCustomClient: false,
      client_name: suggestedClient,
      custom_client: ''
    }));
  }, []);

  // Format client name with proper validation
  const formatClientName = useCallback((name) => {
    if (!name || typeof name !== 'string') return '';

    // Remove extra spaces and trim
    const cleaned = name.replace(/\s+/g, ' ').trim();

    // Capitalize first letter of each word
    const formatted = cleaned.split(' ')
      .map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    return formatted;
  }, []);

  // Validate client name
  const validateClientName = useCallback((name) => {
    const errors = [];

    if (!name || name.trim().length === 0) {
      errors.push('Client name is required');
      return errors;
    }

    const trimmed = name.trim();

    // Check minimum length
    if (trimmed.length < 2) {
      errors.push('Client name must be at least 2 characters');
    }

    // Check maximum length
    if (trimmed.length > 50) {
      errors.push('Client name must be less than 50 characters');
    }

    // Check for multiple consecutive spaces
    if (/\s{2,}/.test(name)) {
      errors.push('Use single spaces between words (multiple spaces found)');
    }

    // Check for leading or trailing spaces
    if (name !== name.trim()) {
      errors.push('Remove extra spaces at the beginning or end');
    }

    // Check for valid characters (letters, numbers, spaces, hyphens, apostrophes)
    const validPattern = /^[a-zA-Z0-9\s\-'&.]+$/;
    if (!validPattern.test(trimmed)) {
      errors.push('Only letters, numbers, spaces, hyphens, apostrophes, & and . are allowed');
    }

    // Check if it starts and ends with valid characters (not space or special chars)
    if (!/^[a-zA-Z0-9]/.test(trimmed)) {
      errors.push('Client name must start with a letter or number');
    }

    if (!/[a-zA-Z0-9]$/.test(trimmed)) {
      errors.push('Client name must end with a letter or number');
    }

    // Smart space validation - suggest where spaces are needed
    const words = trimmed.split(' ');
    if (words.some(word => word.length === 0)) {
      errors.push('Extra spaces detected - use single spaces between words only');
    }

    // Check for potential missing spaces (common patterns)
    const missingSpacePatterns = [
      { pattern: /[a-z][A-Z]/, message: 'Consider adding space between lowercase and uppercase letters' },
      { pattern: /[a-zA-Z]\d/, message: 'Consider adding space between letters and numbers' },
      { pattern: /\d[a-zA-Z]/, message: 'Consider adding space between numbers and letters' },
      { pattern: /[a-zA-Z][&]/, message: 'Consider adding space before "&"' },
      { pattern: /[&][a-zA-Z]/, message: 'Consider adding space after "&"' }
    ];

    missingSpacePatterns.forEach(({ pattern, message }) => {
      if (pattern.test(trimmed)) {
        // This is a suggestion, not an error - we'll show it as a warning
        errors.push(`Suggestion: ${message}`);
      }
    });

    return errors;
  }, []);

  // Add new client to database via API
  const addCustomClientToList = useCallback(async (customClientName) => {
    const validationErrors = validateClientName(customClientName);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const formattedName = formatClientName(customClientName);

    // Check if client already exists locally (quick check)
    const normalizedNew = normalizeClientName(formattedName);
    const exists = clientList.some(client =>
      normalizeClientName(client) === normalizedNew
    );

    if (exists) {
      return {
        success: false,
        errors: ['Client already exists in the list'],
        existingClient: clientList.find(client =>
          normalizeClientName(client) === normalizedNew
        )
      };
    }

    // Add to database via API
    const apiResult = await addClientToDatabase(formattedName);

    if (apiResult.success) {
      return {
        success: true,
        formattedName,
        message: `Client "${formattedName}" added to database and will be available for all users`
      };
    } else {
      return {
        success: false,
        errors: [apiResult.message],
        existingClient: apiResult.existingClient
      };
    }
  }, [clientList, normalizeClientName, formatClientName, validateClientName, addClientToDatabase]);

  // Filter clients based on search query
  const getFilteredClients = useCallback(() => {
    if (!clientSearchQuery.trim()) {
      return clientList;
    }

    const query = clientSearchQuery.toLowerCase();
    return clientList.filter(client =>
      client.toLowerCase().includes(query) ||
      // Also search by first letters of words
      client.toLowerCase().split(' ').some(word => word.startsWith(query))
    );
  }, [clientList, clientSearchQuery]);

  // Update client search query
  const updateClientSearchQuery = useCallback((query) => {
    setClientSearchQuery(query);
  }, []);

  // Clear client search
  const clearClientSearch = useCallback(() => {
    setClientSearchQuery('');
  }, []);

  return {
    // Data
    formData,
    users,
    clientList,

    // State
    loading,
    submitting,
    error,
    success,

    // Client search
    clientSearchQuery,
    getFilteredClients,

    // Actions
    updateFormField,
    handleClientChange,
    submitTask,
    resetForm,

    // Helpers
    getCharacterCount,
    isCharacterLimitExceeded,
    validateForm,

    // Client suggestions
    getClientSuggestions,
    applySuggestion,

    // Client management
    formatClientName,
    validateClientName,
    addCustomClientToList,
    migrateDefaultClients,

    // Client search actions
    updateClientSearchQuery,
    clearClientSearch
  };
};

export default useTaskAssignment;