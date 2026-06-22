// Seeds the showcase demo thread: posts a small threaded conversation as
// authenticated (simpleSSO) users with avatars to the `demo` tenant under the
// showcase urlId, so the commenting demo renders verified commenters.
// Run: node seed-demo-thread.mjs
import { FastCommentsServerSDK } from 'fastcomments-sdk/server';

const TENANT = 'demo';
const URL_ID = 'fastcomments-rn-showcase-v3';
const PAGE_URL = 'https://fastcomments.com/demo/fastcomments-rn-showcase-v3';

const avatar = (seed) =>
    `https://api.dicebear.com/9.x/avataaars/png?size=200&seed=${encodeURIComponent(seed)}`;

const ssoFor = (p) =>
    JSON.stringify({ simpleSSOUser: { username: p.name, email: p.email, avatar: avatar(p.name) } });

let counter = 0;
const broadcastId = () => `seed-${Date.now()}-${counter++}`;

const MAYA = { name: 'Maya Chen', email: 'maya.chen@fctest.com' };
const DEV = { name: 'Dev Patel', email: 'dev.patel@fctest.com' };
const LIANG = { name: 'Liang Wu', email: 'liang.wu@fctest.com' };
const SOFIA = { name: 'Sofia Rossi', email: 'sofia.rossi@fctest.com' };

const sdk = new FastCommentsServerSDK({ basePath: 'https://fastcomments.com' });
const api = sdk.publicApi;

const post = async (p, comment, parentId) => {
    let res;
    try {
        res = await api.createCommentPublic({
            tenantId: TENANT,
            urlId: URL_ID,
            broadcastId: broadcastId(),
            sso: ssoFor(p),
            commentData: {
                commenterName: p.name,
                commenterEmail: p.email,
                comment,
                parentId: parentId ?? null,
                url: PAGE_URL,
                urlId: URL_ID,
                date: Date.now(),
                tos: true,
            },
        });
    } catch (e) {
        const body = e?.response ? await e.response.text().catch(() => '') : '';
        console.log(`POST ${p.name} ERROR http=${e?.response?.status} body=${body.slice(0, 400)}`);
        throw e;
    }
    console.log(`POST ${p.name}: status=${res.status} id=${res.comment?.id} parent=${parentId ?? '-'}`);
    return res.comment?.id;
};

const root = await post(
    MAYA,
    'Just dropped FastComments into our React Native app and the live updates are buttery smooth — new comments show up instantly, no refresh. 🔥'
);
const r1 = await post(
    DEV,
    'Same here! Took me about 20 minutes to wire up. The theme tokens made it match our design system perfectly.',
    root
);
await post(
    MAYA,
    'Right? I switched the accent color and turned on the dark theme in basically two lines.',
    r1
);
const r2 = await post(
    LIANG,
    'Does it handle threading + GIFs out of the box? Eyeing it for our community app.',
    root
);
await post(
    SOFIA,
    'Yep — GIFs, image uploads, @mentions and reactions are all built in. We shipped it last week and the team loves it.',
    r2
);

const read = await api.getCommentsPublic({ tenantId: TENANT, urlId: URL_ID, direction: 'OF' });
console.log(`READBACK: status=${read.status} count=${read.comments?.length}`);
