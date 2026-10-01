import { checkRoomSecret } from '@/apis';
import { withPopup } from '@/utils/withPopup';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { message } from '@/utils/message';

export interface IArgs {
  address: string;
}

export const SecretModal = withPopup<IArgs, string>(
  ({ resolve, reject, params, visible }) => {
    const { t } = useTranslation();
    const [secret, setSecret] = useState('');
    const [error, setError] = useState(false);
    const { loading, run: requestCheckSecret } = useRequest(
      async () => {
        if (!secret) return;
        const { success } = await checkRoomSecret({
          address: params!.address,
          secret,
        });
        if (success) {
          resolve(secret);
        }
      },
      {
        manual: true,
        onError() {
          setError(true);
          message.error(t('socket.invalid-secret'));
        },
      },
    );

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        setSecret('');
        setError(false);
        reject(null);
      }
    };

    return (
      <Dialog open={visible} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('socket.room-secret')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestCheckSecret();
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="secret-input"
                className="text-sm font-medium text-foreground"
              >
                {t('socket.secret')}
              </label>
              <Input
                id="secret-input"
                type="password"
                autoComplete="off"
                placeholder={t('socket.secret-placeholder')!}
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
                  if (error) setError(false);
                }}
                aria-invalid={error}
                aria-describedby={error ? 'secret-error' : undefined}
                className="h-11 text-base md:h-9 md:text-sm"
                autoFocus
                required
              />
              {error && (
                <p
                  id="secret-error"
                  role="alert"
                  className="m-0 text-sm text-destructive"
                >
                  {t('socket.invalid-secret')}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="touch"
                className="md:h-9 md:text-sm"
                onClick={() => handleOpenChange(false)}
              >
                {t('socket.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                type="submit"
                size="touch"
                disabled={loading}
                className="md:h-9 md:text-sm"
              >
                {loading && <Spinner className="size-4" />}
                {t('common.join', { defaultValue: 'Join' })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
);
