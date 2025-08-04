'use client';

import React from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardNavigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard, HelpCircle } from 'lucide-react';

export function KeyboardShortcutsHelp() {
  const { shortcuts, isVisible, toggleVisibility, hideShortcuts } = useKeyboardShortcuts();

  return (
    <Dialog open={isVisible} onOpenChange={toggleVisibility}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-1"
          title="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5" />
            <span>Keyboard Shortcuts</span>
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and edit estimate lines efficiently.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex-1">
                <div className="text-sm text-gray-900">{shortcut.action}</div>
              </div>
              <Badge variant="outline" className="ml-2 font-mono text-xs">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Tip:</strong> Use Tab to navigate between cells quickly. Arrow keys work when your cursor is at the beginning or end of an input field.
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button onClick={hideShortcuts} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}