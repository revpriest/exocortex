/**
 * NewUserWelcomeDialog.tsx - Offer new users a test DB and help
 */

// React hooks for state management and lifecycle
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';


/**
 * New User Welcome Dialog Component
 *
 * Shows a welcome dialog for first-time users when the database is empty.
 * Offers to generate sample data to help them understand the app.
 */
export function NewUserWelcomeDialog ({ isOpen, onClose, onGenerateTestData, onAbout }: {
  isOpen: boolean;
  onClose: () => void;
  onGenerateTestData: () => void;
  onAbout: () => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    await onGenerateTestData();
    setIsGenerating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg">Welcome to ExocortexLog!</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-base text-foreground">
            New user? Would you like some random test data to explore the app?
          </p>
          <p className="text-sm text-muted-foreground">
            The test data can be deleted in the conf screen.
          </p>
        </div>
        <DialogFooter className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onAbout}
            disabled={isGenerating}
            className="bg-secondary border-border"
          >
            About
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="bg-secondary border-border"
          >
            No
          </Button>
          <Button
            onClick={handleGenerateTest}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90"
          >
            {isGenerating ? 'Generating...' : 'Yes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

