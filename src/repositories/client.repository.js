/**
 * Client Repository
 * Wraps existing firebaseService client functions
 * Provides clean interface for client database operations
 */

import { BaseRepository } from './base.repository.js';
import {
  loadClientsFromFirebase,
  getClientsWithData,
  getClients,
  addClient,
  getClientById,
  getClientByName,
  updateClient,
  deleteClient,
  searchClients,
  getClientAnalytics,
  getClientActivities,
  addClientActivity,
  getClientTasks,
  getClientMeetings,
  getClientFiles
} from '../../lib/firebaseService.js';

export class ClientRepository extends BaseRepository {
  constructor() {
    super('clients');
  }

  /**
   * Get all clients for a tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of clients
   */
  async findByTenant(tenantId) {
    try {
      const clients = await loadClientsFromFirebase(tenantId);
      return clients || [];
    } catch (error) {
      this.handleError(error, 'find clients by tenant');
    }
  }

  /**
   * Get clients with additional data (task counts, etc.)
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of clients with data
   */
  async findWithData(tenantId) {
    try {
      const clients = await getClientsWithData(tenantId);
      return clients || [];
    } catch (error) {
      this.handleError(error, 'find clients with data');
    }
  }

  /**
   * Get all clients (simple list)
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of clients
   */
  async findAll(tenantId) {
    try {
      const clients = await getClients(tenantId);
      return clients || [];
    } catch (error) {
      this.handleError(error, 'find all clients');
    }
  }

  /**
   * Find client by ID
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Client object or null
   */
  async findById(clientId, tenantId) {
    try {
      const client = await getClientById(clientId, tenantId);
      return client || null;
    } catch (error) {
      this.handleError(error, 'find client by ID');
    }
  }

  /**
   * Find client by name
   * @param {string} clientName - Client name
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Client object or null
   */
  async findByName(clientName, tenantId) {
    try {
      const client = await getClientByName(clientName, tenantId);
      return client || null;
    } catch (error) {
      this.handleError(error, 'find client by name');
    }
  }

  /**
   * Create a new client
   * @param {Object} clientData - Client data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created client object
   */
  async create(clientData, tenantId) {
    try {
      const newClient = await addClient(clientData, tenantId);
      return newClient;
    } catch (error) {
      this.handleError(error, 'create client');
    }
  }

  /**
   * Update client
   * @param {string} clientId - Client ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated client object
   */
  async update(clientId, updateData, tenantId) {
    try {
      const updatedClient = await updateClient(clientId, updateData, tenantId);
      return updatedClient;
    } catch (error) {
      this.handleError(error, 'update client');
    }
  }

  /**
   * Delete client (soft delete)
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async delete(clientId, tenantId) {
    try {
      await deleteClient(clientId, tenantId);
    } catch (error) {
      this.handleError(error, 'delete client');
    }
  }

  /**
   * Search clients
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} List of matching clients
   */
  async search(searchTerm, filters = {}) {
    try {
      const clients = await searchClients(searchTerm, filters);
      return clients || [];
    } catch (error) {
      this.handleError(error, 'search clients');
    }
  }

  /**
   * Get client analytics
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(tenantId) {
    try {
      const analytics = await getClientAnalytics(tenantId);
      return analytics || {};
    } catch (error) {
      this.handleError(error, 'get client analytics');
    }
  }

  /**
   * Get client activities
   * @param {string} clientId - Client ID
   * @param {number} limit - Number of activities to fetch
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of activities
   */
  async getActivities(clientId, limit = 50, tenantId) {
    try {
      const activities = await getClientActivities(clientId, limit, tenantId);
      return activities || [];
    } catch (error) {
      this.handleError(error, 'get client activities');
    }
  }

  /**
   * Add client activity
   * @param {string} clientId - Client ID
   * @param {Object} activityData - Activity data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created activity
   */
  async addActivity(clientId, activityData, tenantId) {
    try {
      const activity = await addClientActivity(clientId, activityData, tenantId);
      return activity;
    } catch (error) {
      this.handleError(error, 'add client activity');
    }
  }

  /**
   * Get client tasks
   * @param {string} clientName - Client name
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks
   */
  async getTasks(clientName, tenantId) {
    try {
      const tasks = await getClientTasks(clientName, tenantId);
      return tasks || [];
    } catch (error) {
      this.handleError(error, 'get client tasks');
    }
  }

  /**
   * Get client meetings
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of meetings
   */
  async getMeetings(clientId, tenantId) {
    try {
      const meetings = await getClientMeetings(clientId, tenantId);
      return meetings || [];
    } catch (error) {
      this.handleError(error, 'get client meetings');
    }
  }

  /**
   * Get client files
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files
   */
  async getFiles(clientId, tenantId) {
    try {
      const files = await getClientFiles(clientId, tenantId);
      return files || [];
    } catch (error) {
      this.handleError(error, 'get client files');
    }
  }

  /**
   * Check if client name exists
   * @param {string} clientName - Client name
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if exists
   */
  async nameExists(clientName, tenantId) {
    try {
      const client = await this.findByName(clientName, tenantId);
      return !!client;
    } catch (error) {
      this.handleError(error, 'check client name existence');
    }
  }

  /**
   * Count clients for a tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Client count
   */
  async countByTenant(tenantId) {
    try {
      const clients = await this.findByTenant(tenantId);
      return clients.length;
    } catch (error) {
      this.handleError(error, 'count clients');
    }
  }
}

export default ClientRepository;
