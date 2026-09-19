import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiPhoneFill as Phone, PiUserFill as User, PiLockFill as Lock } from 'react-icons/pi';
import { Button, Input } from '../components/ui';
import { useAuthStore } from '../stores';

export const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      await register(phone, nickname, password);
      navigate('/', { replace: true });
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      <button onClick={() => navigate(-1)} className="self-start p-2 -ml-2 mb-8">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h1 className="text-2xl font-bold mb-1">Create Account</h1>
        <p className="text-ink-muted mb-8">Join the live community</p>

        {error && (
          <div className="bg-red-600/20 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            icon={<User className="w-4 h-4" />}
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <Input
            icon={<Phone className="w-4 h-4" />}
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
          />
          <Input
            icon={<Lock className="w-4 h-4" />}
            placeholder="Password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
          <Button fullWidth onClick={handleRegister} loading={isLoading}>
            Create Account
          </Button>
        </div>

        <p className="text-center text-sm text-ink-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-500 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
