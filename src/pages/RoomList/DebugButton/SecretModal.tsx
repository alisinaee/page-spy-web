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
import { message } from '@/utils/message';

export interface IArgs {
  address: string;
}

export const SecretModal = withPopup<IArgs, string>(
  ({ resolve, reject, params, visible }) => {
    const { t } = useTranslation();
    const [secret, setSecret] = useState('');
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
          message.error(t('socket.invalid-secret'));
        },
      },
    );

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        setSecret('');
        reject(null);
      }
    };

    return (
      <Dialog open={visible} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>{t('socket.room-secret')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestCheckSecret();
            }}
            className="flex flex-col gap-4 py-2"
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
                placeholder={t('socket.secret-placeholder')!}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter className="mt-2">
              <Button type="submit" disabled={loading} size="default">
                {loading ? '...' : t('common.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
);
