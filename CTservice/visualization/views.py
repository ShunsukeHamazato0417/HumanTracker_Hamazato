from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse


# Create your views here.

def visualization(request):
    return render(request, 'visualization.html')


def lidar2d(request):
    if 'ty' in request.GET:
        ty = request.GET.get(key="ty")
    else:
        ty = 'raw_data'

    if ty=='raw_data':
      context = { 'title': ty, 'link1': 'remove_bg_data', 'link2': 'detected_data', 'link3': 'dbscan_cluster_data' }
      return render(request, 'lidar2d/visualization.html', context)
    elif ty=='remove_bg_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'detected_data', 'link3': 'dbscan_cluster_data' }
      return render(request, 'lidar2d/visualization.html', context)
    elif ty=='dbscan_cluster_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'remove_bg_data', 'link3': 'detected_data'}
      return render(request, 'lidar2d/visualization_cluster.html', context)
    elif ty=='detected_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'remove_bg_data', 'link3': 'dbscan_cluster_data'}
      return render(request, 'lidar2d/visualization_detected.html', context)
    elif ty=='human_detected_data':
      return HttpResponse('coming soon')
    else :
      return HttpResponse('invalid URL or Query.')


def webtransport_lidar2d(request):
    if 'ty' in request.GET:
          ty = request.GET.get(key="ty")
    else:
        ty = 'raw_data'

    if ty=='raw_data':
      context = { 'title': ty, 'link1': 'remove_bg_data', 'link2': 'integrated_remove_bg_data' }
      return render(request, 'webtransport/lidar2d/visualization.html', context)
    elif ty=='remove_bg_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'integrated_remove_bg_data' }
      return render(request, 'webtransport/lidar2d/visualization.html', context)
    elif ty=='integrated_remove_bg_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'remove_bg_data'}
      return render(request, 'webtransport/lidar2d/visualization_integrated.html', context)
    elif ty=='human_detected_data':
      return HttpResponse('coming soon')
    else :
      return HttpResponse('invalid URL or Query.')


def db_schedule(request):
    return HttpResponse('coming soon...')
