import {RNComment} from "./react-native-comment";
import {FastCommentsSessionUser} from "./user";
import {UserNotification} from "./user-notification";

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
    /** Invoked when the user selects a notification. **/
    onNotificationSelected?: (notification: UserNotification) => void,
    /**
     * Invoked when the user selects the gif toolbar icon.
     * Return a publicly accessible image path (should start with http).
     * You can use the built in GifBrowser as in the examples.
     * If using the FastComments GifBrowser, just return the string path from the browser. It will already be publicly available.
     * If you're using some other gif picker, you'll have to provide a public path.
     * **/
    pickGIF?: () => Promise<string | false>,
    /** Invoked when the user selects the image toolbar icon. Return a path on disk or a publicly accessible image path (should start with http). **/
    pickImage?: () => Promise<FastCommentsFromDiskAsset | string>,
    /** Invoked when the comment count changes. **/
    // commentCountUpdated?: (newCount: number) => void TODO
}

export interface FastCommentsFromDiskAsset {
  base64?: string;
  uri?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  type?: string;
  fileName?: string;
  duration?: number;
  bitrate?: number;
  timestamp?: string;
  id?: string;
}
