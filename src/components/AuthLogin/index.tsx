import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, Lock, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/utils/AuthContext';

const AuthLogin: React.FC = () => {
  const { t } = useTranslation();
  const { login, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg(t('auth.please_enter_password') as string);
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-login-container absolute inset-0 z-10 box-border flex items-center justify-center bg-background p-4 pt-[50px]">
      {loading ? (
        <Spinner className="h-8 w-8 text-primary" />
      ) : (
        <Card className="auth-login-card m-auto w-full max-w-sm overflow-hidden rounded-xl border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>{t('auth.login_title')}</span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="text-muted-foreground hover:text-foreground cursor-pointer inline-flex">
                      <Info className="h-4 w-4" />
                    </span>
                  }
                />
                <TooltipContent>
                  {t('auth.login_title_desc') as string}
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder={t('auth.password') as string}
                  className="pl-9 h-11"
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-destructive">{errorMsg}</p>
              )}
              <Button
                type="submit"
                size="touch"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {t('auth.login_button') as string}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AuthLogin;
