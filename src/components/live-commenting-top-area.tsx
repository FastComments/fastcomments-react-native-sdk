import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet} from "react-native";
import {ReplyArea} from "./reply-area";
import {ShowHideCommentsToggle} from "./show-hide-comments-toggle";
import {SelectSortDirection} from "./select-sort-direction";
import {ShowNewLiveCommentsButton} from "./show-new-live-comments-button";

export function LiveCommentingTopArea(state: FastCommentsState) {
    return <div>
        {
            state.config.inputAfterComments !== true && ReplyArea(state)
        }
        {
            state.config.useShowCommentsToggle && state.commentCountOnServer > 0 && ShowHideCommentsToggle(state)
        }
        {
            state.commentsVisible && state.commentCountOnServer > 1 && SelectSortDirection(state)
        }
        {
            state.commentsVisible && state.newRootCommentCount > 1 && ShowNewLiveCommentsButton(state)
        }
    </div>;
}

const styles = StyleSheet.create({

});
