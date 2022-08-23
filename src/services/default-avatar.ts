import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {FastCommentsImageAsset} from "../types/image-asset";

export function getDefaultAvatarSrc(state: State<FastCommentsState>) {
    return state.imageAssets[FastCommentsImageAsset.AVATAR_DEFAULT].get();
}
