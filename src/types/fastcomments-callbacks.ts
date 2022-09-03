import {RNComment} from "./react-native-comment";
import {FastCommentsSessionUser} from "./user";

export interface FastCommentsCallbacks {
    /** Invoked when voting is successful. **/
    onVoteSuccess?: (comment: RNComment, voteId: string, type: 'up' | 'down' | 'deleted', status: 'success' | 'pending-verification') => void
    /** Invoked when starting to reply, or when replying is cancelled (with null). **/
    replyingTo?: (comment: RNComment | null) => void
    /** Invoked when replying is successful. **/
    onReplySuccess?: (comment: RNComment) => void
    /** Invoked when the user signs in, or SSO is initialized, etc. **/
    onAuthenticationChange?: (status: 'user-set' | 'session-id-set' | 'authentication-failed' | 'logout', currentUser: FastCommentsSessionUser, comment: RNComment | null) => void
    /** Invoked when library renders comments. **/
    onCommentsRendered?: (comment: RNComment[]) => void,
    /** Invoked when the comment count changes. **/
    // commentCountUpdated?: (newCount: number) => void TODO
    /** Invoked when clicking an image inside a comment. **/
    // onImageClicked?: (imageSrc: string) => void TODO
    /** Invoked when trying to open a user's profile, like when clicking an avatar. Return true to prevent loading spinner. **/
    // onOpenProfile?: (userId: string) => boolean TODO
}
