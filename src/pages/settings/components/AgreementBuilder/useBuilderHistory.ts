import { useCallback, useEffect, useRef, useState } from 'react';

const BURST_MS = 600;
const LIMIT = 100;

/**
 * Undo/redo for the Agreement Builder. Every change to `snapshot` is a step;
 * changes in quick succession (typing) are one step. `reset` starts a fresh
 * history, e.g. once an agreement has loaded.
 */
export function useBuilderHistory<T>(snapshot: T, apply: (snapshot: T) => void) {
    const serialized = JSON.stringify(snapshot);
    const past = useRef<string[]>([]);
    const future = useRef<string[]>([]);
    const current = useRef(serialized);
    const burst = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [, rerender] = useState(0);

    const endBurst = () => {
        if (burst.current) clearTimeout(burst.current);
        burst.current = null;
    };

    useEffect(() => {
        if (serialized === current.current) return;
        if (!burst.current) {
            past.current.push(current.current);
            if (past.current.length > LIMIT) past.current.shift();
            future.current = [];
            rerender((n) => n + 1);
        } else {
            clearTimeout(burst.current);
        }
        current.current = serialized;
        burst.current = setTimeout(() => { burst.current = null; }, BURST_MS);
    }, [serialized]);

    useEffect(() => endBurst, []);

    const move = useCallback((from: React.MutableRefObject<string[]>, to: React.MutableRefObject<string[]>) => {
        const target = from.current.pop();
        if (target === undefined) return;
        endBurst();
        to.current.push(current.current);
        // Set first, so the change it causes is not recorded as a new step.
        current.current = target;
        apply(JSON.parse(target));
        rerender((n) => n + 1);
    }, [apply]);

    const undo = useCallback(() => move(past, future), [move]);
    const redo = useCallback(() => move(future, past), [move]);

    const reset = useCallback((fresh: T) => {
        endBurst();
        past.current = [];
        future.current = [];
        current.current = JSON.stringify(fresh);
        rerender((n) => n + 1);
    }, []);

    return { undo, redo, reset, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
