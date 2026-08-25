import { mergeConfig } from '@vendure/core';
import { createTestEnvironment } from '@vendure/testing';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { initialData } from '../../../e2e-common/e2e-initial-data';
import { TEST_SETUP_TIMEOUT_MS, testConfig } from '../../../e2e-common/test-config';

import { getCustomerDocument, getCustomerListDocument } from './graphql/shared-definitions';

describe('authOptions.disableLastLoginUpdate (default false)', () => {
    const { server, adminClient, shopClient } = createTestEnvironment(testConfig());

    beforeAll(async () => {
        await server.init({
            initialData,
            productsCsvPath: path.join(__dirname, 'fixtures/e2e-products-minimal.csv'),
            customerCount: 1,
        });
        await adminClient.asSuperAdmin();
    }, TEST_SETUP_TIMEOUT_MS);

    afterAll(async () => {
        await server.destroy();
    });

    it('updates User.lastLogin on successful login', async () => {
        const { customers } = await adminClient.query(getCustomerListDocument);
        const customer = customers.items[0];

        const before = await adminClient.query(getCustomerDocument, { id: customer.id });
        expect(before.customer?.user?.lastLogin).toBeNull();

        await shopClient.asUserWithCredentials(customer.emailAddress, 'test');

        const after = await adminClient.query(getCustomerDocument, { id: customer.id });
        expect(after.customer?.user?.lastLogin).not.toBeNull();
    });
});

describe('authOptions.disableLastLoginUpdate (true)', () => {
    const { server, adminClient, shopClient } = createTestEnvironment(
        mergeConfig(testConfig(), {
            authOptions: {
                disableLastLoginUpdate: true,
            },
        }),
    );

    beforeAll(async () => {
        await server.init({
            initialData,
            productsCsvPath: path.join(__dirname, 'fixtures/e2e-products-minimal.csv'),
            customerCount: 1,
        });
        await adminClient.asSuperAdmin();
    }, TEST_SETUP_TIMEOUT_MS);

    afterAll(async () => {
        await server.destroy();
    });

    it('does not update User.lastLogin on successful login', async () => {
        const { customers } = await adminClient.query(getCustomerListDocument);
        const customer = customers.items[0];

        const before = await adminClient.query(getCustomerDocument, { id: customer.id });
        expect(before.customer?.user?.lastLogin).toBeNull();

        await shopClient.asUserWithCredentials(customer.emailAddress, 'test');

        const after = await adminClient.query(getCustomerDocument, { id: customer.id });
        expect(after.customer?.user?.lastLogin).toBeNull();
    });
});
