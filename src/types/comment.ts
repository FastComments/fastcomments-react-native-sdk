import {FastCommentsBadge} from "./badge";

export interface FastCommentsComment {
    anonUserId?: string;
    _id: string;
    userId?: string;
    commenterName?: string;
    commenterLink?: string;
    commentHTML: string;
    parentId?: string | null;
    date: number;
    votes?: number;
    votesUp?: number;
    votesDown?: number;
    verified: boolean;
    avatarSrc?: string;
    hasImages?: boolean;
    isByAdmin?: boolean;
    isByModerator?: boolean;
    isPinned?: boolean;
    isSpam?: boolean;
    displayLabel?: string;
    badges?: FastCommentsBadge[];
    isDeleted?: boolean;
    isVotedUp?: boolean;
    isVotedDown?: boolean;
    myVoteId?: string;
    isBlocked?: boolean;
    isFlagged?: boolean;
    approved?: boolean; // this is only false upon submission, normally it is undefined
    children?: FastCommentsComment[]; // populated after fetch
}
