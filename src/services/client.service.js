/**
 * Client Service
 * Contains business logic for client management
 * Uses ClientRepository for data access
 */

import { ClientRepository } from '../repositories/client.repository.js';
import { ClientModel, CLIENT_STATUS } from '../models/client.model.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

export class ClientService {
  constructor() {
    this.clientRepository = new ClientRepository();
  }

  /**
   * Get all clients for a tenant
   * @param {string} tenantId - Organization ID
   * @param {boolean} includeData - Include additional data (task counts, etc.)
   * @returns {Promise<Array>} List of clients
   */
  async getClientsByTenant(tenantId, includeData = false) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    if (includeData) {
      const clients = await this.clientRepository.findWithData(tenantId);
      return clients.map(client => new ClientModel(client).toObject());
    } else {
      const clients = await this.clientRepository.findByTenant(tenantId);
      return clients.map(client => new ClientModel(client).toObject());
    }
  }

  /**
   * Get client by ID
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Client object or null
   */
  async getClientById(clientId, tenantId) {
    if (!clientId || !tenantId) {
      throw new ValidationError('Client ID and tenant ID are required');
    }

    const client = await this.clientRepository.findById(clientId, tenantId);

    if (!client) return null;

    return new ClientModel(client).toObject();
  }

  /**
   * Get client by name
   * @param {string} clientName - Client name
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Client object or null
   */
  async getClientByName(clientName, tenantId) {
    if (!clientName || !tenantId) {
      throw new ValidationError('Client name and tenant ID are required');
    }

    const client = await this.clientRepository.findByName(clientName, tenantId);

    if (!client) return null;

    return new ClientModel(client).toObject();
  }

  /**
   * Create a new client
   * @param {Object} clientData - Client data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created client object
   */
  async createClient(clientData, tenantId) {
    // Validate input data
    const validation = ClientModel.validate({...clientData, tenantId});
    if (!validation.isValid) {
      throw new ValidationError('Invalid client data', validation.errors);
    }

    // Check if client name already exists
    const existingClient = await this.clientRepository.findByName(clientData.name, tenantId);
    if (existingClient) {
      throw new ConflictError(`Client "${clientData.name}" already exists in this organization`);
    }

    // Create client model
    const clientModel = new ClientModel({
      ...clientData,
      tenantId
    });

    // Save to database
    const newClient = await this.clientRepository.create(clientModel.toObject(), tenantId);

    return new ClientModel(newClient).toObject();
  }

  /**
   * Update client
   * @param {string} clientId - Client ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated client object
   */
  async updateClient(clientId, updateData, tenantId) {
    // Validate update data
    const validation = ClientModel.validate(updateData, true);
    if (!validation.isValid) {
      throw new ValidationError('Invalid update data', validation.errors);
    }

    // Check if client exists
    const existingClient = await this.clientRepository.findById(clientId, tenantId);
    if (!existingClient) {
      throw new NotFoundError('Client not found');
    }

    // If updating name, check for conflicts
    if (updateData.name && updateData.name !== existingClient.name) {
      const nameExists = await this.clientRepository.nameExists(updateData.name, tenantId);
      if (nameExists) {
        throw new ConflictError(`Client name "${updateData.name}" already exists`);
      }
    }

    // Update in database
    const updatedClient = await this.clientRepository.update(clientId, updateData, tenantId);

    return new ClientModel(updatedClient).toObject();
  }

  /**
   * Delete client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteClient(clientId, tenantId) {
    if (!clientId || !tenantId) {
      throw new ValidationError('Client ID and tenant ID are required');
    }

    // Check if client exists
    const existingClient = await this.clientRepository.findById(clientId, tenantId);
    if (!existingClient) {
      throw new NotFoundError('Client not found');
    }

    await this.clientRepository.delete(clientId, tenantId);
  }

  /**
   * Search clients
   * @param {string} searchTerm - Search term
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} List of matching clients
   */
  async searchClients(searchTerm, tenantId, filters = {}) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const allFilters = {
      ...filters,
      tenantId
    };

    const clients = await this.clientRepository.search(searchTerm, allFilters);
    return clients.map(client => new ClientModel(client).toObject());
  }

  /**
   * Get client analytics
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Analytics data
   */
  async getClientAnalytics(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const analytics = await this.clientRepository.getAnalytics(tenantId);
    return analytics;
  }

  /**
   * Get client activities
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Number of activities to fetch
   * @returns {Promise<Array>} List of activities
   */
  async getClientActivities(clientId, tenantId, limit = 50) {
    if (!clientId || !tenantId) {
      throw new ValidationError('Client ID and tenant ID are required');
    }

    const activities = await this.clientRepository.getActivities(clientId, limit, tenantId);
    return activities;
  }

  /**
   * Add client activity
   * @param {string} clientId - Client ID
   * @param {Object} activityData - Activity data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created activity
   */
  async addClientActivity(clientId, activityData, tenantId) {
    if (!clientId || !tenantId) {
      throw new ValidationError('Client ID and tenant ID are required');
    }

    if (!activityData.type || !activityData.description) {
      throw new ValidationError('Activity type and description are required');
    }

    // Check if client exists
    const client = await this.clientRepository.findById(clientId, tenantId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    const activity = await this.clientRepository.addActivity(clientId, activityData, tenantId);
    return activity;
  }

  /**
   * Get client tasks
   * @param {string} clientName - Client name
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks
   */
  async getClientTasks(clientName, tenantId) {
    if (!clientName || !tenantId) {
      throw new ValidationError('Client name and tenant ID are required');
    }

    const tasks = await this.clientRepository.getTasks(clientName, tenantId);
    return tasks;
  }

  /**
   * Get client meetings
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of meetings
   */
  async getClientMeetings(clientId, tenantId) {
    if (!clientId || !tenantId) {
      throw new ValidationError('Client ID and tenant ID are required');
    }

    const meetings = await this.clientRepository.getMeetings(clientId, tenantId);
    return meetings;
  }

  /**
   * Get client files
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files
   */
  async getClientFiles(clientId, tenantId) {
    if (!clientId || !tenantId) {
      throw new ValidationError('Client ID and tenant ID are required');
    }

    const files = await this.clientRepository.getFiles(clientId, tenantId);
    return files;
  }

  /**
   * Get active clients only
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of active clients
   */
  async getActiveClients(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const allClients = await this.clientRepository.findByTenant(tenantId);

    const activeClients = allClients.filter(client => {
      const clientModel = new ClientModel(client);
      return clientModel.isActive();
    });

    return activeClients.map(client => new ClientModel(client).toObject());
  }

  /**
   * Get clients by status
   * @param {string} status - Client status
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of clients with specified status
   */
  async getClientsByStatus(status, tenantId) {
    if (!status || !tenantId) {
      throw new ValidationError('Status and tenant ID are required');
    }

    if (!Object.values(CLIENT_STATUS).includes(status)) {
      throw new ValidationError('Invalid client status');
    }

    const allClients = await this.clientRepository.findByTenant(tenantId);

    const filteredClients = allClients.filter(client => client.status === status);

    return filteredClients.map(client => new ClientModel(client).toObject());
  }

  /**
   * Get client count for a tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Client count
   */
  async getClientCount(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    return await this.clientRepository.countByTenant(tenantId);
  }

  /**
   * Check if client name exists
   * @param {string} clientName - Client name
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if exists
   */
  async clientNameExists(clientName, tenantId) {
    if (!clientName || !tenantId) {
      throw new ValidationError('Client name and tenant ID are required');
    }

    return await this.clientRepository.nameExists(clientName, tenantId);
  }
}

export default ClientService;
