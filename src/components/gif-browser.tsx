import {
    ActivityIndicator,
    BackHandler,
    FlatList,
    Image,
    ListRenderItemInfo, Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from "react-native";
import {FastCommentsImageAsset, IFastCommentsStyles, ImageAssetConfig} from "../types";
import {useEffect, useRef, useState} from "react";
import {createURLQueryString, getAPIHost, makeRequest} from "../services/http";
import {GetGifsResponse} from "../types/dto/get-gifs";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {GetTranslationsResponse} from "../types/dto/get-translations-response";
import {GetGifLargeResponse} from "../types/dto/get-gif-large";

export interface GifBrowserProps {
    cancelled: () => void
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    pickedGIF: (gifPath: string) => void
    styles: IFastCommentsStyles
}

interface GifsRequest extends Record<string, string | number | null | undefined> {
    search: string | null,
    page: number,
    locale?: string,
    rating?: string
}

export function GifBrowser({
    cancelled,
    config,
    imageAssets,
    pickedGIF,
    styles
}: GifBrowserProps) {
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [gifs, setGifs] = useState<[string, number, number][]>([]);
    const lastRequestTime = useRef<number>(0);
    const lastGifsRequest = useRef<GifsRequest>({
        search: null,
        page: 0,
        locale: config.locale,
        rating: config.gifRating
    });
    const {width} = useWindowDimensions();

    function setGifsDeDupe(newList: [string, number, number][]) {
        const pathMap: Record<string, boolean> = {};
        const result = [];
        for (const entry of newList) {
            if (!pathMap[entry[0]]) {
                pathMap[entry[0]] = true;
                result.push(entry);
            }
        }
        setGifs(result);
    }

    async function getGifs(request: GifsRequest) {
        const isNewTerm = lastGifsRequest.current.search !== request.search;
        if (!isNewTerm && !hasMore) {
            return;
        }
        if (!isNewTerm && Date.now() - lastRequestTime.current < 5_000) { // incase pagination goes crazy
            return;
        }
        setIsFetching(true);
        lastGifsRequest.current = request;
        lastRequestTime.current = Date.now();
        const response = await makeRequest<GetGifsResponse>({
            apiHost: getAPIHost(config),
            method: 'GET',
            url: '/gifs/' + (request.search ? 'search/' : 'trending/') + config.tenantId + createURLQueryString(request)
        });
        if (response.status === 'success') {
            setHasMore(response.images.length >= 25);
            setIsFetching(false);
            setIsInitialLoad(false);
            if (isNewTerm) {
                setGifsDeDupe(response.images);
            } else {
                setGifsDeDupe([
                    ...gifs,
                    ...response.images
                ]);
            }
        } else {
            // TODO
        }
    }

    async function setupTranslations() {
        let url = '/translations/widgets/comment-ui-gifs?useFullTranslationIds=true';
        if (config.locale) {
            url += '&locale=' + config.locale;
        }
        const response = await makeRequest<GetTranslationsResponse>({
            apiHost: getAPIHost(config),
            method: 'GET',
            url: url
        });
        if (response.translations) {
            setTranslations(response.translations);
        }
    }

    async function initialLoad() {
        await Promise.all([
            setupTranslations(),
            getGifs(lastGifsRequest.current)
        ]);
    }

    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                cancelled();
                return true;
            }
        );

        return () => backHandler.remove()
    }, []);

    useEffect(() => {
        // noinspection JSIgnoredPromiseFromCall
        initialLoad();
    }, []);

    const onEndReached = async () => {
        lastGifsRequest.current.page++;
        await getGifs(lastGifsRequest.current);
    };

    const handleSelected = async (rawBigSrc: string) => {
        if (rawBigSrc.includes('fastcomments') || rawBigSrc.includes('localhost:')) { // support prod and local dev
            pickedGIF(rawBigSrc);
        } else {
            // TODO show loading
            const response = await makeRequest<GetGifLargeResponse>({
                apiHost: getAPIHost(config),
                method: 'GET',
                url: '/gifs/get-large/' + config.tenantId + createURLQueryString({
                    largeInternalURLSanitized: rawBigSrc
                })
            });
            if (response.status === 'success') {
                pickedGIF(rawBigSrc);
            } else {
                // TODO
            }
        }
    };

    const renderItem = ({item}: ListRenderItemInfo<[string, number, number]>) => {
        return <TouchableOpacity onPressOut={() => handleSelected(item[0])}>
            <Image source={{uri: item[0]}} style={[{width}, styles.gifBrowser?.listImage]}/>
        </TouchableOpacity>;
    };

    const header = <TextInput
        value={searchText}
        onChangeText={(newValue) => {
            setSearchText(newValue)
            if (Date.now() - lastRequestTime.current > 1_500) {
                // noinspection JSIgnoredPromiseFromCall
                getGifs({
                    ...lastGifsRequest.current,
                    search: searchText
                });
            }
        }
        }
        style={styles.gifBrowser?.searchInput}
        placeholder={translations.GIF_SEARCH_PLACEHOLDER}
        onSubmitEditing={() => {
            // noinspection JSIgnoredPromiseFromCall
            getGifs({
                ...lastGifsRequest.current,
                search: searchText
            });
        }
        }
        returnKeyType={'search'}
    />;

    return <View style={styles.gifBrowser?.centeredView}>
        <View style={styles.gifBrowser?.modalView}>
            {
                isInitialLoad ? <ActivityIndicator size="large"/> : <FlatList
                    style={styles.gifBrowser?.list}
                    data={gifs}
                    keyExtractor={(item: [string, number, number]) => item[0]}
                    inverted={false}
                    maxToRenderPerBatch={10}
                    onEndReachedThreshold={0.3}
                    onEndReached={onEndReached}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <Text style={styles.gifBrowser?.noResultsMessage}>{translations.GIF_SEARCH_NO_RESULTS_FOUND}</Text>
                    }
                    ListHeaderComponent={header}
                    ListFooterComponent={
                        <View>
                            {
                                isFetching
                                    ? <ActivityIndicator size="large"/>
                                    : null
                            }
                        </View>
                    }
                />
            }
            <TouchableOpacity style={styles.gifBrowser?.modalCancel} onPress={cancelled}>
                <Image style={styles.gifBrowser?.modalCancelImage} source={imageAssets[config.hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}/>
            </TouchableOpacity>
        </View>
    </View>;
}
