from django.urls import path

from . import views

urlpatterns = [
    path('', views.Formula23View.index, name='index'),
    path('compare', views.Formula23View.compare, name='compare'),
    path('virtual', views.Formula23View.virtual, name='virtual'),
    path('analysis', views.Formula23View.analysis, name='analysis'),
    path('ajax', views.Formula23View.ajax, name='ajax'),
    path('save', views.Formula23View.save, name='save'),
]