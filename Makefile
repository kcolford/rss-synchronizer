all:

install:
	pip install -r requires.txt
	install rss-synchronizer.py /bin/rss-synchronizer.py

uninstall:
	pip uninstall -r requires.txt
	rm /bin/rss-synchronizer.py
