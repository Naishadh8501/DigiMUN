import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Crown, User, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Role } from '@/data/mockData';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

const roles: { role: Role; label: string; icon: React.ReactNode; desc: string }[] = [
  { role: 'chair', label: 'Chair', icon: <Crown className="h-6 w-6" />, desc: 'Full committee control, marksheet, and evaluation access' },
  { role: 'vice-chair', label: 'Vice Chair', icon: <Shield className="h-6 w-6" />, desc: 'Administrative access with committee management tools' },
  { role: 'delegate', label: 'Delegate', icon: <User className="h-6 w-6" />, desc: 'Participate in debates, voting, and send chits' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!selectedRole || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const username = selectedRole === 'delegate' ? country.trim() : name.trim();
    if (!username) {
      toast.error(selectedRole === 'delegate' ? "Please enter your country" : "Please enter your username");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          username: username,
          password: password.trim()
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.detail || "Invalid credentials. Please try again.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      
      // Pass the verified name/country to the local auth context
      login(selectedRole, selectedRole === 'delegate' ? data.user.country : data.user.name);
      toast.success("Login successful!");
      navigate('/');
      
    } catch (error) {
      console.error("Login Error:", error);
      toast.error("Network error. Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="font-heading text-4xl font-bold tracking-tight mb-2">
            Digi<span className="text-primary">MUN</span>
          </h1>
          <p className="text-muted-foreground text-sm">Model United Nations Simulation Platform</p>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">Select Role</label>
            <div className="space-y-3">
              {roles.map(r => (
                <button
                  key={r.role}
                  onClick={() => setSelectedRole(r.role)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 text-left ${
                    selectedRole === r.role
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedRole === r.role ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {r.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-heading font-semibold text-sm">{r.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedRole && (
            <div className="space-y-4 animate-fade-in">
              {/* Admin Username Input */}
              {(selectedRole === 'chair' || selectedRole === 'vice-chair') && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Username</label>
                  <Input
                    placeholder="e.g., Naishadh Bhavsar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
              )}

              {/* Delegate Country Input */}
              {selectedRole === 'delegate' && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Delegation (Country)</label>
                  <Input
                    placeholder="e.g., United States, India, Brazil..."
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="h-11"
                  />
                </div>
              )}

              {/* Universal Password Input */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-11"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
          )}

          <Button
            className="w-full h-11 font-heading font-semibold mt-4"
            disabled={
              !selectedRole || 
              !password.trim() || 
              (selectedRole === 'delegate' ? !country.trim() : !name.trim()) ||
              isLoading
            }
            onClick={handleLogin}
          >
            {isLoading ? 'Verifying...' : 'Enter Committee'}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}