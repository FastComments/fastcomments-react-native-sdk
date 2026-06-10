// React 19 ships useSyncExternalStore natively; the CJS shim package breaks
// under vitest's SSR transform (null interop), so alias it here.
import { useSyncExternalStore, useRef, useEffect, useMemo, useDebugValue } from 'react';

export { useSyncExternalStore };

type Selector<Snapshot, Selection> = (snapshot: Snapshot) => Selection;

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => Snapshot,
    getServerSnapshot: undefined | null | (() => Snapshot),
    selector: Selector<Snapshot, Selection>,
    isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
    const instRef = useRef<{ hasValue: boolean; value: Selection | null }>({ hasValue: false, value: null });
    const [getSelection, getServerSelection] = useMemo(() => {
        let hasMemo = false;
        let memoizedSnapshot: Snapshot;
        let memoizedSelection: Selection;
        const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
            if (!hasMemo) {
                hasMemo = true;
                memoizedSnapshot = nextSnapshot;
                const nextSelection = selector(nextSnapshot);
                if (isEqual !== undefined && instRef.current.hasValue) {
                    const currentSelection = instRef.current.value;
                    if (currentSelection !== null && isEqual(currentSelection, nextSelection)) {
                        memoizedSelection = currentSelection;
                        return currentSelection;
                    }
                }
                memoizedSelection = nextSelection;
                return nextSelection;
            }
            if (Object.is(memoizedSnapshot, nextSnapshot)) return memoizedSelection;
            const nextSelection = selector(nextSnapshot);
            if (isEqual !== undefined && isEqual(memoizedSelection, nextSelection)) {
                memoizedSnapshot = nextSnapshot;
                return memoizedSelection;
            }
            memoizedSnapshot = nextSnapshot;
            memoizedSelection = nextSelection;
            return nextSelection;
        };
        const getSnapshotWithSelector = () => memoizedSelector(getSnapshot());
        const getServerSnapshotWithSelector = getServerSnapshot
            ? () => memoizedSelector(getServerSnapshot())
            : undefined;
        return [getSnapshotWithSelector, getServerSnapshotWithSelector];
    }, [getSnapshot, getServerSnapshot, selector, isEqual]);

    const value = useSyncExternalStore(subscribe, getSelection, getServerSelection);
    useEffect(() => {
        instRef.current.hasValue = true;
        instRef.current.value = value;
    }, [value]);
    useDebugValue(value);
    return value;
}
