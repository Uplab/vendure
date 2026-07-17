import { AssetType } from '@vendure/common/lib/generated-types';
import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestContext } from '../../../api/common/request-context';
import { ConfigService } from '../../../config/config.service';
import { StoredMediaService } from './stored-media.service';

const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
);

describe('StoredMediaService', () => {
    const files = new Map<string, Buffer>();
    const storage = {
        fileExists: vi.fn(async () => false),
        writeFileFromBuffer: vi.fn(async (name: string, data: Buffer) => {
            files.set(name, data);
            return name;
        }),
        writeFileFromStream: vi.fn(async (name: string, stream: Readable) => {
            const chunks: Buffer[] = [];
            for await (const chunk of stream) chunks.push(Buffer.from(chunk));
            files.set(name, Buffer.concat(chunks));
            return name;
        }),
        readFileToBuffer: vi.fn(async (name: string) => files.get(name)!),
        deleteFile: vi.fn(async (name: string) => {
            files.delete(name);
        }),
    };
    const configService = {
        assetOptions: {
            permittedFileTypes: ['image/*'],
            assetStorageStrategy: storage,
            assetPreviewStrategy: { generatePreviewImage: vi.fn(async () => png) },
            assetNamingStrategy: {
                generateSourceFileName: vi.fn((_ctx, name: string) => `source/${name}`),
                generatePreviewFileName: vi.fn((_ctx, name: string) => `preview/${name}`),
            },
        },
    } as unknown as ConfigService;
    let service: StoredMediaService;

    beforeEach(() => {
        files.clear();
        vi.clearAllMocks();
        service = new StoredMediaService(configService);
    });

    it('validates, previews and stores an image', async () => {
        const result = await service.storeStream(
            RequestContext.empty(),
            Readable.from(png),
            'avatar.png',
            'image/png',
            { imageOnly: true },
        );

        expect(result).toMatchObject({
            type: AssetType.IMAGE,
            width: 1,
            height: 1,
            mimeType: 'image/png',
            source: 'source/avatar.png',
            preview: 'preview/source/avatar.png',
        });
        expect(files.size).toBe(2);
    });

    it('rejects content whose magic bytes reveal a non-image', async () => {
        const result = await service.storeStream(
            RequestContext.empty(),
            Readable.from(Buffer.from('%PDF-1.7\n')),
            'avatar.png',
            'image/png',
            { imageOnly: true },
        );

        expect(result.__typename).toBe('MimeTypeError');
        expect(files.size).toBe(0);
    });

    it('cleans up the source when writing the preview fails', async () => {
        storage.writeFileFromBuffer
            .mockImplementationOnce(async (name: string, data: Buffer) => {
                files.set(name, data);
                return name;
            })
            .mockRejectedValueOnce(new Error('preview failed'));

        await expect(
            service.storeStream(RequestContext.empty(), Readable.from(png), 'avatar.png', 'image/png'),
        ).rejects.toThrow('preview failed');
        expect(storage.deleteFile).toHaveBeenCalledWith('source/avatar.png');
        expect(files.size).toBe(0);
    });

    it('attempts to delete both owned files when one deletion fails', async () => {
        storage.deleteFile
            .mockRejectedValueOnce(new Error('source delete failed'))
            .mockResolvedValueOnce(undefined);

        await expect(
            service.delete({ source: 'source.png', preview: 'preview.png' }),
        ).resolves.toBeUndefined();
        expect(storage.deleteFile).toHaveBeenNthCalledWith(1, 'source.png');
        expect(storage.deleteFile).toHaveBeenNthCalledWith(2, 'preview.png');
    });
});
