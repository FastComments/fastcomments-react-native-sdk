
// This is a subset of the API comment object.
import {FastCommentsBadge} from "./badge";
import {FastCommentsState} from "../types/fastcomments-state";

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
}

export interface FastCommentsCommentWithState {
    comment: FastCommentsComment;
    state: FastCommentsState;
}

export function FastCommentsComment(props: FastCommentsCommentWithState) {
    const isMyComment = props.state.currentUser && (props.comment.userId === props.state.currentUser.id || props.comment.anonUserId === props.state.currentUser.id);

    return <div></div>;
}
