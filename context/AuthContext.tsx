import React, { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import type { User } from '../types';
import * as api from '../services/api';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (name: string, password_provided: string, portId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
        const fetchedUsers = await api.getUsers();
        setUsers(fetchedUsers);
    } catch (error) {
        toast.error("Failed to fetch user list.");
        console.error("Failed to fetch users:", error);
    }
  }, []);

  useEffect(() => {
    const initialLoad = async () => {
        setIsLoading(true);
        await fetchUsers();
        // Here you could add logic to check for a persisted session token
        setIsLoading(false);
    }
    initialLoad();
  }, [fetchUsers]);

  const login = async (name: string, password_provided: string, portId: string) => {
    try {
        const user = await api.loginUser(name, password_provided, portId);
        setCurrentUser(user);
        toast.success(`Welcome, ${user.name}!`);
        return true;
    } catch (error: any) {
        toast.error(error.message || "Login failed.");
        return false;
    }
  };
  
  const logout = async () => {
    if (currentUser) {
        await api.logoutUser(currentUser.id);
    }
    setCurrentUser(null);
  }

  const addUser = async (user: Omit<User, 'id'>) => {
      await toast.promise(api.addUser(user), {
          loading: 'Adding user...',
          success: 'User added successfully.',
          error: 'Failed to add user.'
      });
      await fetchUsers();
  };

  const updateUser = async (id: string, user: User) => {
      await toast.promise(api.updateUser(id, user), {
          loading: 'Updating user...',
          success: 'User updated successfully.',
          error: 'Failed to update user.'
      });
      await fetchUsers();
  };

  const deleteUser = async (id: string) => {
      if (window.confirm("Are you sure you want to delete this user?")) {
        await toast.promise(api.deleteUser(id), {
            loading: 'Deleting user...',
            success: 'User deleted successfully.',
            error: 'Failed to delete user.'
        });
        await fetchUsers();
      }
  };

  const value = useMemo(() => ({ 
      currentUser, users, login, logout, addUser, updateUser, deleteUser, isLoading 
  }), [currentUser, users, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
