import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';

const router: Router = Router();

// Test Supabase connection
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Test connection by making a simple query to auth.users (this table always exists)
    const { data, error } = await supabase.auth.getUser();

    // Even if there's no user, if we get a response without a connection error, we're connected
    const response: ApiResponse = {
      success: true,
      message: 'Supabase connection successful',
      data: { 
        connected: true,
        url: process.env.SUPABASE_URL,
        hasAuth: !error || error.message !== 'Invalid API key'
      },
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to test Supabase connection',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    res.status(500).json(response);
  }
});

// Test database connection with a simple query
router.get('/db-test', async (req: Request, res: Response) => {
  try {
    // Test with a simple query that should work on Supabase
    // We'll try to get the current timestamp from the database
    const { data, error } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);

    // Even if there are no users, if we get a response without a connection error, we're connected
    const response: ApiResponse = {
      success: true,
      message: 'Database connection successful',
      data: { 
        connected: true,
        method: 'auth.users query',
        hasUsers: data && data.length > 0
      },
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to test database connection',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    res.status(500).json(response);
  }
});

// Example route to get data from a table (replace 'your_table' with actual table name)
router.get('/data', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('your_table')
      .select('*');

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch data',
        data: { error: error.message },
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: data,
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch data',
    };
    return res.status(500).json(response);
  }
});

// Example route to insert data (replace 'your_table' with actual table name)
router.post('/data', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('your_table')
      .insert([req.body])
      .select();

    if (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to insert data',
        data: { error: error.message },
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Data inserted successfully',
      data: data,
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to insert data',
    };
    return res.status(500).json(response);
  }
});

export default router;
