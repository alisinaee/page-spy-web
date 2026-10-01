import { createRoot } from 'react-dom/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export const confirmLogFileName = (defaultName: string) =>
  new Promise<string | null>((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = () => {
      setTimeout(() => {
        root.unmount();
        container.remove();
      }, 200);
    };

    const DialogWrapper = () => {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState(defaultName);

      return (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setOpen(false);
              cleanup();
              resolve(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Save logs</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setOpen(false);
                cleanup();
                resolve(value.trim() || defaultName);
              }}
              className="flex flex-col gap-4 py-2"
            >
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <DialogFooter className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    cleanup();
                    resolve(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      );
    };

    root.render(<DialogWrapper />);
  });
