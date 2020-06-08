"""formula_site URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.urls import include, path
from django.conf.urls import handler404, handler500
from user.views import UserView
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.shortcuts import redirect


def redirect_view(request):
    response = redirect('/formula_2_3')
    return response

def redirect_view_compare(request):
    response = redirect('/formula_2_3/compare')
    return response

def redirect_view_virtual(request):
    response = redirect('/formula_2_3/virtual')
    return response

def redirect_view_analysis(request):
    response = redirect('/formula_2_3/analysis')
    return response

def redirect_view_admin(request):
    response = redirect('/user/admin')
    return response

def redirect_view_manage(request):
    response = redirect('/user/manage')
    return response

def redirect_view_score_e(request):
    response = redirect('/formula_e')
    return response


urlpatterns = [
    path('', redirect_view),
    path('standing', redirect_view),
    path('compare', redirect_view_compare),
    path('virtual', redirect_view_virtual),
    path('camera', redirect_view),
    path('map', redirect_view),
    path('pit', redirect_view),
    path('analysis', redirect_view_analysis),
    path('adminer', redirect_view_admin),
    path('manage', redirect_view_manage),
    path('score', redirect_view_score_e),
    path('user/', include('user.urls')),
    path('formula_e/', include('formula_e.urls')),
    path('formula_2_3/', include('formula_2_3.urls')),
    path('admin/', admin.site.urls),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += staticfiles_urlpatterns()


handler404 = UserView.error_404_view
handler500 = UserView.error_500_view