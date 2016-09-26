# Maintainer: Kieran Colford <kieran@kcolford.com>
pkgname=rss-synchronizer
pkgver=1.0.0
pkgrel=1
epoch=
pkgdesc=""
arch=('i686' 'x86_64')
url=""
license=('GPL')
groups=()
depends=(nodejs phantomjs)
makedepends=(npm phantomjs)
checkdepends=()
optdepends=()
provides=()
conflicts=()
replaces=()
backup=()
options=()
install=
changelog=
source=(package.json
	bin.js
	browser.js
	database.js
	email.js
	index.js
	main.js
	rss.js
	service.js
	timer.js
        rss-synchronizer.service)
md5sums=('3ede6ef0b293caf36808dbab98e49852'
         '0e80dc9e3a0d69e7b57450f8cfeb1957'
         '836ad149fd3ba3f5b02c9572815b12c6'
         '029b45ceccb56b7bc3d95bc56d2b7c8f'
         'e77fec88eb86fb6e69c40bd70b0619f7'
         '34e1b56727b6b6e9a39a5610dfdbcae4'
         '091fd32955db40bc60d06ba14b807e79'
         'f7097e6648eb0b7be8d6bc20563b3358'
         '36ecfe813f3a4714836075c9bfad99e0'
         '3896a5741bc6ef6fa6a8e6a84b213a32'
         '84d2eedf82abd6e6e8c1db493d9ce731')
noextract=()


package() {
  cd "$srcdir/"
  mkdir -p "$pkgdir"/usr/lib/{node_modules,systemd/system}
  npm install -g --prefix "$pkgdir"/usr
  install -m644 rss-synchronizer.service "$pkgdir"/usr/lib/systemd/system/
  make DESTDIR="$pkgdir/" install
}

# vim:set ts=2 sw=2 et:
