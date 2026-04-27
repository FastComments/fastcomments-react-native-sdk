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
import {FastCommentsRNConfig} from "../types/react-native-config";
import {getMergedTranslations} from "../services/translations";
import {showError} from "../services/show-error";
import type {FastCommentsStore} from "../store/types";

export interface GifBrowserProps {
    cancelled: () => void
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    onError?: (title: string, message: string) => void
    pickedGIF: (gifPath: string) => void
    store: FastCommentsStore
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
    onError,
    pickedGIF,
    store,
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
        const sdk = store.getState().sdk;
        const response = request.search
            ? await sdk.publicApi.getGifsSearch({
                tenantId: config.tenantId!,
                search: request.search,
                locale: request.locale,
                rating: request.rating,
                page: request.page,
            })
            : await sdk.publicApi.getGifsTrending({
                tenantId: config.tenantId!,
                locale: request.locale,
                rating: request.rating,
                page: request.page,
            });
        if (response.status === 'success') {
            // Server emits each image as a heterogeneous tuple [src, width, height];
            // OpenAPI 3.0 cannot express tuples, so the SDK types `images` loosely.
            // We narrow it back to the contract documented on the controller.
            const images: [string, number, number][] = (response.images ?? []).map((row: ArrayLike<unknown>): [string, number, number] => {
                return [String(row[0]), Number(row[1]), Number(row[2])];
            });
            setHasMore(images.length >= 25);
            setIsFetching(false);
            setIsInitialLoad(false);
            if (isNewTerm) {
                setGifsDeDupe(images);
            } else {
                setGifsDeDupe([
                    ...gifs,
                    ...images
                ]);
            }
        } else {
            const mergedTranslations = getMergedTranslations(translations, response);
            showError(':(', mergedTranslations.ERROR_MESSAGE, mergedTranslations.DISMISS, onError);
        }
    }

    async function getGifsTranslations() {
        const sdk = store.getState().sdk;
        const response = await sdk.publicApi.getTranslations({
            namespace: 'widgets',
            component: 'comment-ui-gifs',
            useFullTranslationIds: true,
            locale: config.locale,
        });
        return response.translations || {};
    }

    async function getCommonTranslations() {
        const sdk = store.getState().sdk;
        const response = await sdk.publicApi.getTranslations({
            namespace: 'widgets',
            component: 'comment-ui',
            useFullTranslationIds: true,
            locale: config.locale,
        });
        return response.translations || {};
    }

    async function setupTranslations() {
        const [
            commonTranslations,
            gifsTranslations,
        ] = await Promise.all([
            getCommonTranslations(),
            getGifsTranslations(),
        ]);
        setTranslations({
            ...commonTranslations,
            ...gifsTranslations,
        })
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

    const handleSelected = async (rawSrc: string) => {
        if (rawSrc.includes('fastcomments') || rawSrc.includes('localhost:')) { // support prod and local dev
            pickedGIF(rawSrc);
        } else {
            // TODO show loading
            const sdk = store.getState().sdk;
            const response = await sdk.publicApi.getGifLarge({
                tenantId: config.tenantId!,
                largeInternalURLSanitized: rawSrc,
            });
            if (response.status === 'success' && response.src) {
                pickedGIF(response.src);
            } else {
                console.warn('Could not get full version of GIF to use. Error response from API.', response);
                pickedGIF(rawSrc); // silently pick smaller version :/
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
                <Image style={styles.gifBrowser?.modalCancelImage}
                       source={imageAssets[config.hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}/>
            </TouchableOpacity>
        </View>
    </View>;
}
