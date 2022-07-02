export interface UserNotification {
    urlId: string,
    url?: string,
    pageTitle?: string,
    relatedObjectType: number,
    relatedObjectId?: string,
    viewed?: boolean,
    sent?: boolean,
    createdAt: Date,
    type: number,
    fromCommentId?: string,
    fromUserName?: string,
    fromUserId?: string,
    fromUserAvatarSrc?: string,
    optedOut?: boolean
}
