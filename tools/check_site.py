"""Validate the generated blog using only Python's standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, urljoin, unquote
import json
import hashlib
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
ORIGIN = 'https://coderama.top'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.ids = set()
        self.anchors = []
        self.active = None
        self.redirects = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'meta' and (attrs.get('http-equiv') or '').lower() == 'refresh':
            content = attrs.get('content') or ''
            if ';' in content and '=' in content:
                self.redirects.append(content.split('=', 1)[1].strip())
        for name in ('href', 'src', 'data-src'):
            if name in attrs:
                self.urls.append((tag, name, attrs[name] or ''))
        if tag == 'a':
            self.active = [attrs.get('href') or '', (attrs.get('aria-label') or '') + (attrs.get('title') or '')]
        if self.active and tag == 'img':
            self.active[1] += attrs.get('alt') or ''

    def handle_data(self, data):
        if self.active:
            self.active[1] += data

    def handle_endtag(self, tag):
        if tag == 'a' and self.active:
            self.anchors.append(self.active)
            self.active = None


def resolve(url):
    path = PUBLIC / unquote(urlsplit(url).path).lstrip('/')
    for candidate in (path, path / 'index.html', Path(str(path) + '.html')):
        if candidate.is_file():
            return candidate
    return None


def check():
    pages = {}
    errors = []
    for path in PUBLIC.rglob('*.html'):
        page = Page()
        page.feed(path.read_text(encoding='utf-8'))
        pages[path] = page
    for path, page in pages.items():
        relative = path.relative_to(PUBLIC).as_posix()
        route = '/' + relative.removesuffix('index.html') if relative.endswith('index.html') else '/' + relative
        base = ORIGIN + route
        for redirect in page.redirects:
            target = urlsplit(urljoin(base, redirect))
            assert target.netloc == 'coderama.top' and resolve(target.geturl()), f'Invalid legacy redirect in {relative}: {redirect}'
        for href, label in page.anchors:
            if not href.strip() or not label.strip():
                errors.append(f'{relative}: empty link or label: {href!r}')
        for tag, attr, value in page.urls:
            if not value.strip():
                errors.append(f'{relative}: empty {tag}.{attr}')
                continue
            parts = urlsplit(value)
            if tag == 'img' and attr == 'src' and value.startswith(('data:image/png;base64,', 'data:image/gif;base64,', 'data:image/webp;base64,', 'data:image/jpeg;base64,')):
                continue
            if parts.scheme in ('mailto', 'tel'):
                continue
            if parts.scheme and parts.scheme not in ('https', 'http'):
                errors.append(f'{relative}: unsupported URL scheme: {value!r}')
                continue
            url = urlsplit(urljoin(base, value))
            if url.netloc != 'coderama.top':
                continue
            target = resolve(url.geturl())
            if not target:
                errors.append(f'{relative}: missing local target: {value!r}')
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(f'{relative}: missing fragment: {value!r}')
    legacy = json.loads((ROOT / 'tests/fixtures/legacy-rss-guids.json').read_text(encoding='utf-8'))
    for feed in PUBLIC.rglob('rss.xml'):
        items = ET.parse(feed).findall('./channel/item')
        if feed == PUBLIC / 'rss.xml':
            assert len(items) == 10, 'Home RSS must retain the latest 10 posts'
        guids = [item.findtext('guid') for item in items]
        assert len(guids) == len(set(guids)), f'Duplicate GUIDs in {feed}'
        for item in items:
            link, guid = item.findtext('link'), item.findtext('guid')
            assert link and '/posts/' in link and resolve(link), f'Invalid RSS item: {link}'
            if link.rstrip('/') in legacy:
                assert guid == legacy[link.rstrip('/')], f'Changed legacy RSS GUID: {link}'
    for name in ('manifest.webmanifest', 'images/logo/site.webmanifest'):
        manifest = json.loads((PUBLIC / name).read_text(encoding='utf-8'))
        assert manifest['name'] == '沁·拾遗轩'
        for icon in manifest['icons']:
            assert resolve(ORIGIN + icon['src']), icon
    search = PUBLIC / 'search.json'
    if search.is_file():
        for entry in json.loads(search.read_text(encoding='utf-8')):
            route = entry['path']
            assert route.startswith('/') and not route.startswith('//') and resolve(ORIGIN + route), f'Invalid search route: {route}'
    assert (PUBLIC / 'CNAME').read_text().strip() == 'coderama.top'
    assert (PUBLIC / 'sw.js').is_file(), 'Missing worker retirement endpoint'
    for file in ('source/js/fclite.js', 'source/js/redirect.js'):
        assert 'innerHTML' not in (ROOT / file).read_text(encoding='utf-8'), file
    for loc in ET.parse(PUBLIC / 'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
        assert resolve(loc.text), f'Sitemap entry does not exist: {loc.text}'
    mirrors = json.loads((ROOT / 'docs/audits/article-image-mirrors-2026-11-07.json').read_text(encoding='utf-8'))
    for image in mirrors:
        relative = image['local'].removeprefix('/')
        assert relative.startswith('images/articles/') and '..' not in Path(relative).parts, relative
        for directory in (ROOT / 'source', PUBLIC):
            asset = directory / relative
            assert asset.suffix, f'Image has no extension: {asset}'
            assert hashlib.sha256(asset.read_bytes()).hexdigest() == image['sha256'], f'Changed image bytes: {asset}'
    if errors:
        raise AssertionError('\n'.join(errors))
    print(f'PASS: {len(pages)} HTML pages, links and fragments, RSS GUIDs, manifest icons, sitemap, CNAME, worker retirement endpoint and {len(mirrors)} original image hashes.')


if __name__ == '__main__':
    check()
