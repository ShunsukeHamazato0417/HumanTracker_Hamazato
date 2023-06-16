#!/usr/bin/python
#coding:utf-8

import os
import sys
from django.core.wsgi import get_wsgi_application

sys.path.append("/home/hamazato/study/CT/CTservice")
sys.path.append("/home/hamazato/study/CT/CTservice/calibration")
sys.path.append("/home/hamazato/study/CT/CTservise/visualization")
sys.path.append("/usr/local/lib/python3.7/dist-packeges")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "CTservice.settings")
application = get_wsgi_application()
