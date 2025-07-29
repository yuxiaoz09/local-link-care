import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { generateCSRFToken } from '@/lib/formValidation';

interface CSRFContextType {
  token: string;
  refreshToken: () => void;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export function CSRFProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('');

  const refreshToken = () => {
    setToken(generateCSRFToken());
  };

  useEffect(() => {
    refreshToken();
  }, []);

  return (
    <CSRFContext.Provider value={{ token, refreshToken }}>
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
}

interface CSRFTokenProps {
  name?: string;
}

export function CSRFToken({ name = 'csrf_token' }: CSRFTokenProps) {
  const { token } = useCSRF();
  
  return (
    <input
      type="hidden"
      name={name}
      value={token}
    />
  );
}