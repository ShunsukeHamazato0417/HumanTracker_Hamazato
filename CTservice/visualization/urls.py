from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from . import views

app_name = 'visualization'
urlpatterns = [
	path('', views.visualization, name='visualization'),
    path('lidar2d/', views.lidar2d, name='lidar2d'),
	path('lidar2d/db_schedule/', views.db_schedule, name='db_schedule'),
	path('webtransport/lidar2d/', views.webtransport_lidar2d, name='webtransport_lidar2d'),
	] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
