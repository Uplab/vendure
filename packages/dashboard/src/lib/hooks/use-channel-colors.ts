import { api } from '@/vdb/graphql/api.js';
import {
    getSettingsStoreValueDocument,
    setSettingsStoreValueDocument,
} from '@/vdb/graphql/settings-store-operations.js';
import { usePermissions } from '@/vdb/hooks/use-permissions.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const CHANNEL_COLOR_SETTINGS_KEY = 'vendure.dashboard.channelColors';
export const channelColorValues = ['neutral', 'viz-1', 'viz-2', 'viz-3', 'viz-4', 'viz-5'] as const;
export type ChannelColor = (typeof channelColorValues)[number];
export type ChannelColorMap = Record<string, ChannelColor>;

const queryKey = ['settings-store', CHANNEL_COLOR_SETTINGS_KEY] as const;

function normalizeChannelColors(value: unknown): ChannelColorMap {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, ChannelColor] =>
            channelColorValues.includes(entry[1] as ChannelColor),
        ),
    );
}

export function useChannelColors() {
    const queryClient = useQueryClient();
    const { hasPermissions } = usePermissions();
    const query = useQuery({
        queryKey,
        queryFn: () => api.query(getSettingsStoreValueDocument, { key: CHANNEL_COLOR_SETTINGS_KEY }),
        retry: false,
    });
    const colors = normalizeChannelColors(query.data?.getSettingsStoreValue);

    const mutation = useMutation({
        mutationFn: async (nextColors: ChannelColorMap) => {
            const result = await api.mutate(setSettingsStoreValueDocument, {
                input: { key: CHANNEL_COLOR_SETTINGS_KEY, value: nextColors },
            });
            if (result.setSettingsStoreValue.error) {
                throw new Error(result.setSettingsStoreValue.error);
            }
            return result;
        },
        onMutate: async nextColors => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData(queryKey);
            queryClient.setQueryData(queryKey, { getSettingsStoreValue: nextColors });
            return { previous };
        },
        onError: (error, _nextColors, context) => {
            queryClient.setQueryData(queryKey, context?.previous);
            toast.error('Failed to update channel color', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey }),
    });

    const setColor = (channelId: string, color: ChannelColor) => {
        mutation.mutate({ ...colors, [channelId]: color });
    };

    return {
        colors,
        getColor: (channelId: string): ChannelColor => colors[channelId] ?? 'neutral',
        setColor,
        canEdit: !query.isError && hasPermissions(['UpdateChannel']),
        isAvailable: !query.isError,
        isLoading: query.isLoading,
        isSaving: mutation.isPending,
    };
}
