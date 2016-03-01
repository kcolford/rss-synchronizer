all:

Makefile: .tracked-files

.tracked-files:
	git ls-files > $@-t
	cmp -q $@-t $@ || mv $@-t $@
tracked-files = .tracked-files $(shell cat .tracked-files)

.update: $(tracked-files)
	git add $(tracked-files)
	git commit 
	git push
	sudo $(MAKE) install
update: .update

.install: req-apt.txt req-pip.txt rss-synchronizer.py
	apt-get install `cat req-apt.txt`
	pip install `cat req-pip.txt`
	install rss-synchronizer.py /bin/rss-synchronizer
install: .install

.PHONY: update install all

