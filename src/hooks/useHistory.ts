import { useState, useCallback, useEffect } from 'react';
import type { GraphicDocument } from '../types';

export interface UseHistoryReturn {
  document: GraphicDocument;
  updateDocument: (newDoc: GraphicDocument) => void;
  commitDocument: (newDoc: GraphicDocument) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetHistory: (newDoc: GraphicDocument) => void;
}

export function useHistory(initialDocument: GraphicDocument): UseHistoryReturn {
  const [document, setDocumentState] = useState<GraphicDocument>(initialDocument);
  const [past, setPast] = useState<GraphicDocument[]>([]);
  const [future, setFuture] = useState<GraphicDocument[]>([]);

  // Update current document state WITHOUT adding to history stack (for live preview of drags)
  const updateDocument = useCallback((newDoc: GraphicDocument) => {
    setDocumentState(newDoc);
  }, []);

  // Commit a document change and push it to history
  const commitDocument = useCallback((newDoc: GraphicDocument) => {
    setDocumentState((current) => {
      // Don't commit if identical to the current document
      if (JSON.stringify(current) === JSON.stringify(newDoc)) {
        return current;
      }
      setPast((prevPast) => [...prevPast, current]);
      setFuture([]); // Clear future stack on new commit
      return newDoc;
    });
  }, []);

  // Go back in history
  const undo = useCallback(() => {
    if (past.length === 0) return;

    setPast((prevPast) => {
      const newPast = [...prevPast];
      const previous = newPast.pop()!;
      
      setDocumentState((current) => {
        setFuture((prevFuture) => [current, ...prevFuture]);
        return previous;
      });

      return newPast;
    });
  }, [past]);

  // Go forward in history
  const redo = useCallback(() => {
    if (future.length === 0) return;

    setFuture((prevFuture) => {
      const newFuture = [...prevFuture];
      const next = newFuture.shift()!;

      setDocumentState((current) => {
        setPast((prevPast) => [...prevPast, current]);
        return next;
      });

      return newFuture;
    });
  }, [future]);

  // Clear history stack with a new initial document
  const resetHistory = useCallback((newDoc: GraphicDocument) => {
    setDocumentState(newDoc);
    setPast([]);
    setFuture([]);
  }, []);

  // Bind Ctrl+Z and Ctrl+Y key events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if user is typing in a textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  return {
    document,
    updateDocument,
    commitDocument,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetHistory,
  };
}
