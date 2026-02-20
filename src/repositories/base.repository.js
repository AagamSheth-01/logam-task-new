/**
 * Base Repository
 * Provides common database operations for all repositories
 */

import { DatabaseError } from '../utils/errors.js';

export class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  /**
   * Handle database errors consistently
   */
  handleError(error, operation) {
    console.error(`Database Error [${this.collectionName}] - ${operation}:`, error);
    throw new DatabaseError(
      `Failed to ${operation} ${this.collectionName}`,
      error
    );
  }

  /**
   * Convert Firestore timestamp to ISO string
   */
  convertTimestamp(timestamp) {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    return timestamp;
  }

  /**
   * Convert Firestore document to plain object
   */
  docToObject(doc) {
    if (!doc || !doc.exists) return null;

    const data = doc.data();
    const converted = { id: doc.id };

    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value && typeof value.toDate === 'function') {
        converted[key] = this.convertTimestamp(value);
      } else {
        converted[key] = value;
      }
    });

    return converted;
  }

  /**
   * Apply field mappings for backward compatibility
   * Subclasses can override this
   */
  applyFieldMappings(record) {
    return record;
  }
}

export default BaseRepository;
