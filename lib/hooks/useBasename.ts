import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { getBasename, getBasenameAvatar, getBasenameTextRecord, BasenameTextRecordKeys } from '@/lib/basenames';

export function useBasename(address?: Address) {
    const [basename, setBasename] = useState<string | null>(null);
    const [avatar, setAvatar] = useState<string | null>(null);
    const [description, setDescription] = useState<string | null>(null);
    const [twitter, setTwitter] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!address) {
            setBasename(null);
            setAvatar(null);
            setDescription(null);
            setTwitter(null);
            return;
        }

        const resolveBasename = async () => {
            setLoading(true);
            setError(null);

            try {
                // Resolve Basename
                const resolvedBasename = await getBasename(address);
                setBasename(resolvedBasename);

                if (resolvedBasename) {
                    // Get avatar and text records in parallel
                    const [resolvedAvatar, resolvedDescription, resolvedTwitter] = await Promise.all([
                        getBasenameAvatar(resolvedBasename),
                        getBasenameTextRecord(resolvedBasename, BasenameTextRecordKeys.Description),
                        getBasenameTextRecord(resolvedBasename, BasenameTextRecordKeys.Twitter),
                    ]);

                    setAvatar(resolvedAvatar);
                    setDescription(resolvedDescription);
                    setTwitter(resolvedTwitter);
                } else {
                    setAvatar(null);
                    setDescription(null);
                    setTwitter(null);
                }
            } catch (err) {
                console.warn('Failed to resolve Basename:', err);
                setError('Failed to resolve Basename');
                setBasename(null);
                setAvatar(null);
                setDescription(null);
                setTwitter(null);
            } finally {
                setLoading(false);
            }
        };

        resolveBasename();
    }, [address]);

    return {
        basename,
        avatar,
        description,
        twitter,
        loading,
        error
    };
}
