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

    if ty=='raw_data' or ty=='remove_bg_data':
      context = { 'title': ty }
      return render(request, 'lidar2d/visualization.html', context)
    elif ty=='human_detected_data':
      return HttpResponse('coming soon')
    else :
      return HttpResponse('invalid URL or Query.');


def db_schedule(request):
    return HttpResponse('coming soon...')
