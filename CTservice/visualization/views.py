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
      context = { 'title': ty, 'link1': 'remove_bg_data', 'link2': 'detected_data', 'link3': 'dbscan_cluster_data','link4': 'camera_data' }
      return render(request, 'lidar2d/visualization.html', context)
    elif ty=='remove_bg_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'detected_data', 'link3': 'dbscan_cluster_data','link4': 'camera_data' }
      return render(request, 'lidar2d/visualization.html', context)
    elif ty=='dbscan_cluster_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'remove_bg_data', 'link3': 'detected_data','link4': 'camera_data'}
      return render(request, 'lidar2d/visualization_cluster.html', context)
    elif ty=='detected_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'remove_bg_data', 'link3': 'dbscan_cluster_data','link4': 'camera_data','link5': 'history_multimodal_data','link6': 'provisional_detected_data'}
      return render(request, 'lidar2d/visualization_detected.html', context)
    elif ty=='provisional_detected_data':
      context = { 'title': ty, 'link1': 'raw_data', 'link2': 'remove_bg_data', 'link3': 'dbscan_cluster_data','link4': 'camera_data','link5': 'history_multimodal_data'}
      return render(request, 'lidar2d/visualization_provisional_detected.html', context)
    elif ty=='human_detected_data':
      return HttpResponse('coming soon')
    else :
      return HttpResponse('invalid URL or Query.')


def camera(request):
  if 'ty' in request.GET:
      ty = request.GET.get(key="ty")
  else:
      ty = 'camera_data'
      

  if ty=='camera_data':
    context = { 'title': ty, 'link1': 'detected_data', 'link2': 'remove_bg_data', 'link3': 'dbscan_cluster_data','link4': 'raw_data','link5': 'history_multimodal_data'}
    return render(request, 'camera/visualization_camera.html', context)
  elif ty=='camera_history_data':
    context = { 'title': ty, 'link1': 'raw_data', 'link2': 'remove_bg_data', 'link3': 'dbscan_cluster_data','link4': 'camera_data','link5': 'history_multimodal_data'}
    return render(request, 'camera/visualization_chistory.html', context)
  
  

def multimodal(request):
  if 'ty' in request.GET:
      ty = request.GET.get(key="ty")
  else:
      ty = 'multimodal_data'
      

  if ty=='multimodal_data':
    context = { 'title': ty, 'link1': 'detected_data', 'link2': 'remove_bg_data', 'link3': 'history_multimodal_data','link4': 'raw_data','link5': 'camera_data'}
    return render(request, 'multimodal/visualization_multimodal.html', context)
  elif ty=='history_multimodal_data':
    context = { 'title': ty, 'link1': 'raw_data', 'link2': 'history_multimodal_data_sub', 'link3': 'detected_data','link4': 'camera_data','link5': 'multimodal_data'}
    return render(request, 'multimodal/visualization_history_multimodal.html', context)

  elif ty=='history_multimodal_data_sub':
    context = { 'title': ty, 'link1': 'raw_data', 'link2': 'history_multimodal_data', 'link3': 'detected_data','link4': 'camera_data','link5': 'multimodal_data'}
    return render(request, 'multimodal/visualization_history_multimodal_sub.html', context)
  
  elif ty=='provisional_multimodal_data':
    context = { 'title': ty, 'link1': 'raw_data', 'link2': 'history_multimodal_data', 'link3': 'detected_data','link4': 'camera_data','link5': 'multimodal_data'}
    return render(request, 'multimodal/visualization_provisional_multimodal.html', context)

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
