import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch user data from Supabase
  const fetchUserData = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid);
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
    return null;
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Set Auth data immediately
        setCurrentUser({ uid: session.user.id, email: session.user.email });

        // Fetch Supabase data asynchronously
        fetchUserData(session.user.id).then((data) => {
          if (data) {
            setCurrentUser((prev) => ({ ...prev, ...data }));
          }
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Login
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Signup
  const signup = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setCurrentUser(null);
  };

  const refreshUserData = async () => {
    if (currentUser?.uid) {
      const data = await fetchUserData(currentUser.uid);
      if (data) {
        setCurrentUser((prev) => ({ ...prev, ...data }));
      }
    }
  };

  const value = { currentUser, login, signup, logout, refreshUserData };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
