// Example file showing how to use Supabase in your routes
// This file is for reference only - not imported anywhere

import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';

// Example: Get all users
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  return data;
};

// Example: Create a new user
export const createUser = async (userData: { name: string; email: string }) => {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select();
  
  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
  
  return data;
};

// Example: Update a user
export const updateUser = async (id: string, updates: Partial<{ name: string; email: string }>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
  
  return data;
};

// Example: Delete a user
export const deleteUser = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
    .select();
  
  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
  
  return data;
};

// Example: Authentication
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Failed to sign up: ${error.message}`);
  }
  
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Failed to sign in: ${error.message}`);
  }
  
  return data;
};

// Example: Real-time subscriptions
export const subscribeToUsers = (callback: (payload: any) => void) => {
  return supabase
    .channel('users')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'users' }, 
      callback
    )
    .subscribe();
};

// Example: File upload to Supabase Storage
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file);
  
  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  return data;
};

// Example: Get public URL for a file
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};
