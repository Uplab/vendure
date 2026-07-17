import { ChannelColorSwatch } from '@/vdb/components/shared/channel-identity.js';
import { Label } from '@/vdb/components/ui/label.js';
import { RadioGroup, RadioGroupItem } from '@/vdb/components/ui/radio-group.js';
import { ChannelColor, channelColorValues, useChannelColors } from '@/vdb/hooks/use-channel-colors.js';
import { Trans } from '@lingui/react/macro';
import type { ReactNode } from 'react';

const colorLabels: Record<ChannelColor, ReactNode> = {
    neutral: <Trans>Neutral</Trans>,
    'viz-1': <Trans>Color 1</Trans>,
    'viz-2': <Trans>Color 2</Trans>,
    'viz-3': <Trans>Color 3</Trans>,
    'viz-4': <Trans>Color 4</Trans>,
    'viz-5': <Trans>Color 5</Trans>,
};

export function ChannelColorPicker({ channelId }: { channelId: string }) {
    const { getColor, setColor, canEdit, isAvailable, isSaving } = useChannelColors();

    if (!isAvailable || !canEdit) {
        return null;
    }

    return (
        <RadioGroup
            value={getColor(channelId)}
            onValueChange={value => setColor(channelId, value as ChannelColor)}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            disabled={isSaving}
        >
            {channelColorValues.map(color => (
                <Label
                    key={color}
                    htmlFor={`channel-color-${channelId}-${color}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 has-data-checked:border-primary"
                >
                    <RadioGroupItem id={`channel-color-${channelId}-${color}`} value={color} />
                    <ChannelColorSwatch color={color} />
                    <span className="text-sm">{colorLabels[color]}</span>
                </Label>
            ))}
        </RadioGroup>
    );
}
