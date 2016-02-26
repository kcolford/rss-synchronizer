all:

install:
	apt-get install `cat apt.req`
	pip install `cat pip.req`
	install rss-synchronizer.py /bin/rss-synchronizer
