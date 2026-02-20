// pages/api/clients.js - Client List Management API

import { getClients, addClient, updateClient, deleteClient } from '../../lib/firebaseService.js';
import jwt from 'jsonwebtoken';

// Helper function to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Helper function to extract username from token
const getUsernameFromToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  return decoded ? decoded.username : null;
};

// Default client list
const getDefaultClients = () => [
  'Aatmee Developer',
  'Aatmee Sahaj',
  'Admit Scholar',
  'Aggarawal College',
  'Anand Honda',
  'Bhabu Maa Ki Rasoi',
  'Brahmras',
  'Bush Infinity',
  'Craftsbazaar',
  'DSQR',
  'Fitnessfox',
  'Franklord',
  'Gurukrupa',
  'IDT',
  'Learn Canyon',
  'Logam Academy',
  'Logam Digital',
  'Mahi Spa',
  'Moha By Geetanjali',
  'Nk Autowings',
  'Not Funny',
  'Own It Pure',
  'Patel Overseas',
  'Radhe Krishna Jyotish',
  'Raamah',
  'Sagar Consultant',
  'Saregama',
  'Say Solar',
  'Sensora',
  'Silky Silver',
  'Silvaroo',
  'Social Taxi',
  'Speing',
  'Stock Bazaari',
  'Teazy',
  'True Gods',
  'Veer Land Developers',
  'Vs Developers'
];

// Format client name with proper validation
const formatClientName = (name) => {
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
};

// Validate client name
const validateClientName = (name) => {
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Client name is required');
    return errors;
  }

  const trimmed = name.trim();

  // Check minimum length
  if (trimmed.length < 2) {
    errors.push('Client name must be at least 2 characters long');
  }

  // Check maximum length
  if (trimmed.length > 100) {
    errors.push('Client name cannot exceed 100 characters');
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

  return errors;
};

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify authentication for all requests
  const authHeader = req.headers.authorization;
  const username = getUsernameFromToken(authHeader);

  if (!username) {
    console.log('❌ Authentication failed:', authHeader ? 'Invalid token' : 'Missing token');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing token'
    });
  }

  // Get user info from token
  const decoded = verifyToken(authHeader.split(' ')[1]);
  const tenantId = decoded?.tenantId;

  console.log(`🔍 Clients API - ${req.method} request from ${username}`);

  try {
    if (req.method === 'GET') {
      // Get all clients
      console.log('📖 Fetching client list...');

      // Get custom clients from database
      let customClients = [];
      try {
        customClients = await getClients(tenantId);
        console.log(`Found ${customClients.length} custom clients in database`);
      } catch (dbError) {
        console.warn('Failed to fetch custom clients from database:', dbError);
        customClients = [];
      }

      // Merge with default clients
      const defaultClients = getDefaultClients();
      const allClients = [...defaultClients];

      // Add custom clients that don't already exist
      customClients.forEach(customClient => {
        const clientName = customClient.name || customClient.client_name || customClient;
        if (typeof clientName === 'string') {
          const normalizedCustom = clientName.toLowerCase().trim();
          const exists = allClients.some(client =>
            client.toLowerCase().trim() === normalizedCustom
          );
          if (!exists) {
            allClients.push(clientName);
          }
        }
      });

      // Sort the final list
      const sortedClients = allClients.sort();

      console.log(`✅ Returning ${sortedClients.length} clients (${defaultClients.length} default + ${customClients.length} custom)`);

      return res.status(200).json({
        success: true,
        clients: sortedClients,
        count: sortedClients.length,
        defaultCount: defaultClients.length,
        customCount: customClients.length
      });

    } else if (req.method === 'POST') {
      // Handle migration or single client addition
      if (req.body.action === 'migrate_defaults') {
        // Migrate default clients to database
        console.log('🚀 Starting default clients migration...');

        const defaultClients = getDefaultClients();
        let migratedCount = 0;
        let skippedCount = 0;
        const errors = [];

        try {
          // Get existing custom clients to avoid duplicates
          let existingCustomClients = [];
          try {
            existingCustomClients = await getClients(tenantId);
          } catch (dbError) {
            console.warn('Failed to fetch existing clients during migration:', dbError);
          }

          for (const defaultClient of defaultClients) {
            try {
              // Check if this default client is already in custom clients
              const normalizedDefault = defaultClient.toLowerCase().trim();
              const existsInCustom = existingCustomClients.some(customClient => {
                const clientName = customClient.name || customClient.client_name || customClient;
                return typeof clientName === 'string' &&
                       clientName.toLowerCase().trim() === normalizedDefault;
              });

              if (existsInCustom) {
                console.log(`⏭️ Skipping ${defaultClient} - already exists in database`);
                skippedCount++;
                continue;
              }

              // Add default client to database
              const clientData = {
                name: defaultClient,
                client_name: defaultClient,
                email: `${defaultClient.toLowerCase().replace(/\s+/g, '.')}@client.default`,
                added_by: 'system_migration',
                tenantId: tenantId,
                created_at: new Date().toISOString(),
                is_active: true,
                is_default: true // Mark as migrated default client
              };

              await addClient(clientData, tenantId);
              console.log(`✅ Migrated: ${defaultClient}`);
              migratedCount++;

            } catch (clientError) {
              console.error(`❌ Failed to migrate ${defaultClient}:`, clientError);
              errors.push(`Failed to migrate ${defaultClient}: ${clientError.message}`);
            }
          }

          console.log(`🎉 Migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);

          return res.status(200).json({
            success: true,
            message: 'Default clients migration completed',
            migrated: migratedCount,
            skipped: skippedCount,
            total: defaultClients.length,
            errors: errors.length > 0 ? errors : undefined
          });

        } catch (migrationError) {
          console.error('💥 Migration failed:', migrationError);
          return res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: migrationError.message,
            migrated: migratedCount,
            errors
          });
        }
      }

      // Add new client (existing logic)
      const { client_name } = req.body;

      console.log('📝 Adding new client:', client_name);

      // Validate input
      if (!client_name || typeof client_name !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Client name is required and must be a string',
        });
      }

      // Validate client name
      const validationErrors = validateClientName(client_name);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Client name validation failed',
          errors: validationErrors
        });
      }

      // Format the client name
      const formattedName = formatClientName(client_name);

      // Check if client already exists (in default list or custom clients)
      const defaultClients = getDefaultClients();
      const normalizedNew = formattedName.toLowerCase().trim();

      // Check default clients
      const existsInDefault = defaultClients.some(client =>
        client.toLowerCase().trim() === normalizedNew
      );

      if (existsInDefault) {
        return res.status(409).json({
          success: false,
          message: `Client "${formattedName}" already exists in the default client list`,
          existingClient: defaultClients.find(client =>
            client.toLowerCase().trim() === normalizedNew
          )
        });
      }

      // Check custom clients
      let customClients = [];
      try {
        customClients = await getClients(tenantId);
      } catch (dbError) {
        console.warn('Failed to fetch existing clients:', dbError);
      }

      const existsInCustom = customClients.some(customClient => {
        const clientName = customClient.name || customClient.client_name || customClient;
        return typeof clientName === 'string' &&
               clientName.toLowerCase().trim() === normalizedNew;
      });

      if (existsInCustom) {
        return res.status(409).json({
          success: false,
          message: `Client "${formattedName}" already exists in the custom client list`,
          existingClient: formattedName
        });
      }

      // Add to database
      const clientData = {
        name: formattedName,
        client_name: formattedName,
        email: `${formattedName.toLowerCase().replace(/\s+/g, '.')}@client.custom`,
        added_by: username,
        tenantId: tenantId,
        created_at: new Date().toISOString(),
        is_active: true
      };

      try {
        const savedClient = await addClient(clientData, tenantId);
        console.log('✅ Successfully added client:', formattedName);

        return res.status(201).json({
          success: true,
          message: `Client "${formattedName}" added successfully`,
          client: {
            id: savedClient.id,
            name: formattedName,
            added_by: username,
            created_at: clientData.created_at
          }
        });

      } catch (dbError) {
        console.error('❌ Database error adding client:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Failed to save client to database',
          error: dbError.message
        });
      }

    } else {
      // Method not allowed
      console.log('❌ Method not allowed:', req.method);
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed`,
        allowedMethods: ['GET', 'POST', 'OPTIONS']
      });
    }

  } catch (error) {
    console.error('💥 Clients API error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack
      })
    });
  }
}