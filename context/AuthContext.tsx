import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (name: string, password_provided: string, portId: string) => Promise<void>;
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
        console.error("Failed to fetch users:", error);
    }
  }, []);

  useEffect(() => {
    // On initial load, fetch the list of users for management purposes,
    // but don't automatically log anyone in.
    const initialLoad = async () => {
        setIsLoading(true);
        await fetchUsers();
        setIsLoading(false);
    }
    initialLoad();
  }, [fetchUsers]);

  const login = async (name: string, password_provided: string, portId: string) => {
    const user = await api.loginUser(name, password_provided, portId);
    setCurrentUser(user);
  };
  
  const logout = async () => {
    if (currentUser) {
        await api.logoutUser(currentUser.id);
    }
    setCurrentUser(null);
  }

  const addUser = async (user: Omit<User, 'id'>) => {
      await api.addUser(user);
      await fetchUsers();
  };

  const updateUser = async (id: string, user: User) => {
      await api.updateUser(id, user);
      await fetchUsers();
  };

  const deleteUser = async (id: string) => {
      await api.deleteUser(id);
      await fetchUsers();
  };


  const value = { currentUser, users, login, logout, addUser, updateUser, deleteUser, isLoading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};