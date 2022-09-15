import {FastCommentsImageAsset, ImageAssetConfig} from "../types";

export function getDefaultAvatarSrc(imageAssets: ImageAssetConfig) {
    return imageAssets[FastCommentsImageAsset.AVATAR_DEFAULT];
}
