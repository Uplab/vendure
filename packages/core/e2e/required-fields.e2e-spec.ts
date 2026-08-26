import { LanguageCode } from '@vendure/common/lib/generated-types';
import { createTestEnvironment } from '@vendure/testing';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { initialData } from '../../../e2e-common/e2e-initial-data';
import { TEST_SETUP_TIMEOUT_MS, testConfig } from '../../../e2e-common/test-config';

import {
    createChannelDocument,
    createFacetDocument,
    createFacetValueDocument,
    createProductDocument,
    createProductVariantsDocument,
    createZoneDocument,
    updateChannelDocument,
    updateFacetDocument,
    updateProductDocument,
    updateProductVariantsDocument,
} from './graphql/shared-definitions';
import { createTagDocument, createTaxCategoryDocument } from './graphql/admin-definitions';
import { assertThrowsWithMessage } from './utils/assert-throws-with-message';

describe('Required field validation (empty/whitespace strings)', () => {
    const { server, adminClient, shopClient } = createTestEnvironment(testConfig());

    beforeAll(async () => {
        await server.init({
            initialData,
            productsCsvPath: path.join(__dirname, 'fixtures/e2e-products-full.csv'),
            customerCount: 1,
        });
        await adminClient.asSuperAdmin();
    }, TEST_SETUP_TIMEOUT_MS);

    afterAll(async () => {
        await server.destroy();
    });

    describe('Product (translation name/slug)', () => {
        it('rejects empty name in translation', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createProductDocument, {
                    input: {
                        translations: [
                            { languageCode: LanguageCode.en, name: '', slug: 'valid-slug' },
                        ],
                    },
                });
            }, 'cannot be blank')();
        });

        it('rejects empty slug in translation', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createProductDocument, {
                    input: {
                        translations: [
                            { languageCode: LanguageCode.en, name: 'Valid Name', slug: '' },
                        ],
                    },
                });
            }, 'cannot be blank')();
        });

        it('rejects whitespace-only name in translation', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createProductDocument, {
                    input: {
                        translations: [
                            { languageCode: LanguageCode.en, name: '   ', slug: 'valid-slug' },
                        ],
                    },
                });
            }, 'cannot be blank')();
        });

        it('rejects whitespace-only slug in translation', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createProductDocument, {
                    input: {
                        translations: [
                            { languageCode: LanguageCode.en, name: 'Valid Name', slug: '   ' },
                        ],
                    },
                });
            }, 'cannot be blank')();
        });

        it('accepts valid name and slug', async () => {
            const result = await adminClient.query(createProductDocument, {
                input: {
                    translations: [
                        { languageCode: LanguageCode.en, name: 'Test Product', slug: 'test-product', description: 'A test product' },
                    ],
                },
            });
            expect(result.createProduct.name).toBe('Test Product');
        });

        it('rejects blank name on update', async () => {
            const { createProduct } = await adminClient.query(createProductDocument, {
                input: {
                    translations: [
                        { languageCode: LanguageCode.en, name: 'Product To Update', slug: 'product-to-update', description: 'desc' },
                    ],
                },
            });
            await assertThrowsWithMessage(async () => {
                await adminClient.query(updateProductDocument, {
                    input: {
                        id: createProduct.id,
                        translations: [
                            { languageCode: LanguageCode.en, name: '' },
                        ],
                    },
                });
            }, 'cannot be blank')();
        });
    });

    describe('ProductVariant (sku + translation name)', () => {
        const productTranslation = (name: string, slug: string) => ({
            languageCode: LanguageCode.en,
            name,
            slug,
            description: `Description for ${name}`,
        });

        it('rejects empty sku', async () => {
            const product = await adminClient.query(createProductDocument, {
                input: {
                    translations: [productTranslation('PV Test', 'pv-test')],
                },
            });
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createProductVariantsDocument, {
                    input: [
                        {
                            productId: product.createProduct.id,
                            sku: '',
                            translations: [{ languageCode: LanguageCode.en, name: 'Variant' }],
                        },
                    ],
                });
            }, 'cannot be blank')();
        });

        it('rejects whitespace-only sku', async () => {
            const product = await adminClient.query(createProductDocument, {
                input: {
                    translations: [productTranslation('PV WS Test', 'pv-ws-test')],
                },
            });
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createProductVariantsDocument, {
                    input: [
                        {
                            productId: product.createProduct.id,
                            sku: '   ',
                            translations: [{ languageCode: LanguageCode.en, name: 'Variant' }],
                        },
                    ],
                });
            }, 'cannot be blank')();
        });

        it('rejects empty translation name', async () => {
            const product = await adminClient.query(createProductDocument, {
                input: {
                    translations: [productTranslation('PV Name Test', 'pv-name-test')],
                },
            });
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createProductVariantsDocument, {
                    input: [
                        {
                            productId: product.createProduct.id,
                            sku: 'SKU-1',
                            translations: [{ languageCode: LanguageCode.en, name: '' }],
                        },
                    ],
                });
            }, 'cannot be blank')();
        });

        it('accepts valid sku and name', async () => {
            const product = await adminClient.query(createProductDocument, {
                input: {
                    translations: [productTranslation('PV Valid', 'pv-valid')],
                },
            });
            const result = await adminClient.query(createProductVariantsDocument, {
                input: [
                    {
                        productId: product.createProduct.id,
                        sku: 'SKU-VALID',
                        translations: [{ languageCode: LanguageCode.en, name: 'Valid Variant' }],
                    },
                ],
            });
            expect(result.createProductVariants[0].sku).toBe('SKU-VALID');
        });
    });

    describe('Facet (code + translation name)', () => {
        it('rejects empty code', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createFacetDocument, {
                    input: {
                        code: '',
                        translations: [{ languageCode: LanguageCode.en, name: 'Test Facet' }],
                        isPrivate: false,
                    },
                });
            }, 'cannot be blank')();
        });

        it('rejects empty translation name', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createFacetDocument, {
                    input: {
                        code: 'test-facet',
                        translations: [{ languageCode: LanguageCode.en, name: '' }],
                        isPrivate: false,
                    },
                });
            }, 'cannot be blank')();
        });

        it('rejects whitespace-only code', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createFacetDocument, {
                    input: {
                        code: '   ',
                        translations: [{ languageCode: LanguageCode.en, name: 'Test Facet' }],
                        isPrivate: false,
                    },
                });
            }, 'cannot be blank')();
        });

        it('accepts valid code and name', async () => {
            const result = await adminClient.query(createFacetDocument, {
                input: {
                    code: 'valid-facet',
                    translations: [{ languageCode: LanguageCode.en, name: 'Valid Facet' }],
                    isPrivate: false,
                },
            });
            expect(result.createFacet.code).toBe('valid-facet');
        });
    });

    describe('FacetValue (code + translation name)', () => {
        it('rejects empty code', async () => {
            const facet = await adminClient.query(createFacetDocument, {
                input: {
                    code: 'fv-parent',
                    translations: [{ languageCode: LanguageCode.en, name: 'FV Parent' }],
                    isPrivate: false,
                },
            });
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createFacetValueDocument, {
                    input: {
                        facetId: facet.createFacet.id,
                        code: '',
                        translations: [{ languageCode: LanguageCode.en, name: 'Test FV' }],
                    },
                });
            }, 'cannot be blank')();
        });

        it('rejects empty translation name', async () => {
            const facet = await adminClient.query(createFacetDocument, {
                input: {
                    code: 'fv-parent2',
                    translations: [{ languageCode: LanguageCode.en, name: 'FV Parent 2' }],
                    isPrivate: false,
                },
            });
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createFacetValueDocument, {
                    input: {
                        facetId: facet.createFacet.id,
                        code: 'fv-code',
                        translations: [{ languageCode: LanguageCode.en, name: '' }],
                    },
                });
            }, 'cannot be blank')();
        });
    });

    describe('Channel (code + token)', () => {
        const channelInput = {
            defaultLanguageCode: LanguageCode.en,
            pricesIncludeTax: false,
            currencyCode: 'USD' as any,
            defaultTaxZoneId: 'T_1',
            defaultShippingZoneId: 'T_1',
        };

        it('rejects empty code', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createChannelDocument, {
                    input: { ...channelInput, code: '', token: 'some-token' },
                });
            }, 'cannot be blank')();
        });

        it('rejects empty token', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createChannelDocument, {
                    input: { ...channelInput, code: 'test-channel', token: '' },
                });
            }, 'cannot be blank')();
        });

        it('rejects whitespace-only token', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createChannelDocument, {
                    input: { ...channelInput, code: 'test-channel-2', token: '   ' },
                });
            }, 'cannot be blank')();
        });

        it('accepts valid code and token', async () => {
            const result = await adminClient.query(createChannelDocument, {
                input: { ...channelInput, code: 'valid-channel', token: 'valid-token' },
            });
            expect(result.createChannel.code).toBe('valid-channel');
        });
    });

    describe('Zone (name)', () => {
        it('rejects empty name', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createZoneDocument, {
                    input: { name: '' },
                });
            }, 'cannot be blank')();
        });

        it('rejects whitespace-only name', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createZoneDocument, {
                    input: { name: '   ' },
                });
            }, 'cannot be blank')();
        });

        it('accepts valid name', async () => {
            const result = await adminClient.query(createZoneDocument, {
                input: { name: 'Test Zone' },
            });
            expect(result.createZone.name).toBe('Test Zone');
        });
    });

    describe('Channel update', () => {
        const channelInput = {
            defaultLanguageCode: LanguageCode.en,
            pricesIncludeTax: false,
            currencyCode: 'USD' as any,
            defaultTaxZoneId: 'T_1',
            defaultShippingZoneId: 'T_1',
        };

        it('rejects blank code on update', async () => {
            const { createChannel } = await adminClient.query(createChannelDocument, {
                input: { ...channelInput, code: 'channel-to-update', token: 'channel-token-update' },
            });
            await assertThrowsWithMessage(async () => {
                await adminClient.query(updateChannelDocument, {
                    input: { id: createChannel.id, code: '' },
                });
            }, 'cannot be blank')();
        });

        it('rejects blank token on update', async () => {
            const { createChannel } = await adminClient.query(createChannelDocument, {
                input: { ...channelInput, code: 'channel-to-update-2', token: 'channel-token-update-2' },
            });
            await assertThrowsWithMessage(async () => {
                await adminClient.query(updateChannelDocument, {
                    input: { id: createChannel.id, token: '' },
                });
            }, 'cannot be blank')();
        });
    });

    describe('Tag (value) — fields-only smoke test', () => {
        it('rejects empty value', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createTagDocument, { input: { value: '' } });
            }, 'cannot be blank')();
        });

        it('rejects whitespace-only value', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createTagDocument, { input: { value: '   ' } });
            }, 'cannot be blank')();
        });

        it('accepts valid value', async () => {
            const result = await adminClient.query(createTagDocument, {
                input: { value: 'test-tag' },
            });
            expect(result.createTag.value).toBe('test-tag');
        });
    });

    describe('TaxCategory (name) — fields-only smoke test', () => {
        it('rejects empty name', async () => {
            await assertThrowsWithMessage(async () => {
                await adminClient.query(createTaxCategoryDocument, { input: { name: '' } });
            }, 'cannot be blank')();
        });

        it('accepts valid name', async () => {
            const result = await adminClient.query(createTaxCategoryDocument, {
                input: { name: 'Smoke Tax Category' },
            });
            expect(result.createTaxCategory.name).toBe('Smoke Tax Category');
        });
    });
});
