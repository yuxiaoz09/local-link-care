import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CheckSquare, 
  BarChart3, 
  TrendingUp,
  MapPin,
  UserCheck,
  Package,
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatInterface } from '@/components/chat/ChatInterface';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/customers', icon: Users, label: 'Customers' },
    { path: '/appointments', icon: Calendar, label: 'Appointments' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/locations', icon: MapPin, label: 'Locations' },
    { path: '/employees', icon: UserCheck, label: 'Employees' },
    { path: '/products', icon: Package, label: 'Products' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-6 border-b">
        <h2 className="text-xl font-bold">Business CRM</h2>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-3"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow bg-card border-r">
          <NavContent />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-xl font-bold">Business CRM</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-64">
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>

      {/* Smart Chat Interface */}
      <ChatInterface />
    </div>
  );
};

export default Layout;