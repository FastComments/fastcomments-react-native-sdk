import { act } from '@testing-library/react-native';

export interface TestInstanceLike {
    props: Record<string, unknown>;
    parent: TestInstanceLike | null;
}

/**
 * Walks the host element up to the nearest composite ancestor carrying
 * `onPress` and invokes it inside `act()`. We do not use `fireEvent.press`
 * because under the RN jest preset the Pressability responder state machine
 * sometimes drops the press once the tree has re-rendered (e.g. after a live
 * event landed). Calling the onPress prop directly mirrors what the Android
 * espresso `perform(click())` does at the touch handler layer.
 */
export function pressViaProp(element: TestInstanceLike) {
    let cursor: TestInstanceLike | null = element;
    while (cursor) {
        const onPress = cursor.props?.onPress;
        if (typeof onPress === 'function') {
            const fn = onPress;
            act(() => {
                fn();
            });
            return;
        }
        cursor = cursor.parent;
    }
    throw new Error('No onPress prop found in the ancestor chain');
}

/**
 * Same rationale as `pressViaProp`: directly invoke `onChangeText` instead of
 * `fireEvent.changeText`, which is unreliable on this tree once it has
 * re-rendered (host-component-name detection sometimes silently drops the
 * event for a TextInput that re-mounted).
 */
export function changeTextViaProp(element: TestInstanceLike, value: string) {
    const onChangeText = element.props?.onChangeText;
    if (typeof onChangeText !== 'function') {
        throw new Error('Element does not have an onChangeText prop');
    }
    const fn = onChangeText;
    act(() => {
        fn(value);
    });
}
