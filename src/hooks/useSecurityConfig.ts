/**
 * Enhanced security configuration and utilities hook
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, sessionManager } from '@/lib/security';

interface SecurityConfig {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  sessionTimeoutMs: number;
  maxLoginAttempts: number;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  maxLoginAttempts: 5,
};

export function useSecurityConfig(businessId?: string) {
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadSecurityConfig(businessId);
    }
  }, [businessId]);

  const loadSecurityConfig = async (businessId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('password_policies')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setConfig({
          passwordMinLength: data.min_length,
          passwordRequireUppercase: data.require_uppercase,
          passwordRequireLowercase: data.require_lowercase,
          passwordRequireNumbers: data.require_numbers,
          passwordRequireSpecialChars: data.require_special_chars,
          sessionTimeoutMs: DEFAULT_SECURITY_CONFIG.sessionTimeoutMs,
          maxLoginAttempts: DEFAULT_SECURITY_CONFIG.maxLoginAttempts,
        });
      } else {
        // Create default policy for business
        await createDefaultSecurityPolicy(businessId);
      }
    } catch (error) {
      console.error('Error loading security config:', error);
      logSecurityEvent('Failed to load security config', { businessId, error });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSecurityPolicy = async (businessId: string) => {
    try {
      const { error } = await supabase
        .from('password_policies')
        .insert([{
          business_id: businessId,
          min_length: DEFAULT_SECURITY_CONFIG.passwordMinLength,
          require_uppercase: DEFAULT_SECURITY_CONFIG.passwordRequireUppercase,
          require_lowercase: DEFAULT_SECURITY_CONFIG.passwordRequireLowercase,
          require_numbers: DEFAULT_SECURITY_CONFIG.passwordRequireNumbers,
          require_special_chars: DEFAULT_SECURITY_CONFIG.passwordRequireSpecialChars,
        }]);

      if (error) throw error;
      
      logSecurityEvent('Default security policy created', { businessId });
    } catch (error) {
      console.error('Error creating default security policy:', error);
    }
  };

  const updateSecurityConfig = async (businessId: string, newConfig: Partial<SecurityConfig>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('password_policies')
        .upsert({
          business_id: businessId,
          min_length: newConfig.passwordMinLength ?? config.passwordMinLength,
          require_uppercase: newConfig.passwordRequireUppercase ?? config.passwordRequireUppercase,
          require_lowercase: newConfig.passwordRequireLowercase ?? config.passwordRequireLowercase,
          require_numbers: newConfig.passwordRequireNumbers ?? config.passwordRequireNumbers,
          require_special_chars: newConfig.passwordRequireSpecialChars ?? config.passwordRequireSpecialChars,
        });

      if (error) throw error;

      setConfig(prev => ({ ...prev, ...newConfig }));
      logSecurityEvent('Security policy updated', { businessId, changes: newConfig });
    } catch (error) {
      console.error('Error updating security config:', error);
      logSecurityEvent('Failed to update security policy', { businessId, error });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Initialize session management
  useEffect(() => {
    const handleTimeout = () => {
      logSecurityEvent('Session timeout triggered');
      supabase.auth.signOut();
    };

    sessionManager.startTimer(handleTimeout);

    // Reset timer on user activity
    const resetTimer = () => sessionManager.resetTimer();
    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    return () => {
      sessionManager.clearTimer();
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, []);

  return {
    config,
    loading,
    updateSecurityConfig,
    DEFAULT_SECURITY_CONFIG,
  };
}