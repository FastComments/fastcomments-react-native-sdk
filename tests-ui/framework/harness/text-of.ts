/**
 * Extract the displayed text content of a node returned by RNTL queries.
 * `JSON.stringify` on these nodes hits circular refs (parent <-> child); this
 * helper walks props.children recursively and concatenates string content.
 */
export function textOf(node: any): string {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    const props = node.props || {};
    const children = props.children;
    if (children === undefined || children === null) return '';
    if (Array.isArray(children)) {
        return children.map(textOf).join('');
    }
    return textOf(children);
}
