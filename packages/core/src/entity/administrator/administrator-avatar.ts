import { Column } from 'typeorm';

import { DeepPartial } from '@vendure/common/lib/shared-types';

export class AdministratorAvatar {
    constructor(input?: DeepPartial<AdministratorAvatar>) {
        Object.assign(this, input);
    }

    @Column({ nullable: true })
    source: string;

    @Column({ nullable: true })
    preview: string;

    @Column({ nullable: true })
    mimeType: string;

    @Column({ nullable: true })
    width: number;

    @Column({ nullable: true })
    height: number;

    @Column({ nullable: true })
    fileSize: number;
}
