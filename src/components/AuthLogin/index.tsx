import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/utils/AuthContext';

const AuthLogin: React.FC = () => {
  const { t } = useTranslation();
  const { login, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [visible, setVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
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
    <div className="flex h-full min-h-dvh w-full items-center justify-center bg-background">
      {loading ? (
        <Spinner className="size-8 text-primary" />
      ) : (
        <Card className="mx-4 w-full max-w-sm p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-lg font-semibold text-foreground">
                Spy Tobank
              </h1>
              <p className="m-0 text-sm text-muted-foreground">
                {t('auth.login_subtitle', {
                  defaultValue: 'Enter the debugger password',
                })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="auth-password"
                className="text-sm font-medium text-foreground"
              >
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  aria-invalid={!!errorMsg}
                  aria-describedby={
                    errorMsg ? 'auth-password-error' : undefined
                  }
                  className="h-11 pr-12 text-base md:h-9 md:text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-touch"
                  className="absolute inset-y-0 right-0 md:size-9 md:min-h-0 md:min-w-0"
                  aria-label={
                    visible
                      ? (t('auth.hide_password', {
                          defaultValue: 'Hide password',
                        }) as string)
                      : (t('auth.show_password', {
                          defaultValue: 'Show password',
                        }) as string)
                  }
                  aria-pressed={visible}
                  onClick={() => setVisible((v) => !v)}
                >
                  {visible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {errorMsg && (
                <p
                  id="auth-password-error"
                  role="alert"
                  className="m-0 text-sm text-destructive"
                >
                  {errorMsg}
                </p>
              )}
            </div>
            <Button
              type="submit"
              size="touch"
              disabled={submitting}
              className="w-full md:h-9 md:text-sm"
            >
              {submitting && <Spinner className="size-4" />}
              {t('auth.login_button') as string}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};

export default AuthLogin;
