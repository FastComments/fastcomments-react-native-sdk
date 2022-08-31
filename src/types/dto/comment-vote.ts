export interface CommentVoteResponse {
    status: 'success' | 'failed' | 'pending-verification';
    code?: string;
    reason?: string;
    voteId?: string
    editKey?: string
    isVerified?: boolean
    bannedUntil?: number
}
