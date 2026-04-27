export interface FollowUser {
    id: string;
    displayName?: string;
}

export interface FollowStateProvider {
    isFollowing(user: FollowUser): boolean;
    onFollowStateChangeRequested(
        user: FollowUser,
        desiredFollowing: boolean,
    ): Promise<{ following: boolean }>;
}
