import { Text, TextStyle } from 'react-native';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface LiveCommentingCommentCountProps {
    store: FastCommentsStore;
    style?: TextStyle;
    count: number;
}

export function CommentCount({ store, style, count }: LiveCommentingCommentCountProps) {
    const configFormat = useStoreValue(store, (s) => s.config.commentCountFormat);
    const translations = useStoreValue(store, (s) => s.translations);

    if (configFormat) {
        return <Text style={style}>{configFormat.replace('[count]', Number(count).toLocaleString())}</Text>;
    }
    const suffix = count === 1 ? translations.COMMENT_THIS_PAGE : translations.COMMENTS_THIS_PAGE;
    return <Text style={style}>{Number(count).toLocaleString() + suffix}</Text>;
}
