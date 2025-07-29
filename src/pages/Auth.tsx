import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { validatePasswordStrength, PasswordStrength } from '@/lib/passwordValidation';
import { validateEmail } from '@/lib/formValidation';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';
import { sanitizeText, rateLimiter, RATE_LIMITS, logSecurityEvent } from '@/lib/security';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isValid: false });
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Real-time password validation
  useEffect(() => {
    if (password && isSignUp) {
      const strength = validatePasswordStrength(password);
      setPasswordStrength(strength);
      setPasswordError(strength.isValid ? '' : 'Password does not meet security requirements');
    } else {
      setPasswordStrength({ score: 0, feedback: [], isValid: false });
      setPasswordError('');
    }
  }, [password, isSignUp]);

  // Real-time email validation
  useEffect(() => {
    if (email) {
      const emailValidation = validateEmail(email);
      setEmailError(emailValidation.isValid ? '' : emailValidation.errors[0] || '');
    } else {
      setEmailError('');
    }
  }, [email]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!rateLimiter.checkLimit('AUTH_ATTEMPTS', email)) {
      toast({
        title: "Too many attempts",
        description: "Please wait before trying again",
        variant: "destructive",
      });
      return;
    }

    // Input validation and sanitization
    const sanitizedEmail = sanitizeText(email);
    const emailValidation = validateEmail(sanitizedEmail);
    
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.errors[0] || '');
      return;
    }

    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await signIn(sanitizedEmail, password);
      
      if (error) {
        logSecurityEvent('Failed sign in attempt', { 
          resource: 'authentication',
          email: sanitizedEmail,
          error: error.message 
        });
        
        toast({
          title: "Error signing in",
          description: error.message,
          variant: "destructive",
        });
      } else {
        logSecurityEvent('Successful sign in', { resource: 'authentication', email: sanitizedEmail });
        navigate('/dashboard');
      }
    } catch (error) {
      logSecurityEvent('Sign in error', { 
        resource: 'authentication',
        email: sanitizedEmail,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast({
        title: "Error signing in",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!rateLimiter.checkLimit('AUTH_ATTEMPTS', email)) {
      toast({
        title: "Too many attempts",
        description: "Please wait before trying again",
        variant: "destructive",
      });
      return;
    }

    // Input validation and sanitization
    const sanitizedEmail = sanitizeText(email);
    const emailValidation = validateEmail(sanitizedEmail);
    
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.errors[0] || '');
      return;
    }

    if (!passwordStrength.isValid) {
      setPasswordError('Password does not meet security requirements');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await signUp(sanitizedEmail, password);
      
      if (error) {
        logSecurityEvent('Failed sign up attempt', { 
          resource: 'authentication',
          email: sanitizedEmail,
          error: error.message 
        });
        
        toast({
          title: "Error signing up",
          description: error.message,
          variant: "destructive",
        });
      } else {
        logSecurityEvent('Successful sign up', { resource: 'authentication', email: sanitizedEmail });
        
        toast({
          title: "Account created",
          description: "Please check your email to verify your account.",
        });
        
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      logSecurityEvent('Sign up error', { 
        resource: 'authentication',
        email: sanitizedEmail,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast({
        title: "Error signing up",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Business CRM</h1>
          <p className="text-muted-foreground">Manage your customers and appointments</p>
        </div>
        
        <Tabs 
          defaultValue="signin" 
          className="w-full"
          onValueChange={(value) => {
            setIsSignUp(value === 'signup');
            // Clear errors when switching tabs
            setEmailError('');
            setPasswordError('');
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={emailError ? 'border-destructive' : ''}
                      required
                    />
                    {emailError && (
                      <p className="text-sm text-destructive">{emailError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={passwordError ? 'border-destructive' : ''}
                      required
                    />
                    {passwordError && (
                      <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Sign Up</CardTitle>
                <CardDescription>
                  Create a new account to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={emailError ? 'border-destructive' : ''}
                      required
                    />
                    {emailError && (
                      <p className="text-sm text-destructive">{emailError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={passwordError ? 'border-destructive' : ''}
                      required
                    />
                    {password && (
                      <PasswordStrengthIndicator 
                        score={passwordStrength.score}
                        feedback={passwordStrength.feedback}
                        className="mt-2"
                      />
                    )}
                    {passwordError && (
                      <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={password !== confirmPassword && confirmPassword ? 'border-destructive' : ''}
                      required
                    />
                    {password !== confirmPassword && confirmPassword && (
                      <p className="text-sm text-destructive">Passwords do not match</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !passwordStrength.isValid || emailError !== '' || password !== confirmPassword}
                  >
                    {loading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;