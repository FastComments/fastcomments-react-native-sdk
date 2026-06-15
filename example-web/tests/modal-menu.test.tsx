/**
 * Web-lane behavior tests for the anchored dropdown menu (ModalMenu) and the
 * shared outside-click dismissal. These run in jsdom through react-native-web,
 * the only lane that executes the web dropdown path (the node tests-ui suite
 * resolves the native platform and renders the centered Modal instead).
 *
 * Guards the post-refactor contract of useDismissOnOutsideClick + explicit
 * close-on-select: the outside-click listener excludes the menu content, so
 * selecting an item must close the menu on its own (pin/unpin-style handlers
 * never touch the modal id), while a true outside click still dismisses and a
 * sub-modal item keeps the surface open.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Text } from 'react-native';
import { ModalMenu, type ModalMenuItem } from '../../src/components/modal-menu';
import type { IFastCommentsStyles } from '../../src/types';

afterEach(cleanup);

const styles = {} as IFastCommentsStyles;
const closeIcon = { uri: '' };

function openMenu(getByTestId: (id: string) => HTMLElement) {
    fireEvent.click(getByTestId('modalMenuOpenButton'));
}

describe('ModalMenu web dropdown', () => {
    it('opens the anchored dropdown and renders its items', async () => {
        const items: ModalMenuItem[] = [{ id: 'act', label: 'Act', handler: () => {} }];
        const { getByTestId, queryByTestId } = render(
            <ModalMenu closeIcon={closeIcon} items={items} styles={styles} openButton={<Text>Open</Text>} />
        );
        openMenu(getByTestId);
        await waitFor(() => expect(queryByTestId('menuItem-act')).not.toBeNull());
    });

    it('closes the menu when an action item is selected (no sub-modal)', async () => {
        let acted = false;
        const items: ModalMenuItem[] = [{ id: 'act', label: 'Act', handler: () => { acted = true; } }];
        const { getByTestId, queryByTestId } = render(
            <ModalMenu closeIcon={closeIcon} items={items} styles={styles} openButton={<Text>Open</Text>} />
        );
        openMenu(getByTestId);
        await waitFor(() => expect(queryByTestId('menuItem-act')).not.toBeNull());
        fireEvent.click(getByTestId('menuItem-act'));
        expect(acted).toBe(true);
        // Pin/unpin-style handlers never set the modal id; the menu must still close.
        await waitFor(() => expect(queryByTestId('menuItem-act')).toBeNull());
    });

    it('dismisses on a true outside click', async () => {
        const items: ModalMenuItem[] = [{ id: 'act', label: 'Act', handler: () => {} }];
        const { getByTestId, queryByTestId } = render(
            <ModalMenu closeIcon={closeIcon} items={items} styles={styles} openButton={<Text>Open</Text>} />
        );
        openMenu(getByTestId);
        await waitFor(() => expect(queryByTestId('menuItem-act')).not.toBeNull());
        fireEvent.click(document.body);
        await waitFor(() => expect(queryByTestId('menuItem-act')).toBeNull());
    });

    it('keeps the surface open and shows the sub-modal when a sub-modal item is selected', async () => {
        const items: ModalMenuItem[] = [
            {
                id: 'edit',
                label: 'Edit',
                handler: (setModalId) => setModalId('edit'),
                subModalContent: () => <Text testID="editSubmodal">Editing</Text>,
            },
        ];
        const { getByTestId, queryByTestId } = render(
            <ModalMenu closeIcon={closeIcon} items={items} styles={styles} openButton={<Text>Open</Text>} />
        );
        openMenu(getByTestId);
        await waitFor(() => expect(queryByTestId('menuItem-edit')).not.toBeNull());
        fireEvent.click(getByTestId('menuItem-edit'));
        // The dropdown item is gone, replaced by the sub-modal content.
        await waitFor(() => expect(queryByTestId('editSubmodal')).not.toBeNull());
        expect(queryByTestId('menuItem-edit')).toBeNull();
    });
});
