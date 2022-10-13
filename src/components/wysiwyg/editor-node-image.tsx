import {EditorNodeProps} from "./editor-node";
import {Image, ImageBackground, TouchableOpacity} from "react-native";
import {getDefaultImageAssets} from "../../resources";
import {FastCommentsImageAsset} from "../../types";

const assets = getDefaultImageAssets();

export function EditorNodeImage({doDelete, nodeState}: EditorNodeProps) {
    // the only problem with this is that the image does not show exactly the same as after it is posted, which is terrible.
    // it would be great if we could use resizeMode: contain and still have the delete button still align with the image content.
    return <ImageBackground
        source={{uri: nodeState.content.get()}}
        style={{
            position: 'relative',
            marginTop: 10,
            marginBottom: 10,
            width: '100%',
            aspectRatio: 1
        }}
        imageStyle={{
            aspectRatio: 1,
        }}>
        <TouchableOpacity onPress={doDelete} style={{
            position: 'absolute',
            top: -5,
            right: -5
        }}>
            <Image source={assets[FastCommentsImageAsset.ICON_CROSS]} style={{
                width: 12,
                aspectRatio: 1,
                resizeMode: 'center',
            }} />
        </TouchableOpacity>
    </ImageBackground>;
}
