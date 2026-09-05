import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LS_KEY_USER_SETTINGS } from '@/vdb/constants.js';

import {
    migrateTableSettings,
    TABLE_SETTINGS_VERSION,
    UserSettings,
    UserSettingsContext,
    UserSettingsContextType,
    UserSettingsProvider,
} from './user-settings.js';

const mocks = vi.hoisted(() => ({
    serverSettings: null as unknown,
    saved: [] as unknown[],
}));

vi.mock('../graphql/api.js', () => ({
    api: {
        query: () => Promise.resolve({ getSettingsStoreValue: mocks.serverSettings }),
        mutate: (_doc: unknown, variables: any) => {
            mocks.saved.push(variables.input.value);
            return Promise.resolve({ setSettingsStoreValue: { result: 'UPDATED' } });
        },
    },
}));

describe('migrateTableSettings', () => {
    it('drops an empty saved columnFilters entry left behind by older versions', () => {
        // Before this migration, merely visiting a list page saved `columnFilters: []` for it.
        // Leaving that in place would make every existing user look like they had cleared
        // their filters, and `defaultColumnFilters` would never apply to any of them.
        const migrated = migrateTableSettings({
            tableSettings: { 'product-list': { columnFilters: [], pageSize: 25 } },
        } as UserSettings);

        expect(migrated.tableSettings?.['product-list']).toEqual({ pageSize: 25 });
        expect(migrated.tableSettings?.['product-list']).not.toHaveProperty('columnFilters');
    });

    it('preserves a non-empty saved columnFilters entry', () => {
        const columnFilters = [{ id: 'name', value: { contains: 'shoe' } }];

        const migrated = migrateTableSettings({
            tableSettings: { 'product-list': { columnFilters } },
        } as UserSettings);

        expect(migrated.tableSettings?.['product-list'].columnFilters).toEqual(columnFilters);
    });

    it('leaves other table settings untouched', () => {
        const migrated = migrateTableSettings({
            tableSettings: {
                'product-list': { columnFilters: [], columnOrder: ['name'] },
                'order-list': { pageSize: 50 },
            },
        } as UserSettings);

        expect(migrated.tableSettings?.['product-list']).toEqual({ columnOrder: ['name'] });
        expect(migrated.tableSettings?.['order-list']).toEqual({ pageSize: 50 });
    });

    it('stamps the settings so the migration is not repeated', () => {
        const migrated = migrateTableSettings({ tableSettings: {} } as UserSettings);

        expect(migrated.tableSettingsVersion).toBe(TABLE_SETTINGS_VERSION);
    });

    it('returns already-stamped settings untouched', () => {
        // An empty `columnFilters` in settings that carry the stamp is a real user choice —
        // the user cleared every filter after upgrading — and must survive.
        const settings = {
            tableSettings: { 'product-list': { columnFilters: [] } },
            tableSettingsVersion: TABLE_SETTINGS_VERSION,
        } as UserSettings;

        const migrated = migrateTableSettings(settings);

        // Same reference: callers rely on this to tell whether anything needs writing back.
        expect(migrated).toBe(settings);
        expect(migrated.tableSettings?.['product-list'].columnFilters).toEqual([]);
    });
});

describe('UserSettingsProvider table settings migration', () => {
    let container: HTMLDivElement;
    let root: Root;
    let latest: UserSettingsContextType | undefined;

    function Probe() {
        latest = React.useContext(UserSettingsContext);
        return null;
    }

    async function renderProvider() {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        await act(async () => {
            root.render(
                <QueryClientProvider client={queryClient}>
                    <UserSettingsProvider>
                        <Probe />
                    </UserSettingsProvider>
                </QueryClientProvider>,
            );
        });
        // Let the settings query resolve and the resulting save effect run.
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    }

    beforeEach(() => {
        (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
        localStorage.clear();
        mocks.serverSettings = null;
        mocks.saved = [];
        latest = undefined;
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('migrates settings loaded from localStorage', async () => {
        localStorage.setItem(
            LS_KEY_USER_SETTINGS,
            JSON.stringify({ tableSettings: { 'product-list': { columnFilters: [], pageSize: 25 } } }),
        );

        await renderProvider();

        expect(latest?.settings.tableSettings?.['product-list']).toEqual({ pageSize: 25 });
    });

    it('migrates the settings payload that comes back from the server', async () => {
        // The server copy replaces the local one wholesale once it arrives, so it needs the
        // same migration — otherwise it would resurrect the empty entries just dropped locally.
        localStorage.setItem(
            LS_KEY_USER_SETTINGS,
            JSON.stringify({ tableSettings: { 'product-list': { columnFilters: [] } } }),
        );
        mocks.serverSettings = {
            tableSettings: { 'product-list': { columnFilters: [], pageSize: 50 } },
        };

        await renderProvider();

        expect(latest?.settings.tableSettings?.['product-list']).toEqual({ pageSize: 50 });
    });

    it('writes the migrated settings back to the server so the migration runs once', async () => {
        mocks.serverSettings = { tableSettings: { 'product-list': { columnFilters: [] } } };

        await renderProvider();

        const lastSaved = mocks.saved.at(-1) as UserSettings | undefined;
        expect(lastSaved).toBeDefined();
        expect(lastSaved?.tableSettingsVersion).toBe(TABLE_SETTINGS_VERSION);
        expect(lastSaved?.tableSettings?.['product-list']).toEqual({});
    });

    it('leaves already-migrated server settings alone', async () => {
        mocks.serverSettings = {
            tableSettings: { 'product-list': { columnFilters: [] } },
            tableSettingsVersion: TABLE_SETTINGS_VERSION,
        };

        await renderProvider();

        // The user really did clear every filter, so the empty state survives...
        expect(latest?.settings.tableSettings?.['product-list'].columnFilters).toEqual([]);
        // ...and nothing needed writing back.
        expect(mocks.saved).toHaveLength(0);
    });
});
