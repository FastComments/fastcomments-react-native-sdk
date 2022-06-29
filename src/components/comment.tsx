
// This is a subset of the API comment object.
import {FastCommentsBadge} from "./badge";
import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet} from "react-native";
import {CommentMenu} from "./comment-menu";
import {CommentNotices} from "./comment-notices";

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
}

export interface FastCommentsCommentWithState {
    comment: FastCommentsComment;
    state: FastCommentsState;
}

export function FastCommentsComment(props: FastCommentsCommentWithState) {
    const {comment, state} = props;
    const isMyComment = state.currentUser && (comment.userId === state.currentUser.id || comment.anonUserId === state.currentUser.id);

    return <div>
        <div style={styles.topRight}>
            {comment.isPinned && <div style={styles.pin}></div>}
            {!state.config.readonly && CommentMenu(props)}
        </div>
        {CommentNotices(props)}
    </div>;
}

const styles = StyleSheet.create({
    topRight: {

    },
    pin: {

    }
})
