all:

update:
	git commit -a
	sudo $(MAKE) install

install:
	apt-get install `cat req-apt.txt`
	pip install `cat req-pip.txt`
	install rss-synchronizer.py /bin/rss-synchronizer
