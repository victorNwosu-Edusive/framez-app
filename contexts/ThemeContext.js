import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Get initial system theme
    const colorScheme = Appearance.getColorScheme();
    setIsDarkMode(colorScheme === 'dark');
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = {
    isDarkMode,
    colors: {
      background: isDarkMode ? '#121212' : '#ffffff',
      surface: isDarkMode ? '#1e1e1e' : '#f8f8f8',
      text: isDarkMode ? '#ffffff' : '#000000',
      textSecondary: isDarkMode ? '#cccccc' : '#666666',
      primary: '#007AFF',
      accent: '#FF3B30',
      border: isDarkMode ? '#333333' : '#dddddd',
      card: isDarkMode ? '#2a2a2a' : '#ffffff',
    },
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
