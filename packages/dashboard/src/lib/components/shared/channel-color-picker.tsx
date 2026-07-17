import { ChannelColorSwatch } from '@/vdb/components/shared/channel-identity.js';
import { Label } from '@/vdb/components/ui/label.js';
import { RadioGroup, RadioGroupItem } from '@/vdb/components/ui/radio-group.js';
import { ChannelColor, channelColorValues, useChannelColors } from '@/vdb/hooks/use-channel-colors.js';
import { cn } from '@/vdb/lib/utils.js';
import { Trans } from '@lingui/react/macro';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

const colorLabels: Record<ChannelColor, ReactNode> = {
    neutral: <Trans>Neutral</Trans>,
    'viz-1': <Trans>Color 1</Trans>,
    'viz-2': <Trans>Color 2</Trans>,
    'viz-3': <Trans>Color 3</Trans>,
    'viz-4': <Trans>Color 4</Trans>,
    'viz-5': <Trans>Color 5</Trans>,
};

export function ChannelColorPicker({ channelId, className }: { channelId: string; className?: string }) {
    const { getColor, setColor, canEdit, isAvailable, isSaving } = useChannelColors();

    if (!isAvailable || !canEdit) {
        return null;
    }

    const selectedColor = getColor(channelId);

    return (
        <RadioGroup
            value={selectedColor}
            onValueChange={value => setColor(channelId, value as ChannelColor)}
            className={cn('grid grid-cols-3 gap-2', className)}
            disabled={isSaving}
        >
            {channelColorValues.map(color => {
                const selected = selectedColor === color;
                return (
                    <Label
                        key={color}
                        htmlFor={`channel-color-${channelId}-${color}`}
                        className={cn(
                            'relative flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border bg-background px-1 py-2.5 transition-colors hover:bg-accent',
                            selected && 'border-primary bg-accent',
                        )}
                    >
                        <RadioGroupItem
                            id={`channel-color-${channelId}-${color}`}
                            value={color}
                            className="sr-only"
                        />
                        <ChannelColorSwatch color={color} />
                        <span className="w-full truncate text-center text-xs font-medium">
                            {colorLabels[color]}
                        </span>
                        <Check
                            className={cn(
                                'absolute right-1 top-1 size-3.5 text-primary',
                                !selected && 'invisible',
                            )}
                            aria-hidden="true"
                        />
                    </Label>
                );
            })}
        </RadioGroup>
    );
}
